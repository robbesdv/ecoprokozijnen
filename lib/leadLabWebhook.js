export async function sendLeadLabEvent(event, payload = {}) {
  try {
    const res = await fetch('/api/leadlab/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    })

    const text = await res.text()
    const data = text ? JSON.parse(text) : {}

    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.skipped || 'LeadLAB webhook mislukt')
    }

    return { success: true }
  } catch (err) {
    console.warn('LeadLAB webhook fout:', err.message)
    return { success: false, error: err.message }
  }
}
