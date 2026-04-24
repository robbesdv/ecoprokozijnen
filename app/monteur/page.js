'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getPhase } from '@/lib/phases'

export default function MonteurPage() {
  const [orders, setOrders]       = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [user, setUser]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]         = useState(null)
  const [filter, setFilter]       = useState('actief')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { if (d.ok) setUser(d); else window.location.href = '/beheer/login' })
      .catch(() => { window.location.href = '/beheer/login' })
  }, [])

  const loadOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), order_files(*), montage_files(*), defects(*)')
      .eq('assigned_monteur', user.username)
      .order('installation_date', { ascending: true, nullsLast: true })
    setOrders(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('monteur-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, loadOrders])

  useEffect(() => {
    if (selected) {
      const updated = orders.find(o => o.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [orders]) // eslint-disable-line

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' })
    window.location.href = '/beheer/login'
  }

  async function updatePhase(orderId, newPhase) {
    const prevPhase = orders.find(o => o.id === orderId)?.phase
    await supabase.from('orders').update({
      phase: newPhase,
      ...(newPhase === 6 ? { installation_done_at: new Date().toISOString() } : {}),
      ...(newPhase === 7 ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    if (prevPhase !== undefined) {
      await supabase.from('status_history').insert({ order_id: orderId, from_phase: prevPhase, to_phase: newPhase, changed_by: user?.name || 'monteur' })
    }
    showToast('Status bijgewerkt')
    loadOrders()
  }

  async function uploadPhotos(e, orderId) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    let ok = 0
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `montage/${orderId}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
      if (upErr) { showToast('Upload mislukt: ' + upErr.message, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('montage_files').insert({
        order_id: orderId, filename: file.name, storage_path: path,
        file_url: publicUrl, file_type: file.type, uploaded_by: user?.username || 'monteur',
      })
      ok++
    }
    setUploading(false)
    if (ok > 0) showToast(`${ok} foto${ok !== 1 ? "'s" : ''} geüpload`)
    loadOrders()
    e.target.value = ''
  }

  const todayStr  = new Date().toISOString().slice(0, 10)
  const actief    = orders.filter(o => o.phase < 7)
  const compleet  = orders.filter(o => o.phase >= 7)
  const vandaag   = orders.filter(o => o.installation_date?.startsWith(todayStr))
  const openPunten = orders.reduce((s, o) => s + (o.defects || []).filter(d => d.status === 'open').length, 0)

  let visible = (filter === 'compleet' ? compleet : filter === 'vandaag' ? vandaag : actief)
  if (search) {
    const q = search.toLowerCase()
    visible = visible.filter(o => o.customer_name?.toLowerCase().includes(q) || o.customer_address?.toLowerCase().includes(q))
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0F2318', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner color="rgba(255,255,255,0.4)" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0F2318', fontFamily: '-apple-system,BlinkMacSystemFont,"Inter",sans-serif', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: '#152318', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 58 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 34, height: 34, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }} />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>EcoPro Kozijnen</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montage Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 20, padding: '5px 14px', color: '#C8A96E', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {user.name}
            </div>
            <button onClick={logout}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}>
              ↩ Uitloggen
            </button>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <div style={{ background: '#152318', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Vandaag',       value: vandaag.length,  accent: vandaag.length > 0 ? '#C8A96E' : 'rgba(255,255,255,0.15)',  sub: 'Op locatie',          onClick: () => setFilter('vandaag') },
            { label: 'Actieve orders',value: actief.length,   accent: '#3B82F6',                                                   sub: 'Lopende opdrachten',  onClick: () => setFilter('actief') },
            { label: 'Afgerond',      value: compleet.length, accent: '#10B981',                                                   sub: 'Voltooide montages',  onClick: () => setFilter('compleet') },
            { label: 'Open punten',   value: openPunten,      accent: openPunten > 0 ? '#ef4444' : 'rgba(255,255,255,0.15)',       sub: 'Bevindingen klant',   warn: openPunten > 0 },
          ].map(s => (
            <div key={s.label} onClick={s.onClick}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${s.accent}`, borderRadius: 12, padding: '12px 14px', cursor: s.onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
              onMouseEnter={e => s.onClick && (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
              onMouseLeave={e => s.onClick && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: s.warn ? s.accent : 'white' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + search */}
      <div style={{ background: '#152318', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {[
            { key: 'vandaag',  label: `Vandaag${vandaag.length > 0 ? ` (${vandaag.length})` : ''}` },
            { key: 'actief',   label: `Actief (${actief.length})` },
            { key: 'compleet', label: `Afgerond (${compleet.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: '11px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filter === t.key ? 700 : 400, background: 'none', color: filter === t.key ? '#C8A96E' : 'rgba(255,255,255,0.4)', borderBottom: filter === t.key ? '2px solid #C8A96E' : '2px solid transparent', fontFamily: 'inherit', transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoeken…"
            style={{ width: '100%', paddingLeft: 32, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8, padding: '7px 12px 7px 32px', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Lijst + detail */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Orderlijst */}
        <div style={{ width: selected ? 300 : '100%', maxWidth: selected ? 300 : undefined, flexShrink: 0, overflowY: 'auto', background: '#152318', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.35)' }}>
              <Spinner />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              {filter === 'vandaag' ? '— Geen montages vandaag —' : filter === 'compleet' ? 'Nog geen afgeronde opdrachten.' : 'Geen actieve opdrachten.'}
            </div>
          ) : (
            visible.map(order => <OrderKaart key={order.id} order={order} isSelected={selected?.id === order.id} onClick={() => setSelected(s => s?.id === order.id ? null : order)} todayStr={todayStr} />)
          )}
        </div>

        {/* Detail paneel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#0F2318' }}>
            <OrderDetail
              order={selected}
              onClose={() => setSelected(null)}
              onUpdatePhase={updatePhase}
              onUploadPhotos={uploadPhotos}
              uploading={uploading}
              showToast={showToast}
              user={user}
              onRefresh={loadOrders}
            />
          </div>
        )}

        {!selected && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 14, flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>🔧</div>
            Selecteer een opdracht
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#1A1A1A', color: 'white', padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Order kaart in lijst ─────────────────────────────────────────────────────

function OrderKaart({ order, isSelected, onClick, todayStr }) {
  const isVandaag = order.installation_date?.startsWith(todayStr)
  const openDefs  = (order.defects || []).filter(d => d.status === 'open').length
  const fase      = FASE_BADGE[order.phase]

  return (
    <div onClick={onClick}
      style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', background: isSelected ? 'rgba(200,169,110,0.1)' : 'transparent', borderLeft: `3px solid ${isSelected ? '#C8A96E' : isVandaag ? 'rgba(200,169,110,0.4)' : 'transparent'}`, transition: 'all 0.1s' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(200,169,110,0.1)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, flex: 1 }}>{order.customer_name}</div>
        {fase && <span style={{ background: fase.bg, color: fase.color, padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{fase.label}</span>}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 6 }}>📍 {order.customer_address}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {order.installation_date && (
          <span style={{ fontSize: 11, color: isVandaag ? '#C8A96E' : 'rgba(255,255,255,0.4)', fontWeight: isVandaag ? 700 : 400 }}>
            {isVandaag ? '📅 Vandaag' : `📅 ${new Date(order.installation_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`}
          </span>
        )}
        {openDefs > 0 && <span style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 600 }}>⚠ {openDefs}</span>}
        {(order.montage_files || []).length > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>📷 {order.montage_files.length}</span>}
      </div>
    </div>
  )
}

// ─── Order detail ─────────────────────────────────────────────────────────────

function OrderDetail({ order, onClose, onUpdatePhase, onUploadPhotos, uploading, showToast, user, onRefresh }) {
  const [tab, setTab] = useState('info')

  const items        = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const orderFiles   = order.order_files || []
  const montageFiles = order.montage_files || []
  const defects      = order.defects || []
  const openDefs     = defects.filter(d => d.status === 'open')
  const fase         = FASE_BADGE[order.phase]

  const TABS = [
    { key: 'info',       label: 'Opdracht' },
    { key: 'checklist',  label: 'Checklist' },
    { key: 'fotos',      label: `Foto's${montageFiles.length > 0 ? ` (${montageFiles.length})` : ''}` },
    { key: 'opleverbon', label: 'Opleverbon' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#152318', padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{order.customer_name}</h2>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>📍 {order.customer_address}</div>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} style={{ color: '#C8A96E', fontSize: 13, textDecoration: 'none', marginTop: 4, display: 'inline-block', fontWeight: 600 }}>📞 {order.customer_phone}</a>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Datum + route + contact knoppen */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {order.installation_date && (
            <div style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: 9, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Montagedatum</div>
                <div style={{ color: '#C8A96E', fontWeight: 700, fontSize: 14 }}>
                  {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>
          )}
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address || '')}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, padding: '8px 14px', textDecoration: 'none', minWidth: 70 }}>
            <span style={{ fontSize: 20 }}>🗺</span>
            <span style={{ color: '#93C5FD', fontSize: 11, fontWeight: 600 }}>Route</span>
          </a>
          <a href="https://wa.me/31850492456" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 9, padding: '8px 14px', textDecoration: 'none', minWidth: 70 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={{ color: '#6EE7B7', fontSize: 11, fontWeight: 600 }}>WhatsApp</span>
          </a>
        </div>

        {/* Fase + actie knoppen */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {fase && <span style={{ background: fase.bg, color: fase.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{fase.label}</span>}
          {order.phase === 5 && (
            <button onClick={() => { onUpdatePhase(order.id, 6); setTab('fotos') }}
              style={{ background: '#C8A96E', color: '#1A3A2A', border: 'none', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Montage afgerond
            </button>
          )}
          {order.phase === 6 && (
            <button onClick={() => setTab('opleverbon')}
              style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              📋 Opleverbon invullen →
            </button>
          )}
        </div>

        {/* Open bevindingen badge */}
        {openDefs.length > 0 && (
          <div style={{ marginTop: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#FCA5A5', fontWeight: 600 }}>
            ⚠ {openDefs.length} open bevinding{openDefs.length !== 1 ? 'en' : ''} — zie klantportaal
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#152318', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400, background: 'none', color: tab === t.key ? '#C8A96E' : 'rgba(255,255,255,0.4)', borderBottom: tab === t.key ? '2px solid #C8A96E' : '2px solid transparent', fontFamily: 'inherit', transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Notities EcoPro */}
            {order.montage_notes && (
              <MCard title="Notities van EcoPro" icon="📝">
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{order.montage_notes}</p>
              </MCard>
            )}

            {/* Open bevindingen */}
            {openDefs.length > 0 && (
              <MCard title={`Open bevindingen (${openDefs.length})`} icon="⚠" accent="rgba(239,68,68,0.15)" accentBorder="rgba(239,68,68,0.25)">
                {openDefs.map(d => (
                  <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{d.description}</div>
                ))}
              </MCard>
            )}

            {/* Kozijnen */}
            <MCard title="Kozijnen & specificaties" icon="🪟">
              {items.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Geen specificaties.</p>
              ) : items.map((item, idx) => (
                <div key={item.id} style={{ padding: '10px 0', borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{item.description}</div>
                  {item.quantity > 1 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Aantal: {item.quantity}×</div>}
                </div>
              ))}
            </MCard>

            {/* Bestanden EcoPro */}
            {orderFiles.length > 0 && (
              <MCard title="Tekeningen & documenten" icon="📐">
                {orderFiles.map((f, idx) => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < orderFiles.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', textDecoration: 'none' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{f.file_type?.startsWith('image/') ? '🖼' : '📄'}</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 500, fontSize: 13 }}>{f.filename}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>Openen →</div>
                    </div>
                  </a>
                ))}
              </MCard>
            )}
          </div>
        )}

        {tab === 'checklist' && <WerkChecklist />}

        {tab === 'fotos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MCard title="Foto's uploaden" icon="📷">
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', border: `2px dashed ${uploading ? '#C8A96E' : 'rgba(255,255,255,0.2)'}`, borderRadius: 10, cursor: 'pointer', color: uploading ? '#C8A96E' : 'rgba(255,255,255,0.5)', fontSize: 14, transition: 'all 0.15s', marginBottom: 14 }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#C8A96E'; e.currentTarget.style.color = '#C8A96E' } }}
                onMouseLeave={e => { if (!uploading) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } }}>
                <input type="file" onChange={e => onUploadPhotos(e, order.id)} style={{ display: 'none' }} accept="image/*,.pdf" multiple />
                {uploading ? '⏳ Uploaden…' : '📎 Foto\'s & bestanden toevoegen (meerdere mogelijk)'}
              </label>

              {montageFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  Nog geen foto's geüpload
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                  {montageFiles.map(f => {
                    const isImg = f.file_type?.startsWith('image/')
                    return (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#C8A96E'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                        {isImg
                          ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>📄</div>
                        }
                        <div style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.55)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                      </a>
                    )
                  })}
                </div>
              )}
            </MCard>
          </div>
        )}

        {tab === 'opleverbon' && (
          <OpleverBon order={order} showToast={showToast} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  )
}

// ─── Werk checklist ───────────────────────────────────────────────────────────

function WerkChecklist() {
  const ITEMS = [
    'Gereedschap en materialen aanwezig',
    'Klant op de hoogte gesteld van aankomst',
    'Situatie vóór montage gefotografeerd',
    'Metingen gecontroleerd ter plaatse',
    'Oude kozijnen verwijderd',
    'Nieuwe kozijnen geplaatst en waterpas',
    'Afdichting en kitwerk correct aangebracht',
    'Hang- en sluitwerk functioneert correct',
    'Vensterbanken en dorpels geplaatst',
    'Glas vrij van beschadigingen',
    'Schoongemaakt en afval afgevoerd',
    'Situatie ná montage gefotografeerd',
    'Klant akkoord gegeven na inspectie',
  ]
  const [checked, setChecked] = useState({})
  const done = Object.values(checked).filter(Boolean).length

  return (
    <MCard title={`Werkchecklist ${done > 0 ? `(${done}/${ITEMS.length})` : ''}`} icon="✅">
      {done > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(done / ITEMS.length) * 100}%`, background: done === ITEMS.length ? '#10B981' : '#C8A96E', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{done} van {ITEMS.length} afgevinkt</div>
        </div>
      )}
      {ITEMS.map((item, i) => (
        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', marginBottom: 6, borderRadius: 9, border: `1px solid ${checked[i] ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)'}`, background: checked[i] ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}
          onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
          <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked[i] ? '#10B981' : 'rgba(255,255,255,0.18)'}`, background: checked[i] ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
            {checked[i] && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ color: checked[i] ? '#6EE7B7' : 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4 }}>{item}</span>
        </label>
      ))}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center' }}>Checklist wordt lokaal bijgehouden per sessie</p>
    </MCard>
  )
}

// ─── Opleverbon met handtekening ──────────────────────────────────────────────

function OpleverBon({ order, showToast, onRefresh }) {
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

  const [checked, setChecked] = useState({})
  const [naam,    setNaam]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(!!order.oplevering_signed_at)
  const canvasRef             = useRef(null)
  const drawing               = useRef(false)
  const lastPos               = useRef(null)
  const allChecked            = PUNTEN.every((_, i) => checked[i])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches?.[0] || e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  function startDraw(e) { drawing.current = true; lastPos.current = getPos(e) }
  function draw(e) {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#C8A96E'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos
  }
  function stopDraw() { drawing.current = false }
  function clearCanvas() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }
  function hasSig() {
    const data = canvasRef.current.getContext('2d').getImageData(0, 0, 400, 140).data
    return Array.from(data).some((v, i) => i % 4 === 3 && v > 0)
  }

  async function submit() {
    if (!allChecked) { showToast('Vink alle punten af', 'error'); return }
    if (!naam.trim()) { showToast('Vul de naam van de klant in', 'error'); return }
    if (!hasSig()) { showToast('Handtekening ontbreekt', 'error'); return }
    setSaving(true)
    const sigData = canvasRef.current.toDataURL('image/png')
    const now = new Date().toISOString()
    await supabase.from('orders').update({
      oplevering_naam: naam, oplevering_signed_at: now,
      oplevering_punten: JSON.stringify(PUNTEN), phase: 7, completed_at: now,
    }).eq('id', order.id)
    await supabase.from('status_history').insert({ order_id: order.id, to_phase: 7, changed_by: 'monteur-opleverbon' })
    const blob = await fetch(sigData).then(r => r.blob())
    const path = `${order.id}/opleverbon-handtekening.png`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, blob, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('order_files').upsert({
        order_id: order.id, filename: 'Opleverbon – handtekening.png',
        storage_path: path, file_url: publicUrl, file_type: 'image/png',
      }, { onConflict: 'storage_path' })
    }
    setSaving(false)
    setDone(true)
    onRefresh()
    showToast('Opleverbon opgeslagen & order afgerond!')
  }

  if (done || order.oplevering_signed_at) {
    return (
      <MCard title="Opleverbon" icon="📋" accent="rgba(16,185,129,0.12)" accentBorder="rgba(16,185,129,0.25)">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div style={{ color: '#6EE7B7', fontWeight: 700, fontSize: 16 }}>Opleverbon ondertekend</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>
            {order.oplevering_naam} · {order.oplevering_signed_at ? new Date(order.oplevering_signed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>Zichtbaar voor klant in het portaal</div>
        </div>
      </MCard>
    )
  }

  return (
    <MCard title="Opleverbon" icon="📋">
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
        Loop samen met de klant de punten door. Vink alles af, laat de klant tekenen en sla op.
      </p>

      {/* Checklist punten */}
      <div style={{ marginBottom: 18 }}>
        {PUNTEN.map((punt, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', marginBottom: 6, borderRadius: 9, border: `1px solid ${checked[i] ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)'}`, background: checked[i] ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked[i] ? '#10B981' : 'rgba(255,255,255,0.18)'}`, background: checked[i] ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
              {checked[i] && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ color: checked[i] ? '#6EE7B7' : 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4 }}>{punt}</span>
          </label>
        ))}
      </div>

      {/* Naam klant */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Naam klant</div>
        <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Volledige naam klant…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 14px', color: 'white', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* Handtekening */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Handtekening klant</div>
          <button onClick={clearCanvas} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Wissen</button>
        </div>
        <canvas ref={canvasRef} width={400} height={140}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={e => { e.preventDefault(); startDraw(e) }}
          onTouchMove={e => { e.preventDefault(); draw(e) }}
          onTouchEnd={stopDraw}
          style={{ width: '100%', height: 140, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', display: 'block' }} />
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 6 }}>Laat de klant hier tekenen met de vinger of stylus</p>
      </div>

      <button onClick={submit} disabled={saving || !allChecked}
        style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: allChecked ? 'linear-gradient(135deg, #C8A96E, #B8956A)' : 'rgba(255,255,255,0.08)', color: allChecked ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: allChecked ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s' }}>
        {saving ? 'Opslaan…' : '📋 Opleverbon opslaan & order afronden'}
      </button>
    </MCard>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MCard({ title, icon, children, accent = 'rgba(255,255,255,0.04)', accentBorder = 'rgba(255,255,255,0.08)' }) {
  return (
    <div style={{ background: accent, border: `1px solid ${accentBorder}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}

function Spinner({ color = 'rgba(255,255,255,0.4)' }) {
  return <div style={{ width: 28, height: 28, border: `2px solid ${color}`, borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}

const FASE_BADGE = {
  3: { bg: 'rgba(59,130,246,0.15)',  color: '#93C5FD', label: 'In productie' },
  4: { bg: 'rgba(59,130,246,0.15)',  color: '#93C5FD', label: 'Geleverd' },
  5: { bg: 'rgba(245,158,11,0.15)',  color: '#FCD34D', label: 'Ingepland' },
  6: { bg: 'rgba(16,185,129,0.15)',  color: '#6EE7B7', label: 'Afgerond' },
  7: { bg: 'rgba(22,163,74,0.15)',   color: '#86EFAC', label: 'Compleet' },
}
