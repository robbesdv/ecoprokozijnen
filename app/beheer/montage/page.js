'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/phases'
import BeheerNav from '@/lib/BeheerNav'

const MONTEURS = [
  { key: 'rudy',    naam: 'Rudy en team',   kleur: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  { key: 'vida',    naam: 'Vida Kozijnen',  kleur: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  { key: 'matthew', naam: 'Matthew',        kleur: '#C8A96E', bg: 'rgba(200,169,110,0.15)' },
  { key: 'kay',     naam: 'Kay',            kleur: '#10B981', bg: 'rgba(16,185,129,0.15)' },
]

const FASE_KLEUREN = {
  3: { label: 'In productie',        bg: '#EFF6FF', kleur: '#3B82F6', border: '#BFDBFE' },
  4: { label: 'Geleverd bij EcoPro', bg: '#F0FDF4', kleur: '#16A34A', border: '#BBF7D0' },
  5: { label: 'Montage ingepland',   bg: '#FFFBEB', kleur: '#D97706', border: '#FDE68A' },
  6: { label: 'Montage afgerond',    bg: '#F5F3FF', kleur: '#7C3AED', border: '#DDD6FE' },
  7: { label: 'Compleet',            bg: '#F0FDF4', kleur: '#15803D', border: '#86EFAC' },
}

export default function MontagePlanningPage() {
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState('kalender') // kalender | monteurs | lijst
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [toast, setToast]             = useState(null)
  const [savingId, setSavingId]       = useState(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), defects(*), montage_files(*)')
      .gte('phase', 3)
      .order('installation_date', { ascending: true, nullsLast: true })
    setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function saveOrder(id, updates) {
    setSavingId(id)
    const { error } = await supabase.from('orders').update(updates).eq('id', id)
    setSavingId(null)
    if (error) { showToast('Fout: ' + error.message, 'error'); return }
    showToast('Opgeslagen')
    loadOrders()
    if (selectedOrder?.id === id) {
      const { data } = await supabase.from('orders').select('*, order_items(*), defects(*), montage_files(*)').eq('id', id).single()
      if (data) setSelectedOrder(data)
    }
  }

  // Stats
  const stats = {
    inPlannen:    orders.filter(o => o.phase === 4).length,
    gepland:      orders.filter(o => o.phase === 5).length,
    bezig:        orders.filter(o => o.phase === 5 && o.installation_date && new Date(o.installation_date) <= new Date()).length,
    afgerond:     orders.filter(o => o.phase === 6).length,
    openPunten:   orders.reduce((s, o) => s + (o.defects || []).filter(d => d.status === 'open').length, 0),
    zonderMonteur: orders.filter(o => o.phase >= 4 && o.phase < 7 && !o.assigned_monteur).length,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <BeheerNav />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Montage</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Planning & monteursbeheer</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'kalender', label: '📅 Kalender' },
            { key: 'monteurs', label: '👷 Monteurs' },
            { key: 'lijst',    label: '📋 Lijst' },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${view === v.key ? 'var(--brand)' : 'var(--border)'}`, fontFamily: 'inherit', fontWeight: view === v.key ? 700 : 400, background: view === v.key ? 'var(--brand)' : 'white', color: view === v.key ? 'white' : 'var(--text-muted)', transition: 'all 0.1s' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats balk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'In te plannen',    value: stats.inPlannen,    warn: stats.inPlannen > 0,    color: stats.inPlannen > 0 ? 'var(--warn)' : undefined },
          { label: 'Ingepland',        value: stats.gepland,      color: '#3B82F6' },
          { label: 'Vandaag bezig',    value: stats.bezig,        color: stats.bezig > 0 ? '#16A34A' : undefined },
          { label: 'Afgerond',         value: stats.afgerond,     color: 'var(--success)' },
          { label: 'Open bevindingen', value: stats.openPunten,   warn: stats.openPunten > 0, color: stats.openPunten > 0 ? 'var(--danger)' : undefined },
          { label: 'Zonder monteur',   value: stats.zonderMonteur, warn: stats.zonderMonteur > 0, color: stats.zonderMonteur > 0 ? 'var(--warn)' : undefined },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || 'var(--text)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hoofd content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Kalender view */}
        {view === 'kalender' && (
          <KalenderView
            orders={orders}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            onSelectOrder={setSelectedOrder}
            selectedOrder={selectedOrder}
          />
        )}

        {/* Monteurs view */}
        {view === 'monteurs' && (
          <MonteursView
            orders={orders}
            onSelectOrder={setSelectedOrder}
            selectedOrder={selectedOrder}
            onSave={saveOrder}
            savingId={savingId}
            showToast={showToast}
          />
        )}

        {/* Lijst view */}
        {view === 'lijst' && (
          <LijstView
            orders={orders}
            onSelectOrder={setSelectedOrder}
            selectedOrder={selectedOrder}
          />
        )}

        {/* Detail paneel */}
        {selectedOrder && (
          <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onSave={saveOrder}
              savingId={savingId}
              showToast={showToast}
              onRefresh={loadOrders}
            />
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
      </div>
    </div>
  )
}

// ─── Kalender View ────────────────────────────────────────────────────────────

function KalenderView({ orders, currentMonth, setCurrentMonth, onSelectOrder, selectedOrder }) {
  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Maandag = 0

  const maanden = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
  const dagen   = ['Ma','Di','Wo','Do','Vr','Za','Zo']

  function ordersOpDag(day) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return orders.filter(o => o.installation_date?.startsWith(dateStr))
  }

  const today = new Date()
  const isToday = (day) => today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Navigatie */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))}
          style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 16 }}>‹</button>
        <h2 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>{maanden[month]} {year}</h2>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))}
          style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 16 }}>›</button>
      </div>

      {/* Dag headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
        {dagen.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Kalender grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: 90 }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayOrders = ordersOpDag(day)
          const isWeekend = ((startOffset + day - 1) % 7) >= 5
          return (
            <div key={day}
              style={{ minHeight: 90, background: isToday(day) ? 'var(--brand-muted)' : isWeekend ? '#FAFAFA' : 'white', border: `1px solid ${isToday(day) ? 'var(--brand-border)' : 'var(--border)'}`, borderRadius: 10, padding: '8px', overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? 'var(--brand)' : isWeekend ? 'var(--text-muted)' : 'var(--text)', marginBottom: 4 }}>{day}</div>
              {dayOrders.map(o => {
                const m = MONTEURS.find(m => m.key === o.assigned_monteur)
                return (
                  <div key={o.id}
                    onClick={() => onSelectOrder(o)}
                    style={{ background: m?.bg || 'var(--bg)', border: `1px solid ${m?.kleur || 'var(--border)'}`, borderLeft: `3px solid ${m?.kleur || 'var(--border)'}`, borderRadius: 5, padding: '3px 6px', marginBottom: 3, cursor: 'pointer', fontSize: 11 }}
                    title={o.customer_name}>
                    <div style={{ fontWeight: 600, color: m?.kleur || 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name}</div>
                    {m && <div style={{ color: m.kleur, opacity: 0.8, fontSize: 10 }}>{m.naam}</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        {MONTEURS.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: m.kleur }} />
            <span style={{ color: 'var(--text-muted)' }}>{m.naam}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Monteurs View ────────────────────────────────────────────────────────────

function MonteursView({ orders, onSelectOrder, selectedOrder, onSave, savingId }) {
  const activeOrders = orders.filter(o => o.phase < 7)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        {/* Niet toegewezen */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--border)' }} />
            Niet toegewezen
            <span style={{ background: 'var(--warn-bg)', color: 'var(--warn)', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              {activeOrders.filter(o => !o.assigned_monteur).length}
            </span>
          </div>
          {activeOrders.filter(o => !o.assigned_monteur).map(o => (
            <OrderKaartje key={o.id} order={o} onClick={() => onSelectOrder(o)} isSelected={selectedOrder?.id === o.id} />
          ))}
          {activeOrders.filter(o => !o.assigned_monteur).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>✓ Alle orders toegewezen</div>
          )}
        </div>

        {/* Per monteur */}
        {MONTEURS.map(m => {
          const mOrders = activeOrders.filter(o => o.assigned_monteur === m.key)
          return (
            <div key={m.key}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: m.kleur }} />
                {m.naam}
                <span style={{ background: m.bg, color: m.kleur, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {mOrders.length}
                </span>
              </div>
              {mOrders.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>Geen actieve orders</div>
              ) : (
                mOrders.map(o => (
                  <OrderKaartje key={o.id} order={o} monteur={m} onClick={() => onSelectOrder(o)} isSelected={selectedOrder?.id === o.id} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Lijst View ───────────────────────────────────────────────────────────────

function LijstView({ orders, onSelectOrder, selectedOrder }) {
  const [filterMonteur, setFilterMonteur] = useState('')
  const [filterFase, setFilterFase]       = useState('')
  const [sort, setSort]                   = useState('datum')

  let visible = orders.filter(o => {
    if (filterMonteur && o.assigned_monteur !== filterMonteur) return false
    if (filterFase && String(o.phase) !== filterFase) return false
    return true
  })

  if (sort === 'datum') visible = [...visible].sort((a, b) => {
    if (!a.installation_date) return 1
    if (!b.installation_date) return -1
    return new Date(a.installation_date) - new Date(b.installation_date)
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter balk */}
      <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <select value={filterMonteur} onChange={e => setFilterMonteur(e.target.value)} style={{ fontSize: 13 }}>
          <option value="">Alle monteurs</option>
          <option value="">— Niet toegewezen —</option>
          {MONTEURS.map(m => <option key={m.key} value={m.key}>{m.naam}</option>)}
        </select>
        <select value={filterFase} onChange={e => setFilterFase(e.target.value)} style={{ fontSize: 13 }}>
          <option value="">Alle fases</option>
          {Object.entries(FASE_KLEUREN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{visible.length} orders</span>
      </div>

      {/* Tabel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
              {['Klant', 'Adres', 'Monteur', 'Datum', 'Fase', 'Punten'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(o => {
              const m = MONTEURS.find(m => m.key === o.assigned_monteur)
              const fase = FASE_KLEUREN[o.phase]
              const openDefs = (o.defects || []).filter(d => d.status === 'open').length
              const isSelected = selectedOrder?.id === o.id
              return (
                <tr key={o.id} onClick={() => onSelectOrder(o)}
                  style={{ cursor: 'pointer', background: isSelected ? 'var(--brand-muted)' : 'white', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F9FAFB' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--brand-muted)' : 'white' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{o.customer_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_address}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {m ? (
                      <span style={{ background: m.bg, color: m.kleur, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m.naam}</span>
                    ) : (
                      <span style={{ background: 'var(--warn-bg)', color: 'var(--warn)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Niet toegewezen</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {o.installation_date
                      ? new Date(o.installation_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Nog niet gepland</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {fase && <span style={{ background: fase.bg, color: fase.kleur, border: `1px solid ${fase.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{fase.label}</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {openDefs > 0 && <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>⚠ {openDefs}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Geen orders gevonden.</div>
        )}
      </div>
    </div>
  )
}

// ─── Order Kaartje (voor monteurs view) ───────────────────────────────────────

function OrderKaartje({ order, monteur, onClick, isSelected }) {
  const openDefs = (order.defects || []).filter(d => d.status === 'open').length
  const fase = FASE_KLEUREN[order.phase]

  return (
    <div onClick={onClick}
      style={{ background: isSelected ? 'var(--brand-muted)' : 'white', border: `1px solid ${isSelected ? 'var(--brand-border)' : 'var(--border)'}`, borderLeft: `3px solid ${monteur?.kleur || 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.1s' }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = monteur?.kleur || 'var(--brand)' }}}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border)' }}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer_name}</div>
        {fase && <span style={{ background: fase.bg, color: fase.kleur, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>{fase.label}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>📍 {order.customer_address}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        {order.installation_date ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            📅 {new Date(order.installation_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 500 }}>📅 Nog niet gepland</span>
        )}
        {openDefs > 0 && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>⚠ {openDefs} punt{openDefs !== 1 ? 'en' : ''}</span>}
        {(order.montage_files || []).length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📷 {order.montage_files.length}</span>}
      </div>
    </div>
  )
}

// ─── Order Detail Paneel ──────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose, onSave, savingId, showToast, onRefresh }) {
  const [monteur,       setMonteur]       = useState(order.assigned_monteur || '')
  const [installDate,   setInstallDate]   = useState(order.installation_date?.slice(0,10) || '')
  const [montageNotes,  setMontageNotes]  = useState(order.montage_notes || '')
  const [phase,         setPhase]         = useState(order.phase)
  const [tab,           setTab]           = useState('detail')

  const isSaving = savingId === order.id
  const defects  = order.defects || []
  const openDefs = defects.filter(d => d.status === 'open')
  const montageFiles = order.montage_files || []
  const m = MONTEURS.find(m => m.key === monteur)

  async function save() {
    await onSave(order.id, {
      assigned_monteur: monteur || null,
      installation_date: installDate || null,
      montage_notes: montageNotes,
      phase,
      ...(phase === 6 && order.phase !== 6 ? { installation_done_at: new Date().toISOString() } : {}),
      ...(phase === 7 && order.phase !== 7 ? { completed_at: new Date().toISOString() } : {}),
    })
  }

  async function resolveDefect(id) {
    await supabase.from('defects').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    onRefresh(); showToast('Bevinding opgelost')
  }

  const TABS = [
    { key: 'detail',   label: 'Detail' },
    { key: 'punten',   label: `Punten${openDefs.length > 0 ? ` (${openDefs.length})` : ''}` },
    { key: 'fotos',    label: `Foto's${montageFiles.length > 0 ? ` (${montageFiles.length})` : ''}` },
  ]

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📍 {order.customer_address}</div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} style={{ fontSize: 12, color: 'var(--brand)', marginTop: 2, display: 'block', textDecoration: 'none' }}>📞 {order.customer_phone}</a>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-light)', padding: '0 2px' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '9px 8px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, background: 'none', color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {tab === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Monteur */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Monteur</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${!monteur ? 'var(--brand)' : 'var(--border)'}`, background: !monteur ? 'var(--brand-muted)' : 'white', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="monteur" value="" checked={!monteur} onChange={() => setMonteur('')} style={{ width: 'auto', margin: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>Nog niet toegewezen</span>
                </label>
                {MONTEURS.map(m => (
                  <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${monteur === m.key ? m.kleur : 'var(--border)'}`, background: monteur === m.key ? m.bg : 'white', cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="monteur" value={m.key} checked={monteur === m.key} onChange={() => setMonteur(m.key)} style={{ width: 'auto', margin: 0 }} />
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: m.kleur, flexShrink: 0 }} />
                    <span style={{ fontWeight: monteur === m.key ? 600 : 400, color: monteur === m.key ? m.kleur : 'var(--text)' }}>{m.naam}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Datum */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Montagedatum</div>
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
            </div>

            {/* Status */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Status</div>
              <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                {Object.entries(FASE_KLEUREN).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Notities */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Notities voor monteur</div>
              <textarea value={montageNotes} onChange={e => setMontageNotes(e.target.value)} placeholder="Technische details, toegang, bijzonderheden…" style={{ minHeight: 90 }} />
            </div>

            {/* Montagelink */}
            {order.montage_token && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Montagelink</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" readOnly value={`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/montage/${order.montage_token}`} style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }} />
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/montage/${order.montage_token}`); showToast('Link gekopieerd') }}
                    className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                    Kopieer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'punten' && (
          <div>
            {defects.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Geen bevindingen gemeld.</p>}
            {defects.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{d.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>
                    Gemeld {new Date(d.reported_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                {d.status === 'open'
                  ? <button onClick={() => resolveDefect(d.id)} className="btn btn-sm" style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)', flexShrink: 0 }}>Oplossen</button>
                  : <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>✓ Opgelost</span>
                }
              </div>
            ))}
          </div>
        )}

        {tab === 'fotos' && (
          <div>
            {montageFiles.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Nog geen foto's geüpload door monteur.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {montageFiles.map(f => {
                  const isImage = f.file_type?.startsWith('image/')
                  return (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', textDecoration: 'none' }}>
                      {isImage
                        ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: 'var(--bg)' }}>📄</div>
                      }
                      <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-primary btn-full" onClick={save} disabled={isSaving}>
          {isSaving ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </>
  )
}