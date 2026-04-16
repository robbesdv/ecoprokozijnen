import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Afzender — verander naar info@ecoprokozijnen.nl zodra domein geverifieerd is
const FROM = 'EcoPro Kozijnen <onboarding@resend.dev>' // Wijzig naar info@ecoprokozijnen.nl na domeinverificatie
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app'

// ─── E-mail templates per type ────────────────────────────────────────────────

function emailTemplates(order, type, extra = {}) {
  const portalLink = `${BASE_URL}/portaal/${order.portal_token}`
  const portalButton = `
    <div style="text-align:center; margin: 28px 0;">
      <a href="${portalLink}" style="background:#1A3A2A; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
        Bekijk uw portaal →
      </a>
    </div>
  `

  const templates = {

    // ── Nieuwe offerte ────────────────────────────────────────────────────────
    nieuwe_offerte: {
      subject: `Uw offerte van EcoPro Kozijnen`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Bedankt voor uw interesse in EcoPro Kozijnen. Wij hebben een offerte voor u klaarstaan.</p>
        <div style="background:#F4F6F4; border-radius:10px; padding:16px 20px; margin:20px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#6B7280;">Totaalbedrag</span>
            <strong style="color:#1A3A2A;">${formatEuro(order.total_amount)}</strong>
          </div>
          ${order.quote_expires_at ? `<div style="display:flex; justify-content:space-between;">
            <span style="color:#6B7280;">Geldig tot</span>
            <strong>${formatDate(order.quote_expires_at)}</strong>
          </div>` : ''}
        </div>
        <p>U kunt de offerte bekijken, accorderen en de aanbetaling regelen via uw persoonlijke portaal.</p>
        ${portalButton}
        <p style="font-size:13px; color:#6B7280;">Na uw akkoord ontvangen wij graag de aanbetaling van 20% (${formatEuro(order.total_amount * 0.2)}) om de productie te starten.</p>
      `,
    },

    // ── Aanbetaling bevestigd ─────────────────────────────────────────────────
    aanbetaling_bevestigd: {
      subject: `Aanbetaling ontvangen — productie gestart`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Wij hebben uw aanbetaling van <strong>${formatEuro(order.total_amount * 0.2)}</strong> ontvangen. Bedankt!</p>
        <p>Uw kozijnen zijn nu besteld bij de fabriek. De gemiddelde productietijd is <strong>7–8 weken</strong>. Wij houden u op de hoogte via uw portaal.</p>
        ${portalButton}
      `,
    },

    // ── Status gewijzigd ──────────────────────────────────────────────────────
    status_update: {
      subject: `Update over uw kozijnen — ${extra.phaseLabel || 'status gewijzigd'}`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Er is een update voor uw order:</p>
        <div style="background:#EBF2EC; border-left:4px solid #1A3A2A; padding:14px 18px; border-radius:0 8px 8px 0; margin:20px 0;">
          <strong style="color:#1A3A2A; font-size:16px;">${extra.phaseLabel || 'Status bijgewerkt'}</strong>
          ${extra.note ? `<p style="margin:6px 0 0; color:#374151;">${extra.note}</p>` : ''}
        </div>
        ${extra.installDate ? `<p>📅 Montagedatum: <strong>${extra.installDate}</strong></p>` : ''}
        <p>Bekijk alle details en de actuele status in uw portaal.</p>
        ${portalButton}
      `,
    },

    // ── Montage ingepland ─────────────────────────────────────────────────────
    montage_gepland: {
      subject: `Montagedatum bevestigd — ${extra.installDate}`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Uw kozijnen zijn bij ons geleverd en de montage is ingepland!</p>
        <div style="background:#1A3A2A; color:white; border-radius:10px; padding:20px; text-align:center; margin:20px 0;">
          <div style="font-size:13px; opacity:0.7; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">Montagedatum</div>
          <div style="font-size:28px; font-weight:700;">${extra.installDate || '—'}</div>
        </div>
        <p><strong>Wat kunt u verwachten:</strong></p>
        <ul style="color:#374151; line-height:2;">
          <li>Ruim de ruimte rondom de kozijnen vrij</li>
          <li>Zorg voor toegang tot alle betreffende ruimtes</li>
          <li>Zorg dat er iemand aanwezig is de gehele dag</li>
        </ul>
        ${portalButton}
      `,
    },

    // ── Montage afgerond — betaling ───────────────────────────────────────────
    montage_klaar: {
      subject: `Montage afgerond — restbetaling`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>De montage van uw kozijnen is succesvol afgerond! 🎉</p>
        <p>Via uw portaal kunt u:</p>
        <ul style="color:#374151; line-height:2;">
          <li>De restbetaling voldoen</li>
          <li>Eventuele bevindingen melden</li>
        </ul>
        <div style="background:#F4F6F4; border-radius:10px; padding:16px 20px; margin:20px 0;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#6B7280;">Restbedrag</span>
            <strong style="color:#1A3A2A;">${formatEuro(order.total_amount * 0.8)}</strong>
          </div>
        </div>
        ${portalButton}
      `,
    },

    // ── Betaling ontvangen ────────────────────────────────────────────────────
    betaling_bevestigd: {
      subject: `Betaling ontvangen — bedankt!`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Wij hebben uw betaling van <strong>${formatEuro(extra.amount || 0)}</strong> ontvangen. Bedankt!</p>
        ${extra.final ? '<p>Hiermee is alles volledig afgerond. Wij wensen u veel plezier met uw nieuwe kozijnen! 🏠</p>' : '<p>U kunt de actuele status altijd bekijken in uw portaal.</p>'}
        ${portalButton}
      `,
    },

    // ── Bevinding opgelost ────────────────────────────────────────────────────
    bevinding_opgelost: {
      subject: `Uw melding is opgelost`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Wij hebben de door u gemelde bevinding opgelost:</p>
        <div style="background:#F0FDF4; border-left:4px solid #16A34A; padding:14px 18px; border-radius:0 8px 8px 0; margin:20px 0; color:#15803D;">
          ${extra.defect || '—'}
        </div>
        ${extra.allResolved ? '<p>Alle meldingen zijn nu opgelost. U kunt de slotbetaling voldoen via uw portaal.</p>' : '<p>Zijn er nog andere punten? U kunt deze melden via uw portaal.</p>'}
        ${portalButton}
      `,
    },

    // ── Oplevering compleet ───────────────────────────────────────────────────
    compleet: {
      subject: `Oplevering compleet — bedankt voor uw vertrouwen!`,
      body: `
        <p>Beste ${order.customer_name},</p>
        <p>Alles is afgerond! Uw nieuwe kozijnen zijn geplaatst en alle betalingen zijn verwerkt.</p>
        <p>Wij hopen dat u erg tevreden bent met het resultaat. Mocht u in de toekomst vragen hebben, dan staan wij altijd voor u klaar.</p>
        <p style="margin-top:24px;">Met vriendelijke groet,<br><strong>Het team van EcoPro Kozijnen</strong></p>
      `,
    },
  }

  return templates[type] || null
}

// ─── HTML wrapper ─────────────────────────────────────────────────────────────

function wrapEmail(body) {
  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0; padding:0; background:#F4F6F4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px; margin:32px auto; background:white; border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background:#1A3A2A; padding:24px 32px; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="color:white; font-size:18px; font-weight:700; letter-spacing:-0.01em;">EcoPro Kozijnen</div>
            <div style="color:rgba(255,255,255,0.5); font-size:11px; text-transform:uppercase; letter-spacing:0.1em; margin-top:2px;">Klantportaal notificatie</div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px; color:#111827; font-size:15px; line-height:1.7;">
          ${body}
        </div>

        <!-- Footer -->
        <div style="background:#F4F6F4; padding:18px 32px; border-top:1px solid #E5E7EB;">
          <p style="margin:0; font-size:12px; color:#9CA3AF; text-align:center;">
            EcoPro Kozijnen &nbsp;·&nbsp; 
            <a href="mailto:info@ecoprokozijnen.nl" style="color:#6B7280;">info@ecoprokozijnen.nl</a> &nbsp;·&nbsp; 
            085 049 24 56
          </p>
          <p style="margin:8px 0 0; font-size:11px; color:#D1D5DB; text-align:center;">
            U ontvangt deze e-mail omdat u een order heeft bij EcoPro Kozijnen.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEuro(amount) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { order, type, extra } = await request.json()

    if (!order?.customer_email) {
      return Response.json({ error: 'Geen e-mailadres' }, { status: 400 })
    }

    const template = emailTemplates(order, type, extra || {})
    if (!template) {
      return Response.json({ error: `Onbekend type: ${type}` }, { status: 400 })
    }

    console.log('Sending email to:', order.customer_email, 'type:', type, 'from:', FROM)
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: template.subject,
      html: wrapEmail(template.body),
    })

    console.log('Resend response - data:', JSON.stringify(data), 'error:', JSON.stringify(error))

    if (error) {
      console.error('Resend fout:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Notify route fout:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}