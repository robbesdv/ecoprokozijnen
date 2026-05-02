export async function notifyCustomer(order, type, extra = {}) {
  if (!order?.customer_email) return { success: false, error: 'Geen e-mailadres' }

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, type, extra }),
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok) throw new Error(data.error || 'Onbekende fout')
    return { success: true }
  } catch (err) {
    console.warn('Notificatie fout:', err.message)
    return { success: false, error: err.message }
  }
}
