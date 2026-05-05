export const AUTH_COOKIE_NAME = 'ecopro-auth'
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

const VALID_ROLES = new Set(['admin', 'monteur', 'verkoper'])
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function authSecret() {
  const secret =
    process.env.AUTH_COOKIE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.KOZIJNSUITE_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY

  if (secret) return secret
  return process.env.NODE_ENV === 'production' ? '' : 'ecopro-local-dev-auth-secret'
}

function base64UrlEncodeBytes(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(encoder.encode(text))
}

function base64UrlDecodeText(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return decoder.decode(bytes)
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncodeBytes(new Uint8Array(signature))
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createAuthCookie(user) {
  const secret = authSecret()
  if (!secret) throw new Error('AUTH_COOKIE_SECRET ontbreekt')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    ok: true,
    username: user.username,
    role: user.role,
    name: user.name,
    iat: now,
    exp: now + AUTH_COOKIE_MAX_AGE,
  }
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload))
  const signature = await signPayload(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export async function verifyAuthCookie(value) {
  const secret = authSecret()
  if (!secret || !value || typeof value !== 'string') return null

  const [encodedPayload, signature, extra] = value.split('.')
  if (!encodedPayload || !signature || extra) return null

  const expectedSignature = await signPayload(encodedPayload, secret)
  if (!constantTimeEqual(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(base64UrlDecodeText(encodedPayload))
    if (!payload?.ok || !VALID_ROLES.has(payload.role)) return null
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
