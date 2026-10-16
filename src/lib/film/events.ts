/** Cinema events — curated seeds + live web enrichment. */

export type CinemaEventKind =
  | 'festival'
  | 'screening'
  | 'workshop'
  | 'market'
  | 'call'
  | 'other';

export type CinemaEventSource = 'curated' | 'web' | 'official';

export interface CinemaEvent {
  id: string;
  title: string;
  titleFr?: string;
  titleEn?: string;
  summary: string;
  summaryFr?: string;
  summaryEn?: string;
  kind: CinemaEventKind;
  city: string;
  /** ISO date when known (start). */
  startDate?: string | null;
  /** ISO date when known (end). */
  endDate?: string | null;
  /** Human date label when ISO is uncertain. */
  whenLabel?: string | null;
  url?: string | null;
  source: CinemaEventSource;
  provider?: 'tavily' | 'brave' | 'curated' | 'rss' | 'official' | 'icicine';
  /** Recurring annual festival / series. */
  recurring?: boolean;
}

export interface CinemaEventsResponse {
  events: CinemaEvent[];
  fetchedAt: string;
  live: boolean;
  provider: 'tavily' | 'brave' | 'none' | 'mixed' | 'official' | 'rss' | 'icicine';
  queryCount: number;
  message?: string;
}

/**
 * Known Cameroon / regional cinema landmarks — used when live search is
 * offline, and always merged so Écrans Noirs etc. stay visible.
 */
export const CURATED_CINEMA_EVENTS: CinemaEvent[] = [
  {
    id: 'curated-ecrans-noirs',
    title: 'Écrans Noirs',
    titleFr: 'Écrans Noirs',
    titleEn: 'Écrans Noirs',
    summary:
      'Festival panafricain de cinéma à Yaoundé — compétitions, masterclasses, networking Afrique centrale.',
    summaryFr:
      'Festival panafricain de cinéma à Yaoundé — compétitions, masterclasses, networking Afrique centrale.',
    summaryEn:
      'Pan-African film festival in Yaoundé — competitions, masterclasses, Central Africa networking.',
    kind: 'festival',
    city: 'Yaoundé',
    whenLabel: 'Annuel / Annual',
    url: 'https://www.ecransnoirs.org',
    source: 'curated',
    provider: 'curated',
    recurring: true,
  },
  {
    id: 'curated-mis-me-binga',
    title: 'Mis Me Binga',
    titleFr: 'Mis Me Binga',
    titleEn: 'Mis Me Binga',
    summary: 'Festival international de films de femmes — Yaoundé.',
    summaryFr: 'Festival international de films de femmes — Yaoundé.',
    summaryEn: 'International women’s film festival — Yaoundé.',
    kind: 'festival',
    city: 'Yaoundé',
    whenLabel: 'Annuel / Annual',
    source: 'curated',
    provider: 'curated',
    recurring: true,
  },
  {
    id: 'curated-if-cinema',
    title: 'Institut français — cinéma',
    titleFr: 'Institut français — cinéma',
    titleEn: 'French Institute — cinema',
    summary:
      'Projections et ateliers annoncés via les Instituts français de Yaoundé et Douala.',
    summaryFr:
      'Projections et ateliers annoncés via les Instituts français de Yaoundé et Douala.',
    summaryEn:
      'Screenings and workshops announced via French Institutes in Yaoundé and Douala.',
    kind: 'screening',
    city: 'Yaoundé / Douala',
    whenLabel: 'Calendrier local / Local calendar',
    source: 'curated',
    provider: 'curated',
    recurring: true,
  },
];

export const CINEMA_EVENT_QUERIES = [
  'Écrans Noirs festival cinéma Yaoundé dates édition',
  'Mis Me Binga festival films femmes Yaoundé',
  'festival cinéma Cameroun Yaoundé Douala 2025 OR 2026',
  'Institut français Cameroun cinéma projection festival',
  'Cameroon film festival upcoming dates',
] as const;

export function localizeEvent(
  event: CinemaEvent,
  locale: 'fr' | 'en',
): { title: string; summary: string } {
  if (locale === 'fr') {
    return {
      title: event.titleFr || event.title,
      summary: event.summaryFr || event.summary,
    };
  }
  return {
    title: event.titleEn || event.title,
    summary: event.summaryEn || event.summary,
  };
}

