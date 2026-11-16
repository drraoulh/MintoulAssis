/**
 * Geocode waterfall places missing coords (Nominatim) and merge them into
 * ayilaa-places.json, then download their galleries.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const DETAILS = resolve(ROOT, 'data/ayilaa-film/chutte-deau-details.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const MAX_PER = 16;

mkdirSync(OUT_DIR, { recursive: true });

const CITY_FALLBACK = {
  yaounde: { lat: 3.848, lon: 11.5021, regionId: 'centre' },
  yaoundé: { lat: 3.848, lon: 11.5021, regionId: 'centre' },
  douala: { lat: 4.0511, lon: 9.7679, regionId: 'littoral' },
  bafoussam: { lat: 5.4778, lon: 10.4176, regionId: 'ouest' },
  dschang: { lat: 5.4437, lon: 10.0533, regionId: 'ouest' },
  bamenda: { lat: 5.9597, lon: 10.146 },
  limbe: { lat: 4.0225, lon: 9.1906, regionId: 'sud-ouest' },
  limbé: { lat: 4.0225, lon: 9.1906, regionId: 'sud-ouest' },
  kribi: { lat: 2.9373, lon: 9.9073, regionId: 'sud' },
  ngaoundere: { lat: 7.3277, lon: 13.5847, regionId: 'adamaoua' },
  ngaoundéré: { lat: 7.3277, lon: 13.5847, regionId: 'adamaoua' },
  maroua: { lat: 10.591, lon: 14.3159, regionId: 'extreme-nord' },
  garoua: { lat: 9.3012, lon: 13.3921, regionId: 'nord' },
  bertoua: { lat: 4.5773, lon: 13.6846, regionId: 'est' },
  ebolowa: { lat: 2.9, lon: 11.15, regionId: 'sud' },
  buea: { lat: 4.155, lon: 9.241, regionId: 'sud-ouest' },
  bangangte: { lat: 5.146, lon: 10.525, regionId: 'ouest' },
  bangangté: { lat: 5.146, lon: 10.525, regionId: 'ouest' },
  bangou: { lat: 5.25, lon: 10.4, regionId: 'ouest' },
  edea: { lat: 3.8, lon: 10.1333, regionId: 'littoral' },
  edéa: { lat: 3.8, lon: 10.1333, regionId: 'littoral' },
  fokoue: { lat: 5.4, lon: 10.1, regionId: 'ouest' },
  fokoué: { lat: 5.4, lon: 10.1, regionId: 'ouest' },
};

function decodeHtml(text = '') {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/');
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  let cleaned = decodeHtml(String(raw)).trim().replace(/\\+/g, '');
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  if (cleaned.startsWith('/film/covers/')) return null;
  if (!cleaned.startsWith('http')) return null;
  try {
    const url = new URL(cleaned.replace(/ /g, '%20'));
    if (!/ayilaa\.s3/i.test(url.hostname) || !/\/attraction\//i.test(url.pathname)) return null;
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

function extFromUrl(url) {
  try {
    const ext = extname(new URL(url).pathname).toLowerCase();
    if (ext === '.jfif') return '.jpg';
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {
    /* ignore */
  }
  return '.jpg';
}

