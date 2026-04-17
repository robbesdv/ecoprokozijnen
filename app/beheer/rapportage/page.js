'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/phases'
import Link from 'next/link'

export default function RapportagePage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [])

  // ── Berekeningen ─────────────────────────────────────────────────────────

  const MAANDEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

  // Omzet per maand (op basis van aanmaakdatum)
  const omzetPerMaand = MAANDEN.map((_, idx) => {
    const maandOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getFullYear() === year && d.getMonth() === idx
    })
    return {
      label: MAANDEN[idx],
      omzet: maandOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
      aantal: maandOrders.length,
    }
  })

  const maxOmzet = Math.max(...omzetPerMaand.map(m => m.omzet), 1)

  // Totalen
  const totaalOmzet     = orders.filter(o => new Date(o.created_at).getFullYear() === year).reduce((s, o) => s + (o.total_amount || 0), 0)
  const totaalOffertes  = orders.filter(o => new Date(o.created_at).getFullYear() === year).length
  const geaccordeerd    = orders.filter(o => new Date(o.created_at).getFullYear() === year && o.phase >= 1).length
  const conversie       = totaalOffertes > 0 ? Math.round((geaccordeerd / totaalOffertes) * 100) : 0

  // Openstaande betalingen
  const openAanbetaling = orders.filter(o => o.phase >= 1 && !o.deposit_confirmed)
  const openRestbetaling = orders.filter(o => o.phase >= 6 && !o.main_payment_confirmed)
  const openSlot         = orders.filter(o => o.payment_split === 'split_70_10' && o.main_payment_confirmed && !o.final_payment_confirmed)

  const totaalOpenstaand = [
    ...openAanbetaling.map(o => o.total_amount * 0.2),
    ...openRestbetaling.map(o => o.total_amount * (o.payment_split === 'split_70_10' ? 0.7 : 0.8)),
    ...openSlot.map(o => o.total_amount * 0.1),
  ].reduce((s, v) => s + v, 0)

  // Recent (laatste 5 orders)
  const recent = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  const beschikbareJaren = [...new Set(orders.map(o => new Date(o.created_at).getFullYear()))].sort((a, b) => b - a)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Laden…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>

      {/* Header */}
      <header style={{ background: 'var(--brand)', color: 'white', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/beheer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>← Dashboard</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Rapportage</span>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
        >
          {beschikbareJaren.map(y => <option key={y} value={y} style={{ color: 'black', background: 'white' }}>{y}</option>)}
          {!beschikbareJaren.includes(year) && <option value={year} style={{ color: 'black', background: 'white' }}>{year}</option>}
        </select>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* KPI kaarten */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Totale omzet', value: formatEuro(totaalOmzet), sub: `${year}`, color: 'var(--brand)' },
            { label: 'Offertes verstuurd', value: totaalOffertes, sub: `in ${year}` },
            { label: 'Conversie', value: `${conversie}%`, sub: `${geaccordeerd} van ${totaalOffertes} geaccordeerd`, color: conversie >= 50 ? 'var(--success)' : 'var(--warn)' },
            { label: 'Openstaand', value: formatEuro(totaalOpenstaand), sub: `${openAanbetaling.length + openRestbetaling.length + openSlot.length} betalingen`, color: totaalOpenstaand > 0 ? 'var(--warn)' : 'var(--success)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color || 'var(--text)', letterSpacing: '-0.02em' }}>{k.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Omzet grafiek */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Omzet per maand</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{year}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
            {omzetPerMaand.map((m, idx) => {
              const hoogte = m.omzet > 0 ? Math.max((m.omzet / maxOmzet) * 140, 4) : 0
              const isHuidigeMaand = new Date().getMonth() === idx && new Date().getFullYear() === year
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {m.omzet > 0 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatEuro(m.omzet).replace('€\u00a0', '€').replace(',00', '')}
                    </div>
                  )}
                  <div style={{
                    width: '100%', height: hoogte || 3,
                    background: isHuidigeMaand ? 'var(--brand)' : hoogte > 0 ? 'var(--brand-muted)' : '#F3F4F6',
                    borderRadius: '4px 4px 0 0',
                    border: isHuidigeMaand ? 'none' : hoogte > 0 ? '1px solid var(--brand-border)' : 'none',
                    transition: 'height 0.3s',
                    cursor: m.omzet > 0 ? 'default' : 'default',
                  }} title={`${m.label}: ${formatEuro(m.omzet)}`} />
                  <div style={{ fontSize: 10, color: isHuidigeMaand ? 'var(--brand)' : 'var(--text-muted)', fontWeight: isHuidigeMaand ? 700 : 400 }}>{m.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Twee kolommen: openstaand + funnnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Openstaande betalingen */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Openstaande betalingen</div>
            {openAanbetaling.length === 0 && openRestbetaling.length === 0 && openSlot.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>✓ Alles betaald</p>
            ) : (
              <>
                {openAanbetaling.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Aanbetaling (20%)</div>
                    {openAanbetaling.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{o.customer_name}</span>
                        <span style={{ fontWeight: 600 }}>{formatEuro(o.total_amount * 0.2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {openRestbetaling.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Restbetaling</div>
                    {openRestbetaling.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{o.customer_name}</span>
                        <span style={{ fontWeight: 600 }}>{formatEuro(o.total_amount * (o.payment_split === 'split_70_10' ? 0.7 : 0.8))}</span>
                      </div>
                    ))}
                  </div>
                )}
                {openSlot.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Slotbetaling (10%)</div>
                    {openSlot.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{o.customer_name}</span>
                        <span style={{ fontWeight: 600 }}>{formatEuro(o.total_amount * 0.1)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <span>Totaal openstaand</span>
                  <span style={{ color: 'var(--warn)' }}>{formatEuro(totaalOpenstaand)}</span>
                </div>
              </>
            )}
          </div>

          {/* Conversie funnel */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Offerte funnel</div>
            {[
              { label: 'Offertes verstuurd', count: totaalOffertes, color: '#E5E7EB', pct: 100 },
              { label: 'Geaccordeerd',       count: geaccordeerd, color: 'var(--brand-muted)', pct: totaalOffertes > 0 ? (geaccordeerd / totaalOffertes) * 100 : 0 },
              { label: 'Aanbetaling ontvangen', count: orders.filter(o => new Date(o.created_at).getFullYear() === year && o.deposit_confirmed).length, color: '#C8E6C9', pct: totaalOffertes > 0 ? (orders.filter(o => new Date(o.created_at).getFullYear() === year && o.deposit_confirmed).length / totaalOffertes) * 100 : 0 },
              { label: 'Volledig afgerond',  count: orders.filter(o => new Date(o.created_at).getFullYear() === year && o.phase === 7).length, color: 'var(--success-bg)', pct: totaalOffertes > 0 ? (orders.filter(o => new Date(o.created_at).getFullYear() === year && o.phase === 7).length / totaalOffertes) * 100 : 0 },
            ].map((s, idx) => (
              <div key={s.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{s.count}</span>
                </div>
                <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: idx === 0 ? '#D1D5DB' : 'var(--brand)', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recente orders */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Recente orders</div>
          {recent.map((o, idx) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < recent.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{o.customer_address}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{formatEuro(o.total_amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(o.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}