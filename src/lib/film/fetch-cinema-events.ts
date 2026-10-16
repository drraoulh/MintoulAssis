import {
  CINEMA_EVENT_QUERIES,
  CURATED_CINEMA_EVENTS,
  extractDateHint,
  type CinemaEvent,
  type CinemaEventKind,
  type CinemaEventsResponse,
} from '@/lib/film/events';
import { fetchIcicineFestivalEvents } from '@/lib/film/fetch-icicine-events';
import { fetchOfficialCinemaEvents } from '@/lib/film/fetch-official-events';
import { searchWeb, webSearchEnvEnabled, type WebSearchHit } from '@/lib/web-search';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: { at: number; payload: CinemaEventsResponse } | null = null;

function slugId(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function inferKind(text: string): CinemaEventKind {
  const t = text.toLowerCase();
  if (/atelier|workshop|masterclass|formation/.test(t)) return 'workshop';
  if (/appel|call for|résidence|residence|bourse|fund|accréditation|colloque|concours/.test(t)) {
    return 'call';
  }
  if (/marché|market|coproduction/.test(t)) return 'market';
  if (/projection|screening|soirée|seance|séance|sélection/.test(t)) return 'screening';
  if (/festival|écrans noirs|ecrans noirs|mis me binga/.test(t)) return 'festival';
  return 'other';
}

function inferCity(text: string): string {
  const t = text.toLowerCase();
  if (/yaound[eé]/.test(t)) return 'Yaoundé';
  if (/douala/.test(t)) return 'Douala';
  if (/limbe|limb[eé]/.test(t)) return 'Limbé';
  if (/kribi/.test(t)) return 'Kribi';
  if (/buea/.test(t)) return 'Buea';
  if (/cameroun|cameroon/.test(t)) return 'Cameroun';
  return 'Cameroun';
}

function isLikelyCinema(text: string): boolean {
  return /cin[eé]ma|film|festival|écrans?\s*noirs|ecrans?\s*noirs|projection|audiovisuel|mis\s*me\s*binga|masterclass|atelier|accréditation|colloque/i.test(
    text,
  );
}

function isLikelyCameroonOrRegional(text: string): boolean {
  return /cameroun|cameroon|yaound|douala|afrique\s*centrale|central\s*africa|panafricain|pan[- ]?african|écrans?\s*noirs|ecrans?\s*noirs/i.test(
    text,
  );
}

export function hitToEvent(hit: WebSearchHit, index: number): CinemaEvent | null {
  const blob = `${hit.title} ${hit.snippet}`;
  if (!isLikelyCinema(blob)) return null;
  if (!isLikelyCameroonOrRegional(blob)) return null;

  const { startDate, whenLabel } = extractDateHint(blob);
  return {
    id: `web-${slugId(hit.title) || index}`,
    title: hit.title,
    summary: hit.snippet || hit.title,
    kind: inferKind(blob),
    city: inferCity(blob),
    startDate,
    whenLabel,
    url: hit.url,
    source: 'web',
    provider: hit.provider,
  };
}

function dedupeKey(e: CinemaEvent): string {
  const host = e.url
    ? (() => {
        try {
          return new URL(e.url).hostname.replace(/^www\./, '');
        } catch {
          return e.url;
        }
      })()
    : '';
  return `${slugId(e.title)}|${host}|${e.startDate || e.whenLabel || ''}`;
}

function sortEvents(events: CinemaEvent[]): CinemaEvent[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const aTime = a.startDate ? Date.parse(a.startDate) : Number.POSITIVE_INFINITY;
    const bTime = b.startDate ? Date.parse(b.startDate) : Number.POSITIVE_INFINITY;
    const aPast = Number.isFinite(aTime) && aTime < now - 7 * 86400000;
    const bPast = Number.isFinite(bTime) && bTime < now - 7 * 86400000;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aTime !== bTime) return aTime - bTime;
    const rank = (s: CinemaEvent['source']) =>
      s === 'official' ? 0 : s === 'web' ? 1 : 2;
    if (rank(a.source) !== rank(b.source)) return rank(a.source) - rank(b.source);
    return a.title.localeCompare(b.title, 'fr');
  });
}

