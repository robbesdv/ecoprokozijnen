import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { verifyInternalRequest } from '@/lib/internal-auth'

const PANE_LABEL = {
  vast: 'vast glas',
  draai: 'draai',
  kiep: 'kiep',
  draaikiep: 'draai-kiep',
  vent: 'ventilatie',
  deur: 'deur',
  deur2: 'dubbele deur',
  schuif: 'schuif',
  glas: 'glas',
  paneel: 'paneel',
}

function glassFinishLabel(value) {
  const map = { satinato: 'Satinato', milk: 'Melkglas', melkglas: 'Melkglas', solar: 'Zonwerend' }
  return map[String(value || '').toLowerCase()] || ''
}

function buildItemDescription(el) {
  const cols = el.columns || []
  const allRows = cols.flatMap(c => c.rows || [])
  const doorPanels = el.type === 'deur' && Array.isArray(el.doorPanels) ? el.doorPanels : []
  const nVaks = doorPanels.length || allRows.length || 1
  const seenTypes = []
  const typeRows = doorPanels.length
    ? doorPanels.map(panel => ({ paneType: panel.fill === 'glass' ? 'glas' : 'paneel' }))
    : allRows

  typeRows.forEach(row => {
    const label = PANE_LABEL[row.paneType] || row.paneType
    if (label && !seenTypes.includes(label)) seenTypes.push(label)
  })

  const isDoorLeafRow = row => el.type === 'deur' && doorPanels.length > 0 && ['deur', 'deur2'].includes(row.paneType)
  const glassRows = [...allRows.filter(row => row.fill !== 'panel' && !isDoorLeafRow(row)), ...doorPanels.filter(row => row.fill === 'glass')]
  const panelRows = [...allRows.filter(row => row.fill === 'panel' && !isDoorLeafRow(row)), ...doorPanels.filter(row => row.fill === 'panel')]
  const packRank = { 'HR+++': 3, 'HR++': 2, 'HR+': 1 }
  const rawPacks = [...new Set(glassRows.map(row => row.glassPack?.trim()).filter(Boolean))]
  const maxRank = Math.max(0, ...rawPacks.map(pack => packRank[pack] ?? 0))
  const glassPacks = maxRank > 0 ? rawPacks.filter(pack => (packRank[pack] ?? 0) === maxRank) : rawPacks
  const panelPacks = [...new Set(panelRows.map(row => row.panelPack || 'HR++'))]
  const glassFinishes = [...new Set(glassRows.map(row => glassFinishLabel(row.glassFinish)).filter(Boolean))]
  const extras = [
    ...glassFinishes,
    ...(panelPacks.length ? [`Paneel: ${panelPacks.join('/')}`] : []),
    ...(allRows.some(row => row.paneType === 'draaikiep' && row.padk) ? ['PADK ventilatiestand'] : []),
  ]
  const glassStr = [glassRows.length > 0 ? (glassPacks.length > 0 ? glassPacks.join('/') : 'HR++') : null, ...extras].filter(Boolean).join(', ') || 'HR++'
  const width = el.dimensions?.widthMM
  const height = el.dimensions?.heightMM
  const colorCode = el.finish?.colorOutside || ''

  return `Premium Schuco Living Variant ${nVaks}-vaks, ${seenTypes.join(' / ') || 'vast glas'}, ${width} x ${height}mm bxh, Kleur: ${colorCode}, ${glassStr}`
}

function buildExtraDescription(extra) {
  const name = String(extra?.name || '').trim()
  return `Extra: ${name || 'Project extra'}`
}

function buildOrderItems(orderId, kozijnLab) {
  const elementItems = (kozijnLab.elements || []).map((element, index) => ({
    order_id: orderId,
    description: buildItemDescription(element),
    quantity: element.qty || 1,
    unit_price: Number(element.pricePerUnit) || 0,
    sort_order: index,
    element_config: element,
  }))

  const extraItems = (kozijnLab.extras || [])
    .filter(extra => String(extra.name || '').trim() || Number(extra.unitPrice) > 0)
    .map((extra, index) => ({
      order_id: orderId,
      description: buildExtraDescription(extra),
      quantity: extra.qty || 1,
      unit_price: Number(extra.unitPrice) || 0,
      sort_order: elementItems.length + index,
      element_config: null,
    }))

  return [...elementItems, ...extraItems]
}

function orderFieldsFromKozijnLab(kozijnLab) {
  const customer = kozijnLab.customer || {}
  const address = [customer.address, customer.postcode, customer.city].filter(Boolean).join(', ')
  return {
    customer_name: customer.name || 'Onbekend',
    customer_email: customer.email || '',
    customer_phone: customer.phone || '',
    customer_address: address,
    total_amount: Number(kozijnLab.totals?.gross) || 0,
    montage_notes: kozijnLab.project?.notes || '',
    crm_reference: kozijnLab.offerCode || null,
  }
}

