'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { getPhase, formatEuro, formatDate } from '@/lib/phases'
import { ralName, KozijnSVG } from '@/lib/KozijnSVG'
import BeheerNav from '@/lib/BeheerNav'
import { notifyCustomer } from '@/lib/notifyCustomer'
import { appendNijBegunCodeToDescription, getNijBegunSettingsFromItems } from '@/lib/nijBegun'

const PANE_LABEL = {
  vast: 'vast glas', draai: 'draai', kiep: 'kiep',
  draaikiep: 'draai-kiep', vent: 'ventilatie', deur: 'deur', deur2: 'dubbele deur', schuif: 'schuif',
  glas: 'glas', paneel: 'paneel',
}

function glassFinishLabel(value) {
  const map = { satinato: 'Satinato', milk: 'Melkglas', melkglas: 'Melkglas', solar: 'Zonwerend' }
  return map[String(value || '').toLowerCase()] || ''
}

function buildItemDescription(el) {
  const cols = el.columns || []
  const allRows = cols.flatMap(c => c.rows || [])
  const doorPanels = el.type === 'deur' && Array.isArray(el.doorPanels) ? el.doorPanels : []
  const nVaks = doorPanels.length || allRows.length
  const seenTypes = []
  const typeRows = doorPanels.length
    ? doorPanels.map(p => ({ paneType: p.fill === 'glass' ? 'glas' : 'paneel' }))
    : allRows
  typeRows.forEach(r => {
    const label = PANE_LABEL[r.paneType] || r.paneType
    if (!seenTypes.includes(label)) seenTypes.push(label)
  })
  const isDoorLeafRow = (row) => el.type === 'deur' && doorPanels.length > 0 && ['deur', 'deur2'].includes(row.paneType)
  const glassRows = [...allRows.filter(r => r.fill !== 'panel' && !isDoorLeafRow(r)), ...doorPanels.filter(r => r.fill === 'glass')]
  const panelRows = [...allRows.filter(r => r.fill === 'panel' && !isDoorLeafRow(r)), ...doorPanels.filter(r => r.fill === 'panel')]
  const PACK_RANK = { 'HR+++': 3, 'HR++': 2, 'HR+': 1 }
  const rawPacks = [...new Set(glassRows.map(r => r.glassPack?.trim()).filter(Boolean))]
  const maxRank = Math.max(0, ...rawPacks.map(p => PACK_RANK[p] ?? 0))
  const glassPacks = maxRank > 0 ? rawPacks.filter(p => (PACK_RANK[p] ?? 0) === maxRank) : rawPacks
  const panelPacks = [...new Set(panelRows.map(r => r.panelPack || 'HR++'))]
  const glassFinishes = [...new Set(glassRows.map(r => glassFinishLabel(r.glassFinish)).filter(Boolean))]
  const extras = [
    ...glassFinishes,
    ...(panelPacks.length ? [`Paneel: ${panelPacks.join('/')}`] : []),
    ...(allRows.some(r => r.paneType === 'draaikiep' && r.padk) ? ['PADK ventilatiestand'] : []),
  ]
  const glassStr = [glassRows.length > 0 ? (glassPacks.length > 0 ? glassPacks.join('/') : 'HR++') : null, ...extras].filter(Boolean).join(', ') || 'HR++'
  const w = el.dimensions?.widthMM
  const h = el.dimensions?.heightMM
  const colorCode = el.finish?.colorOutside || ''
  const colorName = ralName(colorCode)
  const vaksStr = `${nVaks || 1}-vaks`
  const typesStr = seenTypes.join(' / ') || 'vast glas'
  const kleurStr = colorCode + (colorName && colorName !== colorCode ? ` — ${colorName}` : '')
  return appendNijBegunCodeToDescription(
    `Premium Schüco Living Variant ${vaksStr}, ${typesStr}, ${w} × ${h}mm bxh, Kleur: ${kleurStr}, ${glassStr}`,
    el
  )
}

