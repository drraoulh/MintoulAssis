/**
 * Scrapes Ayila'a hotels, restaurants and tourist sites (images + contact + coords)
 * into src/lib/film/data/ayilaa-places.json for film location scouting.
 *
 * Usage: node scripts/build-film-ayilaa-data.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = 'https://ayilaa.com';
const OUT = resolve(process.cwd(), 'src/lib/film/data/ayilaa-places.json');
const CACHE_DIR = resolve(process.cwd(), 'data/ayilaa-film');
const CONCURRENCY = 2;
const REQUEST_GAP_MS = 200;

/** Film-useful Ayila'a categories (paths verified on ayilaa.com). */
const CATEGORIES = [
  {
    kind: 'site',
    forceLook: 'mountain',
    path: '/fr/categorie/54/mont',
    schema: 'TouristAttraction',
    slug: 'mont',
    pages: 1,
    maxDetails: 80,
  },
  {
    kind: 'site',
    forceLook: 'lake',
    path: '/fr/categorie/81/lac',
    schema: 'TouristAttraction',
    slug: 'lac',
    pages: 2,
    maxDetails: 80,
  },
  {
    kind: 'site',
    path: '/fr/categorie/14/sites-touristiques',
    schema: 'TouristAttraction',
    slug: 'sites-touristiques',
    pages: 13,
    maxDetails: 200,
  },
  {
    kind: 'hotel',
    path: '/fr/categorie/56/hotel',
    schema: 'Hotel',
    slug: 'hotel',
    pages: 29,
    maxDetails: 400,
  },
  {
    kind: 'restaurant',
    path: '/fr/categorie/21/restaurant',
    schema: 'Restaurant',
    slug: 'restaurant',
    pages: 15,
    maxDetails: 220,
  },
  {
    kind: 'house',
    path: '/fr/categorie/59/auberge-habitat-maison-d-hote',
    schema: 'Hotel',
    slug: 'auberge-habitat-maison-d-hote',
    pages: 2,
    maxDetails: 80,
  },
  {
    kind: 'villa',
    path: '/fr/categorie/890/villa',
    schema: 'Hotel',
    slug: 'villa',
    pages: 2,
    maxDetails: 80,
  },
];

const ONLY = process.env.AYILAA_ONLY?.trim();
const ACTIVE_CATEGORIES = ONLY
  ? CATEGORIES.filter((c) => c.slug === ONLY || c.kind === ONLY)
  : CATEGORIES;
if (ONLY && !ACTIVE_CATEGORIES.length) {
  console.error(`Unknown AYILAA_ONLY=${ONLY}`);
  process.exit(1);
}

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

function decodeHtml(text = '') {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&icirc;/g, 'î')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, "'")
    .replace(/&oelig;/g, 'œ')
    .replace(/&hellip;/g, '…')
    .replace(/&#39;/g, "'")
    .replace(/&deg;/g, '°');
}

