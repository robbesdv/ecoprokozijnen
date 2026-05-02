'use client'

import React, { useEffect, useRef, useState } from 'react'
import BeheerNav from '@/lib/BeheerNav'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/phases'
import { notifyCustomer } from '@/lib/notifyCustomer'

function buildDescription(payload) {
  const d = payload.dakkapel || {}
  const bays = Array.isArray(d.bays) ? d.bays.length : 0
  return [
    'DakkapelLAB offerte',
    `${d.widthMM || 0} x ${d.frontHeightMM || 0} x ${d.depthMM || 0} mm`,
    `${bays} vakken`,
    d.material ? `Materiaal: ${d.material}` : '',
    d.roofCover ? `Dakbedekking: ${d.roofCover}` : '',
  ].filter(Boolean).join(' - ')
}

function buildAddress(customer = {}) {
  return [customer.address, customer.postcode, customer.city].filter(Boolean).join(', ')
}

export default function DakkapelLabPage() {
  const iframeRef = useRef(null)
  const [confirmData, setConfirmData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'DAKKAPELLAB_SUBMIT') {
        setConfirmData(event.data.data)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function requestSubmit() {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_DAKKAPELLAB_SUBMIT' }, '*')
  }

  async function createOrder(payload) {
    setSubmitting(true)
    const c = payload.customer || {}
    const totals = payload.totals || {}
    const totalAmount = Number(totals.gross) || 0
    const address = buildAddress(c)
    const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : []

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name: c.name || 'Onbekende dakkapel klant',
        customer_email: c.email || '',
        customer_phone: c.phone || '',
        customer_address: address,
        total_amount: totalAmount,
        phase: 0,
        montage_notes: payload.project?.notes || '',
        internal_notes: [
          `Aangemaakt vanuit DakkapelLAB (${payload.offerCode})`,
          payload.project?.internalNotes || '',
        ].filter(Boolean).join('\n'),
        crm_reference: payload.offerCode || null,
      })
      .select('*')
      .single()

    if (error) {
      showToast('Order niet aangemaakt: ' + error.message, 'error')
      setSubmitting(false)
      return
    }

    const items = lineItems.length
      ? lineItems.map((item, idx) => ({
          order_id: order.id,
          description: item.description || buildDescription(payload),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unitPriceExVat) || 0,
          sort_order: item.sortOrder ?? idx,
          element_config: idx === 0 ? payload : null,
        }))
      : [{
          order_id: order.id,
          description: buildDescription(payload),
          quantity: 1,
          unit_price: totalAmount / 1.21,
          sort_order: 0,
          element_config: payload,
        }]

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) {
      showToast('Order aangemaakt, maar offerteregels niet opgeslagen: ' + itemsError.message, 'error')
      setSubmitting(false)
      return
    }

    await supabase.from('status_history').insert({
      order_id: order.id,
      to_phase: 0,
      note: `Aangemaakt vanuit DakkapelLAB (${payload.offerCode})`,
      changed_by: 'verkoop',
    })

    await notifyCustomer({ ...order, crm_reference: payload.offerCode || null }, totalAmount > 0 ? 'nieuwe_offerte' : 'welkomst')

    setSubmitting(false)
    setConfirmData(null)
    showToast(`Dakkapelofferte aangemaakt: ${formatEuro(totalAmount)}`)
    setTimeout(() => { window.location.href = '/beheer' }, 1400)
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <BeheerNav topSlot={
        <button onClick={requestSubmit} style={{ width: '100%', background: '#22c55e', border: '1px solid #16a34a', color: 'white', padding: '9px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
          → Zet door naar EcoPro
        </button>
      } />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>DakkapelLAB</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Dakkapel configurator, calculatie, offerte en werkbon</div>
          </div>
        </div>

        <iframe
          ref={iframeRef}
          src="/DakkapelLAB/index.html"
          title="DakkapelLAB Configurator"
          style={{ flex: 1, width: '100%', border: 'none', background: 'white' }}
        />
      </div>

      {confirmData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.42)', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 'min(520px,92vw)', background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.24)' }}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Dakkapelofferte aanmaken?</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Er wordt een EcoPro order/offerte aangemaakt met offerteregels vanuit DakkapelLAB.
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 16 }}>
              <strong>{confirmData.offerCode}</strong><br />
              {confirmData.customer?.name || 'Onbekende klant'}<br />
              {formatEuro(confirmData.totals?.gross || 0)} incl. BTW
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmData(null)} disabled={submitting}>Annuleren</button>
              <button className="btn btn-primary" onClick={() => createOrder(confirmData)} disabled={submitting}>
                {submitting ? 'Opslaan...' : 'Order/offerte aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#111827', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, zIndex: 10000 }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
