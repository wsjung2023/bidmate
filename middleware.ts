import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Allow machine-to-machine requests authenticated with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return NextResponse.next()
  }

  const sessionToken =
    req.cookies.get('authjs.session-token') ??
    req.cookies.get('__Secure-authjs.session-token')

  const isLoggedIn = !!sessionToken
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')

  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    if (isApiRoute) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
