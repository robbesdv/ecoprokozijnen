import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname

  // Login en API routes altijd doorlaten
  if (path === '/beheer/login' || path.startsWith('/api/')) {
    return NextResponse.next()
  }

  const cookieVal = request.cookies.get('ecopro-auth')?.value
  let auth = null
  try { auth = cookieVal ? JSON.parse(cookieVal) : null } catch {}

  // /beheer alleen voor admin
  if (path.startsWith('/beheer')) {
    if (!auth?.ok) return NextResponse.redirect(new URL('/beheer/login', request.url))
    // Expliciet checken op admin - alles wat niet monteur is mag door
    if (auth.role === 'monteur') return NextResponse.redirect(new URL('/monteur', request.url))
    return NextResponse.next()
  }

  // /monteur alleen voor ingelogden
  if (path.startsWith('/monteur')) {
    if (!auth?.ok) return NextResponse.redirect(new URL('/beheer/login', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/beheer/:path*', '/monteur/:path*', '/api/login'],
}