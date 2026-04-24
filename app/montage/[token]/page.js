'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MontagePage({ params: paramsPromise }) {
  const { token }    = use(paramsPromise)
  const [order, setOrder]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [toast, setToast]         = useState(null)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab]             = useState('info')

  useEffect(() => { loadOrder() }, [token]) // eslint-disable-line

  async function loadOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), order_files(*), montage_files(*), defects(*)')
      .eq('montage_token', token)
      .single()
    setLoading(false)
    if (!data) { setNotFound(true); return }
    setOrder(data)
    supabase.from('orders').update({ montage_accessed_at: new Date().toISOString() }).eq('id', data.id).then(() => {})
  }

  async function refresh() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), order_files(*), montage_files(*), defects(*)')
      .eq('montage_token', token).single()
    if (data) setOrder(data)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function uploadPhotos(e) {
    const files = Array.from(e.target.files)
    if (!files.length || !order) return
    setUploading(true)
    let ok = 0
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `montage/${order.id}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
      if (upErr) { showToast('Upload mislukt: ' + upErr.message, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('montage_files').insert({
        order_id: order.id, filename: file.name, storage_path: path,
        file_url: publicUrl, file_type: file.type, uploaded_by: 'montage-link',
      })
      ok++
    }
    setUploading(false)
    if (ok > 0) showToast(`${ok} foto${ok !== 1 ? "'s" : ''} geüpload`)
    refresh()
    e.target.value = ''
  }

  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Shell>
  )

  if (notFound) return (
    <Shell>
      <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--brand)' }}>Link niet gevonden</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Deze link is ongeldig of verlopen. Neem contact op met EcoPro Kozijnen.
        </p>
        <a href="tel:+31850492456" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          📞 085 049 24 56
        </a>
      </div>
    </Shell>
  )

  const items        = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const montageFiles = order.montage_files || []
  const orderFiles   = order.order_files || []
  const openDefects  = (order.defects || []).filter(d => d.status === 'open')
  const todayStr     = new Date().toISOString().slice(0, 10)
  const isVandaag    = order.installation_date?.startsWith(todayStr)

  const TABS = [
    { key: 'info',  label: 'Opdracht' },
    { key: 'fotos', label: `Foto's${montageFiles.length > 0 ? ` (${montageFiles.length})` : ''}` },
  ]

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 0 80px' }}>

        {/* Hero kaart */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${isVandaag ? 'var(--accent)' : 'var(--brand)'}`, padding: '20px 20px 18px', marginBottom: 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>Montage opdracht</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--brand)', marginBottom: 4 }}>{order.customer_name}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 14 }}>📍 {order.customer_address}</div>

          {/* Datum + vandaag badge */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            {order.installation_date && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 14px' }}>
                <span style={{ fontSize: 15 }}>📅</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
                  {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
            {isVandaag && (
              <span style={{ background: 'var(--accent)', color: 'var(--brand)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>VANDAAG</span>
            )}
          </div>

          {/* Actieknoppen */}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address || '')}`}
              target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              🗺 Route
            </a>
            <a href="tel:+31850492456" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              📞 EcoPro
            </a>
            <a href="https://wa.me/31850492456" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-sm)', color: '#15803d', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              💬 WhatsApp
            </a>
          </div>
        </div>

        {/* Open bevindingen */}
        {openDefects.length > 0 && (
          <div className="notice notice-warning" style={{ borderRadius: 0, margin: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>⚠ {openDefects.length} open bevinding{openDefects.length !== 1 ? 'en' : ''}</div>
            {openDefects.map(d => (
              <div key={d.id} style={{ fontSize: 13, padding: '2px 0' }}>• {d.description}</div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 56, zIndex: 10 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, background: 'none', color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', fontFamily: 'inherit', transition: 'all 0.1s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 16px 0', background: 'var(--bg)', minHeight: 400 }}>

          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Notities */}
              {order.montage_notes && (
                <DCard title="Notities van EcoPro" icon="📝">
                  <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{order.montage_notes}</p>
                </DCard>
              )}

              {/* Kozijnen */}
              <DCard title="Kozijnen & specificaties" icon="🪟">
                {items.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Geen specificaties toegevoegd.</p>
                ) : items.map((item, idx) => (
                  <div key={item.id} style={{ padding: '11px 0', borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brand)' }}>{item.description}</div>
                      {item.quantity > 1 && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Aantal: {item.quantity}×</div>}
                    </div>
                  </div>
                ))}
              </DCard>

              {/* Documenten */}
              {orderFiles.length > 0 && (
                <DCard title="Tekeningen & documenten" icon="📐">
                  {orderFiles.map((f, idx) => (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: idx < orderFiles.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{f.file_type?.startsWith('image/') ? '🖼' : '📄'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--brand)' }}>{f.filename}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Openen / downloaden →</div>
                      </div>
                    </a>
                  ))}
                </DCard>
              )}
            </div>
          )}

          {tab === 'fotos' && (
            <DCard title="Foto's uploaden" icon="📷">
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                Upload foto's van voor, tijdens en na de montage. Meerdere tegelijk mogelijk.
              </p>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '18px', borderRadius: 'var(--radius)',
                border: `2px dashed ${uploading ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', color: uploading ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 14, transition: 'all 0.15s', marginBottom: 16, background: uploading ? 'rgba(200,169,110,0.06)' : 'transparent'
              }}>
                <input type="file" onChange={uploadPhotos} style={{ display: 'none' }} accept="image/*,.pdf" multiple />
                {uploading ? '⏳ Uploaden…' : '📎 Foto\'s & bestanden toevoegen'}
              </label>

              {montageFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>📷</div>
                  Nog geen foto's geüpload
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                  {montageFiles.map(f => {
                    const isImg = f.file_type?.startsWith('image/')
                    return (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', textDecoration: 'none', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                        {isImg
                          ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: 'var(--bg)' }}>📄</div>
                        }
                        <div style={{ padding: '8px 10px' }}>
                          <div style={{ color: 'var(--brand)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{f.filename}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{formatDate(f.uploaded_at)}</div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </DCard>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : 'var(--brand)', color: 'white', padding: '12px 22px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: 'var(--shadow-lg)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif' }}>
      <header style={{ background: 'var(--brand)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="EcoPro" style={{ width: 32, height: 32, objectFit: 'contain', background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: 4 }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>EcoPro Kozijnen</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montageportaal</div>
          </div>
        </div>
        <div style={{ background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.35)', borderRadius: 20, padding: '4px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
          Monteur
        </div>
      </header>
      {children}
    </div>
  )
}

function DCard({ title, icon, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', marginBottom: 14 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}
