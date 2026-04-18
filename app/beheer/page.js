'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
const MONTEURS = ['rudy', 'vida', 'matthew', 'kay']
const MONTEUR_NAMEN = { rudy: 'Rudy en team', vida: 'Vida Kozijnen', matthew: 'Matthew', kay: 'Kay' }
import { supabase } from '@/lib/supabase'
import { PHASES, getPhase, formatEuro, formatDate, formatDateShort, calcDeposit } from '@/lib/phases'

// ─── E-mail notificaties ──────────────────────────────────────────────────────

async function notifyCustomer(order, type, extra = {}) {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, type, extra }),
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok) throw new Error(data.error || 'Onbekende fout')
    return { success: true }
  } catch (err) {
    console.error('Notificatie fout:', err)
    return { success: false, error: err.message }
  }
}

function getNotifyTypeForPhase(phase) {
  const map = { 2: 'aanbetaling_bevestigd', 5: 'montage_gepland', 6: 'montage_klaar', 7: 'compleet' }
  return map[phase] || 'status_update'
}

function PhaseBadge({ phase }) {
  const p = getPhase(phase)
  return <span className={`badge ${p.badgeClass}`}>{p.adminLabel}</span>
}

function ActionNeeded({ order }) {
  const msg = getPhase(order.phase).actionNeeded(order)
  if (!msg) return <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>
  return <span style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 500 }}>⚠ {msg}</span>
}

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
      .select('*, order_items(*), defects(*), order_files(*)')
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

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' })
    window.location.href = '/beheer/login'
  }

  const stats = {
    actief:    orders.filter(o => o.phase < 7).length,
    urgent:    orders.filter(o => o.phase < 7 && getPhase(o.phase).actionNeeded(o)).length,
    inplannen: orders.filter(o => o.phase === 4).length,
    omzet:     orders.filter(o => o.phase < 7).reduce((s, o) => s + (o.total_amount || 0), 0),
  }

  let visible = orders.filter(o => {
    if (filterPhase !== null && o.phase !== filterPhase) return false
    if (filterUrgent && !getPhase(o.phase).actionNeeded(o)) return false
    if (search) {
      const q = search.toLowerCase()
      return o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.customer_address?.toLowerCase().includes(q)
    }
    return true
  })

  visible = [...visible].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey]
    if (sortKey === 'total_amount' || sortKey === 'phase') { av = Number(av); bv = Number(bv) }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <header style={{ background: 'var(--brand)', color: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="EcoPro" style={{ width: 36, height: 36, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>EcoPro Kozijnen</div>
              <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/beheer/montage" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '7px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
              🔧 Montage
            </Link>
            <Link href="/beheer/rapportage" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '7px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
              📊 Rapport
            </Link>
            <button className="btn btn-accent btn-sm" onClick={() => setShowNewModal(true)} style={{ whiteSpace: 'nowrap', padding: '7px 16px', fontWeight: 600 }}>+ Nieuwe order</button>
            <button
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              ↩ Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Actieve orders',    value: stats.actief,            icon: '📋', onClick: () => { setFilterPhase(null); setFilterUrgent(false) }, color: 'var(--brand)' },
          { label: 'Actie vereist',     value: stats.urgent,            icon: '⚠', warn: stats.urgent > 0,    onClick: () => setFilterUrgent(u => !u) },
          { label: 'Montage inplannen', value: stats.inplannen,         icon: '🔧', warn: stats.inplannen > 0, onClick: () => setFilterPhase(4) },
          { label: 'Openstaande omzet', value: formatEuro(stats.omzet), icon: '💶', isText: true, color: 'var(--brand)' },
        ].map(s => (
          <div key={s.label} onClick={s.onClick}
            style={{ padding: '16px 22px', borderRight: '1px solid var(--border)', cursor: s.onClick ? 'pointer' : 'default', transition: 'background 0.12s', display: 'flex', flexDirection: 'column', gap: 4 }}
            onMouseEnter={e => s.onClick && (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => s.onClick && (e.currentTarget.style.background = 'white')}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{s.icon}</span> {s.label}
            </div>
            <div style={{ fontSize: s.isText ? 20 : 28, fontWeight: 700, color: s.warn ? 'var(--warn)' : s.color || 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</div>
            {s.onClick && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 1 }}>Klik om te filteren →</div>}
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: 14 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam of adres…" style={{ width: 160, paddingLeft: 32, fontSize: 13, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {[null, 0, 1, 2, 3, 4, 5, 6, 7].map(ph => {
            const active = !filterUrgent && filterPhase === ph
            return (
              <button key={ph ?? 'all'} onClick={() => { setFilterPhase(ph); setFilterUrgent(false) }}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? 'var(--brand)' : 'white', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 600 : 400, transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
                {ph === null ? 'Alle' : getPhase(ph).adminLabel}
              </button>
            )
          })}
          <button onClick={() => setFilterUrgent(u => !u)}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${filterUrgent ? 'var(--warn)' : 'var(--border)'}`, background: filterUrgent ? 'var(--warn-bg)' : 'white', color: filterUrgent ? 'var(--warn)' : 'var(--text-muted)', fontWeight: filterUrgent ? 600 : 400, transition: 'all 0.1s' }}>
            ⚠ Actie nodig
          </button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-light)', flexShrink: 0, whiteSpace: 'nowrap' }}>{visible.length} orders</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', overflowY: 'auto', background: 'white' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 0.9fr 36px', padding: '7px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
            {[
              { label: 'Klant', key: 'customer_name' },
              { label: 'Fase', key: 'phase' },
              { label: 'Bedrag', key: 'total_amount' },
            ].map(col => (
              <div key={col.label} onClick={col.key ? () => toggleSort(col.key) : undefined}
                style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                {col.label}{col.key && <SortIcon col={col.key} />}
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
              {search ? `Geen orders gevonden voor "${search}"` : 'Geen orders.'}
            </div>
          )}

          {visible.map(order => {
            const isSelected = selected?.id === order.id
            const hasAction  = !!getPhase(order.phase).actionNeeded(order)
            return (
              <div key={order.id} onClick={() => setSelected(isSelected ? null : order)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 0.9fr 36px', padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s', background: isSelected ? 'var(--brand-muted)' : hasAction ? '#FFFCF5' : 'white', borderLeft: isSelected ? '3px solid var(--brand)' : hasAction ? '3px solid var(--warn)' : '3px solid transparent' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--brand-muted)' : hasAction ? '#FFFCF5' : 'white' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {order.customer_name}
                    {!!getPhase(order.phase).actionNeeded(order) && <span style={{ fontSize: 10, background: 'var(--warn-bg)', color: 'var(--warn)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Actie</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📍 {order.customer_address}</div>
                  {order.installation_date && (
                    <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 2, fontWeight: 500 }}>
                      📅 {new Date(order.installation_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div><PhaseBadge phase={order.phase} /></div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{formatEuro(order.total_amount)}</div>
                <div style={{ color: 'var(--text-light)', fontSize: 18, textAlign: 'center', transition: 'transform 0.2s', transform: isSelected ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
              </div>
              {isSelected && (
                <div className="animate-fade" style={{ borderTop: '1px solid var(--border)', background: '#FAFBFA' }}>
                  <DetailPanel order={order} onClose={() => setSelected(null)} onUpdate={loadOrders} showToast={showToast} inline />
                </div>
              )}
            )
          })}
        </div>


      </div>

      {showNewModal && (
        <NewOrderModal
          onClose={() => setShowNewModal(false)}
          onCreated={order => { loadOrders(); setShowNewModal(false); setSelected(order); showToast(`Order voor ${order.customer_name} aangemaakt`) }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="animate-fade" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function DetailPanel({ order, onClose, onUpdate, showToast, inline = false }) {
  const [phase,            setPhase]           = useState(order.phase)
  const [paymentSplit,     setPaymentSplit]     = useState(order.payment_split)
  const [installDate,      setInstallDate]      = useState(order.installation_date || '')
  const [deliveryExpected, setDeliveryExpected] = useState(order.factory_delivery_expected || '')
  const [notes,            setNotes]            = useState(order.montage_notes || '')
  const [depositConf,      setDepositConf]      = useState(order.deposit_confirmed)
  const [mainConf,         setMainConf]         = useState(order.main_payment_confirmed)
  const [finalConf,        setFinalConf]        = useState(order.final_payment_confirmed)
  const [saving,           setSaving]           = useState(false)
  const [tab,              setTab]              = useState('order')
  const [copied,           setCopied]           = useState(false)
  const [uploadingFile,    setUploadingFile]    = useState(false)
  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [deleting,         setDeleting]         = useState(false)
  const [monteur,          setMonteur]          = useState(order.assigned_monteur || '')

  const baseUrl    = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl  = `${process.env.NEXT_PUBLIC_BASE_URL || baseUrl}/portaal/${order.portal_token}`
  const montageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || baseUrl}/montage/${order.montage_token}`
  const defects   = order.defects || []
  const openDefs  = defects.filter(d => d.status === 'open')
  const files     = order.order_files || []

  function copyPortalLink() {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    showToast('Portaallink gekopieerd')
  }

  async function save() {
    setSaving(true)
    const updates = { phase, payment_split: paymentSplit, montage_notes: notes, assigned_monteur: monteur || null, deposit_confirmed: depositConf, main_payment_confirmed: mainConf, final_payment_confirmed: finalConf }
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
    if (error) {
      showToast('Fout: ' + error.message, 'error')
    } else {
      if (phase !== order.phase) {
        const type = getNotifyTypeForPhase(phase)
        const phaseLabel = PHASES.find(p => p.id === phase)?.adminLabel || ''
        const extra = {
          phaseLabel,
          installDate: installDate ? new Date(installDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
        }
        notifyCustomer(order, type, extra).then(r => {
          if (!r.success) console.warn('E-mail niet verzonden:', r.error)
        })
      }
      if (mainConf && !order.main_payment_confirmed) {
        notifyCustomer(order, 'betaling_bevestigd', { amount: order.total_amount * (paymentSplit === 'split_70_10' ? 0.7 : 0.8), final: false })
      }
      if (finalConf && !order.final_payment_confirmed) {
        notifyCustomer(order, 'betaling_bevestigd', { amount: order.total_amount * 0.1, final: true })
      }
      showToast('Opgeslagen & klant genotificeerd')
      onUpdate()
    }
  }

  async function resolveDefect(id) {
    const defect = (order.defects || []).find(d => d.id === id)
    await supabase.from('defects').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    const remainingOpen = (order.defects || []).filter(d => d.id !== id && d.status === 'open').length
    notifyCustomer(order, 'bevinding_opgelost', { defect: defect?.description || '', allResolved: remainingOpen === 0 })
    onUpdate(); showToast('Bevinding opgelost & klant genotificeerd')
  }

  async function uploadFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFile(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${order.id}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (upErr) { showToast('Upload mislukt: ' + upErr.message, 'error'); setUploadingFile(false); return }
    const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
    const { error: insertErr } = await supabase.from('order_files').insert({
      order_id: order.id, filename: file.name, storage_path: path, file_url: publicUrl, file_type: file.type || 'application/octet-stream',
    })
    setUploadingFile(false)
    if (insertErr) { showToast('DB fout: ' + insertErr.message, 'error'); return }
    showToast(`${file.name} geüpload`)
    onUpdate()
    e.target.value = ''
  }

  async function deleteOrder() {
    setDeleting(true)
    const filePaths = (order.order_files || []).map(f => f.storage_path).filter(Boolean)
    if (filePaths.length > 0) await supabase.storage.from('order-files').remove(filePaths)
    const { error } = await supabase.from('orders').delete().eq('id', order.id)
    setDeleting(false)
    if (error) { showToast('Fout bij verwijderen: ' + error.message, 'error'); return }
    showToast('Order verwijderd')
    onClose(); onUpdate()
  }

  async function deleteFile(fileId, filePath) {
    await supabase.storage.from('order-files').remove([filePath])
    await supabase.from('order_files').delete().eq('id', fileId)
    onUpdate(); showToast('Bestand verwijderd')
  }

  const TABS = [
    { key: 'order',       label: 'Order' },
    { key: 'betaling',    label: 'Betaling' },
    { key: 'bevindingen', label: `Punten${openDefs.length > 0 ? ` (${openDefs.length})` : ''}` },
    { key: 'bestanden',   label: `Bestanden${files.length > 0 ? ` (${files.length})` : ''}` },
    { key: 'info',        label: 'Klant' },
  ]

  return (
    <>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{order.customer_address}</div>
          <div style={{ marginTop: 6 }}><PhaseBadge phase={order.phase} /></div>
        </div>
        {!inline && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-light)', padding: '0 2px', lineHeight: 1 }}>✕</button>}
        {inline && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-light)', padding: '4px 8px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>Sluiten ↑</button>}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: '0 0 auto', padding: '9px 10px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, background: 'none', color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', transition: 'all 0.1s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {tab === 'order' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Section title="Status bijwerken">
              <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                {PHASES.map(p => <option key={p.id} value={p.id}>{p.id}. {p.adminLabel}</option>)}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>De klant ziet de update direct in het portaal én ontvangt een e-mail.</p>
            </Section>
            <Section title="Monteur toewijzen">
              <select value={monteur} onChange={e => setMonteur(e.target.value)}>
                <option value="">— Nog niet toegewezen —</option>
                {MONTEURS.map(m => <option key={m} value={m}>{MONTEUR_NAMEN[m]}</option>)}
              </select>
              {monteur && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>✓ Zichtbaar in monteur dashboard van {MONTEUR_NAMEN[monteur]}</p>}
            </Section>
            <Section title="Verwachte levering fabriek">
              <input type="date" value={deliveryExpected} onChange={e => setDeliveryExpected(e.target.value)} />
            </Section>
            <Section title="Montagedatum">
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
            </Section>

            <Section title="Portaallink klant">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" readOnly value={portalUrl} style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }} />
                <button onClick={copyPortalLink} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>{copied ? '✓' : 'Kopieer'}</button>
              </div>
              {order.portal_accessed_at && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>✓ Klant bezocht portaal op {formatDate(order.portal_accessed_at)}</p>}
            </Section>
            <Section title="Portaallink montageploeg">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" readOnly value={montageUrl} style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }} />
                <button
                  onClick={() => { navigator.clipboard.writeText(montageUrl); showToast('Montagelink gekopieerd') }}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Kopieer
                </button>
              </div>
              {order.montage_accessed_at && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>✓ Monteur bezocht portaal op {formatDate(order.montage_accessed_at)}</p>}
            </Section>
            <Section title="Notities voor montageploeg">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Technische details, toegangsinstructies, bijzonderheden…"
                style={{ minHeight: 72 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Zichtbaar voor de montageploeg in hun portaal.</p>
            </Section>
          </div>
        )}

        {tab === 'betaling' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Section title="Betaalsplitsing na montage">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { val: 'pending',     label: 'Klant kiest zelf',           sub: 'Beide opties worden getoond' },
                  { val: 'full_80',     label: '80% in één keer na montage', sub: null },
                  { val: 'split_70_10', label: '70% na montage + 10% later', sub: 'Na oplossen van bevindingen' },
                ].map(opt => (
                  <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${paymentSplit === opt.val ? 'var(--brand)' : 'var(--border)'}`, background: paymentSplit === opt.val ? 'var(--brand-muted)' : 'white', cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="split" value={opt.val} checked={paymentSplit === opt.val} onChange={() => setPaymentSplit(opt.val)} style={{ width: 'auto', margin: '2px 0 0' }} />
                    <div><div style={{ fontWeight: 500 }}>{opt.label}</div>{opt.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.sub}</div>}</div>
                  </label>
                ))}
              </div>
            </Section>
            <Section title="Betalingen ontvangen">
              {[
                { key: 'deposit', label: '20% aanbetaling', amount: formatEuro(order.total_amount * 0.2), checked: depositConf, set: setDepositConf, notified: order.deposit_notified },
                { key: 'main',    label: paymentSplit === 'split_70_10' ? '70% na montage' : '80% na montage', amount: formatEuro(order.total_amount * (paymentSplit === 'split_70_10' ? 0.7 : 0.8)), checked: mainConf, set: setMainConf, notified: order.main_payment_notified },
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

        {tab === 'bevindingen' && (
          <div>
            {defects.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Geen bevindingen gemeld.</p>}
            {defects.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{d.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>Gemeld {formatDate(d.reported_at)}</div>
                </div>
                {d.status === 'open'
                  ? <button onClick={() => resolveDefect(d.id)} className="btn btn-sm" style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)', flexShrink: 0 }}>Oplossen</button>
                  : <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>✓ Opgelost</span>
                }
              </div>
            ))}
          </div>
        )}

        {tab === 'bestanden' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'white' }}>
              <input type="file" onChange={uploadFile} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" />
              {uploadingFile ? '⏳ Uploaden…' : '📎 Bestand of foto toevoegen'}
            </label>
            {files.length === 0 && !uploadingFile && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Nog geen bestanden toegevoegd.</p>
            )}
            {files.map(f => {
              const isImage = f.file_type?.startsWith('image/')
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{isImage ? '🖼' : '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</a>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{formatDate(f.uploaded_at)}</div>
                  </div>
                  <button onClick={() => deleteFile(f.id, f.storage_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 16, flexShrink: 0 }} title="Verwijderen">✕</button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoRow label="Naam"       value={order.customer_name} />
            <InfoRow label="E-mail"     value={<a href={`mailto:${order.customer_email}`} style={{ color: 'var(--brand)' }}>{order.customer_email}</a>} />
            <InfoRow label="Telefoon"   value={order.customer_phone ? <a href={`tel:${order.customer_phone}`} style={{ color: 'var(--brand)' }}>{order.customer_phone}</a> : '—'} />
            <InfoRow label="Adres"      value={order.customer_address || '—'} />
            <InfoRow label="Totaal"     value={<strong>{formatEuro(order.total_amount)}</strong>} />
            <InfoRow label="Aangemaakt" value={formatDate(order.created_at)} />
            {order.signature_name && (
              <div style={{ margin: '8px 0', padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Digitaal ondertekend</div>
                <div style={{ fontSize: 15, fontFamily: 'Georgia, serif', color: 'var(--text)', letterSpacing: '0.02em' }}>{order.signature_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{formatDate(order.signature_at)}</div>
              </div>
            )}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${order.customer_email}`} className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>✉ E-mail sturen</a>
              {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>📞 Bellen</a>}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
          {saving ? 'Opslaan…' : 'Opslaan & klant notificeren'}
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-light)', padding: '4px 0', fontFamily: 'inherit' }}>
            Order verwijderen
          </button>
        ) : (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500, margin: 0 }}>Weet je zeker dat je deze order wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Annuleren</button>
              <button onClick={deleteOrder} disabled={deleting} className="btn btn-danger btn-sm" style={{ flex: 1 }}>{deleting ? 'Verwijderen…' : 'Ja, verwijderen'}</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function NewOrderModal({ onClose, onCreated, showToast }) {
  const defaultExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', quote_expires_at: defaultExpiry })
  const [addr, setAddr] = useState({ street: '', number: '', postcode: '', city: '' })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '', sort_order: 0 }])
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const total = items.reduce((s, i) => s + ((parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0)), 0)
  const fullAddress = [addr.street + (addr.number ? ' ' + addr.number : ''), addr.postcode, addr.city].filter(Boolean).join(', ')

  function setItem(idx, key, val) { setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it)) }

  function addFile(e) {
    const newFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  async function submit() {
    if (!form.customer_name || !form.customer_email) { showToast('Naam en e-mail zijn verplicht', 'error'); return }
    setSaving(true)

    const { data: order, error } = await supabase
      .from('orders')
      .insert({ ...form, customer_address: fullAddress, quote_expires_at: form.quote_expires_at || null, total_amount: total, phase: 0 })
      .select('*').single()

    if (error) { showToast('Fout: ' + error.message, 'error'); setSaving(false); return }

    const validItems = items.filter(i => i.description && i.unit_price).map((i, idx) => ({
      order_id: order.id, description: i.description, quantity: parseInt(i.quantity) || 1, unit_price: parseFloat(i.unit_price), sort_order: idx,
    }))
    if (validItems.length) await supabase.from('order_items').insert(validItems)

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${order.id}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('order-files').getPublicUrl(path)
        const { error: dbErr } = await supabase.from('order_files').insert({
          order_id: order.id, filename: file.name, storage_path: path, file_url: publicUrl, file_type: file.type || 'application/octet-stream',
        })
        if (dbErr) console.error('order_files insert fout:', dbErr.message)
      }
    }

    await supabase.from('status_history').insert({ order_id: order.id, to_phase: 0, note: 'Order aangemaakt', changed_by: 'beheer' })
    // Slimme mail: welkomst als geen prijzen, offerte als wel prijzen
    const mailType = (total > 0) ? 'nieuwe_offerte' : 'welkomst'
    notifyCustomer(order, mailType).then(r => {
      if (!r.success) console.warn('E-mail niet verzonden:', r.error)
    })
    setSaving(false)
    onCreated(order)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', overflow: 'auto', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Nieuwe order</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-light)', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Section title="Klantgegevens">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label>Naam *</label><input type="text" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Familie de Vries" /></div>
              <div><label>E-mailadres *</label><input type="email" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="klant@email.nl" /></div>
              <div><label>Telefoon</label><input type="tel" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="06-12345678" /></div>
              <div><label>Offerte geldig tot</label><input type="date" value={form.quote_expires_at} onChange={e => setForm(p => ({ ...p, quote_expires_at: e.target.value }))} /></div>
            </div>
          </Section>

          <Section title="Adres">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 10 }}>
              <div><label>Straat</label><input type="text" value={addr.street} onChange={e => setAddr(p => ({ ...p, street: e.target.value }))} placeholder="Gronausestraat" /></div>
              <div><label>Huisnr.</label><input type="text" value={addr.number} onChange={e => setAddr(p => ({ ...p, number: e.target.value }))} placeholder="44" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
              <div><label>Postcode</label><input type="text" value={addr.postcode} onChange={e => setAddr(p => ({ ...p, postcode: e.target.value }))} placeholder="7534 AB" /></div>
              <div><label>Woonplaats</label><input type="text" value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} placeholder="Enschede" /></div>
            </div>
            {fullAddress && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>📍 {fullAddress}</p>}
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
            <button onClick={() => setItems(p => [...p, { description: '', quantity: 1, unit_price: '', sort_order: p.length }])} className="btn btn-ghost btn-sm" style={{ marginTop: 4 }}>+ Regel toevoegen</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border)', fontWeight: 700, fontSize: 17 }}>
              <span>Totaal incl. btw</span>
              <span style={{ color: 'var(--brand)' }}>{formatEuro(total)}</span>
            </div>
            {total > 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Aanbetaling 20%: <strong>{formatEuro(total * 0.2)}</strong></p>}
          </Section>

          <Section title="Foto's & bestanden (optioneel)">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, transition: 'all 0.15s', marginBottom: 10 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'white' }}>
              <input type="file" multiple onChange={addFile} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" />
              📎 &nbsp;Klik om foto's of bestanden toe te voegen
            </label>
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                    <span>{f.type?.startsWith('image/') ? '🖼' : '📄'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setFiles(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>Afbeeldingen, PDF's of Word-bestanden.</p>
          </Section>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: 'white' }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Aanmaken…' : `Order aanmaken${files.length > 0 ? ` + ${files.length} bestand${files.length !== 1 ? 'en' : ''}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

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