'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import { calcDeposit, calcMain, calcFinal } from '@/lib/phases'

const COMPANY = {
  name: 'EcoPro Kozijnen B.V.',
  iban: 'NL37ABNA0126549974',
  ibanFormatted: 'NL37 ABNA 0126 5499 74',
  bic: 'ABNANL2A',
  bankName: 'ABN-AMRO',
  phone: '085 049 24 56',
  email: 'info@ecoprokozijnen.nl',
  fullAddress: 'Plataanstraat 20H, 7545MX Enschede',
  kvk: '91269458',
  btw: 'NL862832451B01',
}

const eur = (v) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : null

function getInvoiceConfig(type, order) {
  const year = new Date().getFullYear()
  const shortId = (order?.id || '').slice(0, 8).toUpperCase()
  const ref = order?.crm_reference || shortId

  switch (type) {
    case 'aanbetaling':
      return {
        kind: 'factuur',
        title: 'Factuur — Aanbetaling',
        subtitle: '20% bij akkoord',
        factuurNr: `F${year}-${shortId}-1`,
        factuurLabel: 'Factuur 1 van 2',
        amount: calcDeposit(order?.total_amount || 0),
        lineDesc: `Aanbetaling (20%) kozijnen project — ref. ${ref}`,
        payTerm: 'Direct bij ontvangst',
        reference: `Aanbetaling ${shortId}`,
      }
    case 'slotfactuur':
      return {
        kind: 'factuur',
        title: 'Factuur — Slotfactuur',
        subtitle: '80% na montage',
        factuurNr: `F${year}-${shortId}-2`,
        factuurLabel: 'Factuur 2 van 2',
        amount: calcMain(order?.total_amount || 0, 'full_80'),
        lineDesc: `Slotfactuur (80%) kozijnen project — ref. ${ref}`,
        payTerm: 'Binnen 5 dagen na factuurdatum',
        reference: `Restbetaling ${shortId}`,
      }
    case 'hoofdfactuur':
      return {
        kind: 'factuur',
        title: 'Factuur — Betaling na montage',
        subtitle: '70% na montage',
        factuurNr: `F${year}-${shortId}-2`,
        factuurLabel: 'Factuur 2 van 3',
        amount: calcMain(order?.total_amount || 0, 'split_70_10'),
        lineDesc: `Betaling na montage (70%) kozijnen project — ref. ${ref}`,
        payTerm: 'Binnen 5 dagen na factuurdatum',
        reference: `Restbetaling ${shortId}`,
      }
    case 'slotbetaling':
      return {
        kind: 'factuur',
        title: 'Factuur — Slotbetaling',
        subtitle: '10% na oplevering',
        factuurNr: `F${year}-${shortId}-3`,
        factuurLabel: 'Factuur 3 van 3',
        amount: calcFinal(order?.total_amount || 0),
        lineDesc: `Slotbetaling (10%) kozijnen project — ref. ${ref}`,
        payTerm: 'Binnen 5 dagen na factuurdatum',
        reference: `Slotbetaling ${shortId}`,
      }
    case 'bewijs-aanbetaling':
      return {
        kind: 'bewijs',
        title: 'Betalingsbewijs — Aanbetaling',
        subtitle: '20% aanbetaling',
        factuurNr: `BW${year}-${shortId}-1`,
        factuurLabel: 'Bewijs 1',
        amount: calcDeposit(order?.total_amount || 0),
        lineDesc: `Aanbetaling (20%) kozijnen project — ref. ${ref}`,
        reference: `Aanbetaling ${shortId}`,
        confirmedField: 'deposit_confirmed',
        paidAtField: 'deposit_paid_at',
      }
    case 'bewijs-slotfactuur':
      return {
        kind: 'bewijs',
        title: 'Betalingsbewijs — Slotfactuur',
        subtitle: '80% restbetaling',
        factuurNr: `BW${year}-${shortId}-2`,
        factuurLabel: 'Bewijs 2',
        amount: calcMain(order?.total_amount || 0, 'full_80'),
        lineDesc: `Slotfactuur (80%) kozijnen project — ref. ${ref}`,
        reference: `Restbetaling ${shortId}`,
        confirmedField: 'main_payment_confirmed',
        paidAtField: 'main_paid_at',
      }
    case 'bewijs-hoofdfactuur':
      return {
        kind: 'bewijs',
        title: 'Betalingsbewijs — Betaling na montage',
        subtitle: '70% na montage',
        factuurNr: `BW${year}-${shortId}-2`,
        factuurLabel: 'Bewijs 2',
        amount: calcMain(order?.total_amount || 0, 'split_70_10'),
        lineDesc: `Betaling na montage (70%) kozijnen project — ref. ${ref}`,
        reference: `Restbetaling ${shortId}`,
        confirmedField: 'main_payment_confirmed',
        paidAtField: 'main_paid_at',
      }
    case 'bewijs-slotbetaling':
      return {
        kind: 'bewijs',
        title: 'Betalingsbewijs — Slotbetaling',
        subtitle: '10% slotbetaling',
        factuurNr: `BW${year}-${shortId}-3`,
        factuurLabel: 'Bewijs 3',
        amount: calcFinal(order?.total_amount || 0),
        lineDesc: `Slotbetaling (10%) kozijnen project — ref. ${ref}`,
        reference: `Slotbetaling ${shortId}`,
        confirmedField: 'final_payment_confirmed',
        paidAtField: 'final_paid_at',
      }
    default:
      return null
  }
}

