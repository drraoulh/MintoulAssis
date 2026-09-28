import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const url = new URL('/login', request.url);
  if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|webmanifest|txt|xml|mp3|mp4|woff2?)$).*)',
  ],
};
