import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const val = cookieStore.get('ecopro-auth')?.value
  try {
    const auth = val ? JSON.parse(val) : null
    if (!auth?.ok) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    return NextResponse.json(auth)
  } catch {
    return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 401 })
  }
}