export default function FactuurPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const { token, type } = params

  const [order, setOrder] = useState(null)
  const [paidAt, setPaidAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('portal_token', token)
        .single()

      setLoading(false)
      if (!data) { setNotFound(true); return }

      if (data.total_amount == null) {
        const sum = (data.order_items || []).reduce(
          (s, i) => s + (i.unit_price || 0) * (i.quantity || 1), 0
        )
        data.total_amount = Math.round(sum * 1.21 * 100) / 100
      }
      setOrder(data)

      // Load payment date from status_history for bewijs types
      if (type.startsWith('bewijs-')) {
        // Map bewijs type → what to look for in status_history
        const phaseMap = {
          'bewijs-aanbetaling': 2,      // deposit → phase 2
          'bewijs-slotfactuur': 7,      // main full_80 → phase 7
          'bewijs-hoofdfactuur': null,  // split 70% → no phase change, use note
          'bewijs-slotbetaling': 7,     // final → phase 7
        }
        const targetPhase = phaseMap[type]

        const { data: hist } = await supabase
          .from('status_history')
          .select('created_at, note')
          .eq('order_id', data.id)
          .eq('changed_by', 'mollie_webhook')
          .order('created_at', { ascending: false })

        if (hist?.length) {
          // Try to find matching entry by phase or note
          let entry = null
          if (type === 'bewijs-hoofdfactuur') {
            entry = hist.find(h => {
              try { return JSON.parse(h.note)?.payment_type === 'main' } catch { return false }
            })
          } else {
            entry = hist.find(h => {
              if (targetPhase) {
                try {
                  const n = JSON.parse(h.note || '{}')
                  if (n.to_phase === targetPhase) return true
                } catch {}
              }
              try { return JSON.parse(h.note || '{}')?.payment_type === type.replace('bewijs-', '').replace('slotfactuur', 'main').replace('hoofdfactuur', 'main').replace('aanbetaling', 'deposit').replace('slotbetaling', 'final') } catch { return false }
            }) || hist[0]
          }
          if (entry) setPaidAt(entry.created_at)
        }

        // Also try order field directly (if deposit_paid_at / main_paid_at / final_paid_at exists)
        const fieldMap = {
          'bewijs-aanbetaling': data.deposit_paid_at,
          'bewijs-slotfactuur': data.main_paid_at,
          'bewijs-hoofdfactuur': data.main_paid_at,
          'bewijs-slotbetaling': data.final_paid_at,
        }
        if (fieldMap[type]) setPaidAt(fieldMap[type])
      }
    }
    load()
  }, [token, type])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Document laden…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Niet gevonden. Controleer de link.</p>
    </div>
  )

  const cfg = getInvoiceConfig(type, order)
  if (!cfg) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Ongeldig documenttype.</p>
    </div>
  )

  // For bewijs: check payment was actually confirmed
  if (cfg.kind === 'bewijs' && !order[cfg.confirmedField]) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: '#666', fontSize: 15 }}>Betaling nog niet bevestigd.</p>
      <p style={{ color: '#999', fontSize: 13 }}>Dit betalingsbewijs is beschikbaar zodra de betaling is ontvangen.</p>
    </div>
  )

  const amountExcl = Math.round((cfg.amount / 1.21) * 100) / 100
  const amountBtw = Math.round((cfg.amount - amountExcl) * 100) / 100
  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const items = (order.order_items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  const isBewijs = cfg.kind === 'bewijs'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        body { margin: 0; padding: 0; background: #f0f0f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        background: isBewijs ? '#1A4B6A' : '#1A3B2A', color: 'white', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="EcoPro" style={{ width: 28, height: 28, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 2 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>EcoPro Kozijnen</span>
          <span style={{ opacity: 0.5, fontSize: 13 }}>— {cfg.title}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.history.back()}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Terug
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: '#C8A96E', border: 'none', color: 'white', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🖨 Afdrukken / Download PDF
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 16px 60px', minHeight: '100vh' }}>
        <div className="invoice-page" style={{
          maxWidth: 760, margin: '0 auto', background: 'white',
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: isBewijs ? '#1A4B6A' : '#1A3B2A', padding: '28px 36px 24px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {LOGO_BASE64 && (
                  <img src={LOGO_BASE64} alt="EcoPro" style={{ width: 44, height: 44, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>EcoPro Kozijnen</div>
                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{COMPANY.fullAddress}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#C8A96E' }}>
                  {isBewijs ? 'BETALINGSBEWIJS' : 'FACTUUR'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{cfg.factuurLabel}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 3, background: '#C8A96E' }} />

          {/* Meta + customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '28px 36px', borderBottom: '1px solid #E5E7EB' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 10 }}>
                {isBewijs ? 'Betaald door' : 'Factuur aan'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 4 }}>{order.customer_name}</div>
              {order.customer_address && (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  {order.customer_address.split(',').map((line, i) => <div key={i}>{line.trim()}</div>)}
                </div>
              )}
              {order.customer_email && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{order.customer_email}</div>}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 10 }}>
                {isBewijs ? 'Bewijsgegevens' : 'Factuurgegevens'}
              </div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  {[
                    [isBewijs ? 'Bewijsnummer' : 'Factuurnummer', cfg.factuurNr],
                    [isBewijs ? 'Datum betaling' : 'Factuurdatum', isBewijs ? (fmtDate(paidAt) || today) : today],
                    ...(!isBewijs ? [['Betalingstermijn', cfg.payTerm]] : [['Betaalmethode', 'iDEAL']]),
                    ['Ordernummer', (order.crm_reference || order.id.slice(0, 8).toUpperCase())],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ color: '#6B7280', paddingBottom: 6, paddingRight: 12, whiteSpace: 'nowrap' }}>{label}</td>
                      <td style={{ fontWeight: 600, color: '#111', paddingBottom: 6 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* For bewijs: confirmation banner */}
          {isBewijs && (
            <div style={{ margin: '24px 36px 0', padding: '16px 20px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, background: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20, color: 'white' }}>✓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#15803D' }}>Betaling ontvangen en bevestigd</div>
                <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>
                  EcoPro Kozijnen heeft uw betaling van <strong>{eur(cfg.amount)}</strong> ontvangen via iDEAL.
                  {paidAt && ` Datum: ${fmtDate(paidAt)}.`}
                </div>
              </div>
            </div>
          )}

          {/* Project items (reference) */}
          <div style={{ padding: '24px 36px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 14 }}>
              Projectoverzicht (ter referentie)
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Omschrijving</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', width: 60 }}>Aantal</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', width: 110 }}>Bedrag incl. BTW</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 12px', color: '#374151', lineHeight: 1.4 }}>{item.description}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B7280' }}>{item.quantity}×</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>
                      {eur((item.unit_price || 0) * (item.quantity || 1) * 1.21)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingRight: 12 }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Totaal project incl. BTW: <strong style={{ color: '#374151' }}>{eur(order.total_amount)}</strong>
              </div>
            </div>
          </div>

          {/* Amount section */}
          <div style={{ margin: '24px 36px', background: isBewijs ? '#EFF6FF' : '#F0F7F2', border: `1px solid ${isBewijs ? '#93C5FD' : '#BBF7D0'}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: isBewijs ? '#1A4B6A' : '#1A3B2A', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{cfg.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{cfg.subtitle}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 22, color: '#C8A96E' }}>{eur(cfg.amount)}</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px 0', color: '#374151' }}>{cfg.lineDesc}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: '#374151' }}>{eur(amountExcl)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '5px 0', color: '#6B7280' }}>BTW 21%</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: '#6B7280' }}>{eur(amountBtw)}</td>
                  </tr>
                  <tr style={{ borderTop: `2px solid ${isBewijs ? '#1A4B6A' : '#1A3B2A'}` }}>
                    <td style={{ padding: '10px 0 5px', fontWeight: 700, fontSize: 15, color: isBewijs ? '#1A4B6A' : '#1A3B2A' }}>
                      {isBewijs ? 'Betaald bedrag' : 'Totaal te betalen'}
                    </td>
                    <td style={{ padding: '10px 0 5px', textAlign: 'right', fontWeight: 800, fontSize: 18, color: isBewijs ? '#1A4B6A' : '#1A3B2A' }}>{eur(cfg.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment details (only for invoice, not bewijs) */}
          {!isBewijs && (
            <div style={{ margin: '0 36px 28px', padding: '20px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 14 }}>Betaalinformatie</div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  {[
                    ['Tenaamstelling', COMPANY.name],
                    ['Bank', COMPANY.bankName],
                    ['IBAN', COMPANY.ibanFormatted],
                    ['BIC', COMPANY.bic],
                    ['Omschrijving', cfg.reference],
                    ['Bedrag', eur(cfg.amount)],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ paddingBottom: 6, paddingRight: 20, color: '#92400E', whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</td>
                      <td style={{ paddingBottom: 6, fontWeight: label === 'IBAN' || label === 'Omschrijving' || label === 'Bedrag' ? 700 : 400, color: '#78350F', fontFamily: label === 'IBAN' ? 'monospace' : 'inherit', letterSpacing: label === 'IBAN' ? '0.05em' : 0 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bewijs: reference info */}
          {isBewijs && (
            <div style={{ margin: '0 36px 28px', padding: '20px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 14 }}>Betalingsreferentie</div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  {[
                    ['Betaald aan', COMPANY.name],
                    ['IBAN', COMPANY.ibanFormatted],
                    ['Omschrijving', cfg.reference],
                    ['Betaalwijze', 'iDEAL'],
                    ['Status', '✓ Betaling bevestigd'],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ paddingBottom: 6, paddingRight: 20, color: '#166534', whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</td>
                      <td style={{ paddingBottom: 6, fontWeight: label === 'Status' ? 700 : 400, color: label === 'Status' ? '#15803D' : '#14532D', fontFamily: label === 'IBAN' ? 'monospace' : 'inherit' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Company footer */}
          <div style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB', padding: '16px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#9CA3AF' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>{COMPANY.name}</div>
              <div>{COMPANY.fullAddress} · {COMPANY.phone} · {COMPANY.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>KVK: {COMPANY.kvk}</div>
              <div>BTW: {COMPANY.btw}</div>
              <div>IBAN: {COMPANY.ibanFormatted}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
