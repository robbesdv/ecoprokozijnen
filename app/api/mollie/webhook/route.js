import { createClient } from '@supabase/supabase-js'
import createMollieClient from '@mollie/api-client'

export async function POST(request) {
  try {
    const body = await request.formData()
    const paymentId = body.get('id')

    if (!paymentId) return new Response('OK', { status: 200 })

    const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY })
    const payment = await mollie.payments.get(paymentId)

    if (!payment.isPaid()) return new Response('OK', { status: 200 })

    const { orderId, paymentType } = payment.metadata || {}
    if (!orderId || !paymentType) return new Response('OK', { status: 200 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const updates = {}
    if (paymentType === 'deposit') {
      updates.deposit_confirmed = true
      updates.deposit_notified = true
      updates.phase_id = 2
    } else if (paymentType === 'main') {
      updates.main_payment_confirmed = true
      updates.main_payment_notified = true
    } else if (paymentType === 'final') {
      updates.final_payment_confirmed = true
      updates.phase_id = 7
    }

    await supabase.from('orders').update(updates).eq('id', orderId)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Mollie webhook error:', err)
    return new Response('OK', { status: 200 })
  }
}
