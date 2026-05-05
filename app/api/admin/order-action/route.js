import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { verifyInternalRequest } from '@/lib/internal-auth'

const ALLOWED_PHASES = new Set([0, 1, 2, 3, 4, 5, 6, 7])
const ALLOWED_SPLITS = new Set(['pending', 'full_80', 'split_70_10'])
const ALLOWED_MONTEURS = new Set(['', 'rudy', 'vida', 'matthew', 'kay'])

function cleanDate(value) {
  const date = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

function cleanBool(value) {
  return Boolean(value)
}

async function fetchOrder(supabase, orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_files(*), defects(*)')
    .eq('id', orderId)
    .single()
  if (error) throw error
  return data
}

async function updateOrder(request, supabase, orderId) {
  const current = await fetchOrder(supabase, orderId)
  const body = await request.json()

  const phase = Number(body.phase)
  if (!ALLOWED_PHASES.has(phase)) {
    return Response.json({ error: 'Ongeldige fase' }, { status: 400 })
  }

  const paymentSplit = String(body.paymentSplit || 'pending')
  if (!ALLOWED_SPLITS.has(paymentSplit)) {
    return Response.json({ error: 'Ongeldige betaalkeuze' }, { status: 400 })
  }

  const monteur = String(body.assignedMonteur || '')
  if (!ALLOWED_MONTEURS.has(monteur)) {
    return Response.json({ error: 'Ongeldige monteur' }, { status: 400 })
  }

  const updates = {
    phase,
    payment_split: paymentSplit,
    montage_notes: String(body.montageNotes || '').slice(0, 4000),
    assigned_monteur: monteur || null,
    deposit_confirmed: cleanBool(body.depositConfirmed),
    main_payment_confirmed: cleanBool(body.mainPaymentConfirmed),
    final_payment_confirmed: cleanBool(body.finalPaymentConfirmed),
    installation_date: cleanDate(body.installationDate),
    factory_delivery_expected: cleanDate(body.factoryDeliveryExpected),
  }

  const now = new Date().toISOString()
  if (phase >= 3 && !current.factory_ordered_at) updates.factory_ordered_at = now
  if (phase === 6 && !current.installation_done_at) updates.installation_done_at = now
  if (phase === 7 && !current.completed_at) updates.completed_at = now

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()
  if (error) throw error

  if (phase !== Number(current.phase)) {
    await supabase.from('status_history').insert({
      order_id: orderId,
      from_phase: current.phase,
      to_phase: phase,
      changed_by: 'beheer',
    })
  }

  return Response.json({ success: true, order: data, previous: current })
}

async function resolveDefect(request, supabase, orderId) {
  const body = await request.json()
  const defectId = body.defectId
  if (!defectId) return Response.json({ error: 'defectId ontbreekt' }, { status: 400 })

  const { data: defect, error: defectError } = await supabase
    .from('defects')
    .select('*')
    .eq('id', defectId)
    .eq('order_id', orderId)
    .single()
  if (defectError) throw defectError

  const { error } = await supabase
    .from('defects')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', defectId)
    .eq('order_id', orderId)
  if (error) throw error

  const { data: openDefects } = await supabase
    .from('defects')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'open')

  return Response.json({ success: true, defect, remainingOpen: openDefects?.length || 0 })
}

async function deleteFile(request, supabase, orderId) {
  const body = await request.json()
  const fileId = body.fileId
  if (!fileId) return Response.json({ error: 'fileId ontbreekt' }, { status: 400 })

  const { data: file, error: fileError } = await supabase
    .from('order_files')
    .select('*')
    .eq('id', fileId)
    .eq('order_id', orderId)
    .single()
  if (fileError) throw fileError

  if (file.storage_path) await supabase.storage.from('order-files').remove([file.storage_path])

  const { error } = await supabase
    .from('order_files')
    .delete()
    .eq('id', fileId)
    .eq('order_id', orderId)
  if (error) throw error

  return Response.json({ success: true })
}

async function deleteOrder(supabase, orderId) {
  const current = await fetchOrder(supabase, orderId)
  const filePaths = (current.order_files || []).map(file => file.storage_path).filter(Boolean)
  if (filePaths.length) await supabase.storage.from('order-files').remove(filePaths)

  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) throw error

  return Response.json({ success: true })
}

export async function POST(request) {
  try {
    const auth = await verifyInternalRequest(request, ['admin'])
    if (!auth) return Response.json({ error: 'Niet bevoegd' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const orderId = searchParams.get('orderId')
    if (!orderId) return Response.json({ error: 'orderId ontbreekt' }, { status: 400 })

    const supabase = createServiceSupabaseClient()

    if (action === 'update') return updateOrder(request, supabase, orderId)
    if (action === 'resolve_defect') return resolveDefect(request, supabase, orderId)
    if (action === 'delete_file') return deleteFile(request, supabase, orderId)
    if (action === 'delete_order') return deleteOrder(supabase, orderId)

    return Response.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('Admin order action error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
