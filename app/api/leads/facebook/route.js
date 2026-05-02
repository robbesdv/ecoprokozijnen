import crypto from 'crypto'
import { normalizeLeadPayload } from '@/lib/lead-normalize'
import { saveLeadRows } from '../_shared'

function verifyMetaSignature(rawBody, signature) {
  const secret = process.env.META_APP_SECRET
  if (!secret) return true
  if (!signature?.startsWith('sha256=')) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function extractLeadEvents(body) {
  return (body.entry || []).flatMap(entry =>
    (entry.changes || [])
      .filter(change => change.field === 'leadgen' && change.value?.leadgen_id)
      .map(change => ({
        ...change.value,
        entry_id: entry.id,
        entry_time: entry.time,
      }))
  )
}

async function fetchMetaLead(event) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN
  if (!accessToken) {
    return {
      ...event,
      id: event.leadgen_id,
      source_lead_id: event.leadgen_id,
      message: 'Meta lead details niet opgehaald: META_PAGE_ACCESS_TOKEN ontbreekt.',
    }
  }

  const version = process.env.META_GRAPH_VERSION || 'v25.0'
  const fields = [
    'created_time',
    'field_data',
    'ad_id',
    'ad_name',
    'adset_id',
    'adset_name',
    'campaign_id',
    'campaign_name',
    'form_id',
    'platform',
  ].join(',')
  const url = new URL(`https://graph.facebook.com/${version}/${event.leadgen_id}`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ...event,
      id: event.leadgen_id,
      source_lead_id: event.leadgen_id,
      message: data?.error?.message || 'Meta lead details konden niet worden opgehaald.',
      meta_fetch_error: data?.error || data,
    }
  }

  return {
    ...data,
    ...event,
    id: event.leadgen_id,
    source_lead_id: event.leadgen_id,
    raw_meta_event: event,
  }
}

export async function GET(request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request) {
  const rawBody = await request.text()
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return Response.json({ error: 'Ongeldige Meta signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const events = extractLeadEvents(body)
    const detailed = await Promise.all(events.map(fetchMetaLead))
    const rows = detailed.map(payload => normalizeLeadPayload(payload, { source: 'facebook' }))
    const data = await saveLeadRows(rows)
    return Response.json({ success: true, count: data.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