function buildExtraDescription(ex) {
  const name = String(ex?.name || '').trim()
  return `Extra: ${name || 'Project extra'}`
}

function toExportExtra(item) {
  return {
    id: item.id,
    name: String(item.description || '').replace(/^Extra:\s*/i, '') || 'Project extra',
    qty: item.quantity || 1,
    unitPrice: Number(item.unit_price) || 0,
  }
}

function starterElementForOrder(order) {
  return {
    id: `starter_${order.id || Date.now()}`,
    name: 'Kozijn 1',
    type: 'kozijn',
    qty: 1,
    dimensions: { widthMM: 1200, heightMM: 1400 },
    profile: { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 },
    finish: {
      colorOutside: 'RAL7016',
      colorInside: 'same',
      colorSash: 'same',
      colorPanel: 'same',
      finishOutside: 'smooth',
      finishInside: 'smooth',
    },
    hardware: 'siegenia',
    pricePerUnit: 0,
    priceTotal: 0,
    columns: [{ widthPct: 100, rows: [{ paneType: 'vast', heightPct: 100, fill: 'glass', glassPack: 'HR++' }] }],
    notes: 'Starter element - pas afmetingen en indeling aan.',
  }
}

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',    icon: '▣' },
  { key: 'kozijnlab',  label: 'KozijnLAB',    icon: '⚡' },
  { key: 'leads',      label: 'Leads',         icon: '👥' },
  { key: 'offertes',   label: 'Offertes',      icon: '📄' },
  { key: 'verkopers',  label: 'Verkopers',     icon: '👤' },
  { key: 'planning',   label: 'Planning',      icon: '📅' },
]

const VERKOPER_NAMEN = { matthew: 'Matthew', rob: 'Rob', kay: 'Kay' }

