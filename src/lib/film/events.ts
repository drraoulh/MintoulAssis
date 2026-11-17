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
  /** Longer on-site body so users need not leave SmartMboa. */
  body?: string | null;
  bodyFr?: string | null;
  bodyEn?: string | null;
  kind: CinemaEventKind;
  city: string;
  venue?: string | null;
  /** Cover / poster image (absolute URL). */
  imageUrl?: string | null;
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
  /** Stable family key for dedupe (e.g. ecrans-noirs). */
  family?: string | null;
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
/** Brand covers kept on-site for key Cameroon festivals. */
export const FESTIVAL_BRAND_IMAGES: Record<string, string> = {
  'ecrans-noirs': '/film/events/ecrans-noirs.png',
  'mis-me-binga': '/film/events/mis-me-binga.png',
};

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
    body:
      'Qu’est-ce que c’est\nÉcrans Noirs est le grand festival panafricain de cinéma organisé à Yaoundé (Cameroun). Il réunit réalisateurs, producteurs, critiques et public autour du cinéma africain et de la diaspora.\n\nOù & quand\n• Ville : Yaoundé\n• Rythme : édition annuelle (dates précises selon l’année)\n• Site : ecransnoirs.org\n\nAu programme\n• Compétitions de longs et courts métrages\n• Projections publiques et avant-premières\n• Masterclasses et ateliers professionnels\n• Accréditations presse / industrie\n• Rencontres de networking Afrique centrale\n\nPour qui\nProfessionnels du cinéma, étudiants, et grand public intéressé par le cinéma africain.',
    bodyFr:
      'Qu’est-ce que c’est\nÉcrans Noirs est le grand festival panafricain de cinéma organisé à Yaoundé (Cameroun). Il réunit réalisateurs, producteurs, critiques et public autour du cinéma africain et de la diaspora.\n\nOù & quand\n• Ville : Yaoundé\n• Rythme : édition annuelle (dates précises selon l’année)\n• Site : ecransnoirs.org\n\nAu programme\n• Compétitions de longs et courts métrages\n• Projections publiques et avant-premières\n• Masterclasses et ateliers professionnels\n• Accréditations presse / industrie\n• Rencontres de networking Afrique centrale\n\nPour qui\nProfessionnels du cinéma, étudiants, et grand public intéressé par le cinéma africain.',
    bodyEn:
      'What it is\nÉcrans Noirs is the major Pan-African film festival held in Yaoundé (Cameroon). It brings together filmmakers, producers, critics and audiences around African cinema and the diaspora.\n\nWhere & when\n• City: Yaoundé\n• Cadence: annual edition (exact dates vary by year)\n• Website: ecransnoirs.org\n\nProgramme\n• Feature and short film competitions\n• Public screenings and premieres\n• Masterclasses and professional workshops\n• Press / industry accreditation\n• Central Africa networking meetings\n\nWho it’s for\nFilm professionals, students, and anyone interested in African cinema.',
    kind: 'festival',
    city: 'Yaoundé',
    venue: 'Yaoundé',
    whenLabel: 'Annuel / Annual',
    url: 'https://www.ecransnoirs.org',
    imageUrl: '/film/events/ecrans-noirs.png',
    source: 'curated',
    provider: 'curated',
    recurring: true,
    family: 'ecrans-noirs',
  },
  {
    id: 'curated-mis-me-binga',
    title: 'Mis Me Binga',
    titleFr: 'Mis Me Binga',
    titleEn: 'Mis Me Binga',
    summary: 'Festival international de films de femmes — Yaoundé.',
    summaryFr: 'Festival international de films de femmes — Yaoundé.',
    summaryEn: 'International women’s film festival — Yaoundé.',
    body:
      'Qu’est-ce que c’est\nMis Me Binga (« je suis une femme » en Duala) est un festival international de films de femmes basé à Yaoundé. Il met en avant les regards de réalisatrices et les récits portés par des femmes.\n\nOù & quand\n• Ville : Yaoundé (Cameroun)\n• Rythme : édition annuelle\n• Focus : cinéma réalisé par / sur les femmes\n\nAu programme\n• Sélection internationale de films\n• Projections et débats\n• Rencontres professionnelles\n• Ateliers et interventions de réalisatrices\n• Moments de networking pour le cinéma féminin\n\nPour qui\nRéalisatrices, producteurs, institutions culturelles, étudiants et public curieux du cinéma de femmes.',
    bodyFr:
      'Qu’est-ce que c’est\nMis Me Binga (« je suis une femme » en Duala) est un festival international de films de femmes basé à Yaoundé. Il met en avant les regards de réalisatrices et les récits portés par des femmes.\n\nOù & quand\n• Ville : Yaoundé (Cameroun)\n• Rythme : édition annuelle\n• Focus : cinéma réalisé par / sur les femmes\n\nAu programme\n• Sélection internationale de films\n• Projections et débats\n• Rencontres professionnelles\n• Ateliers et interventions de réalisatrices\n• Moments de networking pour le cinéma féminin\n\nPour qui\nRéalisatrices, producteurs, institutions culturelles, étudiants et public curieux du cinéma de femmes.',
    bodyEn:
      'What it is\nMis Me Binga (“I am a woman” in Duala) is an international women’s film festival based in Yaoundé. It highlights films by women directors and stories centred on women.\n\nWhere & when\n• City: Yaoundé (Cameroon)\n• Cadence: annual edition\n• Focus: cinema by / about women\n\nProgramme\n• International film selection\n• Screenings and debates\n• Industry meetings\n• Workshops and talks with women filmmakers\n• Networking for women’s cinema\n\nWho it’s for\nWomen directors, producers, cultural institutions, students, and audiences curious about women’s cinema.',
    kind: 'festival',
    city: 'Yaoundé',
    venue: 'Yaoundé',
    whenLabel: 'Annuel / Annual',
    imageUrl: '/film/events/mis-me-binga.png',
    source: 'curated',
    provider: 'curated',
    recurring: true,
    family: 'mis-me-binga',
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
    body:
      'Les Instituts français de Yaoundé et Douala proposent régulièrement des projections, débats et ateliers liés au cinéma. Le calendrier change selon la saison culturelle.',
    bodyFr:
      'Les Instituts français de Yaoundé et Douala proposent régulièrement des projections, débats et ateliers liés au cinéma. Le calendrier change selon la saison culturelle.',
    bodyEn:
      'The French Institutes in Yaoundé and Douala regularly host screenings, talks and cinema workshops. The calendar changes with the cultural season.',
    kind: 'screening',
    city: 'Yaoundé / Douala',
    venue: 'Institut français',
    whenLabel: 'Calendrier local / Local calendar',
    imageUrl: '/film/hub/halls.png',
    source: 'curated',
    provider: 'curated',
    recurring: true,
    family: 'institut-francais',
  },
];

