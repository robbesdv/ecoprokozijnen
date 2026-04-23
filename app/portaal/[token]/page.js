'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import {
  CUSTOMER_STEPS,
  getCustomerStep,
  calcDeposit,
  calcMain,
  calcFinal,
  formatEuro,
  formatDate,
} from '@/lib/phases'
import { KozijnSVG, kozijnSVGString, svgToPngDataUrl, ralName, PANE_NAMES } from '@/lib/KozijnSVG'

const COMPANY = {
  name: 'EcoPro Kozijnen B.V.',
  iban: 'NL37ABNA0126549974',
  bic: 'ABNANL2A',
  bankName: 'ABN-AMBRO',
  phone: '085 049 24 56',
  phoneHref: '+31850492456',
  whatsappHref: 'https://wa.me/31850492456',
  email: 'info@ecoprokozijnen.nl',
  address: 'Plataanstraat 20H, Enschede',
  fullAddress: 'Plataanstraat 20H, 7545MX Enschede',
  kvk: '91269458',
  termsUrl: 'https://ecoprokozijnen.nl/algemene-voorwaarden',
  privacyUrl: 'https://ecoprokozijnen.nl/privacy-policy-2',
  contactName: 'Matthew van Delden',
  contactRole: 'Account Manager',
}

export default function PortaalPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const { token } = params

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadOrder()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), defects(*), order_files(*)')
      .eq('portal_token', token)
      .single()

    setLoading(false)

    if (!data) {
      setNotFound(true)
      return
    }

    setOrder(data)

    supabase
      .from('orders')
      .update({ portal_accessed_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {})
  }

  async function refresh() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), defects(*), order_files(*)')
      .eq('portal_token', token)
      .single()

    if (data) setOrder(data)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  if (loading) {
    return (
      <Shell>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--brand-muted)',
              borderTopColor: 'var(--brand)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Uw order laden…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Shell>
    )
  }

  if (notFound) {
    return (
      <Shell>
        <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'var(--brand-muted)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}
          >
            🔍
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Link niet gevonden</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            Deze portaallink is ongeldig of verlopen. Neem contact op met EcoPro Kozijnen voor een
            nieuwe link.
          </p>
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className="btn btn-primary btn-lg btn-full"
            style={{ marginBottom: 10 }}
          >
            📞 Bel ons
          </a>
          <a href={`mailto:${COMPANY.email}`} className="btn btn-secondary btn-full">
            ✉ Stuur een e-mail
          </a>
        </div>
      </Shell>
    )
  }

  const currentStep = getCustomerStep(order.phase)

  return (
    <Shell customerName={order.customer_name}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 0' }}>
          <StepNav currentStep={currentStep} />
        </div>
      </div>

      <div
        style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 60px' }}
        className="animate-fade"
      >
        <ProjectSummary order={order} />
        <PhaseContent order={order} onRefresh={refresh} showToast={showToast} />
      </div>

      {toast && (
        <div
          className="animate-fade"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children, customerName }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header style={{ background: 'var(--brand)', color: 'white', flexShrink: 0 }}>
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.png"
              alt="EcoPro"
              style={{
                width: 36,
                height: 36,
                objectFit: 'contain',
                background: 'white',
                borderRadius: 8,
                padding: 3,
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
                EcoPro Kozijnen
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 1,
                }}
              >
                Mijn portaal
              </div>
            </div>
          </div>

          {customerName && (
            <div
              style={{
                fontSize: 13,
                padding: '5px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 500,
              }}
            >
              {customerName}
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <footer style={{ borderTop: '1px solid var(--border)', background: 'white', padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <a
            href={`tel:${COMPANY.phoneHref}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 14px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            📞 {COMPANY.phone}
          </a>

          <a
            href={COMPANY.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#15803D',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            💬 WhatsApp
          </a>

          <a
            href={`mailto:${COMPANY.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 14px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ✉ E-mail
          </a>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <a
            href={COMPANY.termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#334155',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            📄 Algemene voorwaarden
          </a>

          <a
            href={COMPANY.privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#334155',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            🔒 Privacybeleid
          </a>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-light)', margin: 0, textAlign: 'center' }}>
          EcoPro Kozijnen · {COMPANY.address}
        </p>
      </footer>
    </div>
  )
}

function StepNav({ currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {CUSTOMER_STEPS.map((step, idx) => {
        const done = idx < currentStep
        const active = idx === currentStep

        return (
          <div
            key={step.label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {idx > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 13,
                  right: '50%',
                  left: '-50%',
                  height: 2,
                  background: done ? 'var(--brand)' : 'var(--border)',
                  transition: 'background 0.4s',
                }}
              />
            )}

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                position: 'relative',
                zIndex: 1,
                background: done ? 'var(--brand)' : active ? 'var(--accent)' : 'white',
                border: `2px solid ${
                  done ? 'var(--brand)' : active ? 'var(--accent)' : 'var(--border)'
                }`,
                color: done ? 'white' : active ? 'var(--brand)' : 'var(--text-light)',
                transition: 'all 0.3s',
                boxShadow: active ? '0 0 0 4px rgba(200,169,110,0.2)' : 'none',
              }}
            >
              {done ? '✓' : idx + 1}
            </div>

            <div
              style={{
                fontSize: 10,
                marginTop: 5,
                textAlign: 'center',
                lineHeight: 1.2,
                fontWeight: active ? 700 : 400,
                color: active ? 'var(--brand)' : done ? 'var(--text)' : 'var(--text-light)',
              }}
            >
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProjectSummary({ order }) {
  const reference = order.id?.slice(0, 8).toUpperCase()
  const totalItems = (order.order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <div className="card-elevated" style={{ overflow: 'hidden', marginBottom: 20 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--brand), #234B36)',
          padding: '18px 20px',
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.65)',
            marginBottom: 6,
          }}
        >
          Projectoverzicht
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {order.customer_name}
        </div>
        {order.customer_address && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>
            {order.customer_address}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '14px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          background: 'white',
        }}
      >
        <SummaryStat label="Orderreferentie" value={reference || '-'} />
        <SummaryStat label="Totaalbedrag" value={formatEuro(order.total_amount || 0)} />
        <SummaryStat label="Aantal onderdelen" value={String(totalItems)} />
        <SummaryStat label="Status" value={phaseLabel(order.phase)} />
      </div>
    </div>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: '#FCFCFB',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function ContactCard() {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={S.sectionTitle}>Uw contactpersoon</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'var(--brand-muted)',
            color: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {COMPANY.contactName
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{COMPANY.contactName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {COMPANY.contactRole}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <a href={`tel:${COMPANY.phoneHref}`} className="btn btn-ghost" style={{ flex: 1, minWidth: 120 }}>
          📞 Bellen
        </a>
        <a
          href={COMPANY.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ flex: 1, minWidth: 120 }}
        >
          💬 WhatsApp
        </a>
        <a
          href={`mailto:${COMPANY.email}`}
          className="btn btn-ghost"
          style={{ flex: 1, minWidth: 120 }}
        >
          ✉ E-mail
        </a>
      </div>
    </div>
  )
}

function PhaseContent({ order, onRefresh, showToast }) {
  const p = order.phase

  if (p === 0) return <Phase0 order={order} onRefresh={onRefresh} showToast={showToast} />
  if (p === 1) return <Phase1 order={order} onRefresh={onRefresh} showToast={showToast} />
  if (p === 2) return <Phase2 order={order} />
  if (p === 3) return <Phase3 order={order} />
  if (p === 4) return <Phase4 order={order} />
  if (p === 5) return <Phase5 order={order} />
  if (p === 6) return <Phase6 order={order} onRefresh={onRefresh} showToast={showToast} />
  if (p === 7) return <Phase7 order={order} showToast={showToast} />

  return null
}

function Phase0({ order, onRefresh, showToast }) {
  const [accepting, setAccepting] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [signName, setSignName] = useState('')
  const [signError, setSignError] = useState('')

  const items = (order.order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const expired = order.quote_expires_at && new Date(order.quote_expires_at) < new Date()
  const daysLeft = order.quote_expires_at
    ? Math.ceil((new Date(order.quote_expires_at) - new Date()) / 86400000)
    : null

  async function downloadPDF() {
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })

      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src =
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF()

    const brand = [26, 58, 42]
    const gold = [200, 169, 110]
    const light = [235, 242, 236]
    const gray = [100, 100, 100]
    const dark = [30, 30, 30]
    const W = 210
    const M = 14

    const eur = (v) =>
      '\u20ac\u00a0' +
      Number(v).toLocaleString('nl-NL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

    const dateStr = (d) =>
      new Date(d).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

    const offerteNr = '2026-' + order.id.slice(0, 4).toUpperCase()
    const inclBTW = order.total_amount
    const exclBTW = Math.round((inclBTW / 1.21) * 100) / 100
    const btwBedrag = Math.round((inclBTW - exclBTW) * 100) / 100

    doc.setFillColor(...brand)
    doc.rect(0, 0, W, 42, 'F')

    doc.setFillColor(...gold)
    doc.rect(0, 40, W, 2, 'F')

    try {
      doc.addImage(LOGO_BASE64, 'PNG', W - M - 28, 7, 22, 22)
    } catch (e) {}

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('EcoPro Kozijnen', M, 18)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 210, 185)
    doc.text(`${COMPANY.fullAddress}  ·  ${COMPANY.phone}  ·  ${COMPANY.email}`, M, 26)

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    const offLabel = 'OFFERTE'
    doc.text(offLabel, W - M - doc.getTextWidth(offLabel), 22)

    let y = 54

    doc.setTextColor(...dark)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(order.customer_name, M, y)
    doc.setFont('helvetica', 'normal')

    if (order.customer_address) {
      const parts = order.customer_address.split(',')
      parts.forEach((p, i) => doc.text(p.trim(), M, y + 5 + i * 5))
    }

    doc.text('Nederland', M, y + 5 + ((order.customer_address?.split(',').length || 0) * 5))

    const metaX = 130
    const metaItems = [
      ['Offertenummer', offerteNr],
      ['Offertedatum', dateStr(order.created_at)],
      ['Debiteurnummer', order.id.slice(0, 6).toUpperCase()],
      ...(order.quote_expires_at ? [['Verloopdatum', dateStr(order.quote_expires_at)]] : []),
    ]

    metaItems.forEach((m, i) => {
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.setFont('helvetica', 'normal')
      doc.text(m[0], metaX, y + i * 6)
      doc.setTextColor(...dark)
      doc.setFont('helvetica', 'bold')
      doc.text(m[1], metaX + 38, y + i * 6)
    })

    y += 36

    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...dark)
    doc.text('Geachte ' + (order.customer_name || 'heer/mevrouw') + ',', M, y)
    y += 6

    const aanhefText =
      'Hartelijk dank voor uw interesse in EcoPro Kozijnen. Hierbij bieden wij u onze offerte aan voor het leveren en monteren van hoogwaardige kunststof kozijnen van het merk Schüco, inclusief bijbehorende waterslagen en afwerkingen.'
    const aanhefLines = doc.splitTextToSize(aanhefText, W - 2 * M)

    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(aanhefLines, M, y)
    y += aanhefLines.length * 5 + 6

    doc.autoTable({
      startY: y,
      head: [['Hoeveelheid', 'Omschrijving', 'Prijs excl. btw', 'Btw', 'Totaal incl. btw']],
      body: items.map((i) => {
        const excl = (i.unit_price * i.quantity) / 1.21
        return [
          String(i.quantity),
          i.description,
          eur(excl),
          '21%',
          eur(i.unit_price * i.quantity),
        ]
      }),
      headStyles: {
        fillColor: brand,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 4,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [247, 250, 248] },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 82 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: M, right: M },
    })

    y = doc.lastAutoTable.finalY

    const totW = 90
    const totX = W - M - totW
    y += 4

    doc.autoTable({
      startY: y,
      head: [['Btw %', 'Basisbedrag', 'Btw-bedrag']],
      body: [['21,00', eur(exclBTW), eur(btwBedrag)]],
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: gray,
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.5,
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 34, halign: 'right' },
        2: { cellWidth: 34, halign: 'right' },
      },
      margin: { left: M, right: W - M - 90 },
      tableWidth: 90,
    })

    const totY = y
    doc.setDrawColor(220, 220, 220)

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text('Totaal (excl. btw)', totX, totY + 6)
    doc.setTextColor(...dark)
    doc.text(eur(exclBTW), W - M - doc.getTextWidth(eur(exclBTW)), totY + 6)

    doc.setTextColor(...gray)
    doc.text('Btw', totX, totY + 12)
    doc.setTextColor(...dark)
    doc.text(eur(btwBedrag), W - M - doc.getTextWidth(eur(btwBedrag)), totY + 12)

    doc.setDrawColor(...gold)
    doc.setLineWidth(0.5)
    doc.line(totX, totY + 14, W - M, totY + 14)

    doc.setFillColor(...light)
    doc.rect(totX, totY + 15, W - M - totX, 10, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brand)
    doc.text('Totaal', totX + 2, totY + 22)

    const totStr = eur(inclBTW)
    doc.text(totStr, W - M - doc.getTextWidth(totStr), totY + 22)

    y = Math.max(doc.lastAutoTable.finalY, totY + 28) + 8

    doc.setFillColor(250, 243, 232)
    doc.rect(M, y, W - 2 * M, 20, 'F')
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.3)
    doc.rect(M, y, W - 2 * M, 20)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gray)
    doc.text('BETALINGSSCHEMA', M + 3, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(8.5)
    doc.text('20% aanbetaling bij akkoord: ' + eur(inclBTW * 0.2), M + 3, y + 11)
    doc.text(
      '80% restbetaling na succesvolle montage: ' +
        eur(inclBTW * 0.8) +
        '  (optioneel: 70% na montage + 10% na oplevering)',
      M + 3,
      y + 17
    )

    y += 26

    const slotLines = doc.splitTextToSize(
      'Wij vertrouwen erop u met deze offerte een helder en compleet voorstel te hebben gedaan. Mocht u nog vragen hebben of aanvullende wensen willen bespreken, dan staan wij uiteraard graag voor u klaar.' +
        (order.quote_expires_at
          ? ' Deze offerte is geldig tot ' + dateStr(order.quote_expires_at) + '.'
          : ''),
      W - 2 * M
    )

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(slotLines, M, y)
    y += slotLines.length * 5 + 8

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...dark)
    doc.text('Met vriendelijke groet,', M, y)
    y += 5
    doc.text(COMPANY.name, M, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text(COMPANY.contactName, M, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.setFontSize(8)
    doc.text(COMPANY.contactRole, M, y)
    doc.text(`${COMPANY.phone}  ·  ${COMPANY.email}`, M, y + 4)

    doc.setFillColor(...brand)
    doc.rect(0, 282, W, 15, 'F')
    doc.setFillColor(...gold)
    doc.rect(0, 282, W, 1.5, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 220, 205)

    const footerText = `${COMPANY.name}  ·  ${COMPANY.fullAddress}  ·  ${COMPANY.email}  ·  ${COMPANY.phone}  ·  KVK: ${COMPANY.kvk}`
    doc.text(footerText, W / 2 - doc.getTextWidth(footerText) / 2, 291)

    // ── Tekeningen per element (eigen pagina per kozijn) ────────────────────
    const elemItems = items.filter(i => i.element_config)
    for (const item of elemItems) {
      const el = item.element_config
      doc.addPage()

      // Pagina-header
      doc.setFillColor(...brand)
      doc.rect(0, 0, W, 22, 'F')
      doc.setFillColor(...gold)
      doc.rect(0, 20, W, 1.5, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('EcoPro Kozijnen  ·  Technische tekening', M, 14)
      doc.setFont('helvetica', 'normal')
      const refStr = `Offerte ${offerteNr}  ·  ${order.customer_name}`
      doc.text(refStr, W - M - doc.getTextWidth(refStr), 14)

      let py = 30

      // Element naam + afmetingen
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...dark)
      doc.text(el.name, M, py)
      py += 7

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(`${el.widthMM} × ${el.heightMM} mm  ·  ${item.quantity}×  ·  Kleur: ${el.colorOutside} ${ralName(el.colorOutside)}`, M, py)
      py += 10

      // SVG tekening → PNG → jsPDF
      const svgStr = kozijnSVGString(el, 480, 300)
      try {
        const pngUrl = await svgToPngDataUrl(svgStr, 480, 300)
        if (pngUrl) {
          const drawW = W - 2 * M
          const drawH = drawW * (300 / 480)
          doc.addImage(pngUrl, 'PNG', M, py, drawW, drawH)
          py += drawH + 8
        }
      } catch (e) {}

      // Specs tabel
      const cols = el.columns || []
      const specsBody = [
        ['Type', el.type?.charAt(0).toUpperCase() + el.type?.slice(1) || '—'],
        ['Breedte × Hoogte', `${el.widthMM} × ${el.heightMM} mm`],
        ['Kleur buiten', `${el.colorOutside} — ${ralName(el.colorOutside)}`],
        ['Kleur binnen', el.colorInside === 'same' ? `Zelfde als buiten` : `${el.colorInside} — ${ralName(el.colorInside)}`],
        ['Afwerking', `Buiten: ${el.finishOutside === 'woodgrain' ? 'Houtnerf' : 'Glad'}  /  Binnen: ${el.finishInside === 'woodgrain' ? 'Houtnerf' : 'Glad'}`],
        ['Aantal kolommen', String(cols.length)],
        ...cols.map((col, ci) => {
          const vakken = col.rows.map((r, ri) => `V${ri + 1}: ${PANE_NAMES[r.paneType] || r.paneType}${['draai','draaikiep','deur'].includes(r.paneType) ? ` (${r.hinge === 'left' ? 'L' : 'R'})` : ''}`).join('  ·  ')
          return [`Kolom ${ci + 1} (${Math.round(el.widthMM * col.widthPct / 100)} mm)`, vakken]
        }),
      ]

      doc.autoTable({
        startY: py,
        head: [['Specificatie', 'Waarde']],
        body: specsBody,
        headStyles: { fillColor: brand, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 8.5, cellPadding: 3 },
        alternateRowStyles: { fillColor: [247, 250, 248] },
        columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: W - 2 * M - 55 } },
        margin: { left: M, right: M },
      })

      // Pagina-footer
      doc.setFillColor(...brand)
      doc.rect(0, 282, W, 15, 'F')
      doc.setFillColor(...gold)
      doc.rect(0, 282, W, 1.5, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 220, 205)
      doc.text(footerText, W / 2 - doc.getTextWidth(footerText) / 2, 291)
    }

    doc.save(`Offerte EcoPro Kozijnen - ${order.customer_name} ${offerteNr}.pdf`)
  }

  function handleAccordeer() {
    setShowSign(true)
    setSignError('')
  }

  async function acceptQuote() {
    if (!signName.trim()) {
      setSignError('Vul uw naam in om te ondertekenen')
      return
    }

    if (signName.trim().toLowerCase() !== order.customer_name.toLowerCase()) {
      setSignError(`Vul uw volledige naam in zoals vermeld op de offerte: "${order.customer_name}"`)
      return
    }

    setAccepting(true)

    await supabase
      .from('orders')
      .update({
        phase: 1,
        quote_accepted_at: new Date().toISOString(),
        signature_name: signName.trim(),
        signature_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    await supabase.from('status_history').insert({
      order_id: order.id,
      from_phase: 0,
      to_phase: 1,
      changed_by: 'klant',
    })

    showToast('Akkoord bevestigd! Wij nemen spoedig contact op.')
    setAccepting(false)
    setShowSign(false)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Uw offerte</h1>
        <p style={S.subtitle}>Opgesteld op {formatDate(order.created_at)}</p>
      </div>

      {!expired && daysLeft !== null && daysLeft <= 5 && (
        <div className={`notice notice-${daysLeft <= 2 ? 'danger' : 'warning'}`}>
          ⏳ Deze offerte verloopt{' '}
          {daysLeft === 0 ? 'vandaag' : `over ${daysLeft} dag${daysLeft !== 1 ? 'en' : ''}`}{' '}
          op <strong>{formatDate(order.quote_expires_at)}</strong>
        </div>
      )}

      {expired && (
        <div className="notice notice-danger">
          ✕ Deze offerte is verlopen op {formatDate(order.quote_expires_at)}. Neem contact op voor
          een nieuwe offerte.
        </div>
      )}

      <div className="card-elevated" style={{ overflow: 'hidden' }}>
        <div
          style={{
            background: 'var(--brand)',
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 3,
              }}
            >
              Offerte voor
            </div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{order.customer_name}</div>
            {order.customer_address && (
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>
                {order.customer_address}
              </div>
            )}
          </div>

          {order.quote_expires_at && !expired && (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 3,
                }}
              >
                Geldig tot
              </div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>
                {formatDate(order.quote_expires_at)}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '4px 0' }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '13px 22px',
                gap: 16,
                background: idx % 2 === 0 ? 'white' : '#FAFAF9',
                borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.description}</div>
                {item.quantity > 1 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {item.quantity} stuks × {formatEuro(item.unit_price)}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  flexShrink: 0,
                  color: 'var(--brand)',
                }}
              >
                {formatEuro(item.unit_price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '16px 22px',
            borderTop: '2px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FAFAF9',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>Totaal incl. btw</span>
          <span style={{ fontWeight: 700, fontSize: 22, color: 'var(--brand)' }}>
            {formatEuro(order.total_amount)}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={S.sectionTitle}>Betalingsschema</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <PayPlanRow
            icon="1"
            pct="20%"
            label="Aanbetaling bij akkoord"
            amount={formatEuro(calcDeposit(order.total_amount))}
          />
          <PayPlanRow
            icon="2"
            pct="80%"
            label="Restbetaling na succesvolle montage"
            amount={formatEuro(order.total_amount * 0.8)}
            last
          />
        </div>
      </div>

      <ContactCard />

      {!expired && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-accent btn-lg btn-full"
            onClick={handleAccordeer}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Spinner /> Even geduld…
              </>
            ) : (
              <>✓ &nbsp;Offerte accorderen</>
            )}
          </button>

          <button className="btn btn-ghost btn-full" onClick={() => setShowContact((v) => !v)}>
            Vraag stellen of aanpassen
          </button>

          <button className="btn btn-secondary btn-full" onClick={downloadPDF}>
            📄 &nbsp;Offerte downloaden als PDF
          </button>

          {showContact && (
            <div className="notice notice-info animate-fade">
              Neem contact op via{' '}
              <a href={`mailto:${COMPANY.email}`} style={{ fontWeight: 600 }}>
                {COMPANY.email}
              </a>{' '}
              of{' '}
              <a href={`tel:${COMPANY.phoneHref}`} style={{ fontWeight: 600 }}>
                {COMPANY.phone}
              </a>
              . Wij passen de offerte graag aan.
            </div>
          )}

          {showSign && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Ondertekenen</div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                Vul uw volledige naam in zoals vermeld op de offerte om akkoord te geven.
              </p>

              <input
                type="text"
                value={signName}
                onChange={(e) => {
                  setSignName(e.target.value)
                  if (signError) setSignError('')
                }}
                placeholder={order.customer_name}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  marginBottom: 10,
                  outline: 'none',
                  background: 'white',
                }}
              />

              {signError && (
                <div className="notice notice-danger" style={{ marginBottom: 10 }}>
                  {signError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-accent btn-full" onClick={acceptQuote} disabled={accepting}>
                  {accepting ? (
                    <>
                      <Spinner /> Even geduld…
                    </>
                  ) : (
                    'Definitief accorderen'
                  )}
                </button>

                <button
                  className="btn btn-ghost btn-full"
                  onClick={() => {
                    setShowSign(false)
                    setSignName('')
                    setSignError('')
                  }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <OrderFiles order={order} />

      <KozijnElementenSection items={items} />
    </div>
  )
}

function KozijnElementenSection({ items }) {
  const elemItems = (items || []).filter(i => i.element_config)
  if (elemItems.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
          Configuratie per element
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Hieronder vindt u de technische tekening van elk kozijn in uw offerte.
        </div>
      </div>

      {elemItems.map((item, idx) => {
        const el = item.element_config
        const cols = el.columns || []
        const panesSummary = cols.map((col, ci) =>
          col.rows.map((r, ri) => `K${ci + 1}-V${ri + 1}: ${PANE_NAMES[r.paneType] || r.paneType}`).join(', ')
        ).join(' · ')
        const colorInside = el.colorInside === 'same' ? el.colorOutside : el.colorInside

        return (
          <div key={item.id || idx} className="card-elevated" style={{ overflow: 'hidden', pageBreakInside: 'avoid' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--brand), #234B36)', padding: '14px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>Element {idx + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{el.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {el.widthMM} × {el.heightMM} mm · {item.quantity}×
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>Prijs</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{formatEuro(item.unit_price * item.quantity)}</div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', background: '#FAFAF9', borderBottom: '1px solid var(--border)' }}>
              <KozijnSVG element={el} width={480} height={300} showDims />
            </div>

            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              {[
                { label: 'Type', value: el.type?.charAt(0).toUpperCase() + el.type?.slice(1) || '—' },
                { label: 'Breedte × Hoogte', value: `${el.widthMM} × ${el.heightMM} mm` },
                { label: 'Kleur buiten', value: `${el.colorOutside} ${ralName(el.colorOutside)}` },
                { label: 'Kleur binnen', value: el.colorInside === 'same' ? `Zelfde (${ralName(el.colorOutside)})` : `${colorInside} ${ralName(colorInside)}` },
                { label: 'Kolommen', value: String(cols.length) },
                { label: 'Vakken', value: panesSummary || '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>{row.value}</div>
                </div>
              ))}
            </div>

            {el.notes && (
              <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600 }}>Notities: </span>{el.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Phase1({ order, onRefresh, showToast }) {
  const [notifying, setNotifying] = useState(false)
  const deposit = calcDeposit(order.total_amount)

  async function notifyPayment() {
    setNotifying(true)
    await supabase.from('orders').update({ deposit_notified: true }).eq('id', order.id)
    showToast('Betaling gemeld! Wij verwerken dit zo snel mogelijk.')
    setNotifying(false)
    onRefresh()
  }

  if (order.deposit_confirmed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={S.title}>Aanbetaling ontvangen</h1>
        </div>
        <div className="notice notice-success" style={{ fontSize: 14 }}>
          ✓ &nbsp;Uw aanbetaling van <strong>{formatEuro(deposit)}</strong> is ontvangen. De
          kozijnen worden nu besteld bij de fabriek.
        </div>
        <StatusTimeline phase={1} order={order} />
        <ContactCard />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Akkoord bevestigd</h1>
        <p style={S.subtitle}>Geaccordeerd op {formatDate(order.quote_accepted_at)}</p>
      </div>

      <div className="notice notice-info">
        Om de productie te starten, ontvangen wij graag uw aanbetaling van 20%.
      </div>

      <PaymentCard
        title="Aanbetaling (20%)"
        amount={formatEuro(deposit)}
        description="Na ontvangst starten wij uw order definitief op."
        reference={`Aanbetaling ${order.id.slice(0, 8).toUpperCase()}`}
      />

      {!order.deposit_notified ? (
        <button className="btn btn-secondary btn-full" onClick={notifyPayment} disabled={notifying}>
          {notifying ? (
            <>
              <Spinner /> Even geduld…
            </>
          ) : (
            'Ik heb de betaling overgemaakt'
          )}
        </button>
      ) : (
        <div className="notice notice-success">
          ✓ &nbsp;Uw betaling is gemeld. Wij bevestigen de ontvangst zo spoedig mogelijk.
        </div>
      )}

      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function Phase2({ order }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Aanbetaling bevestigd</h1>
      </div>
      <div className="notice notice-success">
        ✓ &nbsp;Uw aanbetaling van <strong>{formatEuro(calcDeposit(order.total_amount))}</strong> is
        ontvangen. Wij bestellen uw kozijnen bij de fabriek.
      </div>
      <StatusTimeline phase={2} order={order} />
      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function Phase3({ order }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Kozijnen in productie</h1>
        <p style={S.subtitle}>Uw kozijnen worden momenteel vervaardigd</p>
      </div>

      {order.factory_delivery_expected && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Verwachte levering bij ons</span>
          <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
            {formatDate(order.factory_delivery_expected)}
          </span>
        </div>
      )}

      <StatusTimeline phase={3} order={order} />
      <ContactCard />
      <OrderFiles order={order} />

      <div className="notice notice-info">
        De gemiddelde productietijd is 7–8 weken. Wij nemen contact met u op zodra uw kozijnen
        geleverd zijn om een montagedatum in te plannen.
      </div>
    </div>
  )
}

function Phase4({ order }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Kozijnen geleverd</h1>
      </div>
      <div className="notice notice-success">
        ✓ &nbsp;Uw kozijnen zijn bij ons ontvangen en gecontroleerd. Wij nemen contact met u op voor
        de montagedatum.
      </div>
      <StatusTimeline phase={4} order={order} />
      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function Phase5({ order }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={S.title}>Montage ingepland</h1>
      </div>

      {order.installation_date && (
        <div className="card-elevated" style={{ overflow: 'hidden' }}>
          <div style={{ background: 'var(--brand)', padding: '18px 22px', textAlign: 'center' }}>
            <div
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              Montagedatum
            </div>
            <div
              style={{
                color: 'white',
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: '-0.01em',
              }}
            >
              {formatDate(order.installation_date)}
            </div>
          </div>

          <div style={{ padding: '16px 22px' }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Handig om te weten</div>

            {[
              'Ruim de ruimte rondom de kozijnen vrij',
              'Zorg voor toegang tot alle betreffende ruimtes',
              'Zorg dat er iemand aanwezig is de gehele dag',
              'Onze monteurs zijn telefonisch bereikbaar die dag',
            ].map((tip) => (
              <div key={tip} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--brand)', fontWeight: 600, flexShrink: 0 }}>✓</span>
                <span style={{ color: 'var(--text-muted)' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <StatusTimeline phase={5} order={order} />
      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function Phase6({ order, onRefresh, showToast }) {
  const [defectText, setDefectText] = useState('')
  const [addingDefect, setAddingDefect] = useState(false)
  const [notifyingMain, setNotifyingMain] = useState(false)
  const [notifyingFinal, setNotifyingFinal] = useState(false)
  const [choosingSplit, setChoosingSplit] = useState(false)

  const defects = order.defects || []
  const openDefects = defects.filter((d) => d.status === 'open')

  async function chooseSplit(split) {
    setChoosingSplit(true)
    await supabase.from('orders').update({ payment_split: split }).eq('id', order.id)
    showToast(split === 'full_80' ? '80% betaling geselecteerd' : '70% + 10% geselecteerd')
    setChoosingSplit(false)
    onRefresh()
  }

  async function notifyMainPayment() {
    setNotifyingMain(true)
    await supabase.from('orders').update({ main_payment_notified: true }).eq('id', order.id)
    showToast('Betaling gemeld!')
    setNotifyingMain(false)
    onRefresh()
  }

  async function notifyFinalPayment() {
    setNotifyingFinal(true)
    await supabase.from('orders').update({ final_payment_notified: true }).eq('id', order.id)
    showToast('Slotbetaling gemeld!')
    setNotifyingFinal(false)
    onRefresh()
  }

  async function addDefect() {
    if (!defectText.trim()) return

    setAddingDefect(true)
    await supabase.from('defects').insert({
      order_id: order.id,
      description: defectText.trim(),
      status: 'open',
    })
    setDefectText('')
    showToast('Bevinding gemeld. Wij pakken dit op.')
    setAddingDefect(false)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={S.title}>Montage afgerond</h1>
        <p style={S.subtitle}>
          Geplaatst op {formatDate(order.installation_done_at || order.installation_date)}
        </p>
      </div>

      {order.payment_split === 'pending' && (
        <div className="card-elevated" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--border)',
              background: '#FAFAF9',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Kies uw betaaloptie</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Restbedrag na montage:{' '}
              <strong style={{ color: 'var(--text)' }}>{formatEuro(order.total_amount * 0.8)}</strong>
            </p>
          </div>

          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SplitOption
              title="80% in één keer voldoen"
              sub="Direct afronden — geen verdere betalingen na dit moment"
              amount={formatEuro(order.total_amount * 0.8)}
              amountSub={null}
              accent={false}
              disabled={choosingSplit}
              onClick={() => chooseSplit('full_80')}
            />

            <SplitOption
              title="70% nu, 10% na oplevering"
              sub="De laatste 10% betaalt u pas nadat eventuele punten zijn opgelost"
              amount={formatEuro(order.total_amount * 0.7)}
              amountSub={`+ ${formatEuro(order.total_amount * 0.1)} later`}
              accent
              disabled={choosingSplit}
              onClick={() => chooseSplit('split_70_10')}
            />
          </div>
        </div>
      )}

      {order.payment_split !== 'pending' && !order.main_payment_confirmed && (
        <>
          <PaymentCard
            title={order.payment_split === 'split_70_10' ? 'Te betalen (70%)' : 'Te betalen (80%)'}
            amount={formatEuro(calcMain(order.total_amount, order.payment_split))}
            description={
              order.payment_split === 'split_70_10'
                ? 'U kiest voor betaling in 2 delen.'
                : 'Met deze betaling rondt u het volledige restbedrag af.'
            }
            reference={`Restbetaling ${order.id.slice(0, 8).toUpperCase()}`}
          />

          {!order.main_payment_notified ? (
            <button
              className="btn btn-secondary btn-full"
              onClick={notifyMainPayment}
              disabled={notifyingMain}
            >
              {notifyingMain ? (
                <>
                  <Spinner /> Even geduld…
                </>
              ) : (
                'Ik heb de betaling overgemaakt'
              )}
            </button>
          ) : (
            <div className="notice notice-success">
              ✓ &nbsp;Uw betaling is gemeld. Wij bevestigen zo spoedig mogelijk.
            </div>
          )}
        </>
      )}

      {order.payment_split !== 'pending' && order.main_payment_confirmed && (
        <div className="notice notice-success">
          ✓ &nbsp;Uw {order.payment_split === 'split_70_10' ? '70%' : '80%'} betaling van{' '}
          <strong>{formatEuro(calcMain(order.total_amount, order.payment_split))}</strong> is
          ontvangen. Bedankt!
        </div>
      )}

      {order.payment_split === 'split_70_10' && order.main_payment_confirmed && (
        <div className="card-elevated" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--border)',
              background: '#FAFAF9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>Slotbetaling (10%)</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--brand)' }}>
              {formatEuro(calcFinal(order.total_amount))}
            </div>
          </div>

          <div style={{ padding: '16px 22px' }}>
            {openDefects.length > 0 ? (
              <div className="notice notice-warning">
                ⚠ Er zijn nog {openDefects.length} open bevinding
                {openDefects.length !== 1 ? 'en' : ''}. De slotbetaling wordt beschikbaar zodra alles
                is opgelost.
              </div>
            ) : order.final_payment_confirmed ? (
              <div className="notice notice-success">✓ &nbsp;Slotbetaling ontvangen. Alles is afgerond!</div>
            ) : (
              <>
                <PaymentCard
                  title="Slotbetaling (10%)"
                  amount={formatEuro(calcFinal(order.total_amount))}
                  description="Deze betaling wordt vrijgegeven zodra alle open punten zijn opgelost."
                  reference={`Slotbetaling ${order.id.slice(0, 8).toUpperCase()}`}
                />

                {!order.final_payment_notified ? (
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={notifyFinalPayment}
                    disabled={notifyingFinal}
                  >
                    {notifyingFinal ? (
                      <>
                        <Spinner /> Even geduld…
                      </>
                    ) : (
                      'Slotbetaling gemeld'
                    )}
                  </button>
                ) : (
                  <div className="notice notice-success">✓ &nbsp;Slotbetaling gemeld.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>Bevindingen melden</div>
          {openDefects.length > 0 && <span className="badge badge-montage">{openDefects.length} open</span>}
        </div>

        {defects.length > 0 && (
          <div style={{ padding: '4px 0' }}>
            {defects.map((d, idx) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '12px 20px',
                  fontSize: 13,
                  borderBottom: idx < defects.length - 1 ? '1px solid var(--border)' : 'none',
                  background: idx % 2 === 0 ? 'white' : '#FAFAF9',
                }}
              >
                <span
                  className={`badge ${d.status === 'open' ? 'badge-montage' : 'badge-compleet'}`}
                  style={{ marginTop: 1, flexShrink: 0 }}
                >
                  {d.status === 'open' ? 'Open' : '✓ Opgelost'}
                </span>
                <div>
                  <div style={{ fontWeight: 500, lineHeight: 1.4 }}>{d.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>
                    Gemeld {formatDate(d.reported_at)}
                    {d.resolved_at && ` · Opgelost ${formatDate(d.resolved_at)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            padding: '16px 20px',
            background: defects.length > 0 ? '#FAFAF9' : 'white',
            borderTop: defects.length > 0 ? '1px solid var(--border)' : 'none',
          }}
        >
          {defects.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 12,
                lineHeight: 1.6,
              }}
            >
              Zijn er punten die nog aandacht nodig hebben? Meld ze hier zodat wij ze kunnen
              oppakken.
            </p>
          )}

          <textarea
            value={defectText}
            onChange={(e) => setDefectText(e.target.value)}
            placeholder="Omschrijf het punt dat opgelost moet worden…"
            style={{
              minHeight: 72,
              marginBottom: 10,
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
            }}
          />

          <button
            className="btn btn-secondary btn-full"
            onClick={addDefect}
            disabled={addingDefect || !defectText.trim()}
          >
            {addingDefect ? (
              <>
                <Spinner /> Melden…
              </>
            ) : (
              '+ Bevinding melden'
            )}
          </button>
        </div>
      </div>

      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function Phase7({ order, showToast }) {
  const [rating, setRating] = useState(order.satisfaction_rating || 0)
  const [hovered, setHovered] = useState(0)
  const [submitted, setSubmitted] = useState(!!order.satisfaction_rating)
  const [feedback] = useState(order.satisfaction_feedback || '')

  async function submitRating(stars) {
    setRating(stars)
    await supabase
      .from('orders')
      .update({ satisfaction_rating: stars, satisfaction_feedback: feedback })
      .eq('id', order.id)
    setSubmitted(true)
    showToast('Bedankt voor uw beoordeling!')
  }

  const opleverPunten = safeParseArray(order.oplevering_punten)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
      <div style={{ padding: '10px 0' }}>
        <div
          style={{
            width: 72,
            height: 72,
            background: 'var(--brand)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
          }}
        >
          🏠
        </div>

        <h1 style={{ ...S.title, fontSize: 24, textAlign: 'center' }}>Oplevering compleet!</h1>

        <p
          style={{
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            maxWidth: 380,
            margin: '8px auto 0',
          }}
        >
          Uw nieuwe kozijnen zijn geplaatst en alles is afgerond. Bedankt voor uw vertrouwen in
          EcoPro Kozijnen!
        </p>
      </div>

      <div className="card" style={{ padding: '18px 22px', textAlign: 'left' }}>
        <div style={S.sectionTitle}>Betalingsoverzicht</div>
        <PayPlanRow
          icon="✓"
          pct="20%"
          label="Aanbetaling"
          amount={formatEuro(calcDeposit(order.total_amount))}
          done
        />
        {order.payment_split === 'split_70_10' ? (
          <>
            <PayPlanRow
              icon="✓"
              pct="70%"
              label="Na montage"
              amount={formatEuro(order.total_amount * 0.7)}
              done
            />
            <PayPlanRow
              icon="✓"
              pct="10%"
              label="Slotbetaling"
              amount={formatEuro(order.total_amount * 0.1)}
              done
              last
            />
          </>
        ) : (
          <PayPlanRow
            icon="✓"
            pct="80%"
            label="Na montage"
            amount={formatEuro(order.total_amount * 0.8)}
            done
            last
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <a href={`tel:${COMPANY.phoneHref}`} className="btn btn-ghost" style={{ flex: 1 }}>
          📞 Bel ons
        </a>
        <a href={`mailto:${COMPANY.email}`} className="btn btn-ghost" style={{ flex: 1 }}>
          ✉ E-mail
        </a>
      </div>

      {order.oplevering_signed_at && (
        <div
          className="card"
          style={{
            padding: '18px 22px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--success)',
              marginBottom: 12,
            }}
          >
            📋 Opleverbon
          </div>

          {opleverPunten.map((punt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '5px 0',
                fontSize: 13,
                borderBottom: '1px solid var(--success-border)',
              }}
            >
              <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span style={{ color: 'var(--text)' }}>{punt}</span>
            </div>
          ))}

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--success-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--success)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Akkoord gegeven door
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: 'Georgia, serif',
                  marginTop: 3,
                  color: 'var(--text)',
                }}
              >
                {order.oplevering_naam}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(order.oplevering_signed_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '18px 22px', textAlign: 'center' }}>
        {!submitted ? (
          <>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
              Hoe tevreden bent u met het resultaat?
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => submitRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 36,
                    lineHeight: 1,
                    padding: '4px',
                    transition: 'transform 0.1s',
                    transform: hovered >= star ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  {hovered >= star || rating >= star ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Klik op een ster om uw beoordeling te geven
            </p>
          </>
        ) : (
          <div
            style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: 10,
              padding: '16px',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{'⭐'.repeat(rating)}</div>
            <p style={{ color: 'var(--success)', fontWeight: 600, margin: 0 }}>
              Bedankt voor uw beoordeling!
            </p>
          </div>
        )}
      </div>

      <ContactCard />
      <OrderFiles order={order} />
    </div>
  )
}

function PaymentCard({ title, amount, description, reference }) {
  return (
    <div className="card-elevated" style={{ overflow: 'hidden' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--brand), #234B36)',
          padding: '20px 22px',
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{amount}</div>

        {description && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
            {description}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 22px 10px', background: 'white' }}>
        <div
          style={{
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 12,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Controleer altijd goed de tenaamstelling en gebruik exact deze omschrijving bij uw betaling.
        </div>

        <BankRow label="Tenaamstelling" value={COMPANY.name} strong />
        <BankRow label="Bank" value={COMPANY.bankName} />
        <BankRow label="IBAN" value={COMPANY.iban} copyable compactCopy strong />
        <BankRow label="BIC" value={COMPANY.bic} copyable compactCopy />
        <BankRow label="Omschrijving" value={reference} copyable />
      </div>
    </div>
  )
}

function OrderFiles({ order }) {
  const files = (order.order_files || []).filter((f) => f.file_url)

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15 }}>Documenten & foto&apos;s</div>
        {files.length > 0 && <span className="badge badge-productie">{files.length}</span>}
      </div>

      {files.length === 0 ? (
        <div
          style={{
            padding: '18px 20px',
            fontSize: 13,
            color: 'var(--text-light)',
            fontStyle: 'italic',
          }}
        >
          Nog geen documenten toegevoegd door EcoPro Kozijnen.
        </div>
      ) : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map((f) => {
            const meta = getFileMeta(f)

            return (
              <a
                key={f.id}
                href={f.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  textDecoration: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  background: 'white',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    background: meta.tint,
                    border: `1px solid ${meta.border}`,
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.filename}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: meta.tint,
                        border: `1px solid ${meta.border}`,
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>

                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                      Openen / downloaden
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 18, color: 'var(--text-light)', flexShrink: 0 }}>›</div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusTimeline({ phase, order }) {
  const steps = [
    { label: 'Offerte geaccordeerd', done: phase >= 1, sub: formatDate(order.quote_accepted_at) },
    { label: 'Aanbetaling ontvangen', done: phase >= 2, sub: formatDate(order.deposit_paid_at) },
    { label: 'Besteld bij fabriek', done: phase >= 3, sub: formatDate(order.factory_ordered_at) },
    { label: 'In productie', done: phase >= 3, active: phase === 3 },
    { label: 'Geleverd bij EcoPro', done: phase >= 4 },
    {
      label: 'Montage ingepland',
      done: phase >= 5,
      sub: order.installation_date ? formatDate(order.installation_date) : null,
    },
    { label: 'Montage afgerond', done: phase >= 6 },
    { label: 'Oplevering compleet', done: phase >= 7 },
  ].filter((_, i) => i <= phase + 1)

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={S.sectionTitle}>Voortgang</div>

      {steps.map((step, idx) => (
        <div
          key={step.label}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            paddingBottom: idx < steps.length - 1 ? 12 : 0,
            marginBottom: idx < steps.length - 1 ? 2 : 0,
            position: 'relative',
          }}
        >
          {idx < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 11,
                top: 22,
                bottom: 0,
                width: 2,
                background: step.done ? 'var(--brand)' : 'var(--border)',
              }}
            />
          )}

          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              zIndex: 1,
              background: step.done ? 'var(--brand)' : step.active ? 'var(--accent)' : 'white',
              border: `2px solid ${
                step.done ? 'var(--brand)' : step.active ? 'var(--accent)' : 'var(--border)'
              }`,
              color: step.done ? 'white' : step.active ? 'var(--brand)' : 'var(--text-light)',
            }}
          >
            {step.done ? '✓' : ''}
          </div>

          <div style={{ paddingTop: 2 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: step.done || step.active ? 500 : 400,
                color: step.done ? 'var(--text)' : step.active ? 'var(--brand)' : 'var(--text-light)',
              }}
            >
              {step.label}
            </div>
            {step.sub && (
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{step.sub}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SplitOption({ title, sub, amount, amountSub, accent, disabled, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        border: `2px solid ${
          hovered ? (accent ? 'var(--accent)' : 'var(--brand)') : 'var(--border)'
        }`,
        background: hovered ? (accent ? 'var(--accent-bg)' : 'var(--brand-muted)') : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: accent ? 'var(--accent-dark)' : 'var(--brand)',
          }}
        >
          {amount}
        </div>
        {amountSub && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{amountSub}</div>}
      </div>
    </button>
  )
}

function BankRow({ label, value, copyable, compactCopy, strong }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = compactCopy ? value.replace(/\s/g, '') : value
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr auto',
        gap: 10,
        alignItems: 'center',
        fontSize: 13,
        padding: '8px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>

      <span
        style={{
          fontWeight: strong ? 700 : 500,
          color: 'var(--text)',
          wordBreak: 'break-word',
          textAlign: 'right',
        }}
      >
        {value}
      </span>

      {copyable ? (
        <button
          onClick={copy}
          className="btn btn-ghost"
          style={{
            minWidth: 78,
            padding: '6px 10px',
            fontSize: 12,
            height: 'auto',
          }}
        >
          {copied ? '✓ Gekopieerd' : 'Kopieer'}
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}

function PayPlanRow({ icon, pct, label, amount, done, last }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '9px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        fontSize: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: done ? 'var(--brand)' : 'var(--brand-muted)',
            color: done ? 'white' : 'var(--brand)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {icon || pct}
        </span>

        <div>
          <span style={{ fontWeight: 500 }}>{pct}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 13 }}>{label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{amount}</span>
        {done && <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}

function safeParseArray(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getFileMeta(file) {
  const name = (file.filename || '').toLowerCase()
  const type = (file.file_type || '').toLowerCase()

  const isImage = type.startsWith('image/')
  const isPdf = type.includes('pdf') || name.endsWith('.pdf')

  if (name.includes('offerte')) {
    return {
      icon: '📄',
      label: 'Offerte',
      tint: '#EFF6FF',
      border: '#BFDBFE',
      color: '#1D4ED8',
      isImage,
      isPdf,
    }
  }

  if (name.includes('factuur')) {
    return {
      icon: '🧾',
      label: 'Factuur',
      tint: '#FFF7ED',
      border: '#FED7AA',
      color: '#C2410C',
      isImage,
      isPdf,
    }
  }

  if (name.includes('oplever')) {
    return {
      icon: '✅',
      label: 'Opleverbon',
      tint: '#ECFDF5',
      border: '#BBF7D0',
      color: '#15803D',
      isImage,
      isPdf,
    }
  }

  if (name.includes('tekening') || name.includes('werkbon')) {
    return {
      icon: '📐',
      label: 'Technisch document',
      tint: '#F5F3FF',
      border: '#DDD6FE',
      color: '#6D28D9',
      isImage,
      isPdf,
    }
  }

  if (isImage) {
    return {
      icon: '🖼',
      label: 'Foto',
      tint: '#FDF2F8',
      border: '#FBCFE8',
      color: '#BE185D',
      isImage,
      isPdf,
    }
  }

  if (isPdf) {
    return {
      icon: '📄',
      label: 'PDF',
      tint: '#F8FAFC',
      border: '#CBD5E1',
      color: '#334155',
      isImage,
      isPdf,
    }
  }

  return {
    icon: '📎',
    label: 'Document',
    tint: '#F8FAFC',
    border: '#E2E8F0',
    color: '#475569',
    isImage,
    isPdf,
  }
}

function phaseLabel(phase) {
  switch (phase) {
    case 0:
      return 'Offerte'
    case 1:
      return 'Wacht op aanbetaling'
    case 2:
      return 'Besteld'
    case 3:
      return 'In productie'
    case 4:
      return 'Geleverd'
    case 5:
      return 'Montage ingepland'
    case 6:
      return 'Montage afgerond'
    case 7:
      return 'Compleet'
    default:
      return 'Onbekend'
  }
}

const S = {
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
    color: 'var(--brand)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-muted)',
    margin: '4px 0 0',
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: 12,
  },
}