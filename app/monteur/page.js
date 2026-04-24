'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
    const ch = supabase.channel('monteur-rt')
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
    const prev = orders.find(o => o.id === orderId)?.phase
    await supabase.from('orders').update({
      phase: newPhase,
      ...(newPhase === 6 ? { installation_done_at: new Date().toISOString() } : {}),
      ...(newPhase === 7 ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    if (prev !== undefined) {
      await supabase.from('status_history').insert({ order_id: orderId, from_phase: prev, to_phase: newPhase, changed_by: user?.name || 'monteur' })
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
      const { error } = await supabase.storage.from('order-files').upload(path, file)
      if (error) { showToast('Upload mislukt', 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('montage_files').insert({ order_id: orderId, filename: file.name, storage_path: path, file_url: publicUrl, file_type: file.type, uploaded_by: user?.username || 'monteur' })
      ok++
    }
    setUploading(false)
    if (ok > 0) showToast(`${ok} foto${ok !== 1 ? "'s" : ''} geüpload`)
    loadOrders()
    e.target.value = ''
  }

  const todayStr   = new Date().toISOString().slice(0, 10)
  const actief     = orders.filter(o => o.phase < 7)
  const compleet   = orders.filter(o => o.phase >= 7)
  const vandaag    = orders.filter(o => o.installation_date?.startsWith(todayStr))
  const openPunten = orders.reduce((s, o) => s + (o.defects || []).filter(d => d.status === 'open').length, 0)

  let visible = filter === 'compleet' ? compleet : filter === 'vandaag' ? vandaag : actief
  if (search) {
    const q = search.toLowerCase()
    visible = visible.filter(o => o.customer_name?.toLowerCase().includes(q) || o.customer_address?.toLowerCase().includes(q))
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--brand-muted)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#152318', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', borderRight: '1px solid rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 34, height: 34, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>EcoPro Kozijnen</div>
              <div style={{ fontSize: 10, opacity: 0.38, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Monteur</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 14px' }}>
          <div style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ingelogd als</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#C8A96E' }}>{user.name}</div>
          </div>
        </div>

        <div style={{ padding: '0 14px' }}>
          {[
            { key: 'vandaag',  label: `Vandaag${vandaag.length > 0 ? ` (${vandaag.length})` : ''}`, icon: '📅' },
            { key: 'actief',   label: `Actief (${actief.length})`,   icon: '🔧' },
            { key: 'compleet', label: `Afgerond (${compleet.length})`, icon: '✓' },
          ].map(item => (
            <div key={item.key} onClick={() => setFilter(item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 2, cursor: 'pointer', fontSize: 13, fontWeight: filter === item.key ? 600 : 400, color: filter === item.key ? 'white' : 'rgba(255,255,255,0.5)', background: filter === item.key ? 'rgba(255,255,255,0.13)' : 'transparent', transition: 'all 0.12s' }}
              onMouseEnter={e => { if (filter !== item.key) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { if (filter !== item.key) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {filter === item.key && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '12px 14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', marginBottom: 10 }}>
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.38)', transition: 'all 0.13s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}>
            <span>↩</span> Uitloggen
          </div>
        </div>
      </div>

      {/* Hoofdinhoud */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Topbar */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Mijn opdrachten</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          {vandaag.length > 0 && (
            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vandaag</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {vandaag.map(o => o.customer_name).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI cards */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { label: 'Vandaag',        value: vandaag.length,   icon: '📅', sub: 'Op locatie vandaag',      accent: vandaag.length > 0 ? 'var(--accent)' : '#cbd5e1', warn: vandaag.length > 0,    filter: 'vandaag' },
              { label: 'Actieve orders', value: actief.length,    icon: '🔧', sub: 'Lopende opdrachten',      accent: 'var(--brand)',                                                                filter: 'actief' },
              { label: 'Afgerond',       value: compleet.length,  icon: '✅', sub: 'Voltooide montages',      accent: 'var(--success)',                                                              filter: 'compleet' },
              { label: 'Open punten',    value: openPunten,       icon: '⚠', sub: 'Klantbevindingen',        accent: openPunten > 0 ? 'var(--danger)' : '#cbd5e1',     warn: openPunten > 0 },
            ].map(s => (
              <div key={s.label} onClick={() => s.filter && setFilter(s.filter)}
                style={{ position: 'relative', background: '#FAFAFA', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px 14px', cursor: s.filter ? 'pointer' : 'default', overflow: 'hidden', transition: 'box-shadow 0.15s', borderLeft: `4px solid ${s.accent}` }}
                onMouseEnter={e => s.filter && (e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.07)')}
                onMouseLeave={e => s.filter && (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{s.label}</div>
                  <span style={{ fontSize: 17, opacity: 0.5 }}>{s.icon}</span>
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: s.warn ? s.accent : 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>{s.sub}</div>
                {s.filter && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.accent, marginTop: 5, opacity: 0.8 }}>FILTEREN →</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Zoekbalk + filter chips */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: 14 }}>🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam of adres…" style={{ width: 200, paddingLeft: 32, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'vandaag',  label: `Vandaag${vandaag.length > 0 ? ` (${vandaag.length})` : ''}` },
              { key: 'actief',   label: `Actief (${actief.length})` },
              { key: 'compleet', label: `Afgerond (${compleet.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${filter === t.key ? 'var(--brand)' : 'var(--border)'}`, background: filter === t.key ? 'var(--brand)' : 'white', color: filter === t.key ? 'white' : 'var(--text-muted)', fontWeight: filter === t.key ? 600 : 400, transition: 'all 0.1s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {t.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 'auto' }}>{visible.length} opdracht{visible.length !== 1 ? 'en' : ''}</span>
        </div>

        {/* Lijst + detail */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Orderlijst */}
          <div style={{ width: selected ? 360 : '100%', flexShrink: 0, overflowY: 'auto', background: 'white' }}>

            {/* Tabel header */}
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 100px' : '44px 2fr 1.2fr 120px 36px', padding: '8px 20px', background: '#F8FAFC', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
              {!selected && <div />}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Klant</div>
              {!selected && <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Adres</div>}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Datum</div>
              {!selected && <div />}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, border: '2px solid var(--brand-muted)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Laden…
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                {filter === 'vandaag' ? 'Geen montages vandaag.' : filter === 'compleet' ? 'Nog geen afgeronde opdrachten.' : 'Geen actieve opdrachten.'}
              </div>
            ) : visible.map(order => {
              const isSelected = selected?.id === order.id
              const isVandaag  = order.installation_date?.startsWith(todayStr)
              const openDefs   = (order.defects || []).filter(d => d.status === 'open').length
              const fase       = FASE[order.phase]
              const initColor  = `hsl(${((order.customer_name?.charCodeAt(0) || 65) * 97 + 120) % 360},40%,38%)`
              return (
                <div key={order.id} onClick={() => setSelected(isSelected ? null : order)}
                  style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 100px' : '44px 2fr 1.2fr 120px 36px', padding: '11px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s', background: isSelected ? '#EEF6F0' : isVandaag ? '#FFFDF5' : 'white', borderLeft: `3px solid ${isSelected ? 'var(--brand)' : isVandaag ? 'var(--accent)' : 'transparent'}` }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#EEF6F0' : isVandaag ? '#FFFDF5' : 'white' }}>
                  {!selected && (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: initColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {(order.customer_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {order.customer_name}
                      {isVandaag && <span style={{ fontSize: 9, background: 'var(--accent-bg)', color: 'var(--accent-dark)', padding: '2px 7px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid var(--accent-border)' }}>Vandaag</span>}
                    </div>
                    {selected && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.customer_address}</div>}
                    {openDefs > 0 && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>⚠ {openDefs} punt{openDefs !== 1 ? 'en' : ''}</div>}
                  </div>
                  {!selected && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.customer_address}</div>}
                  <div>
                    {fase && <span className={`badge ${fase.cls}`}>{fase.label}</span>}
                    {order.installation_date && (
                      <div style={{ fontSize: 11, color: isVandaag ? 'var(--accent-dark)' : 'var(--brand)', marginTop: 4, fontWeight: isVandaag ? 700 : 500 }}>
                        📅 {new Date(order.installation_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                  {!selected && <div style={{ color: 'var(--text-light)', fontSize: 18, textAlign: 'center', transition: 'transform 0.2s', transform: isSelected ? 'rotate(90deg)' : 'none' }}>›</div>}
                </div>
              )
            })}
          </div>

          {/* Detail paneel */}
          {selected && (
            <div style={{ flex: 1, borderLeft: '1px solid var(--border)', background: 'var(--bg)', overflowY: 'auto' }}>
              <OrderDetail
                order={selected}
                onClose={() => setSelected(null)}
                onUpdatePhase={updatePhase}
                onUploadPhotos={uploadPhotos}
                uploading={uploading}
                showToast={showToast}
                onRefresh={loadOrders}
                todayStr={todayStr}
              />
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="animate-fade" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Order detail paneel ──────────────────────────────────────────────────────

function OrderDetail({ order, onClose, onUpdatePhase, onUploadPhotos, uploading, showToast, onRefresh, todayStr }) {
  const [tab, setTab] = useState('info')

  const items        = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const orderFiles   = order.order_files || []
  const montageFiles = order.montage_files || []
  const defects      = order.defects || []
  const openDefs     = defects.filter(d => d.status === 'open')
  const fase         = FASE[order.phase]
  const isVandaag    = order.installation_date?.startsWith(todayStr)

  const TABS = [
    { key: 'info',       label: 'Opdracht' },
    { key: 'checklist',  label: 'Checklist' },
    { key: 'fotos',      label: `Foto's${montageFiles.length > 0 ? ` (${montageFiles.length})` : ''}` },
    { key: 'opleverbon', label: 'Opleverbon' },
  ]

  return (
    <>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 20px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>{order.customer_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>📍 {order.customer_address}</div>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none', marginTop: 4, display: 'inline-block', fontWeight: 600 }}>📞 {order.customer_phone}</a>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-light)', padding: '0 2px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Status + datum */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {fase && <span className={`badge ${fase.cls}`}>{fase.label}</span>}
          {order.installation_date && (
            <span style={{ background: isVandaag ? 'var(--accent-bg)' : 'var(--brand-muted)', color: isVandaag ? 'var(--accent-dark)' : 'var(--brand)', border: `1px solid ${isVandaag ? 'var(--accent-border)' : 'var(--brand-border)'}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              📅 {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}{isVandaag ? ' — Vandaag' : ''}
            </span>
          )}
          {order.phase === 5 && (
            <button onClick={() => { onUpdatePhase(order.id, 6); setTab('fotos') }}
              className="btn btn-sm btn-primary" style={{ padding: '3px 12px', fontSize: 11, borderRadius: 20 }}>
              ✓ Montage afgerond
            </button>
          )}
        </div>

        {/* Snelle acties */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address || '')}`}
            target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none', fontSize: 12, justifyContent: 'center' }}>
            🗺 Route
          </a>
          <a href="tel:+31850492456" className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none', fontSize: 12, justifyContent: 'center' }}>
            📞 EcoPro
          </a>
          <a href="https://wa.me/31850492456" target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, color: 'var(--success)', textDecoration: 'none', boxShadow: 'var(--shadow-sm)' }}>
            💬 WhatsApp
          </a>
        </div>

        {/* Open bevindingen notice */}
        {openDefs.length > 0 && (
          <div className="notice notice-warning" style={{ marginTop: 10, fontSize: 12 }}>
            ⚠ {openDefs.length} open bevinding{openDefs.length !== 1 ? 'en' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400, background: 'none', color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', fontFamily: 'inherit', transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 18 }}>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {order.montage_notes && (
              <DCard title="Notities van EcoPro" icon="📝">
                <p style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text)' }}>{order.montage_notes}</p>
              </DCard>
            )}

            {openDefs.length > 0 && (
              <DCard title={`Open bevindingen (${openDefs.length})`} icon="⚠" warn>
                {openDefs.map(d => (
                  <div key={d.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>• {d.description}</div>
                ))}
              </DCard>
            )}

            <DCard title="Kozijnen & specificaties" icon="🪟">
              {items.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Geen specificaties.</p>
              ) : items.map((item, idx) => (
                <div key={item.id} style={{ padding: '10px 0', borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.description}</div>
                  {item.quantity > 1 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Aantal: {item.quantity}×</div>}
                </div>
              ))}
            </DCard>

            {orderFiles.length > 0 && (
              <DCard title="Tekeningen & documenten" icon="📐">
                {orderFiles.map((f, idx) => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < orderFiles.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                    <span style={{ fontSize: 22 }}>{f.file_type?.startsWith('image/') ? '🖼' : '📄'}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{f.filename}</div>
                      <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 1 }}>Openen →</div>
                    </div>
                  </a>
                ))}
              </DCard>
            )}
          </div>
        )}

        {tab === 'checklist' && <WerkChecklist />}

        {tab === 'fotos' && (
          <DCard title="Foto's uploaden" icon="📷">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, transition: 'all 0.15s', marginBottom: 14 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'white' }}>
              <input type="file" onChange={e => onUploadPhotos(e, order.id)} style={{ display: 'none' }} accept="image/*,.pdf" multiple />
              {uploading ? '⏳ Uploaden…' : '📎 Foto\'s & bestanden toevoegen'}
            </label>
            {montageFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>Nog geen foto's geüpload.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                {montageFiles.map(f => {
                  const isImg = f.file_type?.startsWith('image/')
                  return (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', transition: 'box-shadow 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      {isImg
                        ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'var(--bg)' }}>📄</div>
                      }
                      <div style={{ padding: '5px 8px', fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    </a>
                  )
                })}
              </div>
            )}
          </DCard>
        )}

        {tab === 'opleverbon' && (
          <OpleverBon order={order} showToast={showToast} onRefresh={onRefresh} />
        )}
      </div>
    </>
  )
}

// ─── Werkchecklist ────────────────────────────────────────────────────────────

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
    <DCard title={`Werkchecklist${done > 0 ? ` — ${done}/${ITEMS.length}` : ''}`} icon="✅">
      {done > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(done / ITEMS.length) * 100}%`, background: done === ITEMS.length ? 'var(--success)' : 'var(--brand)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{done} van {ITEMS.length} afgevinkt</div>
        </div>
      )}
      {ITEMS.map((item, i) => (
        <label key={i}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px', marginBottom: 5, borderRadius: 8, border: `1px solid ${checked[i] ? 'var(--success-border)' : 'var(--border)'}`, background: checked[i] ? 'var(--success-bg)' : 'white', cursor: 'pointer', transition: 'all 0.15s', fontSize: 13 }}
          onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[i] ? 'var(--success)' : 'var(--border-strong)'}`, background: checked[i] ? 'var(--success)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
            {checked[i] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ color: checked[i] ? 'var(--success)' : 'var(--text)', lineHeight: 1.4 }}>{item}</span>
        </label>
      ))}
      <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8, textAlign: 'center' }}>Checklist wordt lokaal bijgehouden per sessie</p>
    </DCard>
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
    const src  = e.touches?.[0] || e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }
  function startDraw(e) { drawing.current = true; lastPos.current = getPos(e) }
  function draw(e) {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = 'var(--brand)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos
  }
  function stopDraw() { drawing.current = false }
  function clearCanvas() { canvasRef.current.getContext('2d').clearRect(0, 0, 400, 140) }
  function hasSig() {
    return Array.from(canvasRef.current.getContext('2d').getImageData(0, 0, 400, 140).data).some((v, i) => i % 4 === 3 && v > 0)
  }

  async function submit() {
    if (!allChecked) { showToast('Vink alle punten af', 'error'); return }
    if (!naam.trim()) { showToast('Vul de naam van de klant in', 'error'); return }
    if (!hasSig()) { showToast('Handtekening ontbreekt', 'error'); return }
    setSaving(true)
    const now    = new Date().toISOString()
    const sigUrl = canvasRef.current.toDataURL('image/png')
    await supabase.from('orders').update({ oplevering_naam: naam, oplevering_signed_at: now, oplevering_punten: JSON.stringify(PUNTEN), phase: 7, completed_at: now }).eq('id', order.id)
    await supabase.from('status_history').insert({ order_id: order.id, to_phase: 7, changed_by: 'monteur-opleverbon' })
    const blob = await fetch(sigUrl).then(r => r.blob())
    const path = `${order.id}/opleverbon-handtekening.png`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, blob, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('order_files').upsert({ order_id: order.id, filename: 'Opleverbon – handtekening.png', storage_path: path, file_url: publicUrl, file_type: 'image/png' }, { onConflict: 'storage_path' })
    }
    setSaving(false); setDone(true); onRefresh()
    showToast('Opleverbon opgeslagen & order afgerond!')
  }

  if (done || order.oplevering_signed_at) {
    return (
      <div className="notice notice-success" style={{ textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Opleverbon ondertekend</div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          {order.oplevering_naam} · {order.oplevering_signed_at ? new Date(order.oplevering_signed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>Zichtbaar voor klant in het portaal</div>
      </div>
    )
  }

  return (
    <DCard title="Opleverbon" icon="📋">
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Loop samen met de klant de punten door. Vink alles af, laat de klant tekenen en sla op.
      </p>

      <div style={{ marginBottom: 16 }}>
        {PUNTEN.map((punt, i) => (
          <label key={i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px', marginBottom: 5, borderRadius: 8, border: `1px solid ${checked[i] ? 'var(--success-border)' : 'var(--border)'}`, background: checked[i] ? 'var(--success-bg)' : 'white', cursor: 'pointer', transition: 'all 0.15s', fontSize: 13 }}
            onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked[i] ? 'var(--success)' : 'var(--border-strong)'}`, background: checked[i] ? 'var(--success)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
              {checked[i] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ color: checked[i] ? 'var(--success)' : 'var(--text)', lineHeight: 1.4 }}>{punt}</span>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label>Naam klant</label>
        <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Volledige naam klant…" />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Handtekening klant</label>
          <button onClick={clearCanvas} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Wissen</button>
        </div>
        <canvas ref={canvasRef} width={400} height={140}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={e => { e.preventDefault(); startDraw(e) }}
          onTouchMove={e => { e.preventDefault(); draw(e) }}
          onTouchEnd={stopDraw}
          style={{ width: '100%', height: 140, background: 'white', border: '1px solid var(--brand-border)', borderRadius: 'var(--radius)', cursor: 'crosshair', touchAction: 'none', display: 'block', boxShadow: 'var(--shadow-sm)' }} />
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>Laat de klant hier tekenen met de vinger of stylus</p>
      </div>

      <button onClick={submit} disabled={saving || !allChecked} className={`btn btn-full ${allChecked ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 15 }}>
        {saving ? 'Opslaan…' : '📋 Opleverbon opslaan & order afronden'}
      </button>
    </DCard>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DCard({ title, icon, children, warn }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${warn ? 'var(--warn-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: warn ? 'var(--warn)' : 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}

const FASE = {
  3: { cls: 'badge-productie', label: 'In productie' },
  4: { cls: 'badge-deposit',   label: 'Geleverd' },
  5: { cls: 'badge-montage',   label: 'Ingepland' },
  6: { cls: 'badge-oplevering',label: 'Afgerond' },
  7: { cls: 'badge-compleet',  label: 'Compleet' },
}
