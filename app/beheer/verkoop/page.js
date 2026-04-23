'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getPhase, formatEuro, formatDate } from '@/lib/phases'
import { ralName } from '@/lib/KozijnSVG'

const PANE_LABEL = {
  vast: 'vast glas', draai: 'draai', kiep: 'kiep',
  draaikiep: 'draai-kiep', vent: 'ventilatie', deur: 'deur', schuif: 'schuif',
}

function buildItemDescription(el) {
  const cols = el.columns || []
  const allRows = cols.flatMap(c => c.rows || [])
  const nVaks = allRows.length
  const seenTypes = []
  allRows.forEach(r => {
    const label = PANE_LABEL[r.paneType] || r.paneType
    if (!seenTypes.includes(label)) seenTypes.push(label)
  })
  const w = el.dimensions?.widthMM
  const h = el.dimensions?.heightMM
  const colorCode = el.finish?.colorOutside || ''
  const colorName = ralName(colorCode)
  const vaksStr = `${nVaks || 1}-vaks`
  const typesStr = seenTypes.join(' / ') || 'vast glas'
  const kleurStr = colorCode + (colorName && colorName !== colorCode ? ` — ${colorName}` : '')
  return `Premium Schüco Living Variant ${vaksStr}, ${typesStr}, ${w} × ${h}mm bxh, Kleur: ${kleurStr}, HR++`
}

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',    icon: '▣' },
  { key: 'kozijnlab',  label: 'KozijnLAB',    icon: '⚡' },
  { key: 'leads',      label: 'Leads',         icon: '👥' },
  { key: 'offertes',   label: 'Offertes',      icon: '📄' },
  { key: 'planning',   label: 'Planning',      icon: '📅' },
]

