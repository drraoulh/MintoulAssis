/**
 * Upcoming cinema festivals from IciCiné festival news:
 * https://icicine.com/posts/category/festival
 */

import {
  extractDateHint,
  isOrganisedInCameroon,
  type CinemaEvent,
  type CinemaEventKind,
} from '@/lib/film/events';

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; cinema-events)';
const FESTIVAL_PAGE = 'https://icicine.com/posts/category/festival?page=1';

const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  décembre: 12,
};

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/<[^>\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slugId(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56);
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIso(now = new Date()): string {
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Parse "du 23 au 25 octobre 2026" / "du 23 au 25 octobre" (year optional). */
function parseFrenchRange(
  text: string,
  fallbackYear: number,
): { startDate: string; endDate: string; whenLabel: string } | null {
  const m = text.match(
    /(?:du\s+)?(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(20\d{2}))?/i,
  );
  if (!m) return null;
  const month = MONTHS[m[3].toLowerCase()];
  if (!month) return null;
  const year = m[4] ? Number(m[4]) : fallbackYear;
  const startDay = Number(m[1]);
  const endDay = Number(m[2]);
  const whenLabel = m[4]
    ? `${m[1]}–${m[2]} ${m[3]} ${year}`
    : `${m[1]}–${m[2]} ${m[3]} ${year}`;
  return {
    startDate: iso(year, month, startDay),
    endDate: iso(year, month, endDay),
    whenLabel,
  };
}

function inferCity(text: string): string {
  const t = text.toLowerCase();
  if (/yaound/.test(t)) return 'Yaoundé';
  if (/douala/.test(t)) return 'Douala';
  if (/n[’']?djamena|ndjamena|tchad/.test(t)) return "N'Djamena";
  if (/kara|togo/.test(t)) return 'Kara';
  if (/abidjan|côte d[’']ivoire|cote d[’']ivoire/.test(t)) return 'Abidjan';
  if (/cotonou|bénin|benin/.test(t)) return 'Cotonou';
  if (/cannes/.test(t)) return 'Cannes';
  if (/ouagadougou|burkina/.test(t)) return 'Ouagadougou';
  if (/maryland|montgomery|états-unis|etats-unis/.test(t)) return 'Maryland';
  return 'Afrique';
}

function inferKind(text: string): CinemaEventKind {
  const t = text.toLowerCase();
  if (/atelier|film lab|lab\b|workshop|masterclass/.test(t)) return 'workshop';
  if (/appel|call for/.test(t)) return 'call';
  if (/festival|écrans noirs|ecrans noirs|fescimonka|semaine du cin|recico|panafricain/.test(t)) {
    return 'festival';
  }
  return 'other';
}

function isPostponed(text: string): boolean {
  return /report[ée]e|reportée|reporté|postponed|annul[ée]e/.test(text.toLowerCase());
}

/** News about past awards / closing — skip unless a future date is found. */
function isPastNewsTitle(title: string): boolean {
  return /palmar[eè]s|récompensé|recompense|a reçu|a remporté|clôture/.test(
    title.toLowerCase(),
  );
}

function canonicalTitle(title: string, year: number): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (/écrans?\s*noirs/i.test(t)) return `Écrans Noirs ${year}`;
  if (/fescimonka/i.test(t)) return `FESCIMONKA ${year}`;
  if (/film\s*panafricain.*cannes|festival international du film panafricain/i.test(t)) {
    return `Festival International du Film Panafricain de Cannes ${year}`;
  }
  if (/ateliers?\s*de\s*touma[ïi]/i.test(t)) return `Ateliers de Toumaï ${year}`;
  if (/semaine du cin/i.test(t)) return `Semaine du Cinéma ${year}`;
  if (/recico/i.test(t)) return `RECICO ${year}`;
  // Drop "sélection dévoilée" fluff when possible
  return t
    .replace(/\s*:\s*la sélection officielle.*$/i, '')
    .replace(/\s+dévoile.*$/i, '')
    .trim();
}

type ParsedPost = {
  title: string;
  url: string;
  snippet: string;
};

function parseFestivalPosts(html: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(
    /href="(https:\/\/icicine\.com\/posts\/(?!category)([^"]+))"\s*>\s*([^<]{8,220})<\/a>/g,
  )) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    const title = decodeEntities(m[3]);
    const after = html.slice(m.index! + m[0].length, m.index! + m[0].length + 1800);
    const snippet = decodeEntities(after).slice(0, 520);
    posts.push({ title, url, snippet });
  }

  return posts;
}

