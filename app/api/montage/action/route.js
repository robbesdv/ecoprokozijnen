import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { verifyInternalRequest } from '@/lib/internal-auth'

const MONTEUR_PHASES = new Set([5, 6, 7])
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function safeFileName(name) {
  return String(name || 'bestand').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

async function fetchOrderForMonteur(supabase, orderId, username) {
  if (!orderId || !username) return null
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('assigned_monteur', username)
    .single()
  if (error) return null
  return data
}

async function fetchOrderForToken(supabase, orderId, token) {
  if (!orderId || !token) return null
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('montage_token', token)
    .single()
  if (error) return null
  return data
}

async function resolveUploadOrder(request, supabase, orderId, token) {
  if (token) {
    const order = await fetchOrderForToken(supabase, orderId, token)
    return order ? { order, uploadedBy: 'montage-link' } : null
  }

  const auth = await verifyInternalRequest(request, ['monteur'])
  if (!auth) return null

  const order = await fetchOrderForMonteur(supabase, orderId, auth.username)
  return order ? { order, uploadedBy: auth.username || 'monteur' } : null
}

async function prepareUploads(request, supabase) {
  const body = await request.json()
  const orderId = String(body.orderId || '')
  const token = String(body.token || '')
  const files = Array.isArray(body.files) ? body.files : []
  const resolved = await resolveUploadOrder(request, supabase, orderId, token)

  if (!resolved) return Response.json({ error: 'Order niet gevonden' }, { status: 404 })
  if (!files.length) return Response.json({ error: 'Geen bestanden' }, { status: 400 })

  const uploads = []
  for (const [index, file] of files.entries()) {
    const filename = String(file?.name || `bestand-${index + 1}`).slice(0, 200)
    const size = Number(file?.size || 0)
    if (!size) return Response.json({ error: `${filename} is leeg` }, { status: 400 })
    if (size > MAX_UPLOAD_BYTES) return Response.json({ error: `${filename} is groter dan 25 MB` }, { status: 400 })

    const storagePath = `montage/${resolved.order.id}/${Date.now()}-${index}-${safeFileName(filename)}`
    const { data, error } = await supabase.storage
      .from('order-files')
      .createSignedUploadUrl(storagePath)
    if (error) throw error

    uploads.push({
      filename,
      fileType: String(file?.type || 'application/octet-stream').slice(0, 200),
      storagePath,
      path: data.path || storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
    })
  }

  return Response.json({ success: true, uploads })
}

async function registerUploads(request, supabase) {
  const body = await request.json()
  const orderId = String(body.orderId || '')
  const token = String(body.token || '')
  const uploads = Array.isArray(body.uploads) ? body.uploads : []
  const resolved = await resolveUploadOrder(request, supabase, orderId, token)

  if (!resolved) return Response.json({ error: 'Order niet gevonden' }, { status: 404 })
  if (!uploads.length) return Response.json({ error: 'Geen uploads om te registreren' }, { status: 400 })

  const rows = uploads.map(upload => {
    const storagePath = String(upload.storagePath || upload.path || '')
    if (!storagePath.startsWith(`montage/${resolved.order.id}/`)) {
      throw new Error('Ongeldig uploadpad')
    }

    const { data: publicData } = supabase.storage.from('order-files').getPublicUrl(storagePath)
    return {
      order_id: resolved.order.id,
      filename: String(upload.filename || 'bestand').slice(0, 200),
      storage_path: storagePath,
      file_url: publicData.publicUrl,
      file_type: String(upload.fileType || 'application/octet-stream').slice(0, 200),
      uploaded_by: resolved.uploadedBy,
    }
  })

  const { data, error } = await supabase.from('montage_files').insert(rows).select('*')
  if (error) throw error

  return Response.json({ success: true, files: data || [] })
}

async function markAccessed(request, supabase) {
  const body = await request.json()
  const order = await fetchOrderForToken(supabase, body.orderId, body.token)
  if (!order) return Response.json({ error: 'Order niet gevonden' }, { status: 404 })

  const { error } = await supabase
    .from('orders')
    .update({ montage_accessed_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('montage_token', body.token)
  if (error) throw error

  return Response.json({ success: true })
}

async function updatePhase(request, supabase) {
  const auth = await verifyInternalRequest(request, ['monteur'])
  if (!auth) return Response.json({ error: 'Niet bevoegd' }, { status: 401 })

  const body = await request.json()
  const phase = Number(body.phase)
  if (!MONTEUR_PHASES.has(phase)) {
    return Response.json({ error: 'Ongeldige montagefase' }, { status: 400 })
  }

  const current = await fetchOrderForMonteur(supabase, body.orderId, auth.username)
  if (!current) return Response.json({ error: 'Order niet gevonden' }, { status: 404 })

  const now = new Date().toISOString()
  const updates = {
    phase,
    ...(phase === 6 ? { installation_done_at: current.installation_done_at || now } : {}),
    ...(phase === 7 ? { completed_at: current.completed_at || now } : {}),
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', current.id)
    .eq('assigned_monteur', auth.username)
    .select('*')
    .single()
  if (error) throw error

  if (Number(current.phase) !== phase) {
    await supabase.from('status_history').insert({
      order_id: current.id,
      from_phase: current.phase,
      to_phase: phase,
      changed_by: auth.name || 'monteur',
    })
  }

  return Response.json({ success: true, order: data })
}

async function completeHandover(request, supabase) {
  const auth = await verifyInternalRequest(request, ['monteur'])
  if (!auth) return Response.json({ error: 'Niet bevoegd' }, { status: 401 })

  const form = await request.formData()
  const orderId = String(form.get('orderId') || '')
  const name = String(form.get('naam') || '').trim().slice(0, 200)
  const points = String(form.get('punten') || '[]')
  const signature = form.get('signature')

  if (!name) return Response.json({ error: 'Naam ontbreekt' }, { status: 400 })
  if (!signature || typeof signature.arrayBuffer !== 'function') {
    return Response.json({ error: 'Handtekening ontbreekt' }, { status: 400 })
  }

  const current = await fetchOrderForMonteur(supabase, orderId, auth.username)
  if (!current) return Response.json({ error: 'Order niet gevonden' }, { status: 404 })

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      oplevering_naam: name,
      oplevering_signed_at: now,
      oplevering_punten: points,
      phase: 7,
      completed_at: current.completed_at || now,
    })
    .eq('id', current.id)
    .eq('assigned_monteur', auth.username)
    .select('*')
    .single()
  if (error) throw error

  if (Number(current.phase) !== 7) {
    await supabase.from('status_history').insert({
      order_id: current.id,
      from_phase: current.phase,
      to_phase: 7,
      changed_by: auth.name || 'monteur-opleverbon',
    })
  }

  const path = `${current.id}/opleverbon-handtekening.png`
  const { error: uploadError } = await supabase.storage
    .from('order-files')
    .upload(path, signature, { upsert: true, contentType: 'image/png' })
  if (uploadError) throw uploadError

  const { data: publicData } = supabase.storage.from('order-files').getPublicUrl(path)
  const { error: fileError } = await supabase.from('order_files').upsert({
    order_id: current.id,
    filename: 'Opleverbon - handtekening.png',
    storage_path: path,
    file_url: publicData.publicUrl,
    file_type: 'image/png',
  }, { onConflict: 'storage_path' })
  if (fileError) throw fileError

  return Response.json({ success: true, order: updated })
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const supabase = createServiceSupabaseClient()

    if (action === 'mark_accessed') return markAccessed(request, supabase)
    if (action === 'update_phase') return updatePhase(request, supabase)
    if (action === 'prepare_uploads') return prepareUploads(request, supabase)
    if (action === 'register_uploads') return registerUploads(request, supabase)
    if (action === 'complete_handover') return completeHandover(request, supabase)

    return Response.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('Montage action error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
