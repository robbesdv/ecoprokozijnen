import { Resend } from 'resend'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app'
const FROM = 'EcoPro Kozijnen <noreply@send.ecoprokozijnen.nl>'

function formatEuro(amount) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function portalButton(token) {
  const link = `${BASE_URL}/portaal/${token}`
  return `
    <div style="text-align:center; margin:28px 0;">
      <a href="${link}" style="background:#1A3A2A;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Bekijk uw portaal →
      </a>
    </div>
  `
}

function wrapEmail(body) {
  return `<!DOCTYPE html><html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F4F6F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#1A3A2A;padding:20px 32px;display:flex;align-items:center;gap:14px;">
      <img src="${BASE_URL}/logo.png" alt="EcoPro Kozijnen" style="width:44px;height:44px;object-fit:contain;" />
      <div>
        <div style="color:white;font-size:18px;font-weight:700;letter-spacing:-0.01em;">EcoPro Kozijnen</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Klantportaal notificatie</div>
      </div>
    </div>
    <div style="padding:32px 32px 24px;color:#111827;font-size:15px;line-height:1.8;">${body}</div>
    <div style="background:#F4F6F4;padding:18px 32px;border-top:1px solid #E5E7EB;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
        EcoPro Kozijnen &nbsp;·&nbsp;
        <a href="mailto:info@ecoprokozijnen.nl" style="color:#6B7280;">info@ecoprokozijnen.nl</a>
        &nbsp;·&nbsp; 085 049 24 56
      </p>
    </div>
  </div>
</body></html>`
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const results = { offerte_reminders: 0, aanbetaling_reminders: 0, errors: [] }
  const now = new Date()

  // ── 1. Offerte-herinnering (3 dagen voor verloopdatum) ────────────────────
  // Window: expires between now+2d and now+4d → hits once per order with daily cron
  const offerteFrom = new Date(now); offerteFrom.setDate(offerteFrom.getDate() + 2)
  const offerteTo   = new Date(now); offerteTo.setDate(offerteTo.getDate() + 4)

  const { data: expiringOrders } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, total_amount, portal_token, quote_expires_at')
    .eq('phase', 0)
    .not('customer_email', 'is', null)
    .gte('quote_expires_at', offerteFrom.toISOString())
    .lt('quote_expires_at', offerteTo.toISOString())

  for (const order of expiringOrders || []) {
    try {
      const daysLeft = Math.ceil((new Date(order.quote_expires_at) - now) / 86400000)
      const body = `
        <p>Beste ${order.customer_name},</p>
        <p>Uw offerte van EcoPro Kozijnen verloopt over <strong>${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}</strong> (op ${formatDate(order.quote_expires_at)}).</p>
        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
          <strong style="color:#92400E;">Actie vereist</strong>
          <p style="margin:6px 0 0;color:#78350F;font-size:14px;">Bekijk en accordeer uw offerte van <strong>${formatEuro(order.total_amount)}</strong> voor de vervaldatum.</p>
        </div>
        ${portalButton(order.portal_token)}
        <p style="font-size:13px;color:#6B7280;">Heeft u vragen? Bel ons op <a href="tel:+31850492456" style="color:#1A3A2A;">085 049 24 56</a>.</p>
      `
      await resend.emails.send({
        from: FROM,
        to: order.customer_email,
        subject: `Herinnering: uw offerte verloopt over ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}`,
        html: wrapEmail(body),
      })
      results.offerte_reminders++
    } catch (err) {
      results.errors.push(`Offerte ${order.id}: ${err.message}`)
    }
  }

  // ── 2. Aanbetaling-herinnering (5 dagen na akkoord) ───────────────────────
  // Window: quote_accepted_at between 6 and 4 days ago → hits once per order
  const aanbetalingFrom = new Date(now); aanbetalingFrom.setDate(aanbetalingFrom.getDate() - 6)
  const aanbetalingTo   = new Date(now); aanbetalingTo.setDate(aanbetalingTo.getDate() - 4)

  const { data: pendingDeposit } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, total_amount, portal_token, quote_accepted_at')
    .eq('phase', 1)
    .not('customer_email', 'is', null)
    .not('quote_accepted_at', 'is', null)
    .gte('quote_accepted_at', aanbetalingFrom.toISOString())
    .lt('quote_accepted_at', aanbetalingTo.toISOString())

  for (const order of pendingDeposit || []) {
    try {
      const deposit = Math.round(order.total_amount * 0.2 * 100) / 100
      const body = `
        <p>Beste ${order.customer_name},</p>
        <p>U heeft uw offerte geaccordeerd — bedankt! Uw aanbetaling van <strong>${formatEuro(deposit)}</strong> staat echter nog open.</p>
        <div style="background:#EBF2EC;border-left:4px solid #1A3A2A;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
          <strong style="color:#1A3A2A;">Aanbetaling nog niet ontvangen</strong>
          <p style="margin:6px 0 0;color:#374151;font-size:14px;">Maak <strong>${formatEuro(deposit)}</strong> over via het portaal om de productie te starten.</p>
        </div>
        ${portalButton(order.portal_token)}
        <p style="font-size:13px;color:#6B7280;">Vragen? Bel ons op <a href="tel:+31850492456" style="color:#1A3A2A;">085 049 24 56</a>.</p>
      `
      await resend.emails.send({
        from: FROM,
        to: order.customer_email,
        subject: `Herinnering: uw aanbetaling staat nog open`,
        html: wrapEmail(body),
      })
      results.aanbetaling_reminders++
    } catch (err) {
      results.errors.push(`Aanbetaling ${order.id}: ${err.message}`)
    }
  }

  return Response.json(results)
}
