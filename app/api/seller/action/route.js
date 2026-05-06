import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { verifyInternalRequest } from '@/lib/internal-auth'
import { LEAD_STATUSES } from '@/lib/lead-normalize'
import { appendNijBegunCodeToDescription } from '@/lib/nijBegun'

const LEADLAB_WEBHOOK_URL =
  process.env.LEADLAB_WEBHOOK_URL ||
  'https://balanced-analysis-production-27b5.up.railway.app/webhook/kozijnsuite'

const VALID_LEAD_STATUSES = new Set(LEAD_STATUSES.map(status => status.key))

const PANE_LABEL = {
  vast: 'vast glas', draai: 'draai', kiep: 'kiep', draaikiep: 'draai-kiep',
  vent: 'ventilatie', deur: 'deur', deur2: 'dubbele deur', schuif: 'schuif',
  glas: 'glas', paneel: 'paneel',
}

function glassFinishLabel(value) {
  const map = { satinato: 'Satinato', milk: 'Melkglas', melkglas: 'Melkglas', solar: 'Zonwerend' }
  return map[String(value || '').toLowerCase()] || ''
}

function buildItemDescription(el) {
  const cols = el.columns || []
  const allRows = cols.flatMap(c => c.rows || [])
  const doorPanels = el.type === 'deur' && Array.isArray(el.doorPanels) ? el.doorPanels : []
  const typeRows = doorPanels.length ? doorPanels.map(p => ({ paneType: p.fill === 'glass' ? 'glas' : 'paneel' })) : allRows
  const seenTypes = []
  typeRows.forEach(r => {
    const label = PANE_LABEL[r.paneType] || r.paneType
    if (label && !seenTypes.includes(label)) seenTypes.push(label)
  })
  const isDoorLeafRow = (row) => el.type === 'deur' && doorPanels.length > 0 && ['deur', 'deur2'].includes(row.paneType)
  const glassRows = [...allRows.filter(r => r.fill !== 'panel' && !isDoorLeafRow(r)), ...doorPanels.filter(r => r.fill === 'glass')]
  const panelRows = [...allRows.filter(r => r.fill === 'panel' && !isDoorLeafRow(r)), ...doorPanels.filter(r => r.fill === 'panel')]
  const packRank = { 'HR+++': 3, 'HR++': 2, 'HR+': 1 }
  const rawPacks = [...new Set(glassRows.map(r => r.glassPack?.trim()).filter(Boolean))]
  const maxRank = Math.max(0, ...rawPacks.map(pack => packRank[pack] ?? 0))
  const glassPacks = maxRank > 0 ? rawPacks.filter(pack => (packRank[pack] ?? 0) === maxRank) : rawPacks
  const panelPacks = [...new Set(panelRows.map(r => r.panelPack || 'HR++'))]
  const finishLabels = [...new Set(glassRows.map(r => glassFinishLabel(r.glassFinish)).filter(Boolean))]
  const extras = [
    ...finishLabels,
    ...(panelPacks.length ? [`Paneel: ${panelPacks.join('/')}`] : []),
    ...(allRows.some(r => r.paneType === 'draaikiep' && r.padk) ? ['PADK ventilatiestand'] : []),
  ]
  const glassStr = [glassRows.length > 0 ? (glassPacks.length > 0 ? glassPacks.join('/') : 'HR++') : null, ...extras].filter(Boolean).join(', ') || 'HR++'
  const w = el.dimensions?.widthMM
  const h = el.dimensions?.heightMM
  const colorCode = el.finish?.colorOutside || ''
  return appendNijBegunCodeToDescription(
    `Premium Schuco Living Variant ${doorPanels.length || allRows.length || 1}-vaks, ${seenTypes.join(' / ') || 'vast glas'}, ${w} x ${h}mm bxh, Kleur: ${colorCode}, ${glassStr}`,
    el
  )
}

function buildExtraDescription(ex) {
  const name = String(ex?.name || '').trim()
  return `Extra: ${name || 'Project extra'}`
}

