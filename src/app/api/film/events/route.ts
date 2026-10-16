import { NextRequest, NextResponse } from 'next/server';

import { getCinemaEvents } from '@/lib/film/fetch-cinema-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/film/events — upcoming cinema events (live web + curated). */
export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const payload = await getCinemaEvents({ force });
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': force
        ? 'no-store'
        : 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
