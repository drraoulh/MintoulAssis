/**
 * Downloads full Ayila'a hotel galleries (interiors / surroundings) locally
 * and rewrites images[] in ayilaa-places.json to /film/covers/ayilaa/{id}-n.ext
 *
 * Usage: node scripts/download-ayilaa-hotel-galleries.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const DETAILS = resolve(ROOT, 'data/ayilaa-film/hotel-details.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const CONCURRENCY = 4;
const MAX_PER_HOTEL = 16;

mkdirSync(OUT_DIR, { recursive: true });

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

function uniq(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function rankUrl(url) {
  // Prefer interior/surroundings media over logos.
  if (url.includes('/media/')) return 2;
  if (url.includes('/logos/')) return 0;
  return 1;
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
        Accept: 'image/*,*/*',
        Referer: 'https://ayilaa.com/',
      },
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return true;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`FAIL ${url.slice(0, 90)}: ${err.message}`);
    return false;
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

const detailsById = new Map();
if (existsSync(DETAILS)) {
  for (const d of JSON.parse(readFileSync(DETAILS, 'utf8'))) {
    detailsById.set(String(d.external_id), d);
  }
}

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const hotels = data.places.filter((p) => p.kind === 'hotel');
console.log(`Hotel galleries: ${hotels.length}`);

let imageOk = 0;
let imageFail = 0;
let hotelsDone = 0;

await mapPool(hotels, CONCURRENCY, async (place) => {
  const detail = detailsById.get(String(place.external_id));
  const remoteCandidates = uniq([
    ...(detail?.images || []),
    ...(place.images || []),
    place.remote_image,
    place.image,
  ])
    .filter((u) => /^https?:\/\//i.test(String(u)))
    .sort((a, b) => rankUrl(b) - rankUrl(a))
    .slice(0, MAX_PER_HOTEL);

  // Keep already-local covers first
  const localExisting = uniq([...(place.images || []), place.image]).filter((u) =>
    String(u).startsWith('/film/covers/'),
  );

  const localGallery = [...localExisting];

  for (let i = 0; i < remoteCandidates.length; i++) {
    const url = remoteCandidates[i];
    const ext = extFromUrl(url);
    const file = `${place.external_id}-${i + 1}${ext}`;
    const dest = join(OUT_DIR, file);
    const localUrl = `/film/covers/ayilaa/${file}`;
    const saved = await download(url, dest);
    if (saved) {
      if (!localGallery.includes(localUrl)) localGallery.push(localUrl);
      imageOk++;
    } else {
      imageFail++;
    }
  }

  // Ensure at least the main cover file is represented
  if (place.local_cover && !localGallery.includes(place.local_cover)) {
    localGallery.unshift(place.local_cover);
  }

  const gallery = uniq(localGallery).slice(0, MAX_PER_HOTEL);
  if (gallery.length) {
    place.images = gallery;
    place.image = gallery[0];
    place.local_cover = gallery[0];
    place.gallery = gallery;
  }

  hotelsDone++;
  if (hotelsDone % 25 === 0) {
    console.log(`hotels ${hotelsDone}/${hotels.length} · images ok ${imageOk} fail ${imageFail}`);
    writeFileSync(DATA, JSON.stringify(data, null, 2));
  }
});

writeFileSync(DATA, JSON.stringify(data, null, 2));
const withGallery = hotels.filter((h) => (h.gallery || h.images || []).length > 1).length;
console.log(
  JSON.stringify(
    { hotels: hotels.length, withGallery, imageOk, imageFail, outDir: OUT_DIR },
    null,
    2,
  ),
);
