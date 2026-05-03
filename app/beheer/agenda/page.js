'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getPhase, formatEuro } from '@/lib/phases'
import { getLeadAppointment } from '@/lib/lead-appointments'
import BeheerNav from '@/lib/BeheerNav'

const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
const DAGEN   = ['Ma','Di','Wo','Do','Vr','Za','Zo']

function weekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

function dateKey(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLeadAddress(lead) {
  return [lead.customer_address, lead.postcode, lead.city].filter(Boolean).join(', ')
}

function formatAppointmentTime(appointment) {
  const start = new Date(appointment.start)
  if (Number.isNaN(start.getTime())) return ''
  return start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatAppointmentDate(appointment) {
  const start = new Date(appointment.start)
  if (Number.isNaN(start.getTime())) return 'Onbekend'
  return start.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function AgendaPage() {
  const [orders, setOrders]         = useState([])
  const [leadAppointments, setLeadAppointments] = useState([])
  const [loading, setLoading]       = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)

  const loadAgenda = useCallback(async () => {
    const [ordersResult, leadsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('phase', 3)
        .order('installation_date', { ascending: true, nullsLast: true }),
      supabase
        .from('leads')
        .select('*')
        .eq('source', 'leadlab')
        .order('lead_date', { ascending: false }),
    ])

    const appointments = (leadsResult.data || [])
      .filter(lead => !['verloren', 'gewonnen'].includes(lead.status))
      .map(lead => ({ ...lead, appointment: getLeadAppointment(lead) }))
      .filter(lead => lead.appointment?.start)
      .sort((a, b) => new Date(a.appointment.start) - new Date(b.appointment.start))

    setOrders(ordersResult.data || [])
    setLeadAppointments(appointments)
    setLoading(false)
  }, [])

  useEffect(() => { loadAgenda() }, [loadAgenda])

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Maak kalender-grid (maandag-start)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  function ordersOnDate(date) {
    if (!date) return []
    const ds = dateKey(date)
    return orders.filter(o => o.installation_date?.slice(0,10) === ds)
  }

  function leadAppointmentsOnDate(date) {
    if (!date) return []
    const ds = dateKey(date)
    return leadAppointments.filter(lead => lead.appointment.dateKey === ds)
  }

  const upcoming = orders
    .filter(o => o.installation_date && new Date(o.installation_date) >= new Date())
    .slice(0, 12)

  const today = new Date()
  today.setHours(0,0,0,0)

  const upcomingLeadAppointments = leadAppointments
    .filter(lead => new Date(lead.appointment.start) >= today)
    .slice(0, 12)

  const withoutDate = orders.filter(o => !o.installation_date && o.phase === 4)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <BeheerNav />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {/* Topbar */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Agenda</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>LeadLAB-afspraken, montageplanning & bezettingsoverzicht</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 14 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 14, minWidth: 130, textAlign: 'center' }}>{MAANDEN[month]} {year}</div>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 14 }}>›</button>
            <button onClick={() => setCurrentMonth(new Date())} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>Vandaag</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>
          {/* Kalender */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Dag headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#F8FAFC', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {DAGEN.map(d => (
                <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            {/* Kalender cellen */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: 'minmax(90px,1fr)' }}>
                {cells.map((date, i) => {
                  const dayOrders = ordersOnDate(date)
                  const dayLeadAppointments = leadAppointmentsOnDate(date)
                  const isToday = date && date.toDateString() === today.toDateString()
                  const isPast = date && date < today
                  return (
                    <div key={i} style={{ border: '1px solid var(--border)', padding: '6px 8px', background: isToday ? '#EEF6F0' : isPast && date ? '#FAFAFA' : 'white', minHeight: 90, borderLeft: isToday ? '2px solid var(--brand)' : '1px solid var(--border)' }}>
                      {date && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--brand)' : isPast ? 'var(--text-muted)' : 'var(--text)', marginBottom: 4 }}>{date.getDate()}</div>
                          {dayOrders.map(o => (
                            <div key={o.id} onClick={() => { setSelectedOrder(o); setSelectedLead(null) }}
                              style={{ fontSize: 10, background: getPhase(o.phase).badgeClass?.includes('blue') ? '#EFF6FF' : '#F0FDF4', color: 'var(--brand)', padding: '2px 6px', borderRadius: 4, marginBottom: 2, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid rgba(0,0,0,0.06)' }}
                              title={o.customer_name}>
                              {o.customer_name}
                            </div>
                          ))}
                          {dayLeadAppointments.map(lead => (
                            <div key={lead.id} onClick={() => { setSelectedLead(lead); setSelectedOrder(null) }}
                              style={{ fontSize: 10, background: '#FFFBEB', color: '#92400E', padding: '2px 6px', borderRadius: 4, marginBottom: 2, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid #FDE68A' }}
                              title={`LeadLAB afspraak - ${lead.customer_name}`}>
                              {formatAppointmentTime(lead.appointment)} {lead.customer_name}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Zijpaneel */}
          <div style={{ width: 300, borderLeft: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            {selectedOrder ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Orderdetail</div>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'var(--bg)', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>✕</button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selectedOrder.customer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{selectedOrder.customer_address}</div>
                {[
                  ['Fase', getPhase(selectedOrder.phase).adminLabel],
                  ['Datum', selectedOrder.installation_date ? new Date(selectedOrder.installation_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'],
                  ['Monteur', selectedOrder.assigned_monteur || '—'],
                  ['Bedrag', formatEuro(selectedOrder.total_amount)],
                ].map(([l,v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : selectedLead ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>LeadLAB afspraak</div>
                  <button onClick={() => setSelectedLead(null)} style={{ background: 'var(--bg)', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>x</button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selectedLead.customer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{formatLeadAddress(selectedLead) || 'Geen adres'}</div>
                {[
                  ['Datum', formatAppointmentDate(selectedLead.appointment)],
                  ['Tijd', formatAppointmentTime(selectedLead.appointment) || 'Onbekend'],
                  ['Status', selectedLead.status || 'nieuw'],
                  ['Type', selectedLead.project_type || '-'],
                  ['Telefoon', selectedLead.customer_phone || '-'],
                  ['E-mail', selectedLead.customer_email || '-'],
                ].map(([l,v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{l}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</span>
                  </div>
                ))}
                {selectedLead.message && (
                  <div style={{ marginTop: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selectedLead.message}
                  </div>
                )}
                <Link href="/beheer/leads" className="btn btn-primary btn-full" style={{ marginTop: 14, textDecoration: 'none' }}>
                  Open leadpagina
                </Link>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400E', marginBottom: 10 }}>Komende LeadLAB-afspraken</div>
                  {upcomingLeadAppointments.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Geen afspraken gepland.</div>}
                  {upcomingLeadAppointments.map(lead => (
                    <div key={lead.id} onClick={() => { setSelectedLead(lead); setSelectedOrder(null) }}
                      style={{ padding: '9px 10px', borderRadius: 8, background: '#FFFBEB', marginBottom: 6, border: '1px solid #FDE68A', cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{lead.customer_name}</div>
                      <div style={{ color: '#92400E', marginTop: 2, fontWeight: 600 }}>
                        {formatAppointmentDate(lead.appointment)} om {formatAppointmentTime(lead.appointment)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatLeadAddress(lead) || lead.customer_phone || lead.customer_email || 'Geen contactgegevens'}
                      </div>
                    </div>
                  ))}
                </div>
                {withoutDate.length > 0 && (
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#f59e0b', marginBottom: 10 }}>⚠ Nog in te plannen ({withoutDate.length})</div>
                    {withoutDate.map(o => (
                      <div key={o.id} style={{ padding: '8px 10px', borderRadius: 8, background: '#FFFBEB', marginBottom: 6, border: '1px solid #FDE68A', cursor: 'pointer', fontSize: 12 }} onClick={() => { setSelectedOrder(o); setSelectedLead(null) }}>
                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{o.customer_address}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>Komende montages</div>
                  {upcoming.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Geen gepland.</div>}
                  {upcoming.map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setSelectedLead(null) }}
                      style={{ padding: '9px 10px', borderRadius: 8, background: 'var(--bg)', marginBottom: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                      <div style={{ color: 'var(--brand)', marginTop: 2, fontWeight: 500 }}>
                        📅 {new Date(o.installation_date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
