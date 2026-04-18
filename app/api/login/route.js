import { NextResponse } from 'next/server'

const USERS = [
  { username: 'ecopro',   passwordEnv: 'ADMIN_PASSWORD',           role: 'admin',   name: 'EcoPro Admin'   },
  { username: 'rudy',     passwordEnv: 'MONTEUR_PASSWORD_RUDY',    role: 'monteur', name: 'Rudy'           },
  { username: 'vida',     passwordEnv: 'MONTEUR_PASSWORD_VIDA',    role: 'monteur', name: 'Vida Kozijnen'  },
  { username: 'matthew',  passwordEnv: 'MONTEUR_PASSWORD_MATTHEW', role: 'monteur', name: 'Matthew'        },
  { username: 'kay',      passwordEnv: 'MONTEUR_PASSWORD_KAY',     role: 'monteur', name: 'Kay'            },
]

export async function POST(request) {
  try {
    const { username, password } = await request.json()
    const user = USERS.find(u => u.username === username)

    if (!user) {
      return NextResponse.json({ error: 'Gebruikersnaam of wachtwoord onjuist' }, { status: 401 })
    }

    const expectedPassword = process.env[user.passwordEnv]
    if (!expectedPassword || password !== expectedPassword) {
      return NextResponse.json({ error: 'Gebruikersnaam of wachtwoord onjuist' }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirect: user.role === 'admin' ? '/beheer' : '/monteur',
    })

    response.cookies.set('ecopro-auth', JSON.stringify({
      ok: true,
      role: user.role,
      username: user.username,
      name: user.name,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (err) {
    return NextResponse.json({ error: 'Serverfout: ' + err.message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('ecopro-auth')
  return response
}