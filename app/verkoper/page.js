'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, formatDate, getPhase } from '@/lib/phases'
import { formatLeadAddress, LEAD_STATUSES } from '@/lib/lead-normalize'
import { calcPotentialCommission } from '@/lib/sales'
import { notifyCustomer } from '@/lib/notifyCustomer'
import { sendLeadLabEvent } from '@/lib/leadLabWebhook'
import { ralName } from '@/lib/KozijnSVG'

const NAV = [
  { key: 'dashboard', label: 'Overzicht', icon: '▦' },
  { key: 'leads', label: 'Mijn leads', icon: '☎' },
  { key: 'kozijnlab', label: 'KozijnLAB', icon: '⚡' },
  { key: 'orders', label: 'Offertes', icon: '□' },
  { key: 'rapportage', label: 'Rapportage', icon: '↗' },
]

const STATUS_STYLE = {
  nieuw: '#f59e0b',
  contact: '#0284c7',
  afspraak: '#1A3A2A',
  offerte: '#7c3aed',
  gewonnen: '#16a34a',
  verloren: '#6b7280',
}

function statusLabel(status) {
  return LEAD_STATUSES.find(s => s.key === status)?.label || status || 'Nieuw'
}

function StatusBadge({ status }) {
  const color = STATUS_STYLE[status] || STATUS_STYLE.nieuw
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: `${color}18`, color, border: `1px solid ${color}33`, fontSize: 11, fontWeight: 800 }}>
      {statusLabel(status)}
    </span>
  )
}

const PANE_LABEL = {
  vast: 'vast glas', draai: 'draai', kiep: 'kiep', draaikiep: 'draai-kiep',
  vent: 'ventilatie', deur: 'deur', deur2: 'dubbele deur', schuif: 'schuif',
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
  const typeRows = doorPanels.length ? doorPanels.map(p => ({ paneType: p.fill === 'glass' ? 'glas' : 'paneel' })) : allRows
  const seenTypes = []
  typeRows.forEach(r => {
    const label = PANE_LABEL[r.paneType] || r.paneType
    if (label && !seenTypes.includes(label)) seenTypes.push(label)
  })
  const glassRows = [...allRows.filter(r => r.fill !== 'panel'), ...doorPanels.filter(r => r.fill === 'glass')]
  const packs = [...new Set(glassRows.map(r => r.glassPack?.trim()).filter(Boolean))]
  const finishLabels = [...new Set(glassRows.map(r => glassFinishLabel(r.glassFinish)).filter(Boolean))]
  const glassStr = [packs[0] || 'HR++', ...finishLabels].join(', ')
  const w = el.dimensions?.widthMM
  const h = el.dimensions?.heightMM
  const colorCode = el.finish?.colorOutside || ''
  const colorName = ralName(colorCode)
  return `Premium Schuco Living Variant ${doorPanels.length || allRows.length || 1}-vaks, ${seenTypes.join(' / ') || 'vast glas'}, ${w} x ${h}mm bxh, Kleur: ${colorCode}${colorName && colorName !== colorCode ? ` - ${colorName}` : ''}, ${glassStr}`
}

function buildOrderItems(orderId, kl) {
  const elementItems = (kl.elements || []).map((el, idx) => ({
    order_id: orderId,
    description: buildItemDescription(el),
    quantity: el.qty || 1,
    unit_price: Number(el.pricePerUnit) || 0,
    sort_order: idx,
    element_config: el,
  }))
  const extraItems = (kl.extras || [])
    .filter(ex => String(ex.name || '').trim() || Number(ex.unitPrice) > 0)
    .map((ex, idx) => ({
      order_id: orderId,
      description: `Extra: ${String(ex.name || '').trim() || 'Project extra'}`,
      quantity: ex.qty || 1,
      unit_price: Number(ex.unitPrice) || 0,
      sort_order: elementItems.length + idx,
      element_config: null,
    }))
  return [...elementItems, ...extraItems]
}