const CAMEROON_CITY_RE =
  /yaound|douala|limb[eé]|kribi|buea|bamenda|garoua|maroua|ngaound|bafoussam|ebolowa|bertoua|edea|kumba|dschang|foumban|ngaoundéré|ngaoundere|cameroun|cameroon/i;

const FOREIGN_VENUE_RE =
  /cannes|kara|n[’']?djamena|ndjamena|abidjan|cotonou|ouagadougou|maryland|paris|lyon|marseille|londres|london|berlin|toronto|namur|fameck|vancouver|t[eé]touan|dakar|lagos|accra|nairobi|johannesburg|tunis|rabat|casablanca|bruxelles|brussels|genève|geneva|amsterdam|new\s*york|los\s*angeles/i;

/**
 * Keep only events whose venue / city is in Cameroon.
 * Mentions of Cameroonian films abroad (e.g. selection at Cannes) are dropped.
 */
export function isOrganisedInCameroon(event: CinemaEvent): boolean {
  const city = (event.city || '').trim();
  if (city && FOREIGN_VENUE_RE.test(city) && !CAMEROON_CITY_RE.test(city)) {
    return false;
  }
  if (city && CAMEROON_CITY_RE.test(city)) return true;

  const blob = `${event.title} ${event.summary} ${event.whenLabel || ''}`.toLowerCase();
  // Clear foreign hosting phrases
  if (
    FOREIGN_VENUE_RE.test(blob) &&
    !/yaound|douala|au\s+cameroun|en\s+cameroun|in\s+cameroon|à\s+yaound|à\s+douala/.test(blob)
  ) {
    return false;
  }
  return CAMEROON_CITY_RE.test(blob);
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  janvier: 0,
  feb: 1,
  february: 1,
  fevrier: 1,
  février: 1,
  mar: 2,
  march: 2,
  mars: 2,
  apr: 3,
  april: 3,
  avril: 3,
  may: 4,
  mai: 4,
  jun: 5,
  june: 5,
  juin: 5,
  jul: 6,
  july: 6,
  juillet: 6,
  aug: 7,
  august: 7,
  aout: 7,
  août: 7,
  sep: 8,
  sept: 8,
  september: 8,
  septembre: 8,
  oct: 9,
  october: 9,
  octobre: 9,
  nov: 10,
  november: 10,
  novembre: 10,
  dec: 11,
  december: 11,
  decembre: 11,
  décembre: 11,
};

/** Extract a plausible start date from title/snippet text. */
export function extractDateHint(
  text: string,
  now = new Date(),
): { startDate: string | null; whenLabel: string | null } {
  const raw = text.replace(/\s+/g, ' ');

  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return { startDate: `${iso[1]}-${iso[2]}-${iso[3]}`, whenLabel: null };
  }
  const slash = raw.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
  if (slash) {
    const d = slash[1].padStart(2, '0');
    const m = slash[2].padStart(2, '0');
    return { startDate: `${slash[3]}-${m}-${d}`, whenLabel: null };
  }

  const frRange = raw.match(
    /\b(\d{1,2})\s*[–\-àa]+\s*(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(20\d{2})\b/i,
  );
  if (frRange) {
    const month = MONTHS[frRange[3].toLowerCase()];
    if (month !== undefined) {
      const y = frRange[4];
      const d = frRange[1].padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      return {
        startDate: `${y}-${m}-${d}`,
        whenLabel: `${frRange[1]}–${frRange[2]} ${frRange[3]} ${y}`,
      };
    }
  }

  const monthYear = raw.match(/\b([A-Za-zÀ-ÿ]+)\s+(20\d{2})\b/i);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month !== undefined) {
      const y = monthYear[2];
      const m = String(month + 1).padStart(2, '0');
      return {
        startDate: `${y}-${m}-01`,
        whenLabel: `${monthYear[1]} ${y}`,
      };
    }
  }

  const yearOnly = raw.match(/\b(20\d{2})\b/);
  if (yearOnly) {
    const y = Number(yearOnly[1]);
    if (y >= now.getFullYear() - 1 && y <= now.getFullYear() + 2) {
      return { startDate: `${y}-01-01`, whenLabel: String(y) };
    }
  }

  return { startDate: null, whenLabel: null };
}
