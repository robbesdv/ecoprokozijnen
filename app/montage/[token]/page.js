'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, formatDate } from '@/lib/phases'

export default function MontagePage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const { token } = params

  const [order, setOrder]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast]       = useState(null)
  const [uploading, setUploading] = useState(false)

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
      .eq('montage_token', token)
      .single()
    if (data) setOrder(data)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `montage/${order.id}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (upErr) { showToast('Upload mislukt: ' + upErr.message, 'error'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('montage_files').insert({
      order_id: order.id, filename: file.name, storage_path: path,
      file_url: publicUrl, file_type: file.type, uploaded_by: 'montage',
    })
    setUploading(false)
    if (dbErr) { showToast('DB fout: ' + dbErr.message, 'error'); return }
    showToast(`${file.name} geüpload`)
    refresh()
    e.target.value = ''
  }

  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Shell>
  )

  if (notFound) return (
    <Shell>
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'white' }}>Link niet gevonden</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Deze link is ongeldig of verlopen. Neem contact op met EcoPro Kozijnen.</p>
      </div>
    </Shell>
  )

  const items = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const montageFiles = order.montage_files || []
  const orderFiles = order.order_files || []
  const openDefects = (order.defects || []).filter(d => d.status === 'open')

  return (
    <Shell>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Order info kaart */}
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Montage opdracht</div>
          <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{order.customer_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>📍 {order.customer_address}</div>
          {order.installation_date && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.4)', borderRadius: 8, padding: '6px 14px' }}>
              <span style={{ color: '#C8A96E', fontSize: 16 }}>📅</span>
              <span style={{ color: '#C8A96E', fontWeight: 600, fontSize: 14 }}>
                {new Date(order.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Openstaande bevindingen */}
        {openDefects.length > 0 && (
          <div style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ color: '#FCD34D', fontWeight: 600, marginBottom: 8 }}>⚠ {openDefects.length} open bevinding{openDefects.length !== 1 ? 'en' : ''}</div>
            {openDefects.map(d => (
              <div key={d.id} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {d.description}
              </div>
            ))}
          </div>
        )}

        {/* Kozijnen specificaties */}
        <Section title="Kozijnen & specificaties" icon="🪟">
          {items.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic' }}>Nog geen specificaties toegevoegd.</p>
          ) : (
            items.map((item, idx) => (
              <div key={item.id} style={{ padding: '12px 0', borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{item.description}</div>
                  {item.quantity > 1 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Aantal: {item.quantity}</div>}
                </div>
              </div>
            ))
          )}
        </Section>

        {/* Documenten van EcoPro */}
        {orderFiles.length > 0 && (
          <Section title="Tekeningen & documenten" icon="📐">
            {orderFiles.map((f, idx) => {
              const isImage = f.file_type?.startsWith('image/')
              return (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < orderFiles.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', textDecoration: 'none' }}>
                  <span style={{ fontSize: 20 }}>{isImage ? '🖼' : '📄'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{f.filename}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Openen / downloaden →</div>
                  </div>
                </a>
              )
            })}
          </Section>
        )}

        {/* Foto's uploaden */}
        <Section title="Foto's uploaden" icon="📷">
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
            Upload hier foto's van de situatie voor montage, tijdens montage en na afronding.
          </p>

          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '16px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 10,
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14,
            transition: 'all 0.15s', marginBottom: 14,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8A96E'; e.currentTarget.style.color = '#C8A96E' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >
            <input type="file" onChange={uploadPhoto} style={{ display: 'none' }} accept="image/*,.pdf" multiple />
            {uploading ? '⏳ Uploaden…' : '📎 Foto of bestand toevoegen'}
          </label>

          {montageFiles.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>Nog geen foto's geüpload.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {montageFiles.map(f => {
                const isImage = f.file_type?.startsWith('image/')
                return (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#C8A96E'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    {isImage ? (
                      <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📄</div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>{formatDate(f.uploaded_at)}</div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </Section>

        {/* Notities van EcoPro */}
        {order.montage_notes && (
          <Section title="Notities van EcoPro" icon="📝">
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{order.montage_notes}</p>
          </Section>
        )}

        {/* Contact */}
        <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
          <a href="tel:+31850492456" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            📞 085 049 24 56
          </a>
          <a href="mailto:info@ecoprokozijnen.nl" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            ✉ E-mail
          </a>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#DC2626' : '#1A1A1A', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1A3A2A', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="EcoPro" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 3 }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>EcoPro Kozijnen</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montageportaal</div>
          </div>
        </div>
        <div style={{ background: 'rgba(200,169,110,0.2)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 20, padding: '4px 12px', color: '#C8A96E', fontSize: 12, fontWeight: 600 }}>
          Monteur
        </div>
      </header>
      {children}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}