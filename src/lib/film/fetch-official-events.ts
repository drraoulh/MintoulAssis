import {
  CURATED_CINEMA_EVENTS,
  extractDateHint,
  festivalFamilyKey,
  FESTIVAL_BRAND_IMAGES,
  isOrganisedInCameroon,
  type CinemaEvent,
  type CinemaEventKind,
} from '@/lib/film/events';
import {
  extractArticleBody,
  extractMetaDescription,
  extractOgImage,
  extractRssEnclosureImage,
  stripHtml,
} from '@/lib/film/html-meta';

const ECRANS_DETAIL = CURATED_CINEMA_EVENTS.find((e) => e.family === 'ecrans-noirs');

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; cinema-events)';

type OfficialSource = {
  id: string;
  name: string;
  homeUrl: string;
  feedUrl?: string;
  city: string;
};

const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: 'ecrans-noirs',
    name: 'Écrans Noirs',
    homeUrl: 'https://www.ecransnoirs.org/',
    feedUrl: 'https://www.ecransnoirs.org/feed/',
    city: 'Yaoundé',
  },
];

function slugId(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56);
}

function inferKind(text: string): CinemaEventKind {
  const t = text.toLowerCase();
  if (/appel|call for|accréditation|accreditation|concours|colloque/.test(t)) {
    return 'call';
  }
  if (/atelier|workshop|masterclass|formation|iscac|rentrée/.test(t)) return 'workshop';
  if (/sélection|selection|projection|screening/.test(t)) return 'screening';
  if (/festival|écrans noirs|ecrans noirs/.test(t)) return 'festival';
  return 'other';
}

async function fetchText(url: string, timeoutMs = 8_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseRssItems(
  xml: string,
  source: OfficialSource,
  fallbackImage?: string | null,
): CinemaEvent[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8);
  const out: CinemaEvent[] = [];
  for (const m of items) {
    const block = m[1];
    const title = stripHtml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = stripHtml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || source.homeUrl);
    const rawDesc =
      block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1] ||
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ||
      title;
    const desc = stripHtml(rawDesc);
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    if (!title) continue;

    const fromText = extractDateHint(`${title} ${desc}`);
    let startDate = fromText.startDate;
    let whenLabel = fromText.whenLabel;
    if (!startDate && pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) {
        startDate = d.toISOString().slice(0, 10);
      }
    }

    const blob = `${title} ${desc}`;
    // Drop site noise (QA posts, generic tech, unrelated news).
    if (
      !/cin[eé]ma|film|festival|écrans?\s*noirs|ecrans?\s*noirs|projection|atelier|masterclass|accréditation|sélection|colloque|iscac/i.test(
        blob,
      )
    ) {
      continue;
    }
    if (/software|reliability|magicqa|wordpress|plugin|seo\b/i.test(blob)) {
      continue;
    }

    const imageUrl = extractRssEnclosureImage(block) || fallbackImage || null;
    const body = desc.slice(0, 1100);
    const event: CinemaEvent = {
      id: `rss-${source.id}-${slugId(title)}`,
      title,
      summary: desc.slice(0, 420),
      body,
      kind: inferKind(blob),
      city: source.city,
      venue: source.name,
      imageUrl,
      startDate,
      whenLabel,
      url: link,
      source: 'official',
      provider: 'rss',
      family: festivalFamilyKey(`${source.name} ${title}`),
    };
    if (!isOrganisedInCameroon(event)) continue;
    out.push(event);
  }
  return out;
}

