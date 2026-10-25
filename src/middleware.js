import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('sharma_dairy_session')?.value;

  const protectedPrefixes = ['/admin', '/farmer', '/customer', '/staff', '/dashboard'];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/farmer/:path*',
    '/customer/:path*',
    '/staff/:path*',
    '/dashboard/:path*',
  ],
};