function starterElement(id = Date.now()) {
  return {
    id: `seller_${id}`,
    name: 'Kozijn 1',
    type: 'kozijn',
    qty: 1,
    dimensions: { widthMM: 1200, heightMM: 1400 },
    profile: { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 },
    finish: { colorOutside: 'RAL7016', colorInside: 'same', colorSash: 'same', colorPanel: 'same', finishOutside: 'smooth', finishInside: 'smooth' },
    hardware: 'siegenia',
    pricePerUnit: 0,
    priceTotal: 0,
    columns: [{ widthPct: 100, rows: [{ paneType: 'vast', heightPct: 100, fill: 'glass', glassPack: 'HR++' }] }],
  }
}

function leadToKozijnLabPayload(lead) {
  const address = formatLeadAddress(lead)
  return {
    version: 'kozijnlab.v2',
    offerCode: `LEAD-${String(lead.source_lead_id || lead.id).slice(0, 8).toUpperCase()}`,
    customer: {
      name: lead.customer_name || '',
      email: lead.customer_email || '',
      phone: lead.customer_phone || '',
      address: lead.customer_address || address,
      postcode: lead.postcode || '',
      city: lead.city || '',
    },
    project: { notes: lead.message || '', montageEuro: 0, discountPct: 0, vatRate: 0.21 },
    extras: [],
    elements: [starterElement(lead.id)],
  }
}