function stripTags(html = '') {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function metaContent(html, prop, attr = 'itemprop') {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${prop}["'][^>]*>`,
    'i',
  );
  const m = html.match(re);
  return m ? decodeHtml(m[1] || m[2] || '') : null;
}

function allMetaContents(html, prop) {
  const re = new RegExp(
    `<meta[^>]+itemprop=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*itemprop=["']${prop}["'][^>]*>`,
    'gi',
  );
  const out = [];
  for (const m of html.matchAll(re)) {
    const v = decodeHtml(m[1] || m[2] || '').trim();
    if (v && v !== 'Non disponible') out.push(v);
  }
  return [...new Set(out)];
}

function isBrandName(name) {
  return !name || /^ayila[''`]?a?$/i.test(String(name).trim());
}

function nameFromPath(path) {
  const slug = path?.match(/\/\d+-([^/?#]+)/)?.[1];
  if (!slug) return null;
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  const cleaned = decodeHtml(String(raw)).trim().replace(/\\+/g, '');
  if (!cleaned.startsWith('http')) return null;
  try {
    const url = new URL(cleaned.replace(/ /g, '%20'));
    url.pathname = url.pathname
      .split('/')
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return url.toString();
  } catch {
    return cleaned.replace(/ /g, '%20');
  }
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function cityToRegionSlug(city = '', state = '') {
  const hay = `${city} ${state}`.toLowerCase();
  const map = [
    [['yaound', 'mfou', 'mbalmayo', 'obala'], 'centre'],
    [['douala', 'edéa', 'edea', 'nkongsamba', 'yabassi'], 'littoral'],
    [['kribi', 'ebolowa', 'sangmelima', 'campo'], 'sud'],
    [['limb', 'buea', 'tiko', 'muyuka', 'idenao'], 'sud-ouest'],
    [['bafoussam', 'dschang', 'bangangte', 'foumban', 'mbouda', 'bafang'], 'ouest'],
    [['bamenda', 'wum', 'nkambe'], 'nord-ouest'],
    [['bertoua', 'abatang', 'batouri', 'yokadouma'], 'est'],
    [['ngaound', 'meiganga', 'tibati'], 'adamaoua'],
    [['garoua', 'poli', 'guider'], 'nord'],
    [['maroua', 'mokolo', 'kousseri', 'yagoua'], 'extreme-nord'],
  ];
  for (const [keys, slug] of map) {
    if (keys.some((k) => hay.includes(k))) return slug;
  }
  return '';
}

async function fetchText(pathOrUrl, retries = 4) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE}${pathOrUrl}`;
  for (let i = 0; i < retries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      process.stdout.write(`GET ${url}… `);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Referer: BASE,
        },
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        console.log(`HTTP ${res.status}, backoff`);
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const text = await res.text();
      console.log(`ok ${text.length}`);
      return text;
    } catch (err) {
      clearTimeout(timer);
      console.warn(`retry ${i + 1}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      if (i === retries - 1) throw err;
    }
  }
  throw new Error(`Failed ${url}`);
}

function parseListingPage(html, cat) {
  const blocks = html.split(`itemscope itemtype="https://schema.org/${cat.schema}"`).slice(1);
  const items = [];
  for (const block of blocks) {
    const chunk = block.slice(0, 3500);
    const url =
      metaContent(`<meta ${chunk}`, 'url') || chunk.match(/href="(\/fr\/[^"]+\/\d+-[^"]+)"/)?.[1];
    const name = metaContent(`<meta ${chunk}`, 'name');
    if (!url || !name) continue;
    const externalId = url.match(/\/(\d+)-/)?.[1] || null;
    const image = normalizeImageUrl(metaContent(`<meta ${chunk}`, 'image'));
    const phone = metaContent(`<meta ${chunk}`, 'telephone');
    const priceFrom = parsePrice(metaContent(`<meta ${chunk}`, 'priceRange'));
    const street = metaContent(`<meta ${chunk}`, 'streetAddress');
    const city = metaContent(`<meta ${chunk}`, 'addressLocality');
    const rating = Number(metaContent(`<meta ${chunk}`, 'ratingValue') || '') || null;
    items.push({
      external_id: externalId,
      kind: cat.kind,
      category: cat.slug,
      forceLook: cat.forceLook || null,
      name: isBrandName(name) ? nameFromPath(url) || name : name,
      path: url,
      source_url: `${BASE}${url}`,
      image,
      phone: phone && phone !== 'Non disponible' ? phone : null,
      price_from: priceFrom,
      neighborhood: street && street !== 'Non disponible' ? street : null,
      city,
      rating,
    });
  }
  const map = new Map();
  for (const item of items) {
    if (item.external_id) map.set(item.external_id, item);
  }
  return [...map.values()];
}

function extractPlaceName(html, listing) {
  const titleName = html
    .match(/<title>\s*Ayila[''`]?a?\s*\|\s*([^<\n]+)/i)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim();
  const metaNames = allMetaContents(html, 'name').filter((n) => !isBrandName(n));
  const candidates = [listing?.name, titleName, ...metaNames].filter((n) => n && !isBrandName(n));
  return candidates[0] || listing?.name || titleName || 'Lieu inconnu';
}

function extractImages(html, listing) {
  const fromAttrs = [
    ...html.matchAll(
      /(?:src|content|data-src|data-lazy|data-original|href)=["'](https:\/\/ayilaa\.s3\.eu-west-1\.amazonaws\.com\/attraction\/[^"']+)["']/gi,
    ),
  ].map((m) => m[1]);
  const fromBare = [...html.matchAll(/["'](https:\/\/ayilaa\.s3\.eu-west-1\.amazonaws\.com\/attraction\/[^"']+)["']/gi)].map(
    (m) => m[1],
  );
  const fromMeta = allMetaContents(html, 'image');
  const seeds = [listing?.image, ...(listing?.images || [])];
  const uniq = [
    ...new Set(
      [...fromMeta, ...fromAttrs, ...fromBare, ...seeds]
        .map(normalizeImageUrl)
        .filter((u) => u && !u.includes('tr?id=')),
    ),
  ];
  // Prefer interiors/exteriors (media/) ahead of logos.
  return uniq.sort((a, b) => {
    const sa = a.includes('/media/') ? 2 : a.includes('/logos/') ? 0 : 1;
    const sb = b.includes('/media/') ? 2 : b.includes('/logos/') ? 0 : 1;
    return sb - sa;
  });
}

function parseDetailPage(html, listing) {
  const name = extractPlaceName(html, listing);
  const phoneRaw = metaContent(html, 'telephone');
  const images = extractImages(html, listing);
  const image = images[0] || normalizeImageUrl(listing.image);
  const city = metaContent(html, 'addressLocality') || listing.city;
  const neighborhood = metaContent(html, 'streetAddress') || listing.neighborhood;
  const priceFrom = parsePrice(metaContent(html, 'priceRange')) ?? listing.price_from;
  const cuisines = allMetaContents(html, 'servesCuisine');
  const geo = html.match(/name="geo\.position"\s+content="([^;]+);([^"]+)"/i);
  const lat =
    (geo ? Number(geo[1]) : Number(html.match(/latitude:\s*parseFloat\("([^"]+)"\)/)?.[1])) || null;
  const lng =
    (geo ? Number(geo[2]) : Number(html.match(/longitude:\s*parseFloat\("([^"]+)"\)/)?.[1])) || null;
  const placename = html.match(/name="geo\.placename"\s+content="([^"]+)"/i)?.[1] || city;
  const descriptionHtml =
    html.match(/<p itemprop="description">([\s\S]*?)<\/p>\s*<\/section>/i)?.[1] || '';
  const description = stripTags(descriptionHtml);
  const rating =
    Number(html.match(/itemprop="ratingValue"[^>]*content="([^"]+)"/i)?.[1] || '') || listing.rating;
  // Ayila'a embeds its own support WhatsApp on every page — ignore it.
  const AYILAA_SUPPORT = /650801991/;
  const phoneCandidates = [
    phoneRaw && phoneRaw !== 'Non disponible' ? phoneRaw : null,
    listing.phone,
    ...[...html.matchAll(/tel:(\+?237[\d\s.-]+)/gi)].map((m) => m[1].replace(/[\s.-]/g, '')),
  ].filter(Boolean);
  const placePhone = phoneCandidates.find((p) => !AYILAA_SUPPORT.test(String(p))) || null;
  const waRaw =
    html.match(/wa\.me\/(\d+)/i)?.[1] ||
    phoneCandidates.find((p) => /whatsapp/i.test(html) && !AYILAA_SUPPORT.test(String(p))) ||
    null;
  const whatsapp = waRaw && !AYILAA_SUPPORT.test(String(waRaw)) ? String(waRaw) : null;
  const website =
    html.match(/itemprop="url"[^>]*content="(https?:\/\/(?!ayilaa\.com)[^"]+)"/i)?.[1] || null;
  const hoursRows = [
    ...html.matchAll(
      /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/gi,
    ),
  ]
    .map((m) => ({
      day: decodeHtml(m[1]).trim(),
      open: decodeHtml(m[2]).trim(),
      close: decodeHtml(m[3]).trim(),
    }))
    .filter((h) => h.day && !/jours/i.test(h.day));

  const openingHours = hoursRows.length
    ? hoursRows.map((h) => `${h.day}: ${h.open}-${h.close}`).join('; ')
    : null;

  return {
    id: `ayilaa-${listing.external_id}`,
    external_id: listing.external_id,
    kind: listing.kind,
    category: listing.category,
    forceLook: listing.forceLook || null,
    name,
    path: listing.path,
    source_url: listing.source_url,
    image,
    images: images.slice(0, 24),
    phone: placePhone,
    whatsapp,
    website,
    price_from: priceFrom,
    neighborhood:
      neighborhood && neighborhood !== 'Non disponible' ? neighborhood : listing.neighborhood,
    city: city || listing.city || '',
    state: placename || '',
    regionId: cityToRegionSlug(city || listing.city || '', placename || ''),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lng) ? lng : null,
    rating,
    cuisines,
    description: description || null,
    short_description: description ? description.slice(0, 220) : null,
    openingHours,
  };
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function scrapeCategory(cat) {
  const label = cat.slug;
  const cacheFile = resolve(CACHE_DIR, `${label}-listings.json`);
  let listings = [];
  if (existsSync(cacheFile)) {
    listings = JSON.parse(readFileSync(cacheFile, 'utf8'));
    console.log(`[${label}] cache listings: ${listings.length}`);
  } else {
    const all = new Map();
    for (let page = 1; page <= cat.pages; page++) {
      const path = page === 1 ? cat.path : `${cat.path}?page=${page}`;
      try {
        const html = await fetchText(path);
        const items = parseListingPage(html, cat);
        for (const item of items) all.set(item.external_id, item);
        console.log(`[${label}] page ${page}/${cat.pages} → +${items.length} (total ${all.size})`);
      } catch (err) {
        console.error(`[${label}] page ${page} FAIL: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    listings = [...all.values()];
    writeFileSync(cacheFile, JSON.stringify(listings, null, 2));
  }

  // Prefer places that already show an image on the listing card
  const ranked = [...listings].sort((a, b) => {
    const ai = a.image ? 1 : 0;
    const bi = b.image ? 1 : 0;
    if (bi !== ai) return bi - ai;
    return (b.rating || 0) - (a.rating || 0);
  });
  const toDetail = ranked.slice(0, cat.maxDetails);

  const detailsFile = resolve(CACHE_DIR, `${label}-details.json`);
  const done = existsSync(detailsFile)
    ? new Map(JSON.parse(readFileSync(detailsFile, 'utf8')).map((d) => [d.external_id, d]))
    : new Map();

  const pending = toDetail.filter((l) => {
    const existing = done.get(l.external_id);
    if (!existing) return true;
    if (!existing.lat || !existing.lon) return true;
    if (!existing.image && !existing.images?.length) return true;
    if (cat.forceLook && existing.forceLook !== cat.forceLook) return true;
    return false;
  });
  console.log(`[${label}] details: ${done.size} cached, ${pending.length} to fetch`);

  let completed = 0;
  await mapPool(pending, CONCURRENCY, async (listing) => {
    await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    try {
      const html = await fetchText(listing.path);
      done.set(listing.external_id, parseDetailPage(html, listing));
    } catch (err) {
      console.error(`[${label}] FAIL ${listing.external_id}: ${err.message}`);
      done.set(listing.external_id, {
        id: `ayilaa-${listing.external_id}`,
        ...listing,
        images: listing.image ? [listing.image] : [],
        lat: null,
        lon: null,
        regionId: cityToRegionSlug(listing.city || ''),
        scrape_error: err.message,
      });
    }
    completed++;
    if (completed % 20 === 0 || completed === pending.length) {
      writeFileSync(detailsFile, JSON.stringify([...done.values()], null, 2));
      console.log(`[${label}] details progress ${completed}/${pending.length}`);
    }
  });

  writeFileSync(detailsFile, JSON.stringify([...done.values()], null, 2));
  return [...done.values()].filter((d) => d.name && !isBrandName(d.name));
}

const scraped = [];
for (const cat of ACTIVE_CATEGORIES) {
  const places = await scrapeCategory(cat);
  scraped.push(...places);
}

/** Merge with existing catalog when running a single-category refresh. */
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).places || [] : [];
const incomingKinds = new Set(ACTIVE_CATEGORIES.map((c) => c.kind));
const incomingSlugs = new Set(ACTIVE_CATEGORIES.map((c) => c.slug));
const kept = ONLY
  ? existing.filter(
      (p) => !(incomingKinds.has(p.kind) && (!p.category || incomingSlugs.has(p.category))),
    )
  : [];
const allPlaces = ONLY ? [...kept, ...scraped] : scraped;

/** Prefer mont/hotel/house-enriched records when the same Ayila'a id appears twice. */
const byId = new Map();
for (const p of allPlaces) {
  const prev = byId.get(p.external_id);
  if (!prev) {
    byId.set(p.external_id, p);
    continue;
  }
  const score = (x) =>
    (x.forceLook === 'mountain' || x.category === 'mont' ? 4 : 0) +
    (x.forceLook === 'lake' || x.category === 'lac' ? 4 : 0) +
    (x.kind === 'hotel' && x.category === 'hotel' ? 3 : 0) +
    (x.kind === 'house' || x.kind === 'villa' ? 3 : 0) +
    (x.kind === 'restaurant' && x.category === 'restaurant' ? 2 : 0) +
    (x.local_cover || String(x.image || '').startsWith('/film/') ? 3 : 0) +
    (x.image || x.images?.length ? 2 : 0) +
    (x.phone ? 1 : 0) +
    (x.description ? 1 : 0);
  if (score(p) >= score(prev)) byId.set(p.external_id, { ...prev, ...p });
}
const deduped = [...byId.values()];

const usable = deduped.filter(
  (p) =>
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    (p.image || (p.images && p.images.length > 0)),
);

const payload = {
  generatedAt: new Date().toISOString(),
  attribution: "Ayila'a (ayilaa.com) — images hébergées sur ayilaa.s3",
  counts: {
    total: deduped.length,
    withCoordsAndImage: usable.length,
    hotel: usable.filter((p) => p.kind === 'hotel').length,
    house: usable.filter((p) => p.kind === 'house').length,
    villa: usable.filter((p) => p.kind === 'villa').length,
    restaurant: usable.filter((p) => p.kind === 'restaurant').length,
    site: usable.filter((p) => p.kind === 'site' && p.category !== 'mont').length,
    mountain: usable.filter((p) => p.forceLook === 'mountain' || p.category === 'mont').length,
    lake: usable.filter((p) => p.forceLook === 'lake' || p.category === 'lac').length,
  },
  places: usable.map((p) => ({
    id: p.id,
    external_id: p.external_id,
    kind: p.kind,
    category: p.category || null,
    forceLook: p.forceLook || null,
    name: p.name,
    city: p.city || '',
    regionId: p.regionId || cityToRegionSlug(p.city || '', p.state || ''),
    lat: p.lat,
    lon: p.lon,
    image: p.image || p.images?.[0] || null,
    images: (p.images || []).slice(0, 24),
    gallery: p.gallery || undefined,
    local_cover: p.local_cover || undefined,
    remote_image: p.remote_image || undefined,
    phone: p.phone || null,
    whatsapp: p.whatsapp || null,
    website: p.website || null,
    address: p.neighborhood || null,
    price_from: p.price_from || null,
    rating: p.rating || null,
    cuisines: p.cuisines || [],
    description: p.short_description || p.description?.slice(0, 280) || null,
    openingHours: p.openingHours || null,
    source_url: p.source_url,
  })),
};

writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(payload.counts, null, 2));
