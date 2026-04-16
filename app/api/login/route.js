import { NextResponse } from 'next/server'

export async function POST(request) {
  const { username, password } = await request.json()

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('ecopro-auth', 'ok', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dagen
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Gebruikersnaam of wachtwoord onjuist' }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('ecopro-auth')
  return response
}