export default function VerkoperPage() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [leads, setLeads] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [confirmData, setConfirmData] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [leadFilter, setLeadFilter] = useState('open')
  const iframeRef = useRef(null)
  const activeLeadRef = useRef(null)
  const pendingPayloadRef = useRef(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.role === 'verkoper') setUser(d)
        else window.location.href = '/beheer/login'
      })
      .catch(() => { window.location.href = '/beheer/login' })
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    const [leadResult, orderResult] = await Promise.all([
      supabase.from('leads').select('*').eq('assigned_to', user.username).order('lead_date', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').eq('sales_owner', user.username).order('created_at', { ascending: false }),
    ])
    setLeads(leadResult.data || [])
    setOrders(orderResult.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`verkoper-${user.username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, loadData])

  useEffect(() => {
    const handler = e => {
      if (e.data?.type === 'KOZIJNLAB_SUBMIT') setConfirmData(e.data.data)
      if (e.data?.type === '__edit_mode_available' && pendingPayloadRef.current) postProjectToKozijnLab(pendingPayloadRef.current)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (!selectedLead) return
    const fresh = leads.find(l => l.id === selectedLead.id)
    if (fresh) setSelectedLead(fresh)
  }, [leads]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' })
    window.location.href = '/beheer/login'
  }

  function postProjectToKozijnLab(payload) {
    const msg = { type: 'KOZIJNLAB_LOAD_PROJECT', data: payload }
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(msg, '*'), 400)
    setTimeout(() => { if (pendingPayloadRef.current === payload) pendingPayloadRef.current = null }, 1200)
  }

  function openKozijnLabForLead(lead) {
    activeLeadRef.current = lead
    const payload = leadToKozijnLabPayload(lead)
    pendingPayloadRef.current = payload
    setTab('kozijnlab')
    setTimeout(() => postProjectToKozijnLab(payload), 80)
    showToast(`KozijnLAB geopend voor ${lead.customer_name}`)
  }

  function requestSubmit() {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_SUBMIT' }, '*')
  }

  async function updateLead(lead, updates) {
    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id).eq('assigned_to', user.username)
    if (error) { showToast('Lead niet bijgewerkt: ' + error.message, 'error'); return }
    showToast('Lead bijgewerkt')
    loadData()
  }

  async function createOrder(kl) {
    setSubmitting(true)
    const lead = activeLeadRef.current
    const c = kl.customer || {}
    const total_amount = Number(kl.totals?.gross) || 0
    const address = [c.address, c.postcode, c.city].filter(Boolean).join(', ')
    const internalNotes = [
      `Verkoper: ${user.name} (${user.username})`,
      lead ? `Lead: ${lead.customer_name} (${lead.source_lead_id || lead.id})` : '',
      kl.project?.notes ? `Notities: ${kl.project.notes}` : '',
    ].filter(Boolean).join('\n')

    const { data: order, error } = await supabase.from('orders').insert({
      customer_name: c.name || 'Onbekend',
      customer_email: c.email || '',
      customer_phone: c.phone || '',
      customer_address: address,
      total_amount,
      phase: 0,
      montage_notes: kl.project?.notes || '',
      crm_reference: kl.offerCode || null,
      sales_owner: user.username,
      internal_notes: internalNotes,
    }).select('*').single()

    if (error) {
      setSubmitting(false)
      showToast('Order niet aangemaakt: ' + error.message, 'error')
      return
    }

    const items = buildOrderItems(order.id, kl)
    if (items.length) {
      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) showToast('Order aangemaakt, maar offerteregels niet opgeslagen: ' + itemsError.message, 'error')
    }

    if (lead) {
      await supabase.from('leads').update({ status: 'offerte', order_id: order.id }).eq('id', lead.id).eq('assigned_to', user.username)
      await sendLeadLabEvent('offerte_verzonden', { orderId: order.id })
    }

    await supabase.from('status_history').insert({
      order_id: order.id,
      to_phase: 0,
      note: `Aangemaakt vanuit verkoperportaal (${kl.offerCode || 'KozijnLAB'})`,
      changed_by: user.name || 'verkoper',
    })

    await notifyCustomer({ ...order, crm_reference: kl.offerCode || null }, total_amount > 0 ? 'nieuwe_offerte' : 'welkomst')

    setSubmitting(false)
    setConfirmData(null)
    activeLeadRef.current = null
    await loadData()
    setTab('orders')
    showToast(`Order aangemaakt voor ${c.name || 'klant'}`)
  }

  const openLeads = leads.filter(l => !['gewonnen', 'verloren'].includes(l.status))
  const activeOrders = orders.filter(o => Number(o.phase || 0) <= 1)
  const acceptedOrders = orders.filter(o => Number(o.phase || 0) >= 1)
  const wonValue = orders.filter(o => Number(o.phase || 0) >= 1).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
  const potentialValue = openLeads.reduce((sum, l) => sum + (Number(l.potential_amount) || 0), 0)
  const potentialCommission = openLeads.reduce((sum, l) => sum + calcPotentialCommission(l.potential_amount), 0)
  const realizedCommission = orders.filter(o => Number(o.phase || 0) >= 1).reduce((sum, o) => sum + calcPotentialCommission(o.total_amount), 0)

  let visibleLeads = leadFilter === 'all' ? leads : leads.filter(l => !['gewonnen', 'verloren'].includes(l.status))
  if (leadFilter !== 'all' && leadFilter !== 'open') visibleLeads = leads.filter(l => l.status === leadFilter)
  if (search) {
    const q = search.toLowerCase()
    visibleLeads = visibleLeads.filter(l => [l.customer_name, l.customer_email, l.customer_phone, formatLeadAddress(l), l.project_type, l.message].filter(Boolean).some(v => String(v).toLowerCase().includes(q)))
  }

  if (!user) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>Laden...</div>

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      <aside style={{ width: 220, background: '#152318', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 34, height: 34, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 4 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>EcoPro Kozijnen</div>
              <div style={{ fontSize: 10, opacity: 0.38, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Verkoopportaal</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '18px 14px' }}>
          <div style={{ background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ingelogd als</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#C8A96E' }}>{user.name}</div>
          </div>
        </div>
        <nav style={{ padding: '0 10px', flex: 1 }}>
          {NAV.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px', borderRadius: 9, marginBottom: 2, fontSize: 13, fontWeight: tab === item.key ? 700 : 500, color: tab === item.key ? 'white' : 'rgba(255,255,255,0.52)', background: tab === item.key ? 'rgba(255,255,255,0.13)' : 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>{item.label}
              {item.key === 'leads' && openLeads.length > 0 && <span style={{ marginLeft: 'auto', background: '#f59e0b', color: 'white', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{openLeads.length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={logout} style={{ width: '100%', padding: '8px 14px', borderRadius: 9, background: 'transparent', border: 0, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>↩ Uitloggen</button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Verkoopportaal</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Leads, offertes, KozijnLAB en rapportage voor {user.name}</div>
          </div>
          {tab === 'kozijnlab' && (
            <button onClick={requestSubmit} style={{ background: '#16a34a', color: 'white', border: '1px solid #15803d', borderRadius: 9, padding: '9px 15px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Zet door naar EcoPro</button>
          )}
        </div>

        <section style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'kozijnlab' ? 'block' : 'none', zIndex: 1 }}>
            <iframe ref={iframeRef} src="/KozijnLAB/index.html" title="KozijnLAB" style={{ width: '100%', height: '100%', border: 0 }} />
          </div>

          {tab === 'dashboard' && (
            <PortalView>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginBottom: 18 }}>
                <StatCard label="Open leads" value={openLeads.length} sub="Toegewezen aan jou" accent="#f59e0b" />
                <StatCard label="Potentieel" value={formatEuro(potentialValue)} sub="Open leadwaarde" accent="#0284c7" small />
                <StatCard label="Offertes" value={activeOrders.length} sub="Uitstaand of in akkoordfase" accent="#7c3aed" />
                <StatCard label="Pot. commissie" value={formatEuro(potentialCommission)} sub="Indicatief 5%" accent="#16a34a" small />
              </div>
              <TwoColumn>
                <Panel title="Nieuwste leads">
                  {openLeads.slice(0, 6).map(lead => <LeadRow key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setTab('leads') }} />)}
                  {!openLeads.length && <EmptyText>Geen open leads toegewezen.</EmptyText>}
                </Panel>
                <Panel title="Laatste offertes">
                  {orders.slice(0, 6).map(order => <OrderRow key={order.id} order={order} />)}
                  {!orders.length && <EmptyText>Nog geen offertes aangemaakt.</EmptyText>}
                </Panel>
              </TwoColumn>
            </PortalView>
          )}

          {tab === 'leads' && (
            <PortalView>
              <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? 'minmax(0,1fr) 360px' : '1fr', gap: 16, height: '100%' }}>
                <div style={{ minWidth: 0, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek lead" style={{ maxWidth: 260, fontSize: 13 }} />
                    <select value={leadFilter} onChange={e => setLeadFilter(e.target.value)} style={{ width: 155, fontSize: 13 }}>
                      <option value="open">Open leads</option>
                      <option value="all">Alle leads</option>
                      {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button onClick={() => { activeLeadRef.current = null; setTab('kozijnlab') }} className="btn btn-primary" style={{ marginLeft: 'auto' }}>Nieuwe offerte</button>
                  </div>
                  <Panel title={`Mijn leads (${visibleLeads.length})`}>
                    {loading && <EmptyText>Laden...</EmptyText>}
                    {!loading && visibleLeads.map(lead => <LeadRow key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} active={selectedLead?.id === lead.id} />)}
                    {!loading && !visibleLeads.length && <EmptyText>Geen leads gevonden.</EmptyText>}
                  </Panel>
                </div>
                {selectedLead && (
                  <aside style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
                    <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedLead.customer_name}</div>
                          <div style={{ marginTop: 6 }}><StatusBadge status={selectedLead.status} /></div>
                        </div>
                        <button onClick={() => setSelectedLead(null)} style={{ width: 30, height: 30, border: 0, borderRadius: 8, cursor: 'pointer' }}>x</button>
                      </div>
                    </div>
                    <div style={{ padding: 18, display: 'grid', gap: 16 }}>
                      <Info label="Adres" value={formatLeadAddress(selectedLead) || '-'} />
                      <Info label="Telefoon" value={selectedLead.customer_phone || '-'} />
                      <Info label="E-mail" value={selectedLead.customer_email || '-'} />
                      <Info label="Potentieel" value={formatEuro(selectedLead.potential_amount)} />
                      <Info label="Pot. commissie" value={formatEuro(calcPotentialCommission(selectedLead.potential_amount))} />
                      {selectedLead.message && <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedLead.message}</div>}
                      <select value={selectedLead.status || 'nieuw'} onChange={e => updateLead(selectedLead, { status: e.target.value })}>
                        {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      {selectedLead.order_id ? (
                        <div className="btn btn-secondary btn-full">Order aangemaakt</div>
                      ) : (
                        <button className="btn btn-primary btn-full" onClick={() => openKozijnLabForLead(selectedLead)}>Maak offerte in KozijnLAB</button>
                      )}
                      <button className="btn btn-secondary btn-full" onClick={() => updateLead(selectedLead, { last_contact_at: new Date().toISOString(), status: selectedLead.status === 'nieuw' ? 'contact' : selectedLead.status })}>Contactmoment opslaan</button>
                    </div>
                  </aside>
                )}
              </div>
            </PortalView>
          )}

          {tab === 'orders' && (
            <PortalView>
              <Panel title={`Mijn offertes (${orders.length})`}>
                {orders.map(order => <OrderRow key={order.id} order={order} />)}
                {!orders.length && <EmptyText>Nog geen offertes aangemaakt.</EmptyText>}
              </Panel>
            </PortalView>
          )}

          {tab === 'rapportage' && (
            <PortalView>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginBottom: 18 }}>
                <StatCard label="Leads totaal" value={leads.length} sub="Alle toegewezen leads" accent="#0284c7" />
                <StatCard label="Gewonnen/akkoord" value={acceptedOrders.length} sub="Orders vanaf fase 1" accent="#16a34a" />
                <StatCard label="Omzet akkoord" value={formatEuro(wonValue)} sub="Indicatief" accent="#1A3A2A" small />
                <StatCard label="Commissie" value={formatEuro(realizedCommission)} sub="Indicatief 5%" accent="#C8A96E" small />
              </div>
              <TwoColumn>
                <Panel title="Leadstatus">
                  {LEAD_STATUSES.map(s => (
                    <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{s.label}</span><strong>{leads.filter(l => l.status === s.key).length}</strong>
                    </div>
                  ))}
                </Panel>
                <Panel title="Funnel">
                  <Info label="Open leads" value={String(openLeads.length)} />
                  <Info label="Offertes" value={String(orders.length)} />
                  <Info label="Akkoord/orders actief" value={String(acceptedOrders.length)} />
                  <Info label="Conversie" value={leads.length ? `${Math.round((acceptedOrders.length / leads.length) * 100)}%` : '0%'} />
                </Panel>
              </TwoColumn>
            </PortalView>
          )}
        </section>
      </main>

      {confirmData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 6 }}>Offerte doorzetten?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Deze KozijnLAB offerte wordt als order/offerte aangemaakt in EcoPro.</div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>
              <Info label="Klant" value={confirmData.customer?.name || '-'} />
              <Info label="Offerte" value={confirmData.offerCode || '-'} />
              <Info label="Totaal" value={formatEuro(confirmData.totals?.gross || 0)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmData(null)} disabled={submitting}>Annuleren</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => createOrder(confirmData)} disabled={submitting}>{submitting ? 'Opslaan...' : 'Order aanmaken'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast.msg}</div>
      )}
    </div>
  )
}

function PortalView({ children }) {
  return <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>{children}</div>
}

function TwoColumn({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>{children}</div>
}

function Panel({ title, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, small }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: '15px 17px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: small ? 21 : 32, lineHeight: 1, fontWeight: 900, color: accent, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7 }}>{sub}</div>
    </div>
  )
}

function LeadRow({ lead, onClick, active }) {
  return (
    <div onClick={onClick} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 14, padding: '11px 12px', borderRadius: 10, border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? '#EEF6F0' : 'white', marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.customer_name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatLeadAddress(lead) || lead.customer_phone || lead.customer_email || 'Geen contactgegevens'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <StatusBadge status={lead.status} />
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand)', marginTop: 5 }}>{formatEuro(lead.potential_amount)}</div>
      </div>
    </div>
  )
}

function OrderRow({ order }) {
  const ph = getPhase(order.phase)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 14, padding: '11px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'white', marginBottom: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer_name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{ph?.adminLabel || `Fase ${order.phase}`} · {formatDate(order.created_at)}</div>
      </div>
      <div style={{ textAlign: 'right', fontWeight: 900, color: 'var(--brand)' }}>{formatEuro(order.total_amount)}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--text)', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

function EmptyText({ children }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 10 }}>{children}</div>
}
