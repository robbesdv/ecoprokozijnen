import { createServiceSupabaseClient } from '@/lib/supabase-server'

const LEADLAB_WEBHOOK_URL =
  process.env.LEADLAB_WEBHOOK_URL ||
  'https://balanced-analysis-production-27b5.up.railway.app/webhook/kozijnsuite'

const PAYMENT_NOTIFY_FIELDS = {
  notify_deposit_payment: 'deposit_notified',
  notify_main_payment: 'main_payment_notified',
  notify_final_payment: 'final_payment_notified',
}

async function fetchPortalOrder(supabase, orderId, token) {
  if (!orderId || !token) return null

  const { data, error } = await supabase
    .from('orders')
    .select('id, portal_token, phase, customer_name, customer_email, customer_phone, quote_accepted_at, deposit_confirmed')
    .eq('id', orderId)
    .eq('portal_token', token)
    .single()

  if (error) return null
  return data
}

async function sendLeadLabAkkoord(order) {
  const secret = process.env.KOZIJNSUITE_WEBHOOK_SECRET
  if (!secret) return

  await fetch(LEADLAB_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret,
    },
    body: JSON.stringify({
      event: 'akkoord_gegeven',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
    }),
  }).catch(() => {})
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, orderId, token } = body
    const supabase = createServiceSupabaseClient()
    const order = await fetchPortalOrder(supabase, orderId, token)

    if (!order) {
      return Response.json({ error: 'Order niet gevonden' }, { status: 404 })
    }

    if (action === 'accept_quote') {
      const signatureName = String(body.signatureName || '').trim()
      if (!signatureName) {
        return Response.json({ error: 'Naam ontbreekt' }, { status: 400 })
      }
      if (signatureName.toLowerCase() !== String(order.customer_name || '').toLowerCase()) {
        return Response.json({ error: 'Naam komt niet overeen met de offerte' }, { status: 400 })
      }
      if (!body.termsAccepted) {
        return Response.json({ error: 'Algemene voorwaarden niet geaccepteerd' }, { status: 400 })
      }

      if (Number(order.phase || 0) < 1 && !order.quote_accepted_at) {
        const now = new Date().toISOString()
        const { error } = await supabase
          .from('orders')
          .update({
            phase: 1,
            quote_accepted_at: now,
            signature_name: signatureName,
            signature_at: now,
          })
          .eq('id', order.id)
          .eq('portal_token', token)

        if (error) throw error

        await supabase.from('status_history').insert({
          order_id: order.id,
          from_phase: 0,
          to_phase: 1,
          changed_by: 'klant',
        })

        await sendLeadLabAkkoord(order)
      }

      return Response.json({ success: true })
    }

    if (action in PAYMENT_NOTIFY_FIELDS) {
      const field = PAYMENT_NOTIFY_FIELDS[action]
      const { error } = await supabase
        .from('orders')
        .update({ [field]: true })
        .eq('id', order.id)
        .eq('portal_token', token)

      if (error) throw error
      return Response.json({ success: true })
    }

    if (action === 'choose_payment_split') {
      const split = String(body.split || '')
      if (!['full_80', 'split_70_10'].includes(split)) {
        return Response.json({ error: 'Ongeldige betaalkeuze' }, { status: 400 })
      }

      const { error } = await supabase
        .from('orders')
        .update({ payment_split: split })
        .eq('id', order.id)
        .eq('portal_token', token)

      if (error) throw error
      return Response.json({ success: true })
    }

    if (action === 'add_defect') {
      const description = String(body.description || '').trim().slice(0, 2000)
      if (!description) {
        return Response.json({ error: 'Omschrijving ontbreekt' }, { status: 400 })
      }

      const { error } = await supabase.from('defects').insert({
        order_id: order.id,
        description,
        status: 'open',
      })

      if (error) throw error
      return Response.json({ success: true })
    }

    if (action === 'submit_rating') {
      const stars = Number(body.stars)
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return Response.json({ error: 'Ongeldige beoordeling' }, { status: 400 })
      }

      const feedback = String(body.feedback || '').trim().slice(0, 2000)
      const { error } = await supabase
        .from('orders')
        .update({ satisfaction_rating: stars, satisfaction_feedback: feedback })
        .eq('id', order.id)
        .eq('portal_token', token)

      if (error) throw error
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('Portal action error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
