import { NextResponse } from 'next/server';

import { renderLocationDossierPdf } from '@/lib/film/dossier-pdf';
import { getFilmLocation } from '@/lib/film/locations';

export const runtime = 'nodejs';

/** GET /api/film/dossier?slugs=a[,b]&locale=fr — branded PDF location dossier(s). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'fr';
  const slugs = [
    ...new Set(
      (url.searchParams.get('slugs') || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].slice(0, 2);

  const locations = slugs.map((slug) => getFilmLocation(slug)).filter((l) => l !== undefined);
  if (!locations.length) {
    return NextResponse.json({ detail: 'Unknown location' }, { status: 404 });
  }

  const pdf = await renderLocationDossierPdf(locations, locale);
  const name =
    locations.length > 1
      ? `smartmboa-comparatif-${locations.map((l) => l.slug).join('-vs-')}-${locale}.pdf`
      : `smartmboa-dossier-${locations[0].slug}-${locale}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${url.searchParams.get('inline') === '1' ? 'inline' : 'attachment'}; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
