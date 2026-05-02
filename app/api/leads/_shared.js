import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { normalizeLeadRows } from '@/lib/lead-normalize'

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase configuratie ontbreekt')
  return createClient(url, key)
}

function getBearerToken(header = '') {
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

export function getRequestToken(request) {
  const url = new URL(request.url)
  return request.headers.get('x-api-key') ||
    request.headers.get('x-ecopro-leads-key') ||
    getBearerToken(request.headers.get('authorization')) ||
    url.searchParams.get('key') ||
    url.searchParams.get('api_key') ||
    url.searchParams.get('token') ||
    ''
}

export function isLeadRequestAuthorized(request, extraKeys = []) {
  const configured = [
    process.env.LEADS_API_KEY,
    process.env.SLIMSTER_API_KEY,
    ...extraKeys,
  ].filter(Boolean)
  if (!configured.length) return false
  return configured.includes(getRequestToken(request))
}

function stableLeadId(row) {
  if (row.source_lead_id) return row.source_lead_id
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(row.raw_payload || row))
    .digest('hex')
    .slice(0, 32)
}

export async function saveLeadRows(rows) {
  if (!rows.length) return []
  const prepared = rows.map(row => ({
    ...row,
    source_lead_id: stableLeadId(row),
  }))

  const { data, error } = await supabaseServer()
    .from('leads')
    .upsert(prepared, { onConflict: 'source,source_lead_id' })
    .select('*')

  if (error) throw error
  return data || []
}

export async function ingestLeadRequest(request, defaultSource) {
  if (!isLeadRequestAuthorized(request)) {
    return Response.json({ error: 'Ongeldige of ontbrekende lead API key' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const body = await request.json()
    const source = url.searchParams.get('source') || body.source || defaultSource || 'webhook'
    const rows = normalizeLeadRows(body, { source })
    const data = await saveLeadRows(rows)
    return Response.json({ success: true, count: data.length, leads: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
