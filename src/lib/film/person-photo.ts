/**
 * Fetch a public portrait for a Cameroon cinema / culture personality.
 * Prefer Wikipedia (FR then EN); fall back to Africiné / CINAF Open Graph images.
 */

import type { PersonUI } from '@/lib/types';
import { extractCinemaSearchTerms } from '@/lib/film/research-cinema';

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; person-photo)';

export type OnlinePersonProfile = PersonUI & {
  extract?: string;
  wikiLang?: 'fr' | 'en';
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanWikiThumb(url: string): string {
  // Drop tracking params that can break some image CDNs
  try {
    const u = new URL(url);
    u.search = '';
    return u.toString();
  } catch {
    return url.split('?')[0];
  }
}

function looksLikePersonPage(opts: {
  title: string;
  description?: string;
  extract?: string;
  type?: string;
}): boolean {
  if (opts.type === 'disambiguation') return false;
  const blob = `${opts.title} ${opts.description || ''} ${opts.extract || ''}`.toLowerCase();
  if (/\bliste\b|\blist of\b|\bcatégorie\b|\bcategory\b/i.test(opts.title)) return false;
  // Film/series pages — skip for person cards
  if (
    /\b(film|série|serie|movie|album|festival|catégorie|category)\b/i.test(opts.description || '') &&
    !/\b(acteur|actrice|réalisateur|réalisatrice|producteur|productrice|cinéaste|videographer|director|actor|actress|screenwriter|scénariste)\b/i.test(
      blob,
    )
  ) {
    return false;
  }
  return (
    /\b(acteur|actrice|réalisateur|réalisatrice|producteur|productrice|cinéaste|scénariste|vidéographe|videographer|director|actor|actress|screenwriter|filmmaker|artiste|chanteur|chanteuse|ministre|professeur|enseignant)\b/i.test(
      blob,
    ) || /\b(né|née|born)\b/i.test(opts.extract || '')
  );
}

async function wikiSummary(
  lang: 'fr' | 'en',
  title: string,
): Promise<{
  title: string;
  description?: string;
  extract?: string;
  type?: string;
  photoUrl?: string;
  pageUrl: string;
} | null> {
  try {
    const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const res = await fetch(sumUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const sum = (await res.json()) as {
      title?: string;
      description?: string;
      extract?: string;
      type?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    const photo =
      sum.originalimage?.source || sum.thumbnail?.source
        ? cleanWikiThumb(sum.originalimage?.source || sum.thumbnail!.source!)
        : undefined;
    return {
      title: sum.title || title,
      description: sum.description,
      extract: sum.extract,
      type: sum.type,
      photoUrl: photo,
      pageUrl:
        sum.content_urls?.desktop?.page ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    };
  } catch {
    return null;
  }
}

async function wikiFindPerson(
  lang: 'fr' | 'en',
  query: string,
): Promise<OnlinePersonProfile | null> {
  try {
    const searchUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', '5');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { search?: { title: string }[] };
    };

    for (const item of data.query?.search || []) {
      const summary = await wikiSummary(lang, item.title);
      if (!summary) continue;
      if (
        !looksLikePersonPage({
          title: summary.title,
          description: summary.description,
          extract: summary.extract,
          type: summary.type,
        })
      ) {
        continue;
      }
      // Prefer pages whose title overlaps the query name
      const qn = query.toLowerCase();
      const tn = summary.title.toLowerCase();
      const nameBits = qn
        .split(/[^\p{L}]+/u)
        .filter((w) => w.length >= 3)
        .slice(0, 4);
      const overlap = nameBits.filter((b) => tn.includes(b)).length;
      if (nameBits.length >= 2 && overlap < 1) continue;

      return {
        id: `wiki-${lang}-${slugify(summary.title)}`,
        name: summary.title,
        title: summary.description || undefined,
        organization:
          lang === 'fr'
            ? 'Cinéma / culture — Cameroun (Wikipédia)'
            : 'Cameroon cinema / culture (Wikipedia)',
        photoUrl: summary.photoUrl || null,
        sourceUrl: summary.pageUrl,
        sourceLabel: lang === 'fr' ? 'Wikipédia' : 'Wikipedia',
        extract: summary.extract,
        wikiLang: lang,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function ogImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const og =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );
    const src = og?.[1]?.trim();
    if (!src || !/^https?:\/\//i.test(src)) return null;
    return src;
  } catch {
    return null;
  }
}

async function enrichPhotoFromCatalogs(
  name: string,
  profile: OnlinePersonProfile,
): Promise<OnlinePersonProfile> {
  if (profile.photoUrl) return profile;
  const slug = slugify(name);
  const candidates = [
    `https://www.africine.org/personne/${slug}`,
    `https://www.cinaf.tv/fr/artistes/${slug}`,
  ];
  if (/kepombia|mitoumba/i.test(name)) {
    candidates.push('https://www.cinaf.tv/fr/artistes/ebenzer-kepombia-c29');
  }
  for (const url of candidates) {
    const img = await ogImageFromUrl(url);
    if (img) {
      return {
        ...profile,
        photoUrl: img,
        sourceUrl: profile.sourceUrl || url,
        sourceLabel: profile.sourceLabel || (url.includes('cinaf') ? 'CINAF' : 'Africiné'),
      };
    }
  }
  return profile;
}

export function looksLikePersonResearchQuery(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (
    /\b(qui\s+est|who\s+is|do\s+you\s+know|connais[- ]tu|parle[- ]moi\s+de|tell\s+me\s+about|c['’]est\s+qui)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // Capitalized multi-word proper name
  if (
    /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+){1,4})\b/u.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve the best online person profile (with photo when available).
 */
export async function fetchOnlinePersonProfile(
  userText: string,
): Promise<OnlinePersonProfile | null> {
  if (!looksLikePersonResearchQuery(userText)) return null;

  const terms = extractCinemaSearchTerms(userText);
  const primary = terms[0] || userText.trim();
  if (primary.length < 3) return null;

  // Prefer FR Wikipedia for Cameroon personalities, then EN
  const queries = [
    `${primary} Cameroun`,
    primary,
    `${primary} Cameroon`,
  ];

  let best: OnlinePersonProfile | null = null;
  for (const q of queries) {
    best = (await wikiFindPerson('fr', q)) || (await wikiFindPerson('en', q));
    if (best) break;
  }

  if (!best) {
    // Minimal stub so we can still try catalog photos
    best = {
      id: `web-${slugify(primary)}`,
      name: primary,
      title: undefined,
      organization: 'Industrie cinéma camerounaise',
      photoUrl: null,
      sourceUrl: null,
      sourceLabel: 'Web',
    };
  }

  best = await enrichPhotoFromCatalogs(primary, best);
  // Drop stub with neither photo nor useful title/extract
  if (!best.photoUrl && !best.title && !best.extract && best.sourceLabel === 'Web') {
    return null;
  }
  // Prefer profiles that at least have a photo or a solid bio line
  if (!best.photoUrl && !best.title && !(best.extract && best.extract.length > 40)) {
    return null;
  }
  return best;
}

export function onlineProfileToPersonUI(p: OnlinePersonProfile): PersonUI {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    organization: p.organization,
    photoUrl: p.photoUrl,
    sourceUrl: p.sourceUrl,
    sourceLabel: p.sourceLabel,
  };
}
