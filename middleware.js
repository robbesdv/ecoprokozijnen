import { NextResponse } from 'next/server'

export function middleware(request) {
  // Alleen /beheer routes beschermen
  if (!request.nextUrl.pathname.startsWith('/beheer')) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Basic ')) {
    // Edge Runtime heeft geen Buffer — gebruik atob()
    const base64 = authHeader.slice(6)
    const decoded = atob(base64)
    // Gebruik indexOf zodat een ':' in het wachtwoord geen probleem geeft
    const colonIndex = decoded.indexOf(':')
    const username = decoded.slice(0, colonIndex)
    const password = decoded.slice(colonIndex + 1)

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Toegang geweigerd', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="EcoPro Beheer"',
    },
  })
}

export const config = {
  matcher: ['/beheer/:path*'],
}
