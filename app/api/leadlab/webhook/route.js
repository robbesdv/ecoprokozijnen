import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, verifyAuthCookie } from '@/lib/auth-cookie'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

const LEADLAB_WEBHOOK_URL =
  process.env.LEADLAB_WEBHOOK_URL ||
  'https://balanced-analysis-production-27b5.up.railway.app/webhook/kozijnsuite'

const ALLOWED_EVENTS = new Set(['offerte_verzonden', 'akkoord_gegeven'])

async function hasAdminSession() {
  const cookieStore = await cookies()
  const val = cookieStore.get(AUTH_COOKIE_NAME)?.value

  try {
    const auth = await verifyAuthCookie(val)
    return Boolean(auth?.ok && auth.role !== 'monteur')
  } catch {
    return false
  }
}

async function getOrder({ event, orderId, portalToken }) {
  let query = createServiceSupabaseClient()
    .from('orders')
    .select('id, portal_token, phase, quote_accepted_at, customer_email, customer_phone')
    .eq('id', orderId)

  if (event === 'akkoord_gegeven') {
    query = query.eq('portal_token', portalToken)
  }

  const { data, error } = await query.single()
  if (error) throw error
  return data
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { event, orderId, portalToken } = body

    if (!ALLOWED_EVENTS.has(event)) {
      return Response.json({ error: 'Onbekend LeadLAB event' }, { status: 400 })
    }

    if (!orderId) {
      return Response.json({ error: 'Ontbrekende orderId' }, { status: 400 })
    }

    if (event === 'offerte_verzonden' && !(await hasAdminSession())) {
      return Response.json({ error: 'Niet ingelogd als beheerder' }, { status: 401 })
    }

    if (event === 'akkoord_gegeven' && !portalToken) {
      return Response.json({ error: 'Ontbrekende portalToken' }, { status: 400 })
    }

    const order = await getOrder({ event, orderId, portalToken })

    if (event === 'akkoord_gegeven' && !order.quote_accepted_at && Number(order.phase || 0) < 1) {
      return Response.json({ error: 'Offerte is nog niet geaccordeerd' }, { status: 409 })
    }

    const customer_phone = order.customer_phone || ''
    const customer_email = order.customer_email || ''

    if (!customer_phone && !customer_email) {
      return Response.json({ success: false, skipped: 'Geen contactgegevens' })
    }

    const secret = process.env.KOZIJNSUITE_WEBHOOK_SECRET
    if (!secret) {
      return Response.json({ error: 'KOZIJNSUITE_WEBHOOK_SECRET ontbreekt' }, { status: 500 })
    }

    const response = await fetch(LEADLAB_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({
        event,
        customer_phone,
        customer_email,
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      return Response.json(
        { error: 'LeadLAB webhook fout', details: details.slice(0, 500) },
        { status: 502 }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('LeadLAB webhook route fout:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