function buildOrderItems(orderId, kl) {
  const elementItems = (kl.elements || []).map((el, idx) => ({
    order_id: orderId,
    description: buildItemDescription(el),
    quantity: el.qty || 1,
    unit_price: Number(el.pricePerUnit) || 0,
    sort_order: idx,
    element_config: el,
  }))
  const extraItems = (kl.extras || [])
    .filter(ex => String(ex.name || '').trim() || Number(ex.unitPrice) > 0)
    .map((ex, idx) => ({
      order_id: orderId,
      description: buildExtraDescription(ex),
      quantity: ex.qty || 1,
      unit_price: Number(ex.unitPrice) || 0,
      sort_order: elementItems.length + idx,
      element_config: null,
    }))
  return [...elementItems, ...extraItems]
}

async function notifyLeadLabOfferte(order) {
  const secret = process.env.KOZIJNSUITE_WEBHOOK_SECRET
  if (!secret) return

  await fetch(LEADLAB_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret,
    },
    body: JSON.stringify({
      event: 'offerte_verzonden',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
    }),
  }).catch(() => {})
}

async function updateLead(request, supabase, seller) {
  const body = await request.json()
  const leadId = body.leadId
  if (!leadId) return Response.json({ error: 'leadId ontbreekt' }, { status: 400 })

  const updates = {}
  if (body.updates?.status !== undefined) {
    const status = String(body.updates.status)
    if (!VALID_LEAD_STATUSES.has(status)) return Response.json({ error: 'Ongeldige leadstatus' }, { status: 400 })
    updates.status = status
  }
  if (body.updates?.last_contact_at !== undefined) {
    const value = String(body.updates.last_contact_at || '')
    const timestamp = Date.parse(value)
    if (!Number.isFinite(timestamp)) return Response.json({ error: 'Ongeldige contactdatum' }, { status: 400 })
    updates.last_contact_at = new Date(timestamp).toISOString()
  }

  if (!Object.keys(updates).length) return Response.json({ error: 'Geen wijzigingen' }, { status: 400 })

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
    .eq('assigned_to', seller.username)
    .select('*')
    .single()
  if (error) throw error

  return Response.json({ success: true, lead: data })
}

async function createOrder(request, supabase, seller) {
  const body = await request.json()
  const kl = body.kozijnLab
  if (!kl || typeof kl !== 'object') return Response.json({ error: 'KozijnLAB payload ontbreekt' }, { status: 400 })

  let lead = null
  if (body.leadId) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', body.leadId)
      .eq('assigned_to', seller.username)
      .single()
    if (error) throw error
    lead = data
  }

  const c = kl.customer || {}
  const totalAmount = Number(kl.totals?.gross) || 0
  const address = [c.address, c.postcode, c.city].filter(Boolean).join(', ')
  const internalNotes = [
    `Verkoper: ${seller.name} (${seller.username})`,
    lead ? `Lead: ${lead.customer_name} (${lead.source_lead_id || lead.id})` : '',
    kl.project?.notes ? `Notities: ${kl.project.notes}` : '',
  ].filter(Boolean).join('\n')

  const { data: order, error } = await supabase.from('orders').insert({
    customer_name: c.name || 'Onbekend',
    customer_email: c.email || '',
    customer_phone: c.phone || '',
    customer_address: address,
    total_amount: totalAmount,
    phase: 0,
    montage_notes: kl.project?.notes || '',
    crm_reference: kl.offerCode || null,
    sales_owner: seller.username,
    internal_notes: internalNotes,
  }).select('*').single()
  if (error) throw error

  const items = buildOrderItems(order.id, kl)
  if (items.length) {
    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError
  }

  if (lead) {
    await supabase
      .from('leads')
      .update({ status: 'offerte', order_id: order.id })
      .eq('id', lead.id)
      .eq('assigned_to', seller.username)
    await notifyLeadLabOfferte(order)
  }

  await supabase.from('status_history').insert({
    order_id: order.id,
    to_phase: 0,
    note: `Aangemaakt vanuit verkoperportaal (${kl.offerCode || 'KozijnLAB'})`,
    changed_by: seller.name || 'verkoper',
  })

  return Response.json({ success: true, order })
}

export async function POST(request) {
  try {
    const seller = await verifyInternalRequest(request, ['verkoper'])
    if (!seller) return Response.json({ error: 'Niet bevoegd' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const supabase = createServiceSupabaseClient()

    if (action === 'update_lead') return updateLead(request, supabase, seller)
    if (action === 'create_order') return createOrder(request, supabase, seller)

    return Response.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('Seller action error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
