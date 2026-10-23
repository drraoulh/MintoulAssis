import { NextResponse, type NextRequest } from 'next/server';

/** Set on the first page load; its absence means "first visit in this browser". */
const VISITOR_COOKIE = 'smartmboa_visitor';
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * First visit → ask the browser to wipe this site's HTTP cache and storage
 * (localStorage, sessionStorage, IndexedDB, service workers) so the user starts clean,
 * then remember them with a cookie. Cookies are deliberately not cleared.
 */
export function proxy(request: NextRequest) {
  // Only full page loads — not RSC navigations / prefetches made by an already-open tab
  const isDocument =
    request.headers.get('sec-fetch-dest') === 'document' ||
    (request.headers.get('accept') ?? '').includes('text/html');
  if (!isDocument || request.headers.has('rsc') || request.headers.has('next-router-prefetch')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set('Clear-Site-Data', '"cache", "storage"');
  response.cookies.set(VISITOR_COOKIE, '1', {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, Next internals and any file with an extension (images, fonts…)
      source: '/((?!api|_next/static|_next/image|.*\\..*).*)',
      missing: [{ type: 'cookie', key: 'smartmboa_visitor' }],
    },
  ],
};