/** Pull edition dates from Écrans Noirs homepage / activities pages. */
function parseEcransNoirsEdition(
  html: string,
  imageUrl?: string | null,
): CinemaEvent | null {
  const text = stripHtml(html);
  const meta = extractMetaDescription(html);
  const article = extractArticleBody(html, 1400);
  const range = text.match(
    /(?:du\s+)?(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(20\d{2})/i,
  );
  const months: Record<string, number> = {
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

  const editionNoteFr = article || meta || '';
  const bodyFrBase = ECRANS_DETAIL?.bodyFr || ECRANS_DETAIL?.body || '';
  const bodyEnBase = ECRANS_DETAIL?.bodyEn || ECRANS_DETAIL?.body || '';

  if (range) {
    const month = months[range[3].toLowerCase()];
    const year = range[4];
    const startDay = range[1].padStart(2, '0');
    const endDay = range[2].padStart(2, '0');
    const m = String(month).padStart(2, '0');
    const summary = `30ème édition du Festival du Cinéma Africain — Yaoundé, du ${range[1]} au ${range[2]} ${range[3]} ${year}.`;
    const datesFr = `Édition ${year}\nDates confirmées : du ${range[1]} au ${range[2]} ${range[3]} ${year} — Yaoundé.\n`;
    const datesEn = `Edition ${year}\nConfirmed dates: ${range[1]}–${range[2]} ${range[3]} ${year} — Yaoundé.\n`;
    const liveFr = editionNoteFr
      ? `\nInfos édition\n${editionNoteFr.slice(0, 500)}`
      : '';
    return {
      id: 'official-ecrans-noirs-edition',
      title: `Écrans Noirs ${year}`,
      titleFr: `Écrans Noirs ${year}`,
      titleEn: `Écrans Noirs ${year}`,
      summary,
      summaryFr: summary,
      summaryEn: `30th edition of the African Film Festival — Yaoundé, ${range[1]}–${range[2]} ${range[3]} ${year}.`,
      body: `${datesFr}\n${bodyFrBase}${liveFr}`,
      bodyFr: `${datesFr}\n${bodyFrBase}${liveFr}`,
      bodyEn: `${datesEn}\n${bodyEnBase}`,
      kind: 'festival',
      city: 'Yaoundé',
      venue: 'Yaoundé',
      imageUrl: imageUrl || FESTIVAL_BRAND_IMAGES['ecrans-noirs'] || null,
      startDate: `${year}-${m}-${startDay}`,
      endDate: `${year}-${m}-${endDay}`,
      whenLabel: `${range[1]}–${range[2]} ${range[3]} ${year}`,
      url: 'https://www.ecransnoirs.org/activites-2/',
      source: 'official',
      provider: 'official',
      recurring: true,
      family: 'ecrans-noirs',
    };
  }

  if (/ECRANS NOIRS 20\d{2}|Écrans Noirs 20\d{2}/i.test(text)) {
    const year = text.match(/ECRANS NOIRS (20\d{2})|Écrans Noirs (20\d{2})/i);
    const y = year?.[1] || year?.[2] || String(new Date().getFullYear());
    const liveFr = editionNoteFr
      ? `\nInfos édition\n${editionNoteFr.slice(0, 500)}`
      : '';
    return {
      id: 'official-ecrans-noirs-edition',
      title: `Écrans Noirs ${y}`,
      titleFr: `Écrans Noirs ${y}`,
      titleEn: `Écrans Noirs ${y}`,
      summary:
        'Édition en cours sur le site officiel — sélection, accréditations et activités.',
      summaryFr:
        'Édition en cours sur le site officiel — sélection, accréditations et activités.',
      summaryEn:
        'Current edition on the official site — selection, accreditation, and activities.',
      body: `${bodyFrBase}${liveFr}`,
      bodyFr: `${bodyFrBase}${liveFr}`,
      bodyEn: bodyEnBase,
      kind: 'festival',
      city: 'Yaoundé',
      venue: 'Yaoundé',
      imageUrl: imageUrl || FESTIVAL_BRAND_IMAGES['ecrans-noirs'] || null,
      whenLabel: y,
      startDate: `${y}-01-01`,
      url: 'https://www.ecransnoirs.org/',
      source: 'official',
      provider: 'official',
      recurring: true,
      family: 'ecrans-noirs',
    };
  }

  return null;
}

export async function fetchOfficialCinemaEvents(): Promise<{
  events: CinemaEvent[];
  provider: 'official' | 'rss' | 'none' | 'mixed';
}> {
  const events: CinemaEvent[] = [];
  const providers = new Set<'official' | 'rss'>();

  await Promise.all(
    OFFICIAL_SOURCES.map(async (source) => {
      const [home, activities, feed] = await Promise.all([
        fetchText(source.homeUrl),
        source.id === 'ecrans-noirs'
          ? fetchText('https://www.ecransnoirs.org/activites-2/')
          : Promise.resolve(null),
        source.feedUrl ? fetchText(source.feedUrl) : Promise.resolve(null),
      ]);

      const cover =
        FESTIVAL_BRAND_IMAGES[source.id] ||
        (activities && extractOgImage(activities, source.homeUrl)) ||
        (home && extractOgImage(home, source.homeUrl)) ||
        null;

      if (source.id === 'ecrans-noirs') {
        const edition = parseEcransNoirsEdition(
          `${activities || ''}\n${home || ''}`,
          cover,
        );
        if (edition) {
          events.push(edition);
          providers.add('official');
        }
      }

      if (feed) {
        const rssEvents = parseRssItems(feed, source, cover);
        if (rssEvents.length) {
          events.push(...rssEvents);
          providers.add('rss');
        }
      }
    }),
  );

  const provider =
    providers.size === 0
      ? 'none'
      : providers.size > 1
        ? 'mixed'
        : [...providers][0];

  return { events, provider };
}
