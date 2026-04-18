import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname

  if (path === '/beheer/login' || path.startsWith('/api/login')) {
    return NextResponse.next()
  }

  if (path.startsWith('/beheer')) {
    const auth = request.cookies.get('ecopro-auth')
    if (auth?.value !== 'ok') {
      return NextResponse.redirect(new URL('/beheer/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/beheer/:path*', '/api/login'],
}
