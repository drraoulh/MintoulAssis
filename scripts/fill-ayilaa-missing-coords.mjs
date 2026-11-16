/**
 * Add city-approx coords for plage/musee places missing GPS, download galleries.
 * Usage: node scripts/fill-ayilaa-missing-coords.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const MAX_PER = 16;

const JOBS = [
  {
    details: resolve(ROOT, 'data/ayilaa-film/plage-details.json'),
    forceLook: 'coast',
    category: 'plage',
    prefix: 'c',
  },
  {
    details: resolve(ROOT, 'data/ayilaa-film/musee-details.json'),
    forceLook: 'museum',
    category: 'musee',
    prefix: 'm',
  },
];

const CITY_FALLBACK = {
  limbe: { lat: 4.0225, lon: 9.1906, regionId: 'sud-ouest' },
  limbé: { lat: 4.0225, lon: 9.1906, regionId: 'sud-ouest' },
  ebolowa: { lat: 2.9, lon: 11.15, regionId: 'sud' },
  bandenkop: { lat: 5.35, lon: 10.2, regionId: 'ouest' },
  kribi: { lat: 2.9373, lon: 9.9073, regionId: 'sud' },
  douala: { lat: 4.0511, lon: 9.7679, regionId: 'littoral' },
  yaounde: { lat: 3.848, lon: 11.5021, regionId: 'centre' },
  yaoundé: { lat: 3.848, lon: 11.5021, regionId: 'centre' },
};

mkdirSync(OUT_DIR, { recursive: true });

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

function cityFallback(city = '') {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  if (CITY_FALLBACK[key]) return CITY_FALLBACK[key];
  for (const [k, v] of Object.entries(CITY_FALLBACK)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

const data = JSON.parse(readFileSync(DATA, 'utf8'));
let added = 0;
let imgOk = 0;

for (const job of JOBS) {
  if (!existsSync(job.details)) continue;
  const details = JSON.parse(readFileSync(job.details, 'utf8'));
  const missing = details.filter((p) => !(Number.isFinite(p.lat) && Number.isFinite(p.lon)));
  for (const detail of missing) {
    const fb = cityFallback(detail.city || '');
    if (!fb) {
      console.warn(`SKIP ${detail.name}`);
      continue;
    }
    const remote = [...(detail.images || []), detail.image].map(normalizeImageUrl).filter(Boolean);
    const gallery = [];
    for (let i = 0; i < Math.min(remote.length, MAX_PER); i++) {
      const url = remote[i];
      const file = `${detail.external_id}-${job.prefix}${i + 1}${extFromUrl(url)}`;
      const dest = join(OUT_DIR, file);
      const local = `/film/covers/ayilaa/${file}`;
      if (await download(url, dest)) {
        gallery.push(local);
        imgOk++;
      }
    }
    if (!gallery.length) continue;
    const place = {
      id: detail.id || `ayilaa-${detail.external_id}`,
      external_id: String(detail.external_id),
      kind: 'site',
      category: job.category,
      forceLook: job.forceLook,
      name: detail.name,
      city: detail.city || '',
      regionId: detail.regionId || fb.regionId || 'centre',
      lat: fb.lat,
      lon: fb.lon,
      image: gallery[0],
      images: gallery,
      gallery,
      local_cover: gallery[0],
      remote_images: remote,
      coordsApprox: true,
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
    console.log(`ADD ${place.name} ← ${detail.city}`);
  }
}

data.counts = {
  ...data.counts,
  total: data.places.length,
  withCoordsAndImage: data.places.length,
  coast: data.places.filter((p) => p.forceLook === 'coast' || p.category === 'plage').length,
  museum: data.places.filter((p) => p.forceLook === 'museum' || p.category === 'musee').length,
};
data.generatedAt = new Date().toISOString();
writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ added, imgOk, coast: data.counts.coast, museum: data.counts.museum }, null, 2));
