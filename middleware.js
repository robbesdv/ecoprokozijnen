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
    if (auth.role === 'monteur') return NextResponse.redirect(new URL('/monteur', request.url))
    if (auth.role === 'verkoper') return NextResponse.redirect(new URL('/verkoper', request.url))
    return NextResponse.next()
  }

  // /monteur alleen voor ingelogden
  if (path.startsWith('/monteur')) {
    if (!auth?.ok) return NextResponse.redirect(new URL('/beheer/login', request.url))
    if (auth.role === 'verkoper') return NextResponse.redirect(new URL('/verkoper', request.url))
    if (auth.role === 'admin') return NextResponse.redirect(new URL('/beheer', request.url))
    return NextResponse.next()
  }

  // /verkoper alleen voor verkopers
  if (path.startsWith('/verkoper')) {
    if (!auth?.ok) return NextResponse.redirect(new URL('/beheer/login', request.url))
    if (auth.role === 'monteur') return NextResponse.redirect(new URL('/monteur', request.url))
    if (auth.role === 'admin') return NextResponse.redirect(new URL('/beheer', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/beheer/:path*', '/monteur/:path*', '/verkoper/:path*', '/api/login'],
}
