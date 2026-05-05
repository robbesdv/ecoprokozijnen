import createMollieClient from '@mollie/api-client'
import { Resend } from 'resend'
import { internalApiHeaders } from '@/lib/internal-auth'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

const FROM = 'EcoPro Kozijnen <onboarding@resend.dev>'
const ADMIN_EMAIL = 'robbesdv@gmail.com'
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app').replace(/^http:/, 'https:')

const PAYMENT_LABELS = {
  deposit: 'Aanbetaling (20%)',
  main:    'Restbetaling (70% of 80%)',
  final:   'Slotbetaling (10%)',
}

async function sendAdminEmail(order, paymentType, amount) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const label = PAYMENT_LABELS[paymentType] || paymentType
    const adminUrl = `${BASE_URL}/beheer/verkoop`
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `💳 iDEAL betaling ontvangen — ${order.customer_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <div style="background:#1A3A2A;border-radius:12px;padding:24px 28px;color:white;margin-bottom:24px">
            <div style="font-size:13px;opacity:0.7;margin-bottom:6px">iDEAL betaling bevestigd</div>
            <div style="font-size:24px;font-weight:700">${order.customer_name}</div>
            <div style="font-size:15px;opacity:0.85;margin-top:4px">${order.customer_address || ''}</div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#f9fafb">
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Type</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right">${label}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Bedrag</td>
              <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#1A3A2A;border-bottom:1px solid #e5e7eb;text-align:right">€ ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:12px 16px;font-size:13px;color:#6b7280">Referentie</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;text-align:right">${order.crm_reference || order.id.slice(0, 8).toUpperCase()}</td>
            </tr>
          </table>

          <div style="text-align:center">
            <a href="${adminUrl}" style="display:inline-block;background:#1A3A2A;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
              Bekijk in dashboard →
            </a>
          </div>
        </div>
      `,
    })
  } catch (e) {
    console.error('Admin email failed:', e)
  }
}

export async function POST(request) {
  try {
    const body = await request.formData()
    const paymentId = body.get('id')

    if (!paymentId) return new Response('OK', { status: 200 })

    const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })
    const payment = await mollie.payments.get(paymentId)

    if (payment.status !== 'paid') return new Response('OK', { status: 200 })

    const { orderId, paymentType } = payment.metadata || {}
    if (!orderId || !paymentType) return new Response('OK', { status: 200 })

    const supabase = createServiceSupabaseClient()

    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, customer_address, total_amount, payment_split, crm_reference, portal_token, phase')
      .eq('id', orderId)
      .single()

    if (!order) return new Response('OK', { status: 200 })

    const updates = {}
    let notifyType = null
    let notifyExtra = {}

    if (paymentType === 'deposit') {
      updates.deposit_confirmed = true
      updates.deposit_notified = true
      updates.phase = 2
      notifyType = 'aanbetaling_bevestigd'
    } else if (paymentType === 'main') {
      updates.main_payment_confirmed = true
      updates.main_payment_notified = true
      // full_80 is financially complete → advance to phase 7
      if (order.payment_split === 'full_80') {
        updates.phase = 7
        updates.completed_at = new Date().toISOString()
      }
      notifyType = 'betaling_bevestigd'
      notifyExtra = {
        amount: Number(payment.amount?.value || 0),
        final: false,
      }
    } else if (paymentType === 'final') {
      updates.final_payment_confirmed = true
      updates.phase = 7
      updates.completed_at = new Date().toISOString()
      notifyType = 'betaling_bevestigd'
      notifyExtra = {
        amount: Number(payment.amount?.value || 0),
        final: true,
      }
    }

    const prevPhase = order.phase
    const paidAt = payment.paidAt || new Date().toISOString()

    // Best-effort: store per-payment timestamp (requires deposit_paid_at/main_paid_at/final_paid_at columns)
    const paidAtField = paymentType === 'deposit' ? 'deposit_paid_at'
      : paymentType === 'main' ? 'main_paid_at'
      : 'final_paid_at'
    updates[paidAtField] = paidAt

    await supabase.from('orders').update(updates).eq('id', orderId)

    // Always log a status_history entry for iDEAL payments so bewijs can find the payment date
    await supabase.from('status_history').insert({
      order_id: orderId,
      from_phase: prevPhase,
      to_phase: updates.phase || prevPhase,
      changed_by: 'mollie_webhook',
      note: JSON.stringify({ payment_type: paymentType, amount: payment.amount?.value, mollie_id: paymentId, paid_at: paidAt, to_phase: updates.phase || prevPhase }),
    }).catch(() => {})

    // Send customer notification
    if (notifyType && order.customer_email) {
      await fetch(`${BASE_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...internalApiHeaders() },
        body: JSON.stringify({ order, type: notifyType, extra: notifyExtra }),
      }).catch(() => {})
    }

    const amount = payment.amount?.value || 0
    await sendAdminEmail(order, paymentType, amount)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Mollie webhook error:', err)
    return new Response('OK', { status: 200 })
  }
}