async function download(url, dest) {
  if (existsSync(dest)) return true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/*',
        Referer: 'https://ayilaa.com/',
      },
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return true;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`FAIL ${url.slice(0, 88)}: ${err.message}`);
    return false;
  }
}

function cleanQuery(name) {
  return String(name)
    .replace(/chutte[- ]?deau/gi, '')
    .replace(/\b(les|la|le|de|du|des|et|sa|for[eê]t|sacr[eée]+)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function geocodeQueries(queries) {
  for (const q of queries) {
    if (!q) continue;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cm&q=${encodeURIComponent(q)}`;
    await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SmartMboaFilmBot/1.0 (film locations enrichment)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) continue;
    const rows = await res.json();
    if (!rows?.length) continue;
    return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name, q };
  }
  return null;
}

function cityFallback(city = '') {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  if (CITY_FALLBACK[key]) return CITY_FALLBACK[key];
  for (const [k, v] of Object.entries(CITY_FALLBACK)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function cityToRegionSlug(city = '', state = '') {
  const hay = `${city} ${state}`.toLowerCase();
  if (/littoral|douala/.test(hay)) return 'littoral';
  if (/centre|yaound/.test(hay)) return 'centre';
  if (/ouest|bafoussam|dschang|bangangte|nkongsamba|fokoue/.test(hay)) return 'ouest';
  if (/nord.?ouest|bamenda|bafut/.test(hay)) return 'nord-ouest';
  if (/sud.?ouest|limbe|buea|tiko/.test(hay)) return 'sud-ouest';
  if (/extr.me.?nord|maroua|kousseri/.test(hay)) return 'extreme-nord';
  if (/\bnord\b|garoua/.test(hay)) return 'nord';
  if (/adamaoua|ngaoundere|ngaoundéré/.test(hay)) return 'adamaoua';
  if (/\best\b|bertoua/.test(hay)) return 'est';
  if (/\bsud\b|ebolowa|kribi|campo/.test(hay)) return 'sud';
  return 'centre';
}

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const details = JSON.parse(readFileSync(DETAILS, 'utf8'));
const missing = details.filter((p) => !(Number.isFinite(p.lat) && Number.isFinite(p.lon)));
console.log(`Waterfalls missing coords: ${missing.length}`);

let added = 0;
let geocoded = 0;
let cityApprox = 0;
let imgOk = 0;

for (const detail of missing) {
  const cleaned = cleanQuery(detail.name);
  const queries = [
    `${detail.name}, Cameroun`,
    `${cleaned}, Cameroun`,
    `chutes ${cleaned}, Cameroun`,
    detail.city ? `${cleaned}, ${detail.city}, Cameroun` : null,
  ].filter(Boolean);

  let lat = null;
  let lon = null;
  let approx = false;
  try {
    const g = await geocodeQueries(queries);
    if (g) {
      lat = g.lat;
      lon = g.lon;
      geocoded++;
      console.log(`GEO ${detail.name} ← ${g.q} → ${lat},${lon}`);
    }
  } catch (err) {
    console.warn(`GEO FAIL ${detail.name}: ${err.message}`);
  }

  if (!(Number.isFinite(lat) && Number.isFinite(lon))) {
    const fb = cityFallback(detail.city || '');
    if (fb) {
      lat = fb.lat;
      lon = fb.lon;
      approx = true;
      cityApprox++;
      console.log(`CITY ${detail.name} ← ${detail.city} → ${lat},${lon}`);
    } else {
      console.warn(`SKIP ${detail.name} (no coords)`);
      continue;
    }
  }

  const remote = [...(detail.images || []), detail.image].map(normalizeImageUrl).filter(Boolean);
  const gallery = [];
  for (let i = 0; i < Math.min(remote.length, MAX_PER); i++) {
    const url = remote[i];
    const file = `${detail.external_id}-w${i + 1}${extFromUrl(url)}`;
    const dest = join(OUT_DIR, file);
    const local = `/film/covers/ayilaa/${file}`;
    if (await download(url, dest)) {
      gallery.push(local);
      imgOk++;
    }
  }
  if (!gallery.length) {
    console.warn(`NO IMG ${detail.name}`);
    continue;
  }

  const place = {
    id: detail.id || `ayilaa-${detail.external_id}`,
    external_id: String(detail.external_id),
    kind: 'site',
    category: 'chutte-deau',
    forceLook: 'waterfall',
    name: detail.name,
    city: detail.city || '',
    regionId: detail.regionId || cityToRegionSlug(detail.city || '', detail.state || ''),
    lat,
    lon,
    image: gallery[0],
    images: gallery,
    gallery,
    local_cover: gallery[0],
    remote_images: remote,
    coordsApprox: approx || undefined,
    phone: detail.phone || null,
    whatsapp: detail.whatsapp || null,
    website: detail.website || null,
    address: detail.neighborhood || null,
    price_from: detail.price_from || null,
    rating: detail.rating || null,
    cuisines: detail.cuisines || [],
    description: detail.short_description || detail.description?.slice?.(0, 280) || null,
    openingHours: detail.openingHours || null,
    source_url: detail.source_url,
  };

  const idx = data.places.findIndex((p) => String(p.external_id) === String(place.external_id));
  if (idx >= 0) data.places[idx] = { ...data.places[idx], ...place };
  else data.places.push(place);
  added++;
}

data.counts = {
  ...data.counts,
  total: data.places.length,
  withCoordsAndImage: data.places.length,
  waterfall: data.places.filter((p) => p.forceLook === 'waterfall' || p.category === 'chutte-deau')
    .length,
  lake: data.places.filter((p) => p.forceLook === 'lake' || p.category === 'lac').length,
};
data.generatedAt = new Date().toISOString();
writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(
  JSON.stringify(
    { added, geocoded, cityApprox, imgOk, waterfall: data.counts.waterfall, lake: data.counts.lake },
    null,
    2,
  ),
);
