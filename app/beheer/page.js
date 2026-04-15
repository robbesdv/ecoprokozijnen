'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase, formatEuro, formatDate, formatDateShort, calcDeposit } from '@/lib/phases'

// ─── Hulpcomponenten ──────────────────────────────────────────────────────────

function PhaseBadge({ phase }) {
  const p = getPhase(phase)
  return <span className={`badge ${p.badgeClass}`}>{p.adminLabel}</span>
}

function ActionNeeded({ order }) {
  const msg = getPhase(order.phase).actionNeeded(order)
  if (!msg) return <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warn)', fontSize: 12, fontWeight: 500 }}>
      <span>⚠</span> {msg}
    </span>
  )
}

// ─── Hoofdpagina ──────────────────────────────────────────────────────────────

export default function BeheerPage() {
  const [orders, setOrders]             = useState([])
  const [selected, setSelected]         = useState(null)
  const [filterPhase, setFilterPhase]   = useState(null)
  const [filterUrgent, setFilterUrgent] = useState(false)
  const [search, setSearch]             = useState('')
  const [sortKey, setSortKey]           = useState('created_at')
  const [sortDir, setSortDir]           = useState('desc')
  const [showNewModal, setShowNewModal] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), defects(*)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
    const ch = supabase.channel('orders-beheer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadOrders])

  // Geselecteerde order meebewegen bij refresh
  useEffect(() => {
    if (selected) {
      const updated = orders.find(o => o.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [orders]) // eslint-disable-line

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Statistieken ───────────────────────────────────────────────────────────

  const stats = {
    actief:    orders.filter(o => o.phase < 7).length,
    urgent:    orders.filter(o => o.phase < 7 && getPhase(o.phase).actionNeeded(o)).length,
    inplannen: orders.filter(o => o.phase === 4).length,
    omzet:     orders.filter(o => o.phase < 7).reduce((s, o) => s + (o.total_amount || 0), 0),
  }

  // ── Filter + zoek + sorteer ────────────────────────────────────────────────

  let visible = orders.filter(o => {
    if (filterPhase !== null && o.phase !== filterPhase) return false
    if (filterUrgent && !getPhase(o.phase).actionNeeded(o)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.customer_address?.toLowerCase().includes(q)
      )
    }
    return true
  })

  visible = [...visible].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey]
    if (sortKey === 'total_amount') { av = Number(av); bv = Number(bv) }
    if (sortKey === 'phase')        { av = Number(av); bv = Number(bv) }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <span style={{ color: 'var(--text-light)', marginLeft: 3 }}>⇅</span>
    return <span style={{ color: 'var(--brand)', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: 'var(--brand)', color: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>EcoPro Kozijnen</div>
            <div style={{ fontSize: 10, opacity: 0.45, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Beheerdashboard</div>
          </div>
          <button
            className="btn btn-accent btn-sm"
            onClick={() => setShowNewModal(true)}
          >
            + Nieuwe order
          </button>
        </div>
      </header>

      {/* Statistieken */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Actieve orders', value: stats.actief, onClick: () => { setFilterPhase(null); setFilterUrgent(false) } },
          { label: 'Actie vereist',  value: stats.urgent,    warn: stats.urgent > 0,    onClick: () => setFilterUrgent(u => !u) },
          { label: 'Montage inplannen', value: stats.inplannen, warn: stats.inplannen > 0, onClick: () => setFilterPhase(4) },
          { label: 'Openstaande omzet', value: formatEuro(stats.omzet), isText: true },
        ].map(s => (
          <div
            key={s.label}
            onClick={s.onClick}
            style={{ padding: '14px 20px', borderRight: '1px solid var(--border)', cursor: s.onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
            onMouseEnter={e => s.onClick && (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => s.onClick && (e.currentTarget.style.background = 'white')}
          >
            <div style={{ fontSize: s.isText ? 18 : 24, fontWeight: 700, color: s.warn ? 'var(--warn)' : 'inherit', letterSpacing: s.isText ? '-0.01em' : '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Zoek + filter bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Zoek */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: 14 }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op naam of adres…"
            style={{ width: 220, paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        {/* Fase filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {[null, 0, 1, 2, 3, 4, 5, 6, 7].map(ph => {
            const active = !filterUrgent && filterPhase === ph
            return (
              <button
                key={ph ?? 'all'}
                onClick={() => { setFilterPhase(ph); setFilterUrgent(false) }}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  background: active ? 'var(--brand)' : 'white',
                  color: active ? 'white' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400, transition: 'all 0.1s', whiteSpace: 'nowrap',
                }}
              >
                {ph === null ? 'Alle' : getPhase(ph).adminLabel}
              </button>
            )
          })}
          <button
            onClick={() => setFilterUrgent(u => !u)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${filterUrgent ? 'var(--warn)' : 'var(--border)'}`,
              background: filterUrgent ? 'var(--warn-bg)' : 'white',
              color: filterUrgent ? 'var(--warn)' : 'var(--text-muted)',
              fontWeight: filterUrgent ? 600 : 400, transition: 'all 0.1s',
            }}
          >
            ⚠ Actie nodig
          </button>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-light)', flexShrink: 0 }}>{visible.length} order{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lijst + detail */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Orderlijst */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
          {/* Kolomkoppen */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.2fr 0.9fr 0.8fr 36px',
            padding: '7px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            {[
              { label: 'Klant',       key: 'customer_name' },
              { label: 'Fase',        key: 'phase' },
              { label: 'Actie nodig', key: null },
              { label: 'Bedrag',      key: 'total_amount' },
              { label: 'Datum',       key: 'created_at' },
            ].map(col => (
              <div
                key={col.label}
                onClick={col.key ? () => toggleSort(col.key) : undefined}
                style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', display: 'flex', alignItems: 'center' }}
              >
                {col.label}
                {col.key && <SortIcon col={col.key} />}
              </div>
            ))}
            <div />
          </div>

          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--brand-muted)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Laden…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              {search ? `Geen orders gevonden voor "${search}"` : 'Geen orders gevonden.'}
            </div>
          )}

          {visible.map(order => {
            const isSelected = selected?.id === order.id
            const hasAction  = !!getPhase(order.phase).actionNeeded(order)
            return (
              <div
                key={order.id}
                onClick={() => setSelected(isSelected ? null : order)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.2fr 0.9fr 0.8fr 36px',
                  padding: '12px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  alignItems: 'center', transition: 'background 0.1s',
                  background: isSelected ? 'var(--brand-muted)' : hasAction ? '#FFFCF5' : 'white',
                  borderLeft: isSelected ? '3px solid var(--brand)' : hasAction ? '3px solid var(--warn)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--brand-muted)' : '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--brand-muted)' : hasAction ? '#FFFCF5' : 'white' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{order.customer_address}</div>
                </div>
                <div><PhaseBadge phase={order.phase} /></div>
                <div><ActionNeeded order={order} /></div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{formatEuro(order.total_amount)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateShort(order.created_at)}</div>
                <div style={{ color: 'var(--text-light)', fontSize: 18, textAlign: 'center' }}>›</div>
              </div>
            )
          })}
        </div>

        {/* Detail paneel */}
        {selected && (
          <div className="animate-slide" style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DetailPanel
              order={selected}
              onClose={() => setSelected(null)}
              onUpdate={loadOrders}
              showToast={showToast}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewOrderModal
          onClose={() => setShowNewModal(false)}
          onCreated={order => { loadOrders(); setShowNewModal(false); setSelected(order); showToast(`Order voor ${order.customer_name} aangemaakt`) }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="animate-fade" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A',
          color: 'white', padding: '11px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Detail paneel ────────────────────────────────────────────────────────────

function DetailPanel({ order, onClose, onUpdate, showToast }) {
  const [phase,            setPhase]            = useState(order.phase)
  const [paymentSplit,     setPaymentSplit]      = useState(order.payment_split)
  const [installDate,      setInstallDate]       = useState(order.installation_date || '')
  const [deliveryExpected, setDeliveryExpected]  = useState(order.factory_delivery_expected || '')
  const [notes,            setNotes]             = useState(order.internal_notes || '')
  const [depositConf,      setDepositConf]       = useState(order.deposit_confirmed)
  const [mainConf,         setMainConf]          = useState(order.main_payment_confirmed)
  const [finalConf,        setFinalConf]         = useState(order.final_payment_confirmed)
  const [saving,           setSaving]            = useState(false)
  const [tab,              setTab]               = useState('order')
  const [copied,           setCopied]            = useState(false)

  const baseUrl   = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || baseUrl}/portaal/${order.portal_token}`
  const defects   = order.defects || []
  const openDefs  = defects.filter(d => d.status === 'open')

  function copyPortalLink() {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    showToast('Portaallink gekopieerd')
  }

  async function save() {
    setSaving(true)
    const updates = {
      phase, payment_split: paymentSplit, internal_notes: notes,
      deposit_confirmed: depositConf, main_payment_confirmed: mainConf, final_payment_confirmed: finalConf,
    }
    if (installDate)      updates.installation_date = installDate
    if (deliveryExpected) updates.factory_delivery_expected = deliveryExpected
    if (phase >= 3 && !order.factory_ordered_at) updates.factory_ordered_at = new Date().toISOString()
    if (phase === 6 && !order.installation_done_at) updates.installation_done_at = new Date().toISOString()
    if (phase === 7 && !order.completed_at) updates.completed_at = new Date().toISOString()

    const { error } = await supabase.from('orders').update(updates).eq('id', order.id)

    if (!error && phase !== order.phase) {
      await supabase.from('status_history').insert({ order_id: order.id, from_phase: order.phase, to_phase: phase, changed_by: 'beheer' })
    }

    setSaving(false)
    if (error) showToast('Fout: ' + error.message, 'error')
    else { showToast('Opgeslagen'); onUpdate() }
  }

  async function resolveDefect(id) {
    await supabase.from('defects').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    onUpdate()
    showToast('Bevinding opgelost')
  }

  const TABS = [
    { key: 'order',       label: 'Order' },
    { key: 'betaling',    label: 'Betaling' },
    { key: 'bevindingen', label: `Punten${openDefs.length > 0 ? ` (${openDefs.length})` : ''}` },
    { key: 'info',        label: 'Klant' },
  ]

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{order.customer_address}</div>
          <div style={{ marginTop: 6 }}><PhaseBadge phase={order.phase} /></div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-light)', padding: '0 2px', lineHeight: 1 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: 12,
              fontWeight: tab === t.key ? 700 : 400,
              background: 'none',
              color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent',
              transition: 'all 0.1s', fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {/* ── Tab: Order ── */}
        {tab === 'order' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Section title="Status bijwerken">
              <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                {PHASES.map(p => <option key={p.id} value={p.id}>{p.id}. {p.adminLabel}</option>)}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                De klant ziet de update direct in het portaal.
              </p>
            </Section>

            <Section title="Verwachte levering fabriek">
              <input type="date" value={deliveryExpected} onChange={e => setDeliveryExpected(e.target.value)} />
            </Section>

            <Section title="Montagedatum">
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
            </Section>

            <Section title="Interne notitie">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Niet zichtbaar voor klant…" style={{ minHeight: 72 }} />
            </Section>

            <Section title="Portaallink">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" readOnly value={portalUrl} style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }} />
                <button
                  onClick={copyPortalLink}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {copied ? '✓' : 'Kopieer'}
                </button>
              </div>
              {order.portal_accessed_at && (
                <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>
                  ✓ Klant heeft het portaal voor het laatst bezocht op {formatDate(order.portal_accessed_at)}
                </p>
              )}
            </Section>
          </div>
        )}

        {/* ── Tab: Betaling ── */}
        {tab === 'betaling' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Section title="Betaalsplitsing na montage">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { val: 'pending',     label: 'Klant kiest zelf',               sub: 'Beide opties worden getoond' },
                  { val: 'full_80',     label: '80% in één keer na montage',     sub: null },
                  { val: 'split_70_10', label: '70% na montage + 10% later',     sub: 'Na oplossen van bevindingen' },
                ].map(opt => (
                  <label key={opt.val} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${paymentSplit === opt.val ? 'var(--brand)' : 'var(--border)'}`,
                    background: paymentSplit === opt.val ? 'var(--brand-muted)' : 'white',
                    cursor: 'pointer', fontSize: 13,
                  }}>
                    <input type="radio" name="split" value={opt.val} checked={paymentSplit === opt.val} onChange={() => setPaymentSplit(opt.val)} style={{ width: 'auto', margin: '2px 0 0' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{opt.label}</div>
                      {opt.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.sub}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Betalingen ontvangen">
              {[
                { key: 'deposit', label: `20% aanbetaling`, amount: formatEuro(order.total_amount * 0.2), checked: depositConf, set: setDepositConf, notified: order.deposit_notified },
                { key: 'main',    label: paymentSplit === 'split_70_10' ? `70% na montage` : `80% na montage`, amount: formatEuro(order.total_amount * (paymentSplit === 'split_70_10' ? 0.7 : 0.8)), checked: mainConf, set: setMainConf, notified: order.main_payment_notified },
                ...(paymentSplit === 'split_70_10' ? [{ key: 'final', label: '10% slotbetaling', amount: formatEuro(order.total_amount * 0.1), checked: finalConf, set: setFinalConf, notified: order.final_payment_notified }] : []),
              ].map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={p.checked} onChange={e => p.set(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>{p.amount}</span>
                  {p.notified && !p.checked && <span style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 600 }}>Klant gemeld</span>}
                  {p.checked && <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>✓</span>}
                </label>
              ))}
            </Section>
          </div>
        )}

        {/* ── Tab: Bevindingen ── */}
        {tab === 'bevindingen' && (
          <div>
            {defects.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Geen bevindingen gemeld.</p>}
            {defects.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{d.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>Gemeld {formatDate(d.reported_at)}</div>
                </div>
                {d.status === 'open' ? (
                  <button onClick={() => resolveDefect(d.id)} className="btn btn-sm" style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)', flexShrink: 0 }}>
                    Oplossen
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>✓ Opgelost</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Klant ── */}
        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoRow label="Naam"       value={order.customer_name} />
            <InfoRow label="E-mail"     value={<a href={`mailto:${order.customer_email}`} style={{ color: 'var(--brand)' }}>{order.customer_email}</a>} />
            <InfoRow label="Telefoon"   value={order.customer_phone ? <a href={`tel:${order.customer_phone}`} style={{ color: 'var(--brand)' }}>{order.customer_phone}</a> : '—'} />
            <InfoRow label="Adres"      value={order.customer_address || '—'} />
            <InfoRow label="Totaal"     value={<strong>{formatEuro(order.total_amount)}</strong>} />
            <InfoRow label="Aangemaakt" value={formatDate(order.created_at)} />
            {order.crm_reference && <InfoRow label="CRM ref." value={order.crm_reference} />}

            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${order.customer_email}`} className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>
                ✉ &nbsp;E-mail sturen
              </a>
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>
                  📞 &nbsp;Bellen
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Opslaan */}
      <div style={{ padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
          {saving ? 'Opslaan…' : 'Opslaan & klant notificeren'}
        </button>
      </div>
    </>
  )
}

// ─── Nieuw order modal ────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onCreated, showToast }) {
  const [form, setForm]   = useState({ customer_name: '', customer_email: '', customer_phone: '', customer_address: '', quote_expires_at: '' })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '', sort_order: 0 }])
  const [saving, setSaving] = useState(false)

  const total = items.reduce((s, i) => s + ((parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0)), 0)

  function setItem(idx, key, val) { setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it)) }

  async function submit() {
    if (!form.customer_name || !form.customer_email) { showToast('Naam en e-mail zijn verplicht', 'error'); return }
    if (items.every(i => !i.description)) { showToast('Voeg minimaal één offerteregel toe', 'error'); return }
    setSaving(true)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({ ...form, quote_expires_at: form.quote_expires_at || null, total_amount: total, phase: 0 })
      .select('*').single()

    if (error) { showToast('Fout: ' + error.message, 'error'); setSaving(false); return }

    const validItems = items.filter(i => i.description && i.unit_price).map((i, idx) => ({
      order_id: order.id, description: i.description,
      quantity: parseInt(i.quantity) || 1, unit_price: parseFloat(i.unit_price), sort_order: idx,
    }))
    if (validItems.length) await supabase.from('order_items').insert(validItems)
    await supabase.from('status_history').insert({ order_id: order.id, to_phase: 0, note: 'Order aangemaakt', changed_by: 'beheer' })

    setSaving(false)
    onCreated(order)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Nieuwe order</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-light)', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Section title="Klantgegevens">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'customer_name',    label: 'Naam *',           placeholder: 'Familie de Vries',       type: 'text' },
                { key: 'customer_email',   label: 'E-mailadres *',    placeholder: 'klant@email.nl',         type: 'email' },
                { key: 'customer_phone',   label: 'Telefoon',         placeholder: '06-12345678',            type: 'tel' },
                { key: 'customer_address', label: 'Adres',            placeholder: 'Straatnaam 1, Enschede', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Offerte geldig tot</label>
              <input type="date" value={form.quote_expires_at} onChange={e => setForm(p => ({ ...p, quote_expires_at: e.target.value }))} style={{ maxWidth: 200 }} />
            </div>
          </Section>

          <Section title="Offerteregels">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 100px 28px', gap: 6, marginBottom: 8 }}>
              {['Omschrijving', 'Aantal', 'Stukprijs', ''].map(h => (
                <div key={h} style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 100px 28px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input type="text" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} placeholder="Kozijn 900×1400mm" />
                <input type="number" min="1" value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} style={{ textAlign: 'center' }} />
                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} placeholder="870" />
                <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1} style={{ background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'default', color: items.length > 1 ? 'var(--danger)' : 'var(--border)', fontSize: 16, padding: 0 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setItems(p => [...p, { description: '', quantity: 1, unit_price: '', sort_order: p.length }])} className="btn btn-ghost btn-sm" style={{ marginTop: 4 }}>
              + Regel toevoegen
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border)', fontWeight: 700, fontSize: 17 }}>
              <span>Totaal incl. btw</span>
              <span style={{ color: 'var(--brand)' }}>{formatEuro(total)}</span>
            </div>
            {total > 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Aanbetaling 20%: <strong>{formatEuro(total * 0.2)}</strong></p>}
          </Section>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: 'white' }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Aanmaken…' : 'Order aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mini hulpcomponenten ─────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}