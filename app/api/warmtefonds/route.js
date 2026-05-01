import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app').replace(/^http:/, 'https:')

// Y positions (pt from bottom of A4 page = 842pt) for text overlay fallback.
// Adjust these if the text lands in the wrong place.
const FIELD_Y = {
  naam:     638,  // "Naam" row
  straat:   613,  // "Straat en huisnummer" row
  postcode: 588,  // "Postcode en woonplaats" row
}
const FIELD_X = 180 // x start — after the label text

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
    .select('customer_name, customer_address')
    .eq('portal_token', token)
    .single()

  if (!order) return new Response('Niet gevonden', { status: 404 })

  const [street = '', postcode = '', city = ''] = (order.customer_address || '').split(',').map(s => s.trim())
  const postcodeCity = [postcode, city].filter(Boolean).join(' ')

  let templateBytes
  try {
    const res = await fetch(`${BASE_URL}/warmtefonds-template.pdf`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    templateBytes = await res.arrayBuffer()
  } catch {
    return new Response(
      'Template niet gevonden. Sla het ondertekende PDF-bestand op als public/warmtefonds-template.pdf',
      { status: 500 }
    )
  }

  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })

  // Try AcroForm fields first (works if PDF has interactive form fields)
  let filledViaForm = false
  try {
    const form = pdfDoc.getForm()
    const fields = form.getFields()
    if (fields.length > 0) {
      console.log('Warmtefonds form fields:', fields.map(f => f.getName()))
      const mapping = {
        Naam: order.customer_name,
        naam: order.customer_name,
        'Straat en huisnummer': street,
        straat: street,
        adres: street,
        'Postcode en woonplaats': postcodeCity,
        postcode: postcodeCity,
        postcode_woonplaats: postcodeCity,
      }
      for (const field of fields) {
        const val = mapping[field.getName()]
        if (val !== undefined) {
          try { form.getTextField(field.getName()).setText(val); filledViaForm = true } catch {}
        }
      }
    }
  } catch {}

  // Fallback: draw text at fixed coordinates
  if (!filledViaForm) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const page = pdfDoc.getPage(0)
    const black = rgb(0, 0, 0)
    const size = 10

    const rows = [
      { text: order.customer_name || '', y: FIELD_Y.naam },
      { text: street,                    y: FIELD_Y.straat },
      { text: postcodeCity,              y: FIELD_Y.postcode },
    ]
    for (const { text, y } of rows) {
      if (text) page.drawText(text, { x: FIELD_X, y, size, font, color: black })
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
