import { verifyInternalRequest } from '@/lib/internal-auth'

const REQUIRED_CHECKS = [
  {
    key: 'supabaseUrl',
    label: 'NEXT_PUBLIC_SUPABASE_URL',
    ok: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  },
  {
    key: 'supabaseAnon',
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ok: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  {
    key: 'supabaseService',
    label: 'SUPABASE_SERVICE_ROLE_KEY',
    ok: () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
  },
  {
    key: 'authCookieSecret',
    label: 'AUTH_COOKIE_SECRET',
    ok: () => Boolean(process.env.AUTH_COOKIE_SECRET),
  },
  {
    key: 'internalApiSecret',
    label: 'INTERNAL_API_SECRET',
    ok: () => Boolean(process.env.INTERNAL_API_SECRET),
  },
]

const OPTIONAL_CHECKS = [
  {
    key: 'leadLabApiKey',
    label: 'LEADLAB_API_KEY',
    ok: () => Boolean(process.env.LEADLAB_API_KEY),
  },
  {
    key: 'kozijnsuiteWebhookSecret',
    label: 'KOZIJNSUITE_WEBHOOK_SECRET',
    ok: () => Boolean(process.env.KOZIJNSUITE_WEBHOOK_SECRET),
  },
  {
    key: 'mollieApiKey',
    label: 'MOLLIE_API_KEY',
    ok: () => Boolean(process.env.MOLLIE_API_KEY),
  },
  {
    key: 'resendApiKey',
    label: 'RESEND_API_KEY',
    ok: () => Boolean(process.env.RESEND_API_KEY),
  },
]

function toStatus(check) {
  return {
    key: check.key,
    label: check.label,
    configured: check.ok(),
  }
}

export async function GET(request) {
  const auth = await verifyInternalRequest(request, ['admin'])
  if (!auth) {
    return Response.json({ error: 'Niet bevoegd' }, { status: 401 })
  }

  const required = REQUIRED_CHECKS.map(toStatus)
  const optional = OPTIONAL_CHECKS.map(toStatus)

  return Response.json({
    ok: required.every(item => item.configured),
    checkedAt: new Date().toISOString(),
    required,
    optional,
  })
}
