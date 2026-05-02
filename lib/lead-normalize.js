const FIELD_ALIASES = {
  name: ['customer_name', 'name', 'full_name', 'fullname', 'naam', 'voornaam_en_achternaam'],
  firstName: ['first_name', 'firstname', 'voornaam'],
  lastName: ['last_name', 'lastname', 'achternaam'],
  email: ['customer_email', 'email', 'e-mail', 'mail', 'email_address'],
  phone: ['customer_phone', 'phone', 'telephone', 'telefoon', 'mobiel', 'mobile', 'phone_number'],
  address: ['customer_address', 'address', 'adres', 'street_address', 'straat', 'straatnaam'],
  postcode: ['postcode', 'postal_code', 'zip', 'zip_code'],
  city: ['city', 'plaats', 'woonplaats'],
  message: ['message', 'bericht', 'opmerking', 'omschrijving', 'description', 'notes', 'toelichting'],
  projectType: ['project_type', 'lead_type', 'type', 'dienst', 'product', 'aanvraag'],
  potential: ['potential_amount', 'budget', 'amount', 'waarde', 'estimate', 'prijsindicatie'],
  externalId: ['source_lead_id', 'lead_id', 'leadgen_id', 'id', 'uuid', 'request_id', 'aanvraag_id'],
}

export const LEAD_STATUSES = [
  { key: 'nieuw', label: 'Nieuw' },
  { key: 'contact', label: 'Contact' },
  { key: 'afspraak', label: 'Afspraak' },
  { key: 'offerte', label: 'Offerte' },
  { key: 'gewonnen', label: 'Gewonnen' },
  { key: 'verloren', label: 'Verloren' },
]

function getPath(obj, path) {
  return String(path).split('.').reduce((acc, key) => acc?.[key], obj)
}

function normalizeFieldData(fieldData) {
  if (!Array.isArray(fieldData)) return {}
  return fieldData.reduce((acc, field) => {
    const key = String(field?.name || '').toLowerCase()
    const value = Array.isArray(field?.values) ? field.values[0] : field?.value
    if (key && value !== undefined && value !== null) acc[key] = value
    return acc
  }, {})
}

function pick(payload, fieldMap, keys) {
  for (const key of keys) {
    const direct = payload?.[key]
    const lower = payload?.[String(key).toLowerCase()]
    const field = fieldMap?.[String(key).toLowerCase()]
    const nested = String(key).includes('.') ? getPath(payload, key) : undefined
    const value = direct ?? lower ?? field ?? nested
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function parseAmount(value) {
  if (value === undefined || value === null || value === '') return 0
  const normalized = String(value).replace(/[^\d,.-]/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function parseLeadDate(value) {
  if (!value) return new Date().toISOString()
  if (typeof value === 'number') {
    const millis = value > 9999999999 ? value : value * 1000
    return new Date(millis).toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function normalizeLeadPayload(payload, options = {}) {
  const raw = payload || {}
  const fieldMap = normalizeFieldData(raw.field_data)
  const firstName = pick(raw, fieldMap, FIELD_ALIASES.firstName)
  const lastName = pick(raw, fieldMap, FIELD_ALIASES.lastName)
  const name = pick(raw, fieldMap, FIELD_ALIASES.name) || [firstName, lastName].filter(Boolean).join(' ')
  const source = String(options.source || raw.source || 'webhook').toLowerCase()

  return {
    source,
    source_lead_id: pick(raw, fieldMap, FIELD_ALIASES.externalId),
    status: raw.status || 'nieuw',
    customer_name: name || 'Onbekende lead',
    customer_email: pick(raw, fieldMap, FIELD_ALIASES.email),
    customer_phone: pick(raw, fieldMap, FIELD_ALIASES.phone),
    customer_address: pick(raw, fieldMap, FIELD_ALIASES.address),
    postcode: pick(raw, fieldMap, FIELD_ALIASES.postcode),
    city: pick(raw, fieldMap, FIELD_ALIASES.city),
    project_type: pick(raw, fieldMap, FIELD_ALIASES.projectType),
    message: pick(raw, fieldMap, FIELD_ALIASES.message),
    potential_amount: parseAmount(pick(raw, fieldMap, FIELD_ALIASES.potential)),
    lead_date: parseLeadDate(raw.created_time || raw.created_at || raw.lead_date || raw.timestamp),
    raw_payload: raw,
  }
}

export function normalizeLeadRows(input, options = {}) {
  const items = Array.isArray(input)
    ? input
    : Array.isArray(input?.leads)
      ? input.leads
      : Array.isArray(input?.data)
        ? input.data
        : [input]

  return items.map(item => normalizeLeadPayload(item, options))
}

export function formatLeadAddress(lead) {
  return [lead.customer_address, lead.postcode, lead.city].filter(Boolean).join(', ')
}