function mergeEvents(parts: CinemaEvent[][]): CinemaEvent[] {
  const map = new Map<string, CinemaEvent>();
  for (const list of parts) {
    for (const e of list) {
      const key = dedupeKey(e);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, e);
        continue;
      }
      // Prefer official > web > curated; keep best date/url
      const rank = (s: CinemaEvent['source']) =>
        s === 'official' ? 0 : s === 'web' ? 1 : 2;
      const winner = rank(e.source) <= rank(existing.source) ? e : existing;
      const other = winner === e ? existing : e;
      map.set(key, {
        ...other,
        ...winner,
        startDate: winner.startDate || other.startDate,
        endDate: winner.endDate || other.endDate,
        whenLabel: winner.whenLabel || other.whenLabel,
        url: winner.url || other.url,
        summary:
          (winner.summary?.length || 0) >= (other.summary?.length || 0)
            ? winner.summary
            : other.summary,
      });
    }
  }

  // Drop generic curated Écrans Noirs if we have a dated official / IciCiné edition
  const datedEcrans = [...map.values()].filter(
    (e) =>
      e.id !== 'curated-ecrans-noirs' &&
      /écrans?\s*noirs/i.test(e.title) &&
      Boolean(e.startDate),
  );
  if (datedEcrans.length) {
    for (const [k, e] of map) {
      if (e.id === 'curated-ecrans-noirs') map.delete(k);
    }
    // Keep a single dated Écrans Noirs (prefer official site over IciCiné news)
    if (datedEcrans.length > 1) {
      const prefer =
        datedEcrans.find((e) => e.provider === 'official') ||
        datedEcrans.find((e) => e.id.startsWith('official-')) ||
        datedEcrans[0];
      for (const [k, e] of map) {
        if (/écrans?\s*noirs/i.test(e.title) && e.id !== prefer.id && e.startDate) {
          map.delete(k);
        }
      }
    }
  }

  return sortEvents([...map.values()]);
}

async function fetchSearchEvents(): Promise<{
  events: CinemaEvent[];
  provider: CinemaEventsResponse['provider'];
  queryCount: number;
}> {
  if (!webSearchEnvEnabled()) {
    return { events: [], provider: 'none', queryCount: 0 };
  }

  const results = await Promise.all(
    CINEMA_EVENT_QUERIES.map((query) => searchWeb({ query, maxResults: 5 })),
  );

  const providers = new Set(
    results.map((r) => r.provider).filter((p): p is 'tavily' | 'brave' => p !== 'none'),
  );
  const hits: WebSearchHit[] = [];
  const seenUrl = new Set<string>();
  for (const r of results) {
    for (const h of r.hits) {
      if (seenUrl.has(h.url)) continue;
      seenUrl.add(h.url);
      hits.push(h);
    }
  }

  const events = hits
    .map((h, i) => hitToEvent(h, i))
    .filter((e): e is CinemaEvent => Boolean(e));

  const provider: CinemaEventsResponse['provider'] =
    providers.size === 0
      ? 'none'
      : providers.size > 1
        ? 'mixed'
        : [...providers][0];

  return { events, provider, queryCount: CINEMA_EVENT_QUERIES.length };
}

export async function getCinemaEvents(opts?: {
  force?: boolean;
}): Promise<CinemaEventsResponse> {
  if (!opts?.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }

  try {
    const [official, icicine, search] = await Promise.all([
      fetchOfficialCinemaEvents(),
      fetchIcicineFestivalEvents(),
      fetchSearchEvents(),
    ]);

    const events = mergeEvents([
      official.events,
      icicine.events,
      search.events,
      CURATED_CINEMA_EVENTS,
    ]);

    const live =
      official.events.length > 0 ||
      icicine.events.length > 0 ||
      search.events.length > 0;
    const providers = [
      official.provider,
      icicine.fetched && icicine.events.length ? ('icicine' as const) : ('none' as const),
      search.provider,
    ].filter((p) => p !== 'none');
    const provider: CinemaEventsResponse['provider'] =
      providers.length === 0
        ? 'none'
        : providers.length > 1
          ? 'mixed'
          : (providers[0] as CinemaEventsResponse['provider']);

    const payload: CinemaEventsResponse = {
      events,
      fetchedAt: new Date().toISOString(),
      live,
      provider,
      queryCount:
        search.queryCount +
        (official.events.length ? 1 : 0) +
        (icicine.fetched ? 1 : 0),
      message: live
        ? undefined
        : 'Live sources unavailable — showing curated festivals.',
    };
    cache = { at: Date.now(), payload };
    return payload;
  } catch (err) {
    const payload: CinemaEventsResponse = {
      events: sortEvents(CURATED_CINEMA_EVENTS),
      fetchedAt: new Date().toISOString(),
      live: false,
      provider: 'none',
      queryCount: 0,
      message:
        err instanceof Error
          ? `Live fetch failed (${err.message}). Showing curated festivals.`
          : 'Live fetch failed — showing curated festivals.',
    };
    cache = { at: Date.now(), payload };
    return payload;
  }
}