async function fetchOrder(supabase, orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (error) throw error
  return data
}

function canEditInKozijnLab(order) {
  return Number(order?.phase || 0) === 0 && !order?.quote_accepted_at
}

async function savePrices(request, supabase) {
  const body = await request.json()
  const orderId = body.orderId
  const prices = Array.isArray(body.prices) ? body.prices : []
  if (!orderId) return Response.json({ error: 'orderId ontbreekt' }, { status: 400 })
  if (!prices.length) return Response.json({ error: 'Geen prijzen ontvangen' }, { status: 400 })

  const itemIds = prices.map(item => item.itemId).filter(Boolean)
  if (!itemIds.length) return Response.json({ error: 'Geen geldige offerteregels' }, { status: 400 })

  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .in('id', itemIds)
  if (itemError) throw itemError
  if ((items || []).length !== itemIds.length) {
    return Response.json({ error: 'Een of meer offerteregels horen niet bij deze order' }, { status: 400 })
  }

  const priceById = new Map()
  for (const item of prices) {
    const value = Number(item.unitPrice)
    if (!Number.isFinite(value) || value < 0) return Response.json({ error: 'Ongeldige prijs' }, { status: 400 })
    priceById.set(item.itemId, Math.round(value * 100) / 100)
  }

  for (const item of items) {
    const { error } = await supabase
      .from('order_items')
      .update({ unit_price: priceById.get(item.id) })
      .eq('id', item.id)
      .eq('order_id', orderId)
    if (error) throw error
  }

  const newExcl = items.reduce((sum, item) => sum + (priceById.get(item.id) || 0) * (item.quantity || 1), 0)
  const newTotal = Math.round(newExcl * 1.21 * 100) / 100
  const { data: order, error } = await supabase
    .from('orders')
    .update({ total_amount: newTotal })
    .eq('id', orderId)
    .select('*')
    .single()
  if (error) throw error

  return Response.json({ success: true, order, totalAmount: newTotal })
}

async function updateFromKozijnLab(request, supabase) {
  const body = await request.json()
  const orderId = body.orderId
  const kozijnLab = body.kozijnLab
  if (!orderId) return Response.json({ error: 'orderId ontbreekt' }, { status: 400 })
  if (!kozijnLab || typeof kozijnLab !== 'object') return Response.json({ error: 'KozijnLAB payload ontbreekt' }, { status: 400 })

  const current = await fetchOrder(supabase, orderId)
  if (!canEditInKozijnLab(current)) {
    return Response.json({ error: 'Deze offerte is al geaccordeerd en kan niet meer worden aangepast' }, { status: 409 })
  }

  const updates = orderFieldsFromKozijnLab(kozijnLab)
  const { data: oldItems, error: oldItemsError } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
  if (oldItemsError) throw oldItemsError

  const { data: order, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()
  if (error) throw error

  const items = buildOrderItems(orderId, kozijnLab)
  if (items.length) {
    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError
  }

  const oldItemIds = (oldItems || []).map(item => item.id)
  if (oldItemIds.length) {
    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .in('id', oldItemIds)
    if (deleteItemsError) throw deleteItemsError
  }

  await supabase.from('status_history').insert({
    order_id: orderId,
    to_phase: current.phase ?? 0,
    note: `Offerte bijgewerkt vanuit KozijnLAB (${kozijnLab.offerCode || order.crm_reference || 'zonder offertenummer'})`,
    changed_by: 'verkoop',
  })

  return Response.json({ success: true, order, previous: current })
}

async function createFromKozijnLab(request, supabase) {
  const body = await request.json()
  const kozijnLab = body.kozijnLab
  if (!kozijnLab || typeof kozijnLab !== 'object') return Response.json({ error: 'KozijnLAB payload ontbreekt' }, { status: 400 })

  const fields = orderFieldsFromKozijnLab(kozijnLab)
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      ...fields,
      phase: 0,
    })
    .select('*')
    .single()
  if (error) throw error

  const items = buildOrderItems(order.id, kozijnLab)
  if (items.length) {
    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError
  }

  await supabase.from('status_history').insert({
    order_id: order.id,
    to_phase: 0,
    note: `Aangemaakt vanuit KozijnLAB (${kozijnLab.offerCode || order.crm_reference || 'zonder offertenummer'})`,
    changed_by: 'verkoop',
  })

  return Response.json({ success: true, order })
}

export async function POST(request) {
  try {
    const auth = await verifyInternalRequest(request, ['admin'])
    if (!auth) return Response.json({ error: 'Niet bevoegd' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const supabase = createServiceSupabaseClient()

    if (action === 'save_prices') return savePrices(request, supabase)
    if (action === 'update_from_kozijnlab') return updateFromKozijnLab(request, supabase)
    if (action === 'create_from_kozijnlab') return createFromKozijnLab(request, supabase)

    return Response.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('Admin sales action error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
