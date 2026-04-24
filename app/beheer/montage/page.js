'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BeheerNav from '@/lib/BeheerNav'

const MONTEURS = [
  { key: 'rudy',    naam: 'Rudy en team',  kleur: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'vida',    naam: 'Vida Kozijnen', kleur: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  { key: 'matthew', naam: 'Matthew',       kleur: '#C8A96E', bg: 'rgba(200,169,110,0.12)' },
  { key: 'kay',     naam: 'Kay',           kleur: '#10B981', bg: 'rgba(16,185,129,0.12)' },
]

const FASES = {
  3: { label: 'In productie',        bg: '#EFF6FF', kleur: '#3B82F6', border: '#BFDBFE' },
  4: { label: 'Geleverd bij EcoPro', bg: '#F0FDF4', kleur: '#16A34A', border: '#BBF7D0' },
  5: { label: 'Montage ingepland',   bg: '#FFFBEB', kleur: '#D97706', border: '#FDE68A' },
  6: { label: 'Montage afgerond',    bg: '#F5F3FF', kleur: '#7C3AED', border: '#DDD6FE' },
  7: { label: 'Compleet',            bg: '#F0FDF4', kleur: '#15803D', border: '#86EFAC' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function notifyCustomer(order, type, extra = {}) {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, type, extra }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Onbekende fout')
    return { success: true }
  } catch (err) {
    console.warn('Notificatie fout:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export default function MontagePlanningPage() {
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [view, setView]                   = useState('kalender')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [toast, setToast]                 = useState(null)
  const [savingId, setSavingId]           = useState(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), defects(*), montage_files(*)')
      .gte('phase', 3)
      .order('installation_date', { ascending: true, nullsLast: true })
    setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
    const ch = supabase.channel('montage-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadOrders])

  // Sync geselecteerde order als hij herlaadt
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    }
  }, [orders]) // eslint-disable-line

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function saveOrder(id, updates, notifyType = null, notifyExtra = {}) {
    setSavingId(id)
    const { error } = await supabase.from('orders').update(updates).eq('id', id)
    if (!error && updates.phase !== undefined) {
      const order = orders.find(o => o.id === id)
      if (order && updates.phase !== order.phase) {
        await supabase.from('status_history').insert({
          order_id: id, from_phase: order.phase, to_phase: updates.phase, changed_by: 'montage',
        })
      }
    }
    setSavingId(null)
    if (error) { showToast('Fout: ' + error.message, 'error'); return }

    if (notifyType) {
      const order = orders.find(o => o.id === id)
      if (order) notifyCustomer({ ...order, ...updates }, notifyType, notifyExtra)
    }

    showToast('Opgeslagen')
    loadOrders()
  }

  const stats = {
    inPlannen:     orders.filter(o => o.phase === 4).length,
    gepland:       orders.filter(o => o.phase === 5).length,
    vandaag:       orders.filter(o => o.phase === 5 && o.installation_date?.startsWith(new Date().toISOString().slice(0,10))).length,
    afgerond:      orders.filter(o => o.phase === 6).length,
    openPunten:    orders.reduce((s, o) => s + (o.defects || []).filter(d => d.status === 'open').length, 0),
    zonderMonteur: orders.filter(o => o.phase >= 4 && o.phase < 7 && !o.assigned_monteur).length,
  }

  const VIEWS = [
    { key: 'kalender', label: 'Kalender' },
    { key: 'monteurs', label: 'Monteurs' },
    { key: 'lijst',    label: 'Lijst' },
  ]

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
            {VIEWS.map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: view === v.key ? 700 : 400, border: `1px solid ${view === v.key ? 'var(--brand)' : 'var(--border)'}`, background: view === v.key ? 'var(--brand)' : 'white', color: view === v.key ? 'white' : 'var(--text-muted)', transition: 'all 0.1s' }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
            {[
              { label: 'In te plannen',   value: stats.inPlannen,     accent: stats.inPlannen > 0     ? '#f59e0b' : '#cbd5e1', warn: stats.inPlannen > 0,     sub: 'Datum instellen' },
              { label: 'Ingepland',       value: stats.gepland,       accent: '#3B82F6',                                       sub: 'Montages in agenda' },
              { label: 'Vandaag bezig',   value: stats.vandaag,       accent: stats.vandaag > 0       ? '#16A34A' : '#cbd5e1', sub: 'Op locatie' },
              { label: 'Afgerond',        value: stats.afgerond,      accent: '#8B5CF6',                                       sub: 'Fase 6 orders' },
              { label: 'Open bevindingen',value: stats.openPunten,    accent: stats.openPunten > 0    ? '#ef4444' : '#cbd5e1', warn: stats.openPunten > 0,    sub: 'Te behandelen' },
              { label: 'Zonder monteur',  value: stats.zonderMonteur, accent: stats.zonderMonteur > 0 ? '#f59e0b' : '#cbd5e1', warn: stats.zonderMonteur > 0, sub: 'Nog toe te wijzen' },
            ].map(s => (
              <div key={s.label}
                style={{ background: '#FAFAFA', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', borderLeft: `4px solid ${s.accent}`, transition: 'box-shadow 0.15s' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: s.warn ? s.accent : 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hoofd content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'kalender' && (
            <KalenderView
              orders={orders} loading={loading}
              currentMonth={currentMonth} setCurrentMonth={setCurrentMonth}
              onSelectOrder={setSelectedOrder} selectedOrder={selectedOrder}
            />
          )}
          {view === 'monteurs' && (
            <MonteursView
              orders={orders}
              onSelectOrder={setSelectedOrder} selectedOrder={selectedOrder}
            />
          )}
          {view === 'lijst' && (
            <LijstView
              orders={orders} loading={loading}
              onSelectOrder={setSelectedOrder} selectedOrder={selectedOrder}
            />
          )}

          {/* Detail paneel */}
          {selectedOrder && (
            <div style={{ width: 390, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <OrderDetailPanel
                key={selectedOrder.id}
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
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Kalender View ────────────────────────────────────────────────────────────

function KalenderView({ orders, loading, currentMonth, setCurrentMonth, onSelectOrder, selectedOrder }) {
  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
  const DAGEN   = ['Ma','Di','Wo','Do','Vr','Za','Zo']

  const todayStr = new Date().toISOString().slice(0, 10)

  function ordersOpDag(day) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return orders.filter(o => o.installation_date?.startsWith(dateStr))
  }

  const isToday  = (day) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` === todayStr
  const isWeekend = (day) => ((startOffset + day - 1) % 7) >= 5

  // Maanden met montages voor snelnavigatie
  const maandTotalen = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .reduce((s, d) => s + ordersOpDag(d).length, 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Navigatie */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))}
          style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', transition: 'border-color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >‹</button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0, letterSpacing: '-0.02em' }}>{MAANDEN[month]} {year}</h2>
          {maandTotalen > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{maandTotalen} montage{maandTotalen !== 1 ? 's' : ''} gepland</div>}
        </div>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))}
          style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', transition: 'border-color 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >›</button>
      </div>

      {/* Dag headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
        {DAGEN.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i >= 5 ? '#94a3b8' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Kalender grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e-${i}`} style={{ minHeight: 90 }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayOrders = ordersOpDag(day)
          const today = isToday(day)
          const weekend = isWeekend(day)
          return (
            <div key={day} style={{ minHeight: 90, background: today ? '#EEF6F0' : weekend ? '#FAFAFA' : 'white', border: `1px solid ${today ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 10, padding: 8, overflow: 'hidden', transition: 'box-shadow 0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: today ? 800 : 400, color: today ? 'var(--brand)' : weekend ? '#94a3b8' : 'var(--text)' }}>{day}</span>
                {dayOrders.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--brand)', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dayOrders.length}</span>}
              </div>
              {dayOrders.map(o => {
                const m = MONTEURS.find(m => m.key === o.assigned_monteur)
                const isSelected = selectedOrder?.id === o.id
                return (
                  <div key={o.id} onClick={() => onSelectOrder(o)}
                    style={{ background: isSelected ? 'var(--brand)' : (m?.bg || '#F1F5F9'), border: `1px solid ${isSelected ? 'var(--brand)' : (m?.kleur || 'var(--border)')}`, borderLeft: `3px solid ${m?.kleur || 'var(--border)'}`, borderRadius: 5, padding: '3px 6px', marginBottom: 3, cursor: 'pointer', fontSize: 11 }}>
                    <div style={{ fontWeight: 600, color: isSelected ? 'white' : (m?.kleur || 'var(--text)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name}</div>
                    {m && !isSelected && <div style={{ fontSize: 10, color: m.kleur, opacity: 0.8 }}>{m.naam}</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 14, marginTop: 20, flexWrap: 'wrap', padding: '14px 0', borderTop: '1px solid var(--border)' }}>
        {MONTEURS.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: m.kleur }} />
            <span style={{ color: 'var(--text-muted)' }}>{m.naam}</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{orders.filter(o => o.assigned_monteur === m.key && o.phase < 7).length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Monteurs View ────────────────────────────────────────────────────────────

function MonteursView({ orders, onSelectOrder, selectedOrder }) {
  const activeOrders = orders.filter(o => o.phase < 7)
  const unassigned   = activeOrders.filter(o => !o.assigned_monteur)

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Niet toegewezen */}
        <div>
          <MonteursKolomHeader naam="Niet toegewezen" count={unassigned.length} kleur="#f59e0b" bg="rgba(245,158,11,0.12)" isWarn />
          {unassigned.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '14px 0' }}>✓ Alle orders toegewezen</div>
          ) : (
            unassigned.map(o => <OrderKaartje key={o.id} order={o} onClick={() => onSelectOrder(o)} isSelected={selectedOrder?.id === o.id} />)
          )}
        </div>

        {/* Per monteur */}
        {MONTEURS.map(m => {
          const mOrders = activeOrders.filter(o => o.assigned_monteur === m.key)
          return (
            <div key={m.key}>
              <MonteursKolomHeader naam={m.naam} count={mOrders.length} kleur={m.kleur} bg={m.bg} />
              {mOrders.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '14px 0' }}>Geen actieve orders</div>
              ) : (
                mOrders.map(o => <OrderKaartje key={o.id} order={o} monteur={m} onClick={() => onSelectOrder(o)} isSelected={selectedOrder?.id === o.id} />)
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonteursKolomHeader({ naam, count, kleur, bg }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: kleur }} />
      {naam}
      <span style={{ background: bg, color: kleur, fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>{count}</span>
    </div>
  )
}

// ─── Lijst View ───────────────────────────────────────────────────────────────

function LijstView({ orders, onSelectOrder, selectedOrder }) {
  const [filterMonteur, setFilterMonteur] = useState('')
  const [filterFase, setFilterFase]       = useState('')
  const [search, setSearch]               = useState('')

  let visible = orders.filter(o => {
    if (filterMonteur === '__geen__' && o.assigned_monteur) return false
    if (filterMonteur && filterMonteur !== '__geen__' && o.assigned_monteur !== filterMonteur) return false
    if (filterFase && String(o.phase) !== filterFase) return false
    if (search) {
      const q = search.toLowerCase()
      return o.customer_name?.toLowerCase().includes(q) || o.customer_address?.toLowerCase().includes(q)
    }
    return true
  }).sort((a, b) => {
    if (!a.installation_date) return 1
    if (!b.installation_date) return -1
    return new Date(a.installation_date) - new Date(b.installation_date)
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter balk */}
      <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: 13 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoeken…" style={{ paddingLeft: 30, width: 160, fontSize: 13 }} />
        </div>
        <select value={filterMonteur} onChange={e => setFilterMonteur(e.target.value)} style={{ fontSize: 13 }}>
          <option value="">Alle monteurs</option>
          <option value="__geen__">Niet toegewezen</option>
          {MONTEURS.map(m => <option key={m.key} value={m.key}>{m.naam}</option>)}
        </select>
        <select value={filterFase} onChange={e => setFilterFase(e.target.value)} style={{ fontSize: 13 }}>
          <option value="">Alle fases</option>
          {Object.entries(FASES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{visible.length} order{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? <LoadingSpinner /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Klant', 'Adres', 'Monteur', 'Datum', 'Fase', 'Punten'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(o => {
                const m         = MONTEURS.find(m => m.key === o.assigned_monteur)
                const fase      = FASES[o.phase]
                const openDefs  = (o.defects || []).filter(d => d.status === 'open').length
                const isSelected = selectedOrder?.id === o.id
                return (
                  <tr key={o.id} onClick={() => onSelectOrder(o)}
                    style={{ cursor: 'pointer', background: isSelected ? '#EEF6F0' : 'white', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${isSelected ? 'var(--brand)' : 'transparent'}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#EEF6F0' : 'white' }}>
                    <td style={{ padding: '11px 16px', fontWeight: 600, fontSize: 14 }}>{o.customer_name}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_address}</td>
                    <td style={{ padding: '11px 16px' }}>
                      {m ? (
                        <span style={{ background: m.bg, color: m.kleur, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{m.naam}</span>
                      ) : (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Niet toegewezen</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: o.installation_date ? 500 : 400, color: o.installation_date ? 'var(--text)' : 'var(--text-light)' }}>
                      {o.installation_date ? formatDate(o.installation_date) : 'Nog niet gepland'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {fase && <span style={{ background: fase.bg, color: fase.kleur, border: `1px solid ${fase.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{fase.label}</span>}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {openDefs > 0 && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠ {openDefs}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Geen orders gevonden.</div>
        )}
      </div>
    </div>
  )
}

// ─── Order kaartje ────────────────────────────────────────────────────────────

function OrderKaartje({ order, monteur, onClick, isSelected }) {
  const openDefs = (order.defects || []).filter(d => d.status === 'open').length
  const fase     = FASES[order.phase]
  return (
    <div onClick={onClick}
      style={{ background: isSelected ? '#EEF6F0' : 'white', border: `1px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`, borderLeft: `3px solid ${monteur?.kleur || (isSelected ? 'var(--brand)' : 'var(--border)')}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.1s' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{order.customer_name}</div>
        {fase && <span style={{ background: fase.bg, color: fase.kleur, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>{fase.label}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>📍 {order.customer_address}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {order.installation_date ? (
          <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>📅 {formatDate(order.installation_date)}</span>
        ) : (
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>📅 Nog niet gepland</span>
        )}
        {openDefs > 0 && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚠ {openDefs} punt{openDefs !== 1 ? 'en' : ''}</span>}
        {(order.montage_files || []).length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📷 {order.montage_files.length}</span>}
      </div>
    </div>
  )
}

// ─── Order Detail Paneel ──────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose, onSave, savingId, showToast, onRefresh }) {
  const [monteur,      setMonteur]      = useState(order.assigned_monteur || '')
  const [installDate,  setInstallDate]  = useState(order.installation_date?.slice(0,10) || '')
  const [notes,        setNotes]        = useState(order.montage_notes || '')
  const [phase,        setPhase]        = useState(order.phase)
  const [tab,          setTab]          = useState('detail')

  const isSaving    = savingId === order.id
  const defects     = order.defects || []
  const openDefs    = defects.filter(d => d.status === 'open')
  const montageFiles = order.montage_files || []
  const m           = MONTEURS.find(m => m.key === monteur)
  const baseUrl     = typeof window !== 'undefined' ? window.location.origin : ''
  const montageUrl  = `${process.env.NEXT_PUBLIC_BASE_URL || baseUrl}/montage/${order.montage_token}`

  async function save() {
    const prevPhase = order.phase
    const updates = {
      assigned_monteur: monteur || null,
      installation_date: installDate || null,
      montage_notes: notes,
      phase,
      ...(phase === 6 && prevPhase !== 6 ? { installation_done_at: new Date().toISOString() } : {}),
      ...(phase === 7 && prevPhase !== 7 ? { completed_at: new Date().toISOString() } : {}),
    }

    let notifyType = null, notifyExtra = {}
    if (phase !== prevPhase) {
      if (phase === 5) {
        notifyType = 'montage_gepland'
        notifyExtra = { installDate: installDate ? new Date(installDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' }
      } else if (phase === 6) {
        notifyType = 'montage_klaar'
      } else if (phase === 7) {
        notifyType = 'compleet'
      } else {
        notifyType = 'status_update'
        notifyExtra = { phaseLabel: FASES[phase]?.label || '' }
      }
    }

    await onSave(order.id, updates, notifyType, notifyExtra)
    if (notifyType) showToast('Opgeslagen & klant genotificeerd')
  }

  async function resolveDefect(id) {
    await supabase.from('defects').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    onRefresh()
    showToast('Bevinding opgelost')
  }

  function copyLink() {
    navigator.clipboard.writeText(montageUrl)
    showToast('Montagelink gekopieerd')
  }

  const TABS = [
    { key: 'detail',  label: 'Planning' },
    { key: 'punten',  label: `Punten${openDefs.length > 0 ? ` (${openDefs.length})` : ''}` },
    { key: 'fotos',   label: `Foto's${montageFiles.length > 0 ? ` (${montageFiles.length})` : ''}` },
  ]

  const fase = FASES[order.phase]

  return (
    <>
      {/* Header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>{order.customer_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>📍 {order.customer_address}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {fase && <span style={{ background: fase.bg, color: fase.kleur, border: `1px solid ${fase.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{fase.label}</span>}
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>📞 {order.customer_phone}</a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-light)', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>✕</button>
        </div>

        {/* Snelle acties */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={copyLink}
            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, color: 'var(--text-muted)', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            🔗 Montagelink
          </button>
          {order.portal_token && (
            <a href={`/portaal/${order.portal_token}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', textAlign: 'center', transition: 'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              🌐 Portaal
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400, background: 'none', color: tab === t.key ? 'var(--brand)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', fontFamily: 'inherit', transition: 'all 0.1s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {tab === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Monteur */}
            <DetailSection title="Monteur toewijzen">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${!monteur ? 'var(--brand)' : 'var(--border)'}`, background: !monteur ? 'var(--brand-muted)' : 'white', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="monteur" value="" checked={!monteur} onChange={() => setMonteur('')} style={{ margin: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>Nog niet toegewezen</span>
                </label>
                {MONTEURS.map(m => (
                  <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${monteur === m.key ? m.kleur : 'var(--border)'}`, background: monteur === m.key ? m.bg : 'white', cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="monteur" value={m.key} checked={monteur === m.key} onChange={() => setMonteur(m.key)} style={{ margin: 0 }} />
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: m.kleur, flexShrink: 0 }} />
                    <span style={{ fontWeight: monteur === m.key ? 700 : 400, color: monteur === m.key ? m.kleur : 'var(--text)' }}>{m.naam}</span>
                  </label>
                ))}
              </div>
            </DetailSection>

            {/* Datum */}
            <DetailSection title="Montagedatum">
              <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
              {installDate && <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 6, fontWeight: 600 }}>📅 {formatDate(installDate)}</div>}
            </DetailSection>

            {/* Status */}
            <DetailSection title="Status bijwerken">
              <select value={phase} onChange={e => setPhase(Number(e.target.value))}>
                {Object.entries(FASES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {phase !== order.phase && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6, fontWeight: 500 }}>⚠ Klant ontvangt een e-mail bij opslaan</div>}
            </DetailSection>

            {/* Notities */}
            <DetailSection title="Notities voor monteur">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Technische details, toegang, bijzonderheden, materiaallijst…" style={{ minHeight: 100 }} />
            </DetailSection>

            {/* Montagelink */}
            {order.montage_token && (
              <DetailSection title="Montagelink kopiëren">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" readOnly value={montageUrl} style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }} />
                  <button onClick={copyLink} style={{ flexShrink: 0 }} className="btn btn-secondary btn-sm">Kopieer</button>
                </div>
                {order.montage_accessed_at && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, fontWeight: 600 }}>✓ Monteur ingelogd op {formatDate(order.montage_accessed_at)}</div>}
              </DetailSection>
            )}
          </div>
        )}

        {tab === 'punten' && (
          <div>
            {defects.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                Geen bevindingen gemeld
              </div>
            )}
            {defects.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: d.status === 'open' ? 'var(--text)' : 'var(--text-muted)' }}>{d.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                    Gemeld {formatDate(d.reported_at)}
                    {d.resolved_at && ` · Opgelost ${formatDate(d.resolved_at)}`}
                  </div>
                </div>
                {d.status === 'open' ? (
                  <button onClick={() => resolveDefect(d.id)}
                    style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)', color: 'var(--brand)', padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
                    Oplossen
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓ Opgelost</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'fotos' && (
          <div>
            {montageFiles.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                Nog geen foto's geüpload
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {montageFiles.map(f => {
                  const isImage = f.file_type?.startsWith('image/')
                  return (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', transition: 'box-shadow 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      {isImage
                        ? <img src={f.file_url} alt={f.filename} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: 'var(--bg)' }}>📄</div>
                      }
                      <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-primary btn-full" onClick={save} disabled={isSaving}>
          {isSaving ? 'Opslaan…' : phase !== order.phase ? 'Opslaan & klant notificeren' : 'Opslaan'}
        </button>
      </div>
    </>
  )
}

function DetailSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--brand-muted)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Laden…
    </div>
  )
}
