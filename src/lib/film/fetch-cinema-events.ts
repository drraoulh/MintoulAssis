import {
  CINEMA_EVENT_QUERIES,
  CURATED_CINEMA_EVENTS,
  FESTIVAL_BRAND_IMAGES,
  extractDateHint,
  festivalFamilyKey,
  isOrganisedInCameroon,
  type CinemaEvent,
  type CinemaEventKind,
  type CinemaEventsResponse,
} from '@/lib/film/events';
import { fetchIcicineFestivalEvents } from '@/lib/film/fetch-icicine-events';
import { fetchOfficialCinemaEvents } from '@/lib/film/fetch-official-events';
import { searchWeb, webSearchEnvEnabled, type WebSearchHit } from '@/lib/web-search';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours fresh
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // serve stale up to 24h while refreshing
let cache: { at: number; payload: CinemaEventsResponse } | null = null;
let refreshing: Promise<CinemaEventsResponse> | null = null;

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

function isLikelyCameroonHosted(text: string): boolean {
  return /yaound|douala|limb[eé]|kribi|buea|bamenda|au\s+cameroun|en\s+cameroun|in\s+cameroon|cameroun\s*—|cameroon\s*—|écrans?\s*noirs|ecrans?\s*noirs|mis\s*me\s*binga|institut\s*fran[cç]ais\s*(du\s*)?cameroun/i.test(
    text,
  );
}

