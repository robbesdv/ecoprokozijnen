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

function getInvoiceConfig(type, order) {
  const year = new Date().getFullYear()
  const shortId = (order?.id || '').slice(0, 8).toUpperCase()
  const ref = order?.crm_reference || shortId

  switch (type) {
    case 'aanbetaling':
      return {
        title: 'Factuur — Aanbetaling',
        subtitle: '20% bij akkoord',
        factuurNr: `F${year}-${shortId}-1`,
        amount: calcDeposit(order?.total_amount || 0),
        lineDesc: `Aanbetaling (20%) kozijnen project — ref. ${ref}`,
        payTerm: 'Direct bij ontvangst',
        reference: `Aanbetaling ${shortId}`,
        factuurLabel: 'Factuur 1 van 2',
      }
    case 'slotfactuur':
      return {
        title: 'Factuur — Slotfactuur',
        subtitle: '80% na montage',
        factuurNr: `F${year}-${shortId}-2`,
        amount: calcMain(order?.total_amount || 0, 'full_80'),
        lineDesc: `Slotfactuur (80%) kozijnen project — ref. ${ref}`,
        payTerm: '14 dagen na factuurdatum',
        reference: `Restbetaling ${shortId}`,
        factuurLabel: 'Factuur 2 van 2',
      }
    case 'hoofdfactuur':
      return {
        title: 'Factuur — Betaling na montage',
        subtitle: '70% na montage',
        factuurNr: `F${year}-${shortId}-2`,
        amount: calcMain(order?.total_amount || 0, 'split_70_10'),
        lineDesc: `Betaling na montage (70%) kozijnen project — ref. ${ref}`,
        payTerm: '14 dagen na factuurdatum',
        reference: `Restbetaling ${shortId}`,
        factuurLabel: 'Factuur 2 van 3',
      }
    case 'slotbetaling':
      return {
        title: 'Factuur — Slotbetaling',
        subtitle: '10% na oplevering',
        factuurNr: `F${year}-${shortId}-3`,
        amount: calcFinal(order?.total_amount || 0),
        lineDesc: `Slotbetaling (10%) kozijnen project — ref. ${ref}`,
        payTerm: 'Direct na oplevering',
        reference: `Slotbetaling ${shortId}`,
        factuurLabel: 'Factuur 3 van 3',
      }
    default:
      return null
  }
}

export default function FactuurPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const { token, type } = params

  const [order, setOrder] = useState(null)
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
    }
    load()
  }, [token])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Factuur laden…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Factuur niet gevonden. Controleer de link.</p>
    </div>
  )

  const cfg = getInvoiceConfig(type, order)
  if (!cfg) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>Ongeldig factuurtype.</p>
    </div>
  )

  const amountExcl = Math.round((cfg.amount / 1.21) * 100) / 100
  const amountBtw = Math.round((cfg.amount - amountExcl) * 100) / 100
  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const items = (order.order_items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

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

      {/* Print button toolbar */}
      <div className="no-print" style={{
        background: '#1A3B2A', color: 'white', padding: '12px 24px',
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

      {/* Invoice */}
      <div style={{ padding: '32px 16px 60px', minHeight: '100vh' }}>
        <div className="invoice-page" style={{
          maxWidth: 760, margin: '0 auto', background: 'white',
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: '#1A3B2A', padding: '28px 36px 24px', color: 'white' }}>
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
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#C8A96E' }}>FACTUUR</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{cfg.factuurLabel}</div>
              </div>
            </div>
          </div>

          {/* Gold divider */}
          <div style={{ height: 3, background: '#C8A96E' }} />

          {/* Invoice meta + customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '28px 36px', borderBottom: '1px solid #E5E7EB' }}>
            {/* Customer */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 10 }}>Factuur aan</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 4 }}>{order.customer_name}</div>
              {order.customer_address && (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  {order.customer_address.split(',').map((line, i) => <div key={i}>{line.trim()}</div>)}
                </div>
              )}
              {order.customer_email && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{order.customer_email}</div>}
            </div>

            {/* Invoice meta */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 10 }}>Factuurgegevens</div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  {[
                    ['Factuurnummer', cfg.factuurNr],
                    ['Factuurdatum', today],
                    ['Betalingstermijn', cfg.payTerm],
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

          {/* Line items — reference overview */}
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

            {/* Project total (reference) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingRight: 12 }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Totaal project incl. BTW: <strong style={{ color: '#374151' }}>{eur(order.total_amount)}</strong>
              </div>
            </div>
          </div>

          {/* Installment section */}
          <div style={{ margin: '24px 36px', background: '#F0F7F2', border: '1px solid #BBF7D0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1A3B2A', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  <tr style={{ borderTop: '2px solid #1A3B2A' }}>
                    <td style={{ padding: '10px 0 5px', fontWeight: 700, fontSize: 15, color: '#1A3B2A' }}>Totaal te betalen</td>
                    <td style={{ padding: '10px 0 5px', textAlign: 'right', fontWeight: 800, fontSize: 18, color: '#1A3B2A' }}>{eur(cfg.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment details */}
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
