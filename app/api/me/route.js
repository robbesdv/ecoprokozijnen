import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, verifyAuthCookie } from '@/lib/auth-cookie'

export async function GET() {
  const cookieStore = await cookies()
  const val = cookieStore.get(AUTH_COOKIE_NAME)?.value
  try {
    const auth = await verifyAuthCookie(val)
    if (!auth?.ok) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    return NextResponse.json(auth)
  } catch {
    return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 401 })
  }
}
