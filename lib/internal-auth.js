import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, verifyAuthCookie } from '@/lib/auth-cookie'

function timingSafeEqualString(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function getInternalApiSecret() {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.AUTH_COOKIE_SECRET ||
    process.env.KOZIJNSUITE_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  )
}

export function internalApiHeaders() {
  const secret = getInternalApiSecret()
  return secret ? { 'x-internal-secret': secret } : {}
}

export async function verifyInternalRequest(request, allowedRoles = ['admin']) {
  const secret = getInternalApiSecret()
  const headerSecret = request.headers.get('x-internal-secret') || ''
  if (secret && timingSafeEqualString(headerSecret, secret)) {
    return { ok: true, role: 'server', username: 'server', name: 'Server' }
  }

  const cookieStore = await cookies()
  const auth = await verifyAuthCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
  if (!auth?.ok) return null
  if (!allowedRoles.includes(auth.role)) return null
  return auth
}
