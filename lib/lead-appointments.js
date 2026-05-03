const START_ALIASES = [
  'appointment_at',
  'appointment_datetime',
  'appointment_start',
  'appointmentDateTime',
  'appointmentStart',
  'afspraak_at',
  'afspraak_datumtijd',
  'afspraak_datetime',
  'afspraak_start',
  'scheduled_at',
  'scheduled_start',
  'planned_at',
  'planned_start',
  'booking_at',
  'booking_start',
  'start_at',
  'start',
]

const END_ALIASES = [
  'appointment_end',
  'appointmentEnd',
  'afspraak_einde',
  'scheduled_end',
  'planned_end',
  'booking_end',
  'end_at',
  'end',
]

const DATE_ALIASES = [
  'appointment_date',
  'appointmentDate',
  'afspraak_datum',
  'afspraak_date',
  'scheduled_date',
  'planned_date',
  'booking_date',
  'datum_afspraak',
]

const GENERIC_DATE_ALIASES = ['date', 'datum']

const TIME_ALIASES = [
  'appointment_time',
  'appointmentTime',
  'afspraak_tijd',
  'scheduled_time',
  'planned_time',
  'booking_time',
  'tijd_afspraak',
  'time',
  'tijd',
]

function normalizeKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseObject(value) {
  if (!value) return {}
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return {} }
  }
  return typeof value === 'object' ? value : {}
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function findValue(input, aliases, depth = 0) {
  if (!input || typeof input !== 'object' || depth > 5) return ''
  const wanted = new Set(aliases.map(normalizeKey))

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findValue(item, aliases, depth + 1)
      if (hasValue(found)) return found
    }
    return ''
  }

  for (const [key, value] of Object.entries(input)) {
    if (wanted.has(normalizeKey(key)) && hasValue(value)) return value
  }

  for (const value of Object.values(input)) {
    const found = findValue(value, aliases, depth + 1)
    if (hasValue(found)) return found
  }

  return ''
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function toLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function normalizeDate(value) {
  if (!hasValue(value)) return ''

  if (typeof value === 'number') {
    const millis = value > 9999999999 ? value : value * 1000
    return toLocalDateKey(new Date(millis))
  }

  const raw = String(value).trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dutch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dutch) return `${dutch[3]}-${pad(dutch[2])}-${pad(dutch[1])}`

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? '' : toLocalDateKey(parsed)
}

function normalizeTime(value) {
  if (!hasValue(value)) return ''
  const raw = String(value).trim()
  const time = raw.match(/(\d{1,2})[:.](\d{2})/)
  if (time) return `${pad(time[1])}:${time[2]}:00`

  const hour = raw.match(/^(\d{1,2})$/)
  if (hour) return `${pad(hour[1])}:00:00`

  return ''
}

function parseDateTimeValue(value) {
  if (!hasValue(value)) return ''

  if (typeof value === 'number') {
    const millis = value > 9999999999 ? value : value * 1000
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const raw = String(value).trim()
  const dutch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/)
  if (dutch) {
    const date = new Date(
      Number(dutch[3]),
      Number(dutch[2]) - 1,
      Number(dutch[1]),
      Number(dutch[4] || 0),
      Number(dutch[5] || 0)
    )
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const isoLike = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})(?::\d{2})?/)
  if (isoLike && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const date = new Date(`${isoLike[1]}T${isoLike[2]}:00`)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}$/)
  if (dateOnly) {
    const date = new Date(`${raw}T00:00:00`)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function combineDateTime(dateValue, timeValue) {
  const date = normalizeDate(dateValue)
  if (!date) return ''
  const time = normalizeTime(timeValue) || '00:00:00'
  const parsed = new Date(`${date}T${time}`)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

export function getLeadAppointment(leadOrPayload) {
  const rawPayload = parseObject(leadOrPayload?.raw_payload)
  const raw = Object.keys(rawPayload).length ? rawPayload : parseObject(leadOrPayload)

  const start =
    parseDateTimeValue(findValue(raw, START_ALIASES)) ||
    combineDateTime(findValue(raw, DATE_ALIASES), findValue(raw, TIME_ALIASES)) ||
    combineDateTime(findValue(raw, GENERIC_DATE_ALIASES), findValue(raw, TIME_ALIASES))

  if (!start) return null

  const end =
    parseDateTimeValue(findValue(raw, END_ALIASES)) ||
    ''

  return {
    start,
    end,
    dateKey: toLocalDateKey(new Date(start)),
  }
}

export function hasLeadAppointment(leadOrPayload) {
  return Boolean(getLeadAppointment(leadOrPayload)?.start)
}