export default function VerkoopPage() {
  const [tab, setTab]               = useState('dashboard')
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [confirmData, setConfirmData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const iframeRef = useRef(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'KOZIJNLAB_SUBMIT') setConfirmData(e.data.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function requestSubmit() {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_SUBMIT' }, '*')
  }

  async function createOrder(kl) {
    setSubmitting(true)
    const c = kl.customer || {}
    const totals = kl.totals || {}
    const address = [c.address, c.postcode, c.city].filter(Boolean).join(', ')

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name:    c.name  || 'Onbekend',
        customer_email:   c.email || '',
        customer_phone:   c.phone || '',
        customer_address: address,
        total_amount:     totals.gross || 0,
        phase: 0,
        montage_notes: kl.project?.notes || '',
      })
      .select('*').single()

    if (error) { showToast('Fout: ' + error.message, 'error'); setSubmitting(false); return }

    const items = (kl.elements || []).map((el, idx) => ({
      order_id:      order.id,
      description:   buildItemDescription(el),
      quantity:      el.qty || 1,
      unit_price:    el.pricePerUnit || 0,
      sort_order:    idx,
      element_config: el,
    }))
    if (items.length) await supabase.from('order_items').insert(items)

    await supabase.from('status_history').insert({
      order_id: order.id, to_phase: 0,
      note: `Aangemaakt vanuit KozijnLAB (${kl.offerCode})`,
      changed_by: 'verkoop',
    })

    setSubmitting(false)
    setConfirmData(null)
    showToast(`Order aangemaakt voor ${c.name}`)
    loadOrders()
    setTimeout(() => { window.location.href = '/beheer' }, 2000)
  }

  const leads    = orders.filter(o => o.phase === 0)
  const offertes = orders.filter(o => o.phase <= 1)
  const openValue = offertes.reduce((s, o) => s + (o.total_amount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--brand)', color: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 36, height: 36, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>EcoPro Kozijnen</div>
              <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Verkoopportaal</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {tab === 'kozijnlab' && (
              <button onClick={requestSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22c55e', border: '1px solid #16a34a', color: 'white', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                → Zet door naar EcoPro
              </button>
            )}
            <Link href="/beheer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '7px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
              ← EcoPro Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <nav style={{ width: 200, background: 'white', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 10px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Menu</div>
          {NAV.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                background: tab === item.key ? 'var(--brand-muted)' : 'transparent',
                border: 'none', borderLeft: tab === item.key ? '3px solid var(--brand)' : '3px solid transparent',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                color: tab === item.key ? 'var(--brand)' : 'var(--text)',
                fontWeight: tab === item.key ? 600 : 400, width: '100%',
              }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.key === 'leads' && leads.length > 0 && (
                <span style={{ background: 'var(--warn)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>{leads.length}</span>
              )}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setTab('kozijnlab')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              ⚡ Nieuwe verkoop
            </button>
          </div>
        </nav>

        {/* ── Main ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

          {/* KozijnLAB iframe — altijd gemount, alleen getoond als actief */}
          <div style={{ position: 'absolute', inset: 0, display: tab === 'kozijnlab' ? 'block' : 'none', zIndex: 1 }}>
            <iframe ref={iframeRef} src="/KozijnLAB/index.html"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="KozijnLAB Configurator" />
          </div>

          {/* Dashboard */}
          {tab === 'dashboard' && (
            <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Verkoopoverzicht</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
                {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Actieve leads',         value: leads.length,         icon: '👥', color: 'var(--warn)',    isNum: true },
                  { label: 'Uitstaande offertes',   value: offertes.length,      icon: '📄', color: 'var(--brand)',   isNum: true },
                  { label: 'Openstaande waarde',    value: formatEuro(openValue), icon: '💶', color: 'var(--success)', isNum: false },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 10 }}>
                      {s.icon} {s.label}
                    </div>
                    <div style={{ fontSize: s.isNum ? 32 : 22, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 22 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Snelle acties</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setTab('kozijnlab')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    ⚡ Open KozijnLAB configurator
                  </button>
                  <Link href="/beheer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '10px 18px', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                    📋 Naar orderbeheer
                  </Link>
                </div>
              </div>

              {leads.length > 0 && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>Recente leads</div>
                  {leads.slice(0, 6).map((o, i) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < Math.min(leads.length, 6) - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{o.customer_address}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--brand)' }}>{formatEuro(o.total_amount)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{formatDate(o.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {leads.length === 0 && !loading && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>Begin je eerste verkoop</div>
                  <div style={{ fontSize: 13, marginBottom: 18 }}>Open KozijnLAB, configureer de kozijnen bij de klant thuis en zet de offerte door.</div>
                  <button onClick={() => setTab('kozijnlab')}
                    style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    ⚡ Open KozijnLAB
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Leads */}
          {tab === 'leads' && (
            <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Leads <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({leads.length})</span></div>
                <button onClick={() => setTab('kozijnlab')}
                  style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  + Nieuwe lead via KozijnLAB
                </button>
              </div>
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laden…</div>
              ) : leads.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Nog geen leads</div>
                  <div style={{ fontSize: 13 }}>Maak een offerte in KozijnLAB en zet hem door naar EcoPro.</div>
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {leads.map((o, i) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < leads.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customer_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>📍 {o.customer_address}</div>
                        {o.customer_email && <div style={{ color: 'var(--text-light)', fontSize: 11, marginTop: 2 }}>✉ {o.customer_email}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 14 }}>{formatEuro(o.total_amount)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{formatDate(o.created_at)}</div>
                        <Link href="/beheer" style={{ fontSize: 11, color: 'var(--brand)', textDecoration: 'none', marginTop: 4, display: 'block' }}>Beheer →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Offertes */}
          {tab === 'offertes' && (
            <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
                Offertes <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({offertes.length})</span>
              </div>
              {offertes.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Geen offertes</div>
                  <div style={{ fontSize: 13 }}>Orders in fase 0 en 1 verschijnen hier.</div>
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {offertes.map((o, i) => {
                    const ph = getPhase(o.phase)
                    return (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < offertes.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customer_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>📍 {o.customer_address}</div>
                          <span className={`badge ${ph.badgeClass}`} style={{ fontSize: 11, marginTop: 6, display: 'inline-block' }}>{ph.adminLabel}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 14 }}>{formatEuro(o.total_amount)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{formatDate(o.created_at)}</div>
                          <Link href="/beheer" style={{ fontSize: 11, color: 'var(--brand)', textDecoration: 'none', marginTop: 4, display: 'block' }}>Beheer →</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Planning */}
          {tab === 'planning' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: 320 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Verkoopplanning</div>
                <div style={{ fontSize: 14 }}>Afspraken en bezoeken bijhouden — komt binnenkort beschikbaar.</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Bevestigingsmodal ─────────────────────────────────────── */}
      {confirmData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Doorsturen naar EcoPro?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              De KozijnLAB offerte wordt omgezet naar een nieuwe order in het dashboard.
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                {confirmData.customer?.name || '—'}
              </div>
              {confirmData.customer?.address && (
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                  📍 {[confirmData.customer.address, confirmData.customer.postcode, confirmData.customer.city].filter(Boolean).join(' ')}
                </div>
              )}
              {confirmData.customer?.email && <div style={{ color: 'var(--text-muted)' }}>✉ {confirmData.customer.email}</div>}
              {confirmData.customer?.phone && <div style={{ color: 'var(--text-muted)' }}>📞 {confirmData.customer.phone}</div>}

              {(confirmData.elements || []).length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Elementen ({confirmData.elements.length})
                  </div>
                  {confirmData.elements.map((el, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i < confirmData.elements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span>{el.qty}× {el.name} <span style={{ color: 'var(--text-muted)' }}>({el.dimensions?.widthMM}×{el.dimensions?.heightMM}mm)</span></span>
                      <span style={{ fontWeight: 600 }}>{fmtEuro(el.priceTotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Totaal incl. BTW</span>
                <span style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 18 }}>{fmtEuro(confirmData.totals?.gross)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Offerte {confirmData.offerCode}</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmData(null)} disabled={submitting}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                Annuleren
              </button>
              <button onClick={() => createOrder(confirmData)} disabled={submitting}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                {submitting ? 'Aanmaken…' : '→ Maak order aan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className="animate-fade" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

function fmtEuro(n) {
  return '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',')
}
