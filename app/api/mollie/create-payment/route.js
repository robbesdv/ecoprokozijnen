import createMollieClient from '@mollie/api-client'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { calcDeposit, calcMain, calcFinal } from '@/lib/phases'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://ecoprokozijnen.vercel.app').replace(/^http:/, 'https:')
const WEBHOOK_URL = (process.env.MOLLIE_WEBHOOK_BASE_URL || BASE_URL).replace(/\/$/, '')

export async function POST(request) {
  try {
    const { orderId, paymentType, token } = await request.json()

    if (!orderId || !paymentType || !token) {
      return Response.json({ error: 'Ontbrekende parameters' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, total_amount, payment_split, crm_reference, portal_token')
      .eq('id', orderId)
      .eq('portal_token', token)
      .single()

    if (error || !order) {
      return Response.json({ error: 'Order niet gevonden' }, { status: 404 })
    }

    let amount, description
    if (paymentType === 'deposit') {
      amount = calcDeposit(order.total_amount)
      description = `Aanbetaling offerte ${order.crm_reference || order.id.slice(0, 8).toUpperCase()}`
    } else if (paymentType === 'main') {
      amount = calcMain(order.total_amount, order.payment_split)
      description = `Restbetaling offerte ${order.crm_reference || order.id.slice(0, 8).toUpperCase()}`
    } else if (paymentType === 'final') {
      amount = calcFinal(order.total_amount)
      description = `Slotbetaling offerte ${order.crm_reference || order.id.slice(0, 8).toUpperCase()}`
    } else {
      return Response.json({ error: 'Ongeldig betalingstype' }, { status: 400 })
    }

    const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })

    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: amount.toFixed(2) },
      description,
      redirectUrl: `${BASE_URL}/portaal/${token}?payment=return`,
      webhookUrl: `${WEBHOOK_URL}/api/mollie/webhook`,
      method: ['ideal'],
      metadata: { orderId, paymentType, token },
    })

    await supabase.from('orders').update({ mollie_payment_id: payment.id }).eq('id', orderId)

    return Response.json({ checkoutUrl: payment._links.checkout.href })
  } catch (err) {
    console.error('Mollie create-payment error:', err)
    return Response.json({ error: err.message || 'Onbekende fout' }, { status: 500 })
  }
}
