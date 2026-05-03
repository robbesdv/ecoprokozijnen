'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BeheerNav from '@/lib/BeheerNav'
import { supabase } from '@/lib/supabase'
import { formatEuro, formatDate } from '@/lib/phases'
import { formatLeadAddress, LEAD_STATUSES } from '@/lib/lead-normalize'
import { notifyCustomer } from '@/lib/notifyCustomer'
import { sendLeadLabEvent } from '@/lib/leadLabWebhook'
import { SELLERS, sellerName, calcPotentialCommission } from '@/lib/sales'

const STATUS_STYLE = {
  nieuw:    { bg: 'var(--warn-bg)', color: 'var(--warn)', border: 'var(--warn-border)' },
  contact:  { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
  afspraak: { bg: 'var(--brand-muted)', color: 'var(--brand)', border: 'var(--brand-border)' },
  offerte:  { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  gewonnen: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  verloren: { bg: '#F3F4F6', color: '#6B7280', border: 'var(--border)' },
}

function statusLabel(status) {
  return LEAD_STATUSES.find(s => s.key === status)?.label || status || 'Nieuw'
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.nieuw
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, border: `1px solid ${s.border}`, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
      {statusLabel(status)}
    </span>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [baseUrl, setBaseUrl] = useState('')

  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('lead_date', { ascending: false })
    if (error) setError(error.message)
    else {
      setLeads(data || [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setBaseUrl(window.location.origin)
    loadLeads()
    const ch = supabase.channel('leads-beheer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadLeads)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadLeads])

  useEffect(() => {
    if (!selected) return
    const fresh = leads.find(l => l.id === selected.id)
    if (fresh) setSelected(fresh)
  }, [leads]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const sources = useMemo(() => [...new Set(leads.map(l => l.source).filter(Boolean))].sort(), [leads])

  const visible = leads.filter(lead => {
    if (statusFilter === 'open' && ['gewonnen', 'verloren'].includes(lead.status)) return false
    if (statusFilter !== 'open' && statusFilter !== 'all' && lead.status !== statusFilter) return false
    if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return [
      lead.customer_name,
      lead.customer_email,
      lead.customer_phone,
      lead.customer_address,
      lead.city,
      lead.project_type,
      lead.message,
      lead.assigned_to,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
  })

  const stats = {
    nieuw: leads.filter(l => l.status === 'nieuw').length,
    actief: leads.filter(l => !['gewonnen', 'verloren'].includes(l.status)).length,
    afspraak: leads.filter(l => ['afspraak', 'offerte'].includes(l.status)).length,
    potentieel: leads
      .filter(l => l.status !== 'verloren')
      .reduce((sum, l) => sum + (Number(l.potential_amount) || 0), 0),
  }

  async function updateLead(lead, updates) {
    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id)
    if (error) {
      showToast('Fout: ' + error.message, 'error')
      return
    }
    showToast('Lead bijgewerkt')
    loadLeads()
  }

  async function createOrderFromLead(lead) {
    const address = formatLeadAddress(lead)
    const notes = [
      `Leadbron: ${lead.source || 'onbekend'}`,
      lead.source_lead_id ? `Extern ID: ${lead.source_lead_id}` : '',
      lead.project_type ? `Type aanvraag: ${lead.project_type}` : '',
      Number(lead.potential_amount) > 0 ? `Lead-schatting: ${formatEuro(lead.potential_amount)}` : '',
      lead.message ? `Bericht: ${lead.message}` : '',
    ].filter(Boolean).join('\n')

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name: lead.customer_name || 'Onbekende lead',
        customer_email: lead.customer_email || '',
        customer_phone: lead.customer_phone || '',
        customer_address: address,
        total_amount: 0,
        phase: 0,
        internal_notes: notes,
        sales_owner: lead.assigned_to || null,
      })
      .select('*')
      .single()

    if (error) {
      showToast('Order niet aangemaakt: ' + error.message, 'error')
      return
    }

    await supabase.from('leads').update({ status: 'offerte', order_id: order.id }).eq('id', lead.id)
    await supabase.from('status_history').insert({
      order_id: order.id,
      to_phase: 0,
      note: `Aangemaakt vanuit lead (${lead.source || 'onbekend'})`,
      changed_by: 'beheer',
    })
    await notifyCustomer(order, 'welkomst')
    await sendLeadLabEvent('offerte_verzonden', { orderId: order.id })
    showToast('Order aangemaakt vanuit lead & klant genotificeerd')
    window.location.href = `/beheer/verkoop?edit=${order.id}`
  }

  async function copy(value) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    showToast('Gekopieerd')
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <BeheerNav />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Leads</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>LeadLAB en handmatige aanvragen</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)} style={{ fontWeight: 700 }}>+ Nieuwe lead</button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 360px' : '1fr' }}>
          <main style={{ minWidth: 0, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 16 }}>
              {[
                { label: 'Nieuwe leads', value: stats.nieuw, accent: 'var(--warn)' },
                { label: 'Actieve leads', value: stats.actief, accent: 'var(--brand)' },
                { label: 'Afspraak/offerte', value: stats.afspraak, accent: 'var(--info)' },
                { label: 'Potentieel', value: formatEuro(stats.potentieel), accent: 'var(--success)', text: true },
              ].map(card => (
                <div key={card.label} style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${card.accent}`, borderRadius: 12, padding: '15px 17px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 9 }}>{card.label}</div>
                  <div style={{ fontSize: card.text ? 21 : 31, lineHeight: 1, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {[
                { label: 'LeadLAB webhook', value: `${baseUrl}/api/leads/leadlab` },
              ].map(item => (
                <div key={item.label} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{item.label}</div>
                  <button onClick={() => copy(item.value)} title="Kopieer URL"
                    style={{ width: '100%', textAlign: 'left', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.value}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7 }}>
                    Authenticatie via header <strong>x-api-key</strong> met de Vercel env var <strong>LEADLAB_API_KEY</strong>.
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
                <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: 13 }}>Zoek</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Naam, plaats of aanvraag" style={{ paddingLeft: 48, fontSize: 13 }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 155, fontSize: 13 }}>
                  <option value="open">Open leads</option>
                  <option value="all">Alle statussen</option>
                  {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ width: 145, fontSize: 13 }}>
                  <option value="all">Alle bronnen</option>
                  {sources.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
                <span style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>{visible.length} leads</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1fr 1fr 120px 32px', padding: '8px 16px', background: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                {['Lead', 'Bron', 'Potentieel', 'Verkoper', 'Datum', ''].map(h => (
                  <div key={h} style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800 }}>{h}</div>
                ))}
              </div>

              {loading && <div style={{ padding: 34, textAlign: 'center', color: 'var(--text-muted)' }}>Laden...</div>}
              {!loading && error && (
                <div style={{ padding: 34, color: 'var(--danger)', background: 'var(--danger-bg)', borderTop: '1px solid var(--danger-border)' }}>
                  {error.includes('leads') ? 'De leads tabel bestaat nog niet in Supabase. Voer de database-update uit supabase/schema.sql uit.' : error}
                </div>
              )}
              {!loading && !error && visible.length === 0 && (
                <div style={{ padding: 42, textAlign: 'center', color: 'var(--text-muted)' }}>Geen leads gevonden.</div>
              )}

              {!loading && !error && visible.map(lead => {
                const active = selected?.id === lead.id
                return (
                  <div key={lead.id} onClick={() => setSelected(active ? null : lead)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1fr 1fr 120px 32px', gap: 0, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: active ? '#EEF6F0' : 'white', borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.customer_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatLeadAddress(lead) || lead.customer_email || lead.customer_phone || 'Geen contactgegevens'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 4 }}>{lead.source || 'webhook'}</div>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{formatEuro(lead.potential_amount)}</div>
                    <div style={{ fontSize: 12, color: lead.assigned_to ? 'var(--text)' : 'var(--text-muted)', fontWeight: lead.assigned_to ? 700 : 500 }}>{sellerName(lead.assigned_to)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(lead.lead_date)}</div>
                    <div style={{ color: 'var(--text-light)', fontSize: 18, textAlign: 'right' }}>›</div>
                  </div>
                )
              })}
            </div>
          </main>

          {selected && (
            <aside style={{ borderLeft: '1px solid var(--border)', background: 'white', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.customer_name}</div>
                    <div style={{ marginTop: 7 }}><StatusBadge status={selected.status} /></div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)' }}>x</button>
                </div>
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <section>
                  <SectionTitle>Contact</SectionTitle>
                  <InfoRow label="E-mail" value={selected.customer_email ? <a href={`mailto:${selected.customer_email}`} style={{ color: 'var(--brand)' }}>{selected.customer_email}</a> : '-'} />
                  <InfoRow label="Telefoon" value={selected.customer_phone ? <a href={`tel:${selected.customer_phone}`} style={{ color: 'var(--brand)' }}>{selected.customer_phone}</a> : '-'} />
                  <InfoRow label="Adres" value={formatLeadAddress(selected) || '-'} />
                </section>

                <section>
                  <SectionTitle>Aanvraag</SectionTitle>
                  <InfoRow label="Bron" value={selected.source || '-'} />
                  <InfoRow label="Extern ID" value={selected.source_lead_id || '-'} />
                  <InfoRow label="Type" value={selected.project_type || '-'} />
                  <InfoRow label="Potentieel" value={<strong>{formatEuro(selected.potential_amount)}</strong>} />
                  <InfoRow label="Pot. commissie" value={<strong>{formatEuro(calcPotentialCommission(selected.potential_amount))}</strong>} />
                  {selected.message && (
                    <div style={{ marginTop: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                      {selected.message}
                    </div>
                  )}
                </section>

                <section>
                  <SectionTitle>Verkoper</SectionTitle>
                  <select value={selected.assigned_to || ''} onChange={e => updateLead(selected, { assigned_to: e.target.value || null })} style={{ fontSize: 13 }}>
                    <option value="">Niet toegewezen</option>
                    {SELLERS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    De verkoper ziet deze lead in zijn eigen verkoopportaal.
                  </div>
                </section>

                <section>
                  <SectionTitle>Status</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {LEAD_STATUSES.map(s => (
                      <button key={s.key} onClick={() => updateLead(selected, { status: s.key })}
                        style={{ padding: '6px 10px', borderRadius: 18, border: `1px solid ${selected.status === s.key ? 'var(--brand)' : 'var(--border)'}`, background: selected.status === s.key ? 'var(--brand)' : 'white', color: selected.status === s.key ? 'white' : 'var(--text-muted)', fontSize: 12, fontWeight: selected.status === s.key ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </section>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.order_id ? (
                    <Link href={`/beheer?order=${selected.order_id}`} className="btn btn-primary btn-full">Open order</Link>
                  ) : (
                    <button className="btn btn-primary btn-full" onClick={() => createOrderFromLead(selected)}>Maak order/offerte</button>
                  )}
                  <button className="btn btn-secondary btn-full" onClick={() => updateLead(selected, { last_contact_at: new Date().toISOString(), status: selected.status === 'nieuw' ? 'contact' : selected.status })}>
                    Contactmoment opslaan
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewLeadModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); loadLeads(); showToast('Lead aangemaakt') }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="animate-fade" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? 'var(--danger)' : '#1A1A1A', color: 'white', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{children}</div>
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

function NewLeadModal({ onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    source: 'handmatig',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    postcode: '',
    city: '',
    project_type: '',
    potential_amount: '',
    assigned_to: '',
    message: '',
  })
  const [saving, setSaving] = useState(false)

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit() {
    if (!form.customer_name) {
      showToast('Naam is verplicht', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('leads').insert({
      ...form,
      assigned_to: form.assigned_to || null,
      source_lead_id: `manual-${Date.now()}`,
      status: 'nieuw',
      potential_amount: Number(form.potential_amount) || 0,
      raw_payload: { manual: true },
    })
    setSaving(false)
    if (error) {
      showToast('Fout: ' + error.message, 'error')
      return
    }
    onCreated()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Nieuwe lead</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 20 }}>x</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label>Naam *</label><input type="text" value={form.customer_name} onChange={e => setField('customer_name', e.target.value)} /></div>
          <div><label>Bron</label><input type="text" value={form.source} onChange={e => setField('source', e.target.value)} /></div>
          <div><label>E-mail</label><input type="email" value={form.customer_email} onChange={e => setField('customer_email', e.target.value)} /></div>
          <div><label>Telefoon</label><input type="tel" value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label>Adres</label><input type="text" value={form.customer_address} onChange={e => setField('customer_address', e.target.value)} /></div>
          <div><label>Postcode</label><input type="text" value={form.postcode} onChange={e => setField('postcode', e.target.value)} /></div>
          <div><label>Plaats</label><input type="text" value={form.city} onChange={e => setField('city', e.target.value)} /></div>
          <div><label>Type aanvraag</label><input type="text" value={form.project_type} onChange={e => setField('project_type', e.target.value)} /></div>
          <div><label>Potentiele waarde</label><input type="number" value={form.potential_amount} onChange={e => setField('potential_amount', e.target.value)} /></div>
          <div><label>Verkoper</label><select value={form.assigned_to} onChange={e => setField('assigned_to', e.target.value)}><option value="">Niet toegewezen</option>{SELLERS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select></div>
          <div style={{ gridColumn: '1 / -1' }}><label>Bericht</label><textarea value={form.message} onChange={e => setField('message', e.target.value)} /></div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Opslaan...' : 'Lead opslaan'}</button>
        </div>
      </div>
    </div>
  )
}
