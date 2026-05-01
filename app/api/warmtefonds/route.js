import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app').replace(/^http:/, 'https:')

// Y positions (pt from bottom of A4 = 842pt) for customer text fields.
const FIELD_Y = {
  naam:     610,
  straat:   585,
  postcode: 560,
}
const FIELD_X = 180

// Checkbox positions [x, y from bottom] — draw a filled square here.
// These match the small checkbox squares in the Warmtefonds form.
const CHECK = {
  hoogrendementsbeglazing:   [16, 392],
  inclusief_hout_kunststof:  [28, 374],
  isolerende_deuren:         [16, 338],
  isolerende_panelen_dubbel: [16, 320],
  isolerende_panelen_triple: [16, 302],
}

function parseItems(items) {
  let hasDoor = false
  const glassPacks = new Set()

  for (const item of items || []) {
    let cfg = item.element_config
    if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg) } catch { continue } }
    if (!cfg) continue

    if (cfg.type === 'deur') hasDoor = true

    const cols = cfg.columns || []
    const allRows = cols.flatMap(c => c.rows || [])
    const doorPanels = (cfg.type === 'deur' && Array.isArray(cfg.doorPanels)) ? cfg.doorPanels : []
    const glassRows = [
      ...allRows.filter(r => r.fill !== 'panel'),
      ...doorPanels.filter(p => p.fill === 'glass'),
    ]
    for (const row of glassRows) {
      if (row.glassPack) glassPacks.add(row.glassPack)
    }
  }

  return { hasDoor, glassPacks }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return new Response('Niet gevonden', { status: 404 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_name, customer_address')
    .eq('portal_token', token)
    .single()

  if (!order) return new Response('Niet gevonden', { status: 404 })

  const { data: items } = await supabase
    .from('order_items')
    .select('element_config')
    .eq('order_id', order.id)

  const { hasDoor, glassPacks } = parseItems(items)
  const hasTriple = glassPacks.has('HR+++')
  const hasDouble = glassPacks.has('HR++') || (!hasTriple && glassPacks.size === 0)

  // Which checkboxes to tick
  const toCheck = new Set(['hoogrendementsbeglazing', 'inclusief_hout_kunststof'])
  if (hasDoor)   toCheck.add('isolerende_deuren')
  if (hasTriple) toCheck.add('isolerende_panelen_triple')
  else if (hasDouble) toCheck.add('isolerende_panelen_dubbel')

  const [street = '', postcode = '', city = ''] = (order.customer_address || '').split(',').map(s => s.trim())
  const postcodeCity = [postcode, city].filter(Boolean).join(' ')

  let templateBytes
  try {
    const res = await fetch(`${BASE_URL}/warmtefonds-template.pdf`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    templateBytes = await res.arrayBuffer()
  } catch {
    return new Response('Template niet gevonden — zet warmtefonds-template.pdf in public/', { status: 500 })
  }

  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.getPage(0)
  const black = rgb(0, 0, 0)
  const green = rgb(0.1, 0.45, 0.16)

  // 1. Fill customer text fields via AcroForm (if present) or text overlay
  let filledViaForm = false
  try {
    const form = pdfDoc.getForm()
    const fields = form.getFields()
    if (fields.length > 0) {
      console.log('Warmtefonds fields:', fields.map(f => f.getName()))
      const textMapping = {
        Naam: order.customer_name, naam: order.customer_name,
        'Straat en huisnummer': street, straat: street, adres: street,
        'Postcode en woonplaats': postcodeCity, postcode: postcodeCity,
      }
      for (const field of fields) {
        const val = textMapping[field.getName()]
        if (val !== undefined) {
          try { form.getTextField(field.getName()).setText(val); filledViaForm = true } catch {}
        }
      }

      // Try to tick checkboxes via AcroForm field names
      const checkMapping = {
        Hoogrendementsbeglazing: 'hoogrendementsbeglazing',
        'Inclusief houten of kunststof kozijnen': 'inclusief_hout_kunststof',
        'Isolerende deuren': 'isolerende_deuren',
        'Isolerende kozijnpanelen (bij dubbel glas)': 'isolerende_panelen_dubbel',
        'Isolerende kozijnpanelen (bij triple glas)': 'isolerende_panelen_triple',
      }
      for (const [fieldName, key] of Object.entries(checkMapping)) {
        if (toCheck.has(key)) {
          try { form.getCheckBox(fieldName).check() } catch {}
        }
      }
    }
  } catch {}

  // 2. Text overlay fallback for customer fields
  if (!filledViaForm) {
    for (const { text, y } of [
      { text: order.customer_name || '', y: FIELD_Y.naam },
      { text: street,                    y: FIELD_Y.straat },
      { text: postcodeCity,              y: FIELD_Y.postcode },
    ]) {
      if (text) page.drawText(text, { x: FIELD_X, y, size: 10, font, color: black })
    }
  }

  // 3. Draw filled checkboxes (always — covers both AcroForm and fallback cases)
  for (const [key, [cx, cy]] of Object.entries(CHECK)) {
    if (toCheck.has(key)) {
      page.drawRectangle({ x: cx, y: cy, width: 7, height: 7, color: green })
    }
  }

  const pdfBytes = await pdfDoc.save()
  const filename = `Warmtefonds-verklaring-${(order.customer_name || 'EcoPro').replace(/\s+/g, '-')}.pdf`

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