/** Kept short — official + IciCiné are preferred; web search is a fallback. */
export const CINEMA_EVENT_QUERIES = [
  'festival cinéma Cameroun Yaoundé Douala 2026 OR 2025 dates',
  'Écrans Noirs Mis Me Binga dates édition Yaoundé',
] as const;

/** Normalize festival / series names for dedupe across sources. */
export function festivalFamilyKey(title: string): string {
  const t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/ecrans?\s*noirs/.test(t)) return 'ecrans-noirs';
  if (/mis\s*me\s*binga/.test(t)) return 'mis-me-binga';
  if (/fescimonka/.test(t)) return 'fescimonka';
  if (/toumai/.test(t)) return 'toumai';
  if (/recico/.test(t)) return 'recico';
  if (/semaine du cin/.test(t)) return 'semaine-cinema';
  if (/institut\s*francais|french\s*institute/.test(t)) return 'institut-francais';
  if (/panafricain.*cannes|cannes.*panafricain/.test(t)) return 'fifp-cannes';
  return t
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
}

export function localizeEvent(
  event: CinemaEvent,
  locale: 'fr' | 'en',
): { title: string; summary: string; body: string } {
  if (locale === 'fr') {
    return {
      title: event.titleFr || event.title,
      summary: event.summaryFr || event.summary,
      body: event.bodyFr || event.body || event.summaryFr || event.summary,
    };
  }
  return {
    title: event.titleEn || event.title,
    summary: event.summaryEn || event.summary,
    body: event.bodyEn || event.body || event.summaryEn || event.summary,
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