async function postSalesAction(action, payload = {}) {
  const res = await fetch(`/api/admin/sales-action?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || 'Actie mislukt')
  return data
}

export default function VerkoopPage() {
  const [tab, setTab]               = useState('dashboard')
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [confirmData, setConfirmData] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [initialEditId, setInitialEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOfferte, setSelectedOfferte] = useState(null)
  const [offerteItems, setOfferteItems] = useState([])
  const [editPrices, setEditPrices] = useState({})
  const [savingOfferte, setSavingOfferte] = useState(false)
  const [statusEvents, setStatusEvents] = useState([])
  const [dismissedEvents, setDismissedEvents] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissedEvents') || '[]')) }
    catch { return new Set() }
  })
  const iframeRef = useRef(null)
  const pendingKozijnPayloadRef = useRef(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    const orders = data || []
    setOrders(orders)
    setLoading(false)

    const { data: hist } = await supabase
      .from('status_history')
      .select('id, created_at, order_id, from_phase, to_phase, changed_by, note')
      .in('changed_by', ['klant', 'mollie_webhook'])
      .order('created_at', { ascending: false })
      .limit(50)
    if (hist) {
      const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))
      setStatusEvents(hist.map(e => ({ ...e, order: orderMap[e.order_id] })))
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('edit')
    if (id) setInitialEditId(id)
  }, [])

  useEffect(() => {
    if (!initialEditId || loading) return
    const order = orders.find(o => o.id === initialEditId)
    if (!order) return
    setInitialEditId(null)
    openInKozijnLab(order)
  }, [initialEditId, loading, orders]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'KOZIJNLAB_SUBMIT') setConfirmData(e.data.data)
      if (e.data?.type === '__edit_mode_available' && pendingKozijnPayloadRef.current) {
        postProjectToKozijnLab(pendingKozijnPayloadRef.current)
      }
      if (e.data?.type === 'KOZIJNLAB_PROJECT_STATE' && !e.data.editOrderId) {
        setEditingOrder(null)
        pendingKozijnPayloadRef.current = null
        if (window.location.search.includes('edit=')) {
          window.history.replaceState(null, '', '/beheer/verkoop')
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  async function openOfferte(order) {
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('sort_order')
    const items = data || []
    setOfferteItems(items)
    setEditPrices(Object.fromEntries(items.map(it => [it.id, it.unit_price])))
    setSelectedOfferte(order)
  }

  async function saveOfferteChanges() {
    setSavingOfferte(true)
    try {
      const result = await postSalesAction('save_prices', {
        orderId: selectedOfferte.id,
        prices: offerteItems.map(item => ({ itemId: item.id, unitPrice: editPrices[item.id] ?? item.unit_price })),
      })
      const newTotal = Number(result.totalAmount ?? result.order?.total_amount) || 0
      const updatedOfferte = { ...selectedOfferte, ...(result.order || {}), total_amount: newTotal }
      setSelectedOfferte(prev => ({ ...prev, ...(result.order || {}), total_amount: newTotal }))
      await notifyCustomer(updatedOfferte, 'order_bijgewerkt', {
        subject: 'Uw offerte is bijgewerkt',
        title: 'Offertebedrag bijgewerkt',
        intro: 'We hebben uw offerte bijgewerkt.',
        changes: [`Nieuw totaalbedrag: ${formatEuro(newTotal)}`],
        amount: newTotal,
      })
      await loadOrders()
      showToast('Wijzigingen opgeslagen & klant genotificeerd')
    } catch (err) {
      showToast('Wijzigingen niet opgeslagen: ' + err.message, 'error')
    } finally {
      setSavingOfferte(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function requestSubmit() {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_SUBMIT' }, '*')
  }

  function orderCanEditInKozijnLab(order) {
    return Number(order?.phase || 0) === 0 && !order?.quote_accepted_at
  }

  function toExportElement(cfg, item, idx) {
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg) } catch { cfg = {} }
    }
    const dimensions = cfg.dimensions || {
      widthMM: cfg.widthMM || 1200,
      heightMM: cfg.heightMM || 1400,
    }
    const finish = cfg.finish || {
      colorOutside: cfg.colorOutside || 'RAL7016',
      colorInside: cfg.colorInside || 'same',
      finishOutside: cfg.finishOutside || 'smooth',
      finishInside: cfg.finishInside || 'smooth',
    }
    return {
      ...cfg,
      id: cfg.id || `edit_${item.id || idx}`,
      name: cfg.name || `Element ${idx + 1}`,
      type: cfg.type || 'kozijn',
      qty: cfg.qty || item.quantity || 1,
      dimensions,
      finish,
      profile: cfg.profile || { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 },
      columns: cfg.columns || [],
      pricePerUnit: Number(item.unit_price) || 0,
      priceTotal: (Number(item.unit_price) || 0) * (item.quantity || 1),
    }
  }

  function buildKozijnLabPayload(order, items) {
    const [address = '', postcode = '', city = ''] = String(order.customer_address || '').split(',').map(s => s.trim())
    const elements = items
      .filter(it => it.element_config)
      .map((it, idx) => toExportElement(it.element_config || {}, it, idx))
    const nijBegun = getNijBegunSettingsFromItems(items)
    return {
      version: 'kozijnlab.v2',
      offerCode: order.crm_reference || `ORD-${String(order.id).slice(0, 8).toUpperCase()}`,
      editOrderId: order.id,
      customer: {
        name: order.customer_name || '',
        email: order.customer_email || '',
        phone: order.customer_phone || '',
        address,
        postcode,
        city,
      },
      project: {
        notes: order.montage_notes || '',
        montageEuro: 0,
        discountPct: 0,
        vatRate: 0.21,
        nijBegun: nijBegun || undefined,
      },
      extras: items
        .filter(it => !it.element_config)
        .map(toExportExtra),
      elements: elements.length ? elements : [starterElementForOrder(order)],
    }
  }

  function postProjectToKozijnLab(payload) {
    const msg = { type: 'KOZIJNLAB_LOAD_PROJECT', data: payload }
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(msg, '*'), 400)
    setTimeout(() => { if (pendingKozijnPayloadRef.current === payload) pendingKozijnPayloadRef.current = null }, 1200)
  }

  async function openInKozijnLab(order) {
    if (!orderCanEditInKozijnLab(order)) {
      showToast('Deze offerte is al geaccordeerd en kan niet meer in KozijnLAB worden aangepast.', 'error')
      return
    }
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('sort_order')
    if (error) { showToast('Kon offerte niet laden: ' + error.message, 'error'); return }

    const payload = buildKozijnLabPayload(order, data || [])

    setEditingOrder(order)
    setSelectedOfferte(null)
    setTab('kozijnlab')
    pendingKozijnPayloadRef.current = payload
    window.history.replaceState(null, '', `/beheer/verkoop?edit=${order.id}`)
    setTimeout(() => postProjectToKozijnLab(payload), 80)
    showToast(`Offerte van ${order.customer_name} geopend in KozijnLAB`)
  }

  function buildOrderItems(orderId, kl) {
    const elementItems = (kl.elements || []).map((el, idx) => ({
      order_id:      orderId,
      description:   buildItemDescription(el),
      quantity:      el.qty || 1,
      unit_price:    el.pricePerUnit || 0,
      sort_order:    idx,
      element_config: el,
    }))
    const extraItems = (kl.extras || [])
      .filter(ex => String(ex.name || '').trim() || Number(ex.unitPrice) > 0)
      .map((ex, idx) => ({
        order_id:      orderId,
        description:   buildExtraDescription(ex),
        quantity:      ex.qty || 1,
        unit_price:    Number(ex.unitPrice) || 0,
        sort_order:    elementItems.length + idx,
        element_config: null,
      }))
    return [...elementItems, ...extraItems]
  }

  async function updateExistingOrder(orderId, kl) {
    setSubmitting(true)
    const current = orders.find(o => o.id === orderId)
    if (current && !orderCanEditInKozijnLab(current)) {
      showToast('Deze offerte is inmiddels geaccordeerd en is niet aangepast.', 'error')
      setSubmitting(false)
      return
    }

    const c = kl.customer || {}
    const total_amount = Number(kl.totals?.gross) || 0
    try {
      const result = await postSalesAction('update_from_kozijnlab', { orderId, kozijnLab: kl })
      const orderForMail = result.order || { ...current, id: orderId, total_amount }
      await notifyCustomer(orderForMail, 'order_bijgewerkt', {
        subject: 'Uw offerte is bijgewerkt',
        title: 'Offerte bijgewerkt',
        intro: 'We hebben uw offerte bijgewerkt vanuit EcoPro KozijnLAB.',
        changes: [
          `Offertenummer: ${kl.offerCode || orderForMail.crm_reference || 'bekend in uw portaal'}`,
          `Totaalbedrag: ${formatEuro(total_amount)}`,
        ],
        amount: total_amount,
      })

      setConfirmData(null)
      setEditingOrder(null)
      await loadOrders()
      setTab('offertes')
      window.history.replaceState(null, '', '/beheer/verkoop')
      showToast(`Offerte bijgewerkt voor ${c.name || current?.customer_name || 'klant'}`)
    } catch (err) {
      showToast('Fout: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function createOrder(kl) {
    if (kl.editOrderId) {
      await updateExistingOrder(kl.editOrderId, kl)
      return
    }
    setSubmitting(true)
    const c = kl.customer || {}
    const total_amount = Number(kl.totals?.gross) || 0
    try {
      const result = await postSalesAction('create_from_kozijnlab', { kozijnLab: kl })
      const orderForMail = result.order || {}
      await notifyCustomer(orderForMail, total_amount > 0 ? 'nieuwe_offerte' : 'welkomst')

      setConfirmData(null)
      showToast(`Order aangemaakt voor ${c.name || orderForMail.customer_name || 'klant'}`)
      loadOrders()
      setTimeout(() => { window.location.href = '/beheer' }, 2000)
    } catch (err) {
      showToast('Fout: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function eventKey(e) { return e.id || `${e.order_id}_${e.created_at}` }

  function eventLabel(e) {
    if (e.changed_by === 'klant' && e.from_phase === 0 && e.to_phase === 1)
      return { icon: '🖊', text: 'Offerte geaccordeerd door klant', color: '#1A3A2A' }
    if (e.changed_by === 'mollie_webhook' && e.to_phase === 2)
      return { icon: '💳', text: 'Aanbetaling (20%) ontvangen via iDEAL', color: '#15803d' }
    if (e.changed_by === 'mollie_webhook' && e.to_phase === 7)
      return { icon: '💳', text: 'Betaling ontvangen via iDEAL', color: '#15803d' }
    const ph = getPhase(e.to_phase)
    return { icon: '🔄', text: `Status gewijzigd naar: ${ph?.adminLabel || `fase ${e.to_phase}`}`, color: 'var(--text-muted)' }
  }

  function relTime(dateStr) {
    const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000)
    if (mins < 1) return 'zojuist'
    if (mins < 60) return `${mins} min geleden`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} uur geleden`
    const days = Math.floor(hrs / 24)
    return `${days} dag${days !== 1 ? 'en' : ''} geleden`
  }

  function dismissEvent(key) {
    setDismissedEvents(prev => {
      const next = new Set(prev)
      next.add(key)
      localStorage.setItem('dismissedEvents', JSON.stringify([...next]))
      return next
    })
  }

  function eventRequiresAttention(e) {
    if (!e.order) return false

    const eventAt = new Date(e.created_at).getTime()
    const orderUpdatedAt = new Date(e.order.updated_at || 0).getTime()
    if (orderUpdatedAt > eventAt + 30000) return false

    const phase = Number(e.order.phase || 0)
    if (e.changed_by === 'klant' && e.from_phase === 0 && e.to_phase === 1) {
      return phase === 1 && !e.order.deposit_confirmed
    }
    if (e.changed_by === 'mollie_webhook' && e.to_phase === 2) {
      return phase === 2 && !!e.order.deposit_confirmed
    }
    if (e.changed_by === 'mollie_webhook' && e.to_phase === 7) {
      return phase === 7
    }
    return phase === Number(e.to_phase)
  }

  const visibleEvents = statusEvents.filter(e => eventRequiresAttention(e) && !dismissedEvents.has(eventKey(e)))

  const leads    = orders.filter(o => o.phase === 0)
  const offertes = orders.filter(o => o.phase <= 1)
  const openValue = offertes.reduce((s, o) => s + (o.total_amount || 0), 0)
  // Orders where iDEAL payment came in — phase 2 = deposit just confirmed, phase 6 main_payment_confirmed
  const recentPayments = orders.filter(o =>
    (o.phase === 2 && o.deposit_confirmed) ||
    (o.phase === 6 && o.main_payment_confirmed) ||
    (o.phase === 7 && o.final_payment_confirmed && o.final_payment_confirmed !== o._final_ack)
  ).slice(0, 10)

  const confirmAdjustedTotal = (() => {
    if (!confirmData) return 0
    const t = confirmData.totals || {}
    const dd = 1 - ((confirmData.project?.discountPct || 0) / 100)
    return t.gross || 0
  })()

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <BeheerNav topSlot={
        tab === 'kozijnlab' ? (
          <button onClick={requestSubmit} style={{ width: '100%', background: '#22c55e', border: '1px solid #16a34a', color: 'white', padding: '9px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            {editingOrder ? 'Offerte bijwerken' : '→ Zet door naar EcoPro'}
          </button>
        ) : null
      } />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {/* Topbar */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Verkoop</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Leads, offertes & KozijnLAB configurator</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {NAV.map(item => (
              <button key={item.key} onClick={() => setTab(item.key)}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${tab === item.key ? 'var(--brand)' : 'var(--border)'}`, background: tab === item.key ? 'var(--brand)' : 'white', color: tab === item.key ? 'white' : 'var(--text-muted)', fontWeight: tab === item.key ? 600 : 400, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.1s' }}>
                <span>{item.icon}</span> {item.label}
                {item.key === 'leads' && leads.length > 0 && <span style={{ background: 'var(--warn)', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{leads.length}</span>}
                {item.key === 'dashboard' && visibleEvents.length > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px' }}>{visibleEvents.length}</span>}
              </button>
            ))}
          </div>
        </div>

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

              {visibleEvents.length > 0 && (
                <div style={{ background: 'white', border: '2px solid #ef4444', borderRadius: 12, overflow: 'hidden', marginBottom: 22 }}>
                  <div style={{ background: '#fef2f2', padding: '12px 20px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🔔</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#b91c1c' }}>Actie vereist</div>
                    <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 8px' }}>{visibleEvents.length}</span>
                  </div>
                  {visibleEvents.map((e, i) => {
                    const key = eventKey(e)
                    const { icon, text, color } = eventLabel(e)
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < visibleEvents.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{e.order?.customer_name || 'Onbekende klant'}</div>
                          <div style={{ color, fontSize: 12, marginTop: 2, fontWeight: 500 }}>{icon} {text}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{relTime(e.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <Link href="/beheer" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Beheer →</Link>
                          <button
                            onClick={() => dismissEvent(key)}
                            title="Markeer als gezien"
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 8px', lineHeight: 1.4 }}
                          >✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

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

          {/* Offertes — lijst */}
          {tab === 'offertes' && !selectedOfferte && (
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
                      <div key={o.id} onClick={() => openOfferte(o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < offertes.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customer_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>📍 {o.customer_address}</div>
                          <span className={`badge ${ph.badgeClass}`} style={{ fontSize: 11, marginTop: 6, display: 'inline-block' }}>{ph.adminLabel}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 14 }}>{formatEuro(o.total_amount)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{formatDate(o.created_at)}</div>
                          {orderCanEditInKozijnLab(o) && (
                            <button onClick={(e) => { e.stopPropagation(); openInKozijnLab(o) }}
                              style={{ display: 'block', marginTop: 6, marginLeft: 'auto', background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                              Open in KozijnLAB
                            </button>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4, display: 'block' }}>Bekijk & bewerk →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Offerte detail */}
          {tab === 'offertes' && selectedOfferte && (
            <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => setSelectedOfferte(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
                  ← Terug
                </button>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedOfferte.customer_name}</div>
                {orderCanEditInKozijnLab(selectedOfferte) && (
                  <button onClick={() => openInKozijnLab(selectedOfferte)}
                    style={{ marginLeft: 'auto', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                    Open in KozijnLAB
                  </button>
                )}
              </div>

              {/* Klantinfo */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                  {selectedOfferte.customer_address && <div><span style={{ color: 'var(--text-muted)' }}>Adres: </span>{selectedOfferte.customer_address}</div>}
                  {selectedOfferte.customer_email && <div><span style={{ color: 'var(--text-muted)' }}>E-mail: </span>{selectedOfferte.customer_email}</div>}
                  {selectedOfferte.customer_phone && <div><span style={{ color: 'var(--text-muted)' }}>Tel: </span>{selectedOfferte.customer_phone}</div>}
                  <div><span style={{ color: 'var(--text-muted)' }}>Datum: </span>{formatDate(selectedOfferte.created_at)}</div>
                </div>
              </div>

              {/* Elementen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {offerteItems.map((item, idx) => {
                  const hasElementConfig = !!item.element_config
                  const cfg = item.element_config || {}
                  const unitPrice = Number(editPrices[item.id] ?? item.unit_price) || 0
                  return (
                    <div key={item.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                      {hasElementConfig ? (
                        <div style={{ flexShrink: 0, width: 200, background: 'var(--bg)', borderRadius: 8, padding: 8 }}>
                          <KozijnSVG element={cfg} width={200} height={140} showDims={false} />
                        </div>
                      ) : (
                        <div style={{ flexShrink: 0, width: 200, background: 'var(--bg)', borderRadius: 8, padding: 18, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Extra onderdeel
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                          {hasElementConfig ? (cfg.name || `Element ${idx + 1}`) : item.description}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>{item.description}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 13, alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Aantal</span>
                          <span>{item.quantity}×</span>
                          <span style={{ color: 'var(--text-muted)' }}>Eenheidsprijs (excl. BTW)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--text-muted)' }}>€</span>
                            <input
                              type="number"
                              value={editPrices[item.id] ?? item.unit_price}
                              onChange={e => setEditPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                              style={{ width: 110, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                            />
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>Totaal incl. 21% BTW</span>
                          <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                            {fmtEuro(unitPrice * (item.quantity || 1) * 1.21)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totaal + opslaan */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Totaal incl. BTW</div>
                  <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--brand)' }}>
                    {fmtEuro(offerteItems.reduce((s, it) => s + (Number(editPrices[it.id]) || it.unit_price) * (it.quantity || 1) * 1.21, 0))}
                  </div>
                </div>
                <button onClick={saveOfferteChanges} disabled={savingOfferte}
                  style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: savingOfferte ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingOfferte ? 0.7 : 1 }}>
                  {savingOfferte ? 'Opslaan…' : '💾 Wijzigingen opslaan'}
                </button>
              </div>

              {/* Facturen */}
              {selectedOfferte?.portal_token && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Facturen</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { label: 'Factuur 1 — Aanbetaling (20%)', type: 'aanbetaling' },
                      ...(selectedOfferte.payment_split === 'split_70_10'
                        ? [
                            { label: 'Factuur 2 — Na montage (70%)', type: 'hoofdfactuur' },
                            { label: 'Factuur 3 — Slotbetaling (10%)', type: 'slotbetaling' },
                          ]
                        : [{ label: 'Factuur 2 — Slotfactuur (80%)', type: 'slotfactuur' }]
                      ),
                    ].map(({ label, type }) => (
                      <a
                        key={type}
                        href={`/factuur/${selectedOfferte.portal_token}/${type}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        📋 {label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* QR-code portaal */}
              {selectedOfferte?.portal_token && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Klantportaal — scan met telefoon</div>
                  <div className="qr-portal-row">
                    <div className="qr-portal-qr">
                      <QRCodeSVG
                        value={`https://ecoprokozijnen.vercel.app/portaal/${selectedOfferte.portal_token}`}
                        size={140}
                        bgColor="#ffffff"
                        fgColor="#1A3A2A"
                        level="M"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{selectedOfferte.customer_name}</div>
                      <div className="qr-portal-url">
                        ecoprokozijnen.vercel.app/portaal/{selectedOfferte.portal_token}
                      </div>
                      <a
                        href={`/portaal/${selectedOfferte.portal_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 16px', fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        🔗 Portaal openen
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verkopers */}
          {tab === 'verkopers' && <VerkoopersTab orders={orders} />}

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
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              {confirmData.editOrderId ? 'Offerte bijwerken?' : 'Doorsturen naar EcoPro?'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {confirmData.editOrderId
                ? 'De bestaande offerte wordt bijgewerkt met de aanpassingen uit KozijnLAB.'
                : 'De KozijnLAB offerte wordt omgezet naar een nieuwe order in het dashboard.'}
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

              {(confirmData.extras || []).length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Extra's ({confirmData.extras.length})
                  </div>
                  {confirmData.extras.map((ex, i) => (
                    <div key={ex.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i < confirmData.extras.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span>{ex.qty || 1}Ã— {ex.name || 'Project extra'}</span>
                      <span style={{ fontWeight: 600 }}>{fmtEuro((ex.qty || 1) * (ex.unitPrice || 0))}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Totaal incl. BTW</span>
                <span style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 18 }}>{fmtEuro(confirmAdjustedTotal)}</span>
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
                {submitting ? 'Opslaan…' : confirmData.editOrderId ? 'Werk offerte bij' : '→ Maak order aan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className="animate-fade" style={{ position: 'fixed', bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 12px))', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

function VerkoopersTab({ orders }) {
  const [selected, setSelected] = useState(null)

  function calcRealized(o) {
    const total = Number(o.total_amount) || 0
    if (Number(o.phase) === 7) return total
    let paid = 0
    if (o.deposit_confirmed || o.deposit_paid_at) paid += Math.round(total * 0.2 * 100) / 100
    if (o.main_payment_confirmed) paid += total * (o.payment_split === 'split_70_10' ? 0.7 : 0.8)
    if (o.final_payment_confirmed) paid += total * 0.1
    return Math.min(total, Math.round(paid * 100) / 100)
  }

  const verkopers = Object.values(
    (orders || []).reduce((acc, o) => {
      const key = o.sales_owner || '__geen__'
      const name = VERKOPER_NAMEN[key] || (key === '__geen__' ? 'Onbekend / EcoPro' : key)
      if (!acc[key]) acc[key] = { key, name, orders: [], totalValue: 0, realized: 0 }
      acc[key].orders.push(o)
      acc[key].totalValue += Number(o.total_amount) || 0
      acc[key].realized += calcRealized(o)
      return acc
    }, {})
  ).sort((a, b) => b.totalValue - a.totalValue)

  const knownWithoutOrders = Object.keys(VERKOPER_NAMEN)
    .filter(u => !verkopers.find(v => v.key === u))
    .map(u => ({ key: u, name: VERKOPER_NAMEN[u], orders: [], totalValue: 0, realized: 0 }))

  const all = [...verkopers, ...knownWithoutOrders]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 32 }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Verkopers</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Prestaties per verkoper</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {all.map(v => {
          const active = v.orders.filter(o => o.phase < 7).length
          const initColor = `hsl(${((v.name?.charCodeAt(0) || 65) * 137 + 200) % 360},40%,38%)`
          return (
            <div key={v.key} onClick={() => setSelected(v)}
              style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, #152318, #1e3a28)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: initColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }}>
                  {(v.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>@{v.key}</div>
                </div>
              </div>
              <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Orders', value: v.orders.length },
                  { label: 'Actief', value: active, accent: active > 0 },
                  { label: 'Omzet', value: fmtEuro(v.totalValue), wide: true },
                  { label: 'Gerealiseerd', value: fmtEuro(v.realized), wide: true, accent: v.realized > 0 },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', gridColumn: s.wide ? 'span 2' : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.accent ? 'var(--success)' : 'var(--text)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 18px 12px', fontSize: 11, color: 'var(--text-muted)' }}>Klik voor details →</div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #152318, #1e3a28)', color: 'white', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `hsl(${((selected.name?.charCodeAt(0)||65)*137+200)%360},40%,38%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }}>
                {(selected.name||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.name}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>@{selected.key} · Verkoper</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[
                { label: 'Orders', value: selected.orders.length },
                { label: 'Actief', value: selected.orders.filter(o => o.phase < 7).length },
                { label: 'Omzet', value: fmtEuro(selected.totalValue) },
                { label: 'Gerealiseerd', value: fmtEuro(selected.realized), accent: true },
              ].map(s => (
                <div key={s.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.accent ? 'var(--success)' : 'var(--text)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Ordergeschiedenis ({selected.orders.length})
              </div>
              {selected.orders.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nog geen orders.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.orders.map(o => {
                  const ph = getPhase(o.phase)
                  const realized = calcRealized(o)
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.customer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{o.customer_address || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 1 }}>{formatDate(o.created_at)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className={`badge ${ph.badgeClass}`}>{ph.adminLabel}</span>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{fmtEuro(o.total_amount)}</div>
                        {realized > 0 && realized < o.total_amount && (
                          <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>✓ {fmtEuro(realized)}</div>
                        )}
                        {realized >= o.total_amount && realized > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>✓ Volledig betaald</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtEuro(n) {
  return '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',')
}
