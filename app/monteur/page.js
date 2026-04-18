'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase, formatDate, formatDateShort } from '@/lib/phases'

const FASE_LABELS = {
  4: 'Geleverd bij EcoPro',
  5: 'Montage ingepland',
  6: 'Montage afgerond',
}

export default function MonteurPage() {
  const [orders, setOrders]         = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [user, setUser]             = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [toast, setToast]           = useState(null)
  const [filter, setFilter]         = useState('actief') // actief | compleet

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.ok) setUser(d)
        else window.location.href = '/beheer/login'
      })
      .catch(() => window.location.href = '/beheer/login')
  }, [])

  const loadOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), order_files(*), montage_files(*), defects(*)')
      .eq('assigned_monteur', user.username)
      .order('installation_date', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' })
    window.location.href = '/beheer/login'
  }

  async function updatePhase(orderId, newPhase) {
    const { error } = await supabase.from('orders').update({ 
      phase: newPhase,
      ...(newPhase === 6 ? { installation_done_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    if (error) { showToast('Fout: ' + error.message, 'error'); return }
    await supabase.from('status_history').insert({ 
      order_id: orderId, to_phase: newPhase, changed_by: user?.name || 'monteur' 
    })
    showToast('Status bijgewerkt')
    loadOrders()
    if (selected?.id === orderId) {
      const { data } = await supabase.from('orders').select('*, order_items(*), order_files(*), montage_files(*), defects(*)').eq('id', orderId).single()
      if (data) setSelected(data)
    }
  }

  async function uploadPhoto(e, orderId) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `montage/${orderId}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
      if (upErr) { showToast('Upload mislukt: ' + upErr.message, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('montage_files').insert({
        order_id: orderId, filename: file.name, storage_path: path,
        file_url: publicUrl, file_type: file.type, uploaded_by: user?.username || 'monteur',
      })
    }
    setUploading(false)
    showToast(`${files.length} bestand${files.length !== 1 ? 'en' : ''} geüpload`)
    loadOrders()
    if (selected?.id === orderId) {
      const { data } = await supabase.from('orders').select('*, order_items(*), order_files(*), montage_files(*), defects(*)').eq('id', orderId).single()
      if (data) setSelected(data)
    }
    e.target.value = ''
  }

  const actief    = orders.filter(o => o.phase < 7)
  const compleet  = orders.filter(o => o.phase >= 7)
  const visible   = filter === 'actief' ? actief : compleet

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1A3A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0F2318', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: '#1A3A2A', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 3 }} />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>EcoPro Kozijnen</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montage Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 20, padding: '4px 14px', color: '#C8A96E', fontSize: 13, fontWeight: 600 }}>
              {user.name}
            </div>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      {/* Stats balk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: '#1A3A2A', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {[
          { label: 'Actieve opdrachten', value: actief.length },
          { label: 'Ingepland', value: actief.filter(o => o.installation_date).length },
          { label: 'Afgerond', value: compleet.length },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 20px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', background: '#1A3A2A', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {[
          { key: 'actief', label: `Actief (${actief.length})` },
          { key: 'compleet', label: `Afgerond (${compleet.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filter === t.key ? 700 : 400, background: 'none', color: filter === t.key ? '#C8A96E' : 'rgba(255,255,255,0.4)', borderBottom: filter === t.key ? '2px solid #C8A96E' : '2px solid transparent', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lijst + detail */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Orderlijst */}
        <div style={{ width: selected ? 320 : '100%', flexShrink: 0, overflowY: 'auto', background: '#1A3A2A' }}>
          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
          )}
          {!loading && visible.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              {filter === 'actief' ? 'Geen actieve opdrachten.' : 'Nog geen afgeronde opdrachten.'}
            </div>
          )}
          {visible.map(order => {
            const isSelected = selected?.id === order.id
            const openDefs = (order.defects || []).filter(d => d.status === 'open').length
            return (
              <div key={order.id}
                onClick={() => setSelected(isSelected ? null : order)}
                style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', background: isSelected ? 'rgba(200,169,110,0.1)' : 'transparent', borderLeft: isSelected ? '3px solid #C8A96E' : '3px solid transparent', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(200,169,110,0.1)' : 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>{order.customer_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>📍 {order.customer_address}</div>
                  </div>
                  <PhaseBadgeMonteur phase={order.phase} />
                </div>
                {order.installation_date && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#C8A96E' }}>📅</span>
                    <span style={{ fontSize: 12, color: '#C8A96E', fontWeight: 500 }}>
                      {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                {openDefs > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#FCD34D', fontWeight: 500 }}>⚠ {openDefs} open bevinding{openDefs !== 1 ? 'en' : ''}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Detail paneel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#0F2318', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <OrderDetail
              order={selected}
              onClose={() => setSelected(null)}
              onUpdatePhase={updatePhase}
              onUploadPhoto={uploadPhoto}
              uploading={uploading}
              showToast={showToast}
              user={user}
            />
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#1A1A1A', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function OrderDetail({ order, onClose, onUpdatePhase, onUploadPhoto, uploading, showToast, user }) {
  const items       = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const orderFiles  = order.order_files || []
  const montageFiles = order.montage_files || []
  const defects     = order.defects || []
  const openDefs    = defects.filter(d => d.status === 'open')

  const canAdvance = order.phase === 5
  const canComplete = order.phase === 6

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{order.customer_name}</h2>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>📍 {order.customer_address}</div>
          {order.customer_phone && <a href={`tel:${order.customer_phone}`} style={{ color: '#C8A96E', fontSize: 13, textDecoration: 'none', marginTop: 4, display: 'block' }}>📞 {order.customer_phone}</a>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>✕</button>
      </div>

      {/* Montagedatum + Google Maps */}
      <div style={{ display: 'grid', gridTemplateColumns: order.installation_date ? '1fr auto' : '1fr', gap: 10, marginBottom: 16 }}>
        {order.installation_date && (
          <div style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Montagedatum</div>
              <div style={{ color: '#C8A96E', fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
        )}
        {order.customer_address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '14px 18px', textDecoration: 'none', minWidth: 80 }}>
            <span style={{ fontSize: 24 }}>🗺</span>
            <span style={{ color: '#93C5FD', fontSize: 11, fontWeight: 600 }}>Route</span>
          </a>
        )}
      </div>

      {/* WhatsApp EcoPro */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <a href="tel:+31850492456" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          📞 EcoPro bellen
        </a>
        <a href="https://wa.me/31850492456" target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#6EE7B7', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          💬 WhatsApp
        </a>
      </div>

      {/* Status actie knoppen */}
      {canAdvance && (
        <button
          onClick={() => onUpdatePhase(order.id, 6)}
          style={{ width: '100%', padding: '14px', background: '#C8A96E', color: '#1A3A2A', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit' }}>
          ✓ Montage afgerond markeren
        </button>
      )}
      {canComplete && (
        <button
          onClick={() => onUpdatePhase(order.id, 7)}
          style={{ width: '100%', padding: '14px', background: '#16A34A', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit' }}>
          ✓ Oplevering compleet
        </button>
      )}

      {/* Open bevindingen */}
      {openDefs.length > 0 && (
        <MSection title="Open bevindingen" icon="⚠">
          {openDefs.map(d => (
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {d.description}
            </div>
          ))}
        </MSection>
      )}

      {/* Notities van EcoPro */}
      {order.montage_notes && (
        <MSection title="Notities van EcoPro" icon="📝">
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{order.montage_notes}</p>
        </MSection>
      )}

      {/* Checklist */}
      <MSection title="Werkchecklist" icon="✅">
        {[
          'Gereedschap en materialen aanwezig',
          'Klant op de hoogte gesteld van aankomst',
          'Situatie voor montage gefotografeerd',
          'Oude kozijnen verwijderd',
          'Nieuwe kozijnen geplaatst en waterpas',
          'Afdichting en kitwerk afgerond',
          'Schoongemaakt en afval afgevoerd',
          'Klant akkoord gegeven na inspectie',
        ].map((item, idx) => (
          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#C8A96E', cursor: 'pointer' }} />
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item}</span>
          </label>
        ))}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Checklist wordt lokaal bijgehouden</p>
      </MSection>

      {/* Kozijnen specificaties — ZONDER PRIJZEN */}
      <MSection title="Kozijnen & specificaties" icon="🪟">
        {items.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Nog geen specificaties.</p>
        ) : items.map((item, idx) => (
          <div key={item.id} style={{ padding: '10px 0', borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{item.description}</div>
            {item.quantity > 1 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Aantal: {item.quantity}</div>}
          </div>
        ))}
      </MSection>

      {/* Tekeningen & documenten van EcoPro */}
      {orderFiles.length > 0 && (
        <MSection title="Tekeningen & documenten" icon="📐">
          {orderFiles.map((f, idx) => {
            const isImage = f.file_type?.startsWith('image/')
            return (
              <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < orderFiles.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>{isImage ? '🖼' : '📄'}</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 500, fontSize: 13 }}>{f.filename}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>Openen →</div>
                </div>
              </a>
            )
          })}
        </MSection>
      )}

      {/* Foto's uploaden */}
      <MSection title="Foto's uploaden" icon="📷">
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 14 }}>
          <input type="file" onChange={e => onUploadPhoto(e, order.id)} style={{ display: 'none' }} accept="image/*,.pdf" multiple />
          {uploading ? '⏳ Uploaden…' : '📎 Foto\'s toevoegen'}
        </label>

        {montageFiles.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', margin: 0 }}>Nog geen foto's geüpload.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {montageFiles.map(f => {
              const isImage = f.file_type?.startsWith('image/')
              return (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', textDecoration: 'none' }}>
                  {isImage
                    ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📄</div>
                  }
                  <div style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                </a>
              )
            })}
          </div>
        )}
      </MSection>

      {/* Opleverbon */}
      <OpleverBon order={order} showToast={showToast} />
    </div>
  )
}

function OpleverBon({ order, showToast }) {
  const PUNTEN = [
    'Alle kozijnen zijn geplaatst conform de opdracht',
    'Kozijnen zijn waterpas en haaks geplaatst',
    'Afdichting en kitwerk is correct aangebracht',
    'Hang- en sluitwerk functioneert correct',
    'Glas is vrij van beschadigingen en krassen',
    'Vensterbanken en dorpels zijn correct geplaatst',
    'Werkplek is schoongemaakt en afval afgevoerd',
    'Klant heeft de kozijnen geïnspecteerd en akkoord bevonden',
  ]

  const [checked,   setChecked]   = useState({})
  const [naam,      setNaam]      = useState('')
  const [signed,    setSigned]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(!!order.oplevering_signed_at)
  const canvasRef                 = useRef(null)
  const drawing                   = useRef(false)
  const lastPos                   = useRef(null)

  const allChecked = PUNTEN.every((_, i) => checked[i])

  function toggleCheck(i) {
    setChecked(p => ({ ...p, [i]: !p[i] }))
  }

  function startDraw(e) {
    drawing.current = true
    const pos = getPos(e)
    lastPos.current = pos
  }

  function draw(e) {
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#C8A96E'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function stopDraw() { drawing.current = false }

  function getPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0] || e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
  }

  function checkSigned() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const hasPixels = Array.from(data).some((v, i) => i % 4 === 3 && v > 0)
    setSigned(hasPixels)
    return hasPixels
  }

  async function submit() {
    if (!allChecked) { showToast('Vink alle punten af', 'error'); return }
    if (!naam.trim()) { showToast('Vul de naam van de klant in', 'error'); return }
    if (!checkSigned()) { showToast('Handtekening ontbreekt', 'error'); return }
    setSaving(true)
    const canvas = canvasRef.current
    const sigData = canvas.toDataURL('image/png')
    const now = new Date().toISOString()
    await supabase.from('orders').update({
      oplevering_naam: naam,
      oplevering_signed_at: now,
      oplevering_punten: JSON.stringify(PUNTEN),
      phase: 7,
      completed_at: now,
    }).eq('id', order.id)
    // Upload handtekening als bestand
    const blob = await fetch(sigData).then(r => r.blob())
    const path = `${order.id}/opleverbon-handtekening.png`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, blob, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('order_files').upsert({
        order_id: order.id,
        filename: 'Opleverbon – handtekening.png',
        storage_path: path,
        file_url: publicUrl,
        file_type: 'image/png',
      }, { onConflict: 'storage_path' })
    }
    setSaving(false)
    setDone(true)
    showToast('Opleverbon opgeslagen & order afgerond!')
  }

  if (done || order.oplevering_signed_at) {
    return (
      <MSection title="Opleverbon" icon="📋">
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ color: '#6EE7B7', fontWeight: 700, fontSize: 15 }}>Opleverbon ondertekend</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            {order.oplevering_naam} · {order.oplevering_signed_at ? new Date(order.oplevering_signed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>Zichtbaar voor klant in het portaal</div>
        </div>
      </MSection>
    )
  }

  return (
    <MSection title="Opleverbon" icon="📋">
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        Loop samen met de klant de punten door. Vink alles af, laat de klant tekenen en sla op. De bon verschijnt automatisch in het klantportaal.
      </p>

      {/* Checklist */}
      <div style={{ marginBottom: 18 }}>
        {PUNTEN.map((punt, i) => (
          <label key={i} onClick={() => toggleCheck(i)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', marginBottom: 6, borderRadius: 8, border: `1px solid ${checked[i] ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`, background: checked[i] ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked[i] ? '#6EE7B7' : 'rgba(255,255,255,0.2)'}`, background: checked[i] ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
              {checked[i] && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ color: checked[i] ? '#6EE7B7' : 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4 }}>{punt}</span>
          </label>
        ))}
      </div>

      {/* Naam klant */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Naam klant</div>
        <input
          type="text"
          value={naam}
          onChange={e => setNaam(e.target.value)}
          placeholder="Volledige naam klant…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* Handtekening */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Handtekening klant</div>
          <button onClick={clearCanvas} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Wissen</button>
        </div>
        <canvas
          ref={canvasRef}
          width={400} height={140}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={e => { e.preventDefault(); startDraw(e) }}
          onTouchMove={e => { e.preventDefault(); draw(e) }}
          onTouchEnd={stopDraw}
          style={{ width: '100%', height: 140, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', display: 'block' }}
        />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>Laat de klant hier tekenen met de vinger of stylus</p>
      </div>

      <button onClick={submit} disabled={saving || !allChecked}
        style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: allChecked ? 'linear-gradient(135deg, #C8A96E, #B8956A)' : 'rgba(255,255,255,0.08)', color: allChecked ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: allChecked ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s' }}>
        {saving ? 'Opslaan…' : '📋 Opleverbon opslaan & order afronden'}
      </button>
    </MSection>
  )
}

function PhaseBadgeMonteur({ phase }) {
  const colors = {
    4: { bg: 'rgba(59,130,246,0.15)', color: '#93C5FD', label: 'Geleverd' },
    5: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', label: 'Ingepland' },
    6: { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7', label: 'Afgerond' },
    7: { bg: 'rgba(22,163,74,0.15)', color: '#86EFAC', label: 'Compleet' },
  }

  const c = colors[phase] || {
    bg: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.5)',
    label: getPhase(phase).adminLabel,
  }

  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

function MSection({ title, icon, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}