function festivalFamilyKey(title: string): string {
  const t = title.toLowerCase();
  if (/semaine du cin/.test(t)) return 'semaine-cinema';
  if (/écrans?\s*noirs|ecrans?\s*noirs/.test(t)) return 'ecrans-noirs';
  if (/fescimonka/.test(t)) return 'fescimonka';
  if (/touma[ïi]/.test(t)) return 'toumai';
  if (/recico/.test(t)) return 'recico';
  if (/panafricain.*cannes|cannes.*panafricain/.test(t)) return 'fifp-cannes';
  return slugId(title).slice(0, 24);
}

export async function fetchIcicineFestivalEvents(now = new Date()): Promise<{
  events: CinemaEvent[];
  fetched: boolean;
}> {
  let html: string | null = null;
  try {
    const res = await fetch(FESTIVAL_PAGE, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(14_000),
      cache: 'no-store',
    });
    if (res.ok) html = await res.text();
  } catch {
    html = null;
  }

  if (!html) return { events: [], fetched: false };

  const posts = parseFestivalPosts(html);
  const postponedFamilies = new Set<string>();
  for (const p of posts) {
    if (isPostponed(`${p.title} ${p.snippet}`)) {
      postponedFamilies.add(festivalFamilyKey(p.title));
    }
  }

  const today = todayIso(now);
  const yearFallback = now.getFullYear();
  const byFamily = new Map<string, CinemaEvent>();

  // Enrich cards that look like festivals but lack a clear date range
  const enriched = await Promise.all(
    posts.map(async (post) => {
      const blob = `${post.title} ${post.snippet}`;
      if (isPostponed(blob) || isPastNewsTitle(post.title)) return post;
      if (parseFrenchRange(blob, yearFallback)) return post;
      if (postponedFamilies.has(festivalFamilyKey(post.title))) return post;
      const article = await fetchText(post.url);
      if (!article) return post;
      const body = decodeEntities(article);
      const rangeInBody = parseFrenchRange(body, yearFallback);
      if (!rangeInBody) return post;
      // Keep a short excerpt around the date so summaries stay readable
      const anchor = body.search(
        /(?:du\s+)?\d{1,2}\s+au\s+\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i,
      );
      const start = anchor >= 0 ? Math.max(0, anchor - 120) : 0;
      const excerpt = body.slice(start, start + 420);
      return {
        ...post,
        snippet: `${post.snippet} ${excerpt}`.replace(/\s+/g, ' ').trim().slice(0, 520),
      };
    }),
  );

  for (const post of enriched) {
    const blob = `${post.title} ${post.snippet}`;
    if (isPostponed(blob)) continue;

    const family = festivalFamilyKey(post.title);
    if (postponedFamilies.has(family)) continue;

    const range = parseFrenchRange(blob, yearFallback);
    const hint = extractDateHint(blob, now);
    const startDate = range?.startDate || hint.startDate;
    const endDate = range?.endDate || startDate;
    const whenLabel = range?.whenLabel || hint.whenLabel;

    if (!startDate && !endDate) continue;
    if (isPastNewsTitle(post.title) && (!endDate || endDate < today)) continue;

    // Keep only upcoming / still running (endDate or startDate >= today)
    const relevantEnd = endDate || startDate;
    if (!relevantEnd || relevantEnd < today) continue;

    const year = Number((startDate || today).slice(0, 4));
    const title = canonicalTitle(post.title, year);
    const kind = inferKind(blob);
    const city = inferCity(blob);
    const summary = post.snippet
      .replace(/<[^>]*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 360);

    const event: CinemaEvent = {
      id: `icicine-${family}-${startDate || 'tbd'}`,
      title,
      titleFr: title,
      summary,
      summaryFr: summary,
      kind,
      city,
      startDate,
      endDate: endDate || null,
      whenLabel,
      url: post.url,
      source: 'official',
      provider: 'icicine',
    };

    if (!isOrganisedInCameroon(event)) continue;

    const existing = byFamily.get(family);
    if (!existing) {
      byFamily.set(family, event);
      continue;
    }
    // Prefer the post that names the festival cleanly / has stronger dates
    const score = (e: CinemaEvent) =>
      (e.endDate ? 2 : 0) + (e.startDate ? 1 : 0) + (e.title.length < 60 ? 1 : 0);
    if (score(event) >= score(existing)) byFamily.set(family, event);
  }

  return {
    events: [...byFamily.values()].sort((a, b) =>
      (a.startDate || '').localeCompare(b.startDate || ''),
    ),
    fetched: true,
  };
}