export function hitToEvent(hit: WebSearchHit, index: number): CinemaEvent | null {
  const blob = `${hit.title} ${hit.snippet}`;
  if (!isLikelyCinema(blob)) return null;
  if (!isLikelyCameroonHosted(blob)) return null;

  const { startDate, whenLabel } = extractDateHint(blob);
  const family = festivalFamilyKey(hit.title);
  const event: CinemaEvent = {
    id: `web-${slugId(hit.title) || index}`,
    title: hit.title,
    summary: hit.snippet || hit.title,
    body: hit.snippet || hit.title,
    kind: inferKind(blob),
    city: inferCity(blob),
    startDate,
    whenLabel,
    url: hit.url,
    source: 'web',
    provider: hit.provider,
    family,
  };
  if (!isOrganisedInCameroon(event)) return null;
  return event;
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

function scoreEvent(e: CinemaEvent): number {
  return (
    (e.imageUrl ? 4 : 0) +
    (e.body && e.body.length > 120 ? 3 : 0) +
    (e.startDate ? 2 : 0) +
    (e.endDate ? 1 : 0) +
    (e.venue ? 1 : 0) +
    (e.source === 'official' ? 3 : e.source === 'web' ? 1 : 0) +
    (e.provider === 'official' ? 2 : e.provider === 'icicine' ? 1 : 0) +
    Math.min(2, Math.floor((e.summary?.length || 0) / 160))
  );
}

function mergeEvents(parts: CinemaEvent[][]): CinemaEvent[] {
  const map = new Map<string, CinemaEvent>();

  for (const list of parts) {
    for (const e of list) {
      const family = e.family || festivalFamilyKey(e.title);
      const year = (e.startDate || e.whenLabel || '').toString().slice(0, 4);
      const key =
        family && !family.includes(' ')
          ? `${family}|${/^\d{4}$/.test(year) ? year : 'open'}`
          : `${slugId(e.title)}|${e.startDate || e.whenLabel || ''}`;

      const incoming = { ...e, family };
      const existing = map.get(key);
      if (!existing) {
        map.set(key, incoming);
        continue;
      }
      const winner = scoreEvent(incoming) >= scoreEvent(existing) ? incoming : existing;
      const other = winner === incoming ? existing : incoming;
      map.set(key, {
        ...other,
        ...winner,
        family,
        startDate: winner.startDate || other.startDate,
        endDate: winner.endDate || other.endDate,
        whenLabel: winner.whenLabel || other.whenLabel,
        url: winner.url || other.url,
        imageUrl: winner.imageUrl || other.imageUrl,
        venue: winner.venue || other.venue,
        body: (winner.body?.length || 0) >= (other.body?.length || 0) ? winner.body : other.body,
        bodyFr: winner.bodyFr || other.bodyFr,
        bodyEn: winner.bodyEn || other.bodyEn,
        summary:
          (winner.summary?.length || 0) >= (other.summary?.length || 0)
            ? winner.summary
            : other.summary,
        summaryFr: winner.summaryFr || other.summaryFr,
        summaryEn: winner.summaryEn || other.summaryEn,
      });
    }
  }

  // Drop generic curated seeds when a richer dated edition exists for same family
  for (const [k, e] of [...map.entries()]) {
    if (!e.id.startsWith('curated-') || !e.family) continue;
    const richer = [...map.values()].some(
      (o) =>
        o.id !== e.id &&
        o.family === e.family &&
        (Boolean(o.startDate) || (o.body?.length || 0) > 80 || Boolean(o.imageUrl)),
    );
    if (richer) map.delete(k);
  }

  // Pin on-site brand covers + keep the richest curated detail text for key festivals.
  const curatedByFamily = new Map(
    CURATED_CINEMA_EVENTS.filter((c) => c.family).map((c) => [c.family!, c]),
  );
  for (const [k, e] of map.entries()) {
    const family = e.family || '';
    const brand = FESTIVAL_BRAND_IMAGES[family];
    const seed = curatedByFamily.get(family);
    if (!brand && !seed) continue;
    map.set(k, {
      ...e,
      imageUrl: brand || e.imageUrl,
      body:
        (e.body?.length || 0) >= (seed?.body?.length || 0) ? e.body : seed?.body,
      bodyFr:
        (e.bodyFr?.length || 0) >= (seed?.bodyFr?.length || 0)
          ? e.bodyFr
          : seed?.bodyFr,
      bodyEn:
        (e.bodyEn?.length || 0) >= (seed?.bodyEn?.length || 0)
          ? e.bodyEn
          : seed?.bodyEn,
      summaryFr: e.summaryFr || seed?.summaryFr,
      summaryEn: e.summaryEn || seed?.summaryEn,
      venue: e.venue || seed?.venue || null,
      url: e.url || seed?.url || null,
    });
  }

  return sortEvents([...map.values()].filter(isOrganisedInCameroon));
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
    CINEMA_EVENT_QUERIES.map((query) => searchWeb({ query, maxResults: 4 })),
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

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function loadFresh(opts?: { forceSearch?: boolean }): Promise<CinemaEventsResponse> {
  try {
    // Cap primary scrape so a slow upstream never blocks the page.
    const [official, icicine] = await Promise.all([
      withTimeout(fetchOfficialCinemaEvents(), 9_000, {
        events: [] as CinemaEvent[],
        provider: 'none' as const,
      }),
      withTimeout(fetchIcicineFestivalEvents(), 9_000, {
        events: [] as CinemaEvent[],
        fetched: false,
      }),
    ]);

    const primaryCount = official.events.length + icicine.events.length;
    // Web search only on explicit refresh, or when both primary sources are empty.
    const needSearch = Boolean(opts?.forceSearch) || primaryCount === 0;
    const search = needSearch
      ? await withTimeout(fetchSearchEvents(), 8_000, {
          events: [] as CinemaEvent[],
          provider: 'none' as const,
          queryCount: 0,
        })
      : { events: [] as CinemaEvent[], provider: 'none' as const, queryCount: 0 };

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

    return {
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
  } catch (err) {
    return {
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
  }
}

function kickRefresh(forceSearch = false) {
  if (refreshing) return;
  refreshing = loadFresh({ forceSearch })
    .then((payload) => {
      cache = { at: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      refreshing = null;
    });
}

export async function getCinemaEvents(opts?: {
  force?: boolean;
}): Promise<CinemaEventsResponse> {
  const now = Date.now();

  if (opts?.force) {
    const payload = await loadFresh({ forceSearch: true });
    cache = { at: now, payload };
    return payload;
  }

  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }

  // Stale-while-revalidate: answer instantly from cache, refresh in background.
  if (cache && now - cache.at < STALE_TTL_MS) {
    kickRefresh(false);
    return cache.payload;
  }

  if (refreshing) return refreshing;

  refreshing = loadFresh({ forceSearch: false }).then((payload) => {
    cache = { at: Date.now(), payload };
    return payload;
  });
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}
