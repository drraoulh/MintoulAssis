import {
  extractDateHint,
  type CinemaEvent,
  type CinemaEventKind,
} from '@/lib/film/events';

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

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseRssItems(xml: string, source: OfficialSource): CinemaEvent[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12);
  const out: CinemaEvent[] = [];
  for (const m of items) {
    const block = m[1];
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = decodeEntities(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || source.homeUrl);
    const desc = decodeEntities(
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || title,
    );
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

    out.push({
      id: `rss-${source.id}-${slugId(title)}`,
      title,
      summary: desc.slice(0, 420),
      kind: inferKind(`${title} ${desc}`),
      city: source.city,
      startDate,
      whenLabel,
      url: link,
      source: 'official',
      provider: 'rss',
    });
  }
  return out;
}

/** Pull edition dates from Écrans Noirs homepage / activities pages. */
function parseEcransNoirsEdition(html: string): CinemaEvent | null {
  const text = decodeEntities(html);
  // "21 au 28 novembre 2026"
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

  if (range) {
    const month = months[range[3].toLowerCase()];
    const year = range[4];
    const startDay = range[1].padStart(2, '0');
    const endDay = range[2].padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return {
      id: 'official-ecrans-noirs-edition',
      title: `Écrans Noirs ${year}`,
      titleFr: `Écrans Noirs ${year}`,
      titleEn: `Écrans Noirs ${year}`,
      summary: `30ème édition du Festival du Cinéma Africain — Yaoundé, du ${range[1]} au ${range[2]} ${range[3]} ${year}.`,
      summaryFr: `30ème édition du Festival du Cinéma Africain — Yaoundé, du ${range[1]} au ${range[2]} ${range[3]} ${year}.`,
      summaryEn: `30th edition of the African Film Festival — Yaoundé, ${range[1]}–${range[2]} ${range[3]} ${year}.`,
      kind: 'festival',
      city: 'Yaoundé',
      startDate: `${year}-${m}-${startDay}`,
      endDate: `${year}-${m}-${endDay}`,
      whenLabel: `${range[1]}–${range[2]} ${range[3]} ${year}`,
      url: 'https://www.ecransnoirs.org/activites-2/',
      source: 'official',
      provider: 'official',
      recurring: true,
    };
  }

  if (/ECRANS NOIRS 20\d{2}|Écrans Noirs 20\d{2}/i.test(text)) {
    const year = text.match(/ECRANS NOIRS (20\d{2})|Écrans Noirs (20\d{2})/i);
    const y = year?.[1] || year?.[2] || String(new Date().getFullYear());
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
      kind: 'festival',
      city: 'Yaoundé',
      whenLabel: y,
      startDate: `${y}-01-01`,
      url: 'https://www.ecransnoirs.org/',
      source: 'official',
      provider: 'official',
      recurring: true,
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

      if (source.id === 'ecrans-noirs') {
        const edition = parseEcransNoirsEdition(
          `${activities || ''}\n${home || ''}`,
        );
        if (edition) {
          events.push(edition);
          providers.add('official');
        }
      }

      if (feed) {
        const rssEvents = parseRssItems(feed, source);
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
