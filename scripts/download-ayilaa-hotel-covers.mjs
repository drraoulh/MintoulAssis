/**
 * Downloads Ayila'a hotel cover images into public/film/covers/ayilaa/
 * and rewrites cover paths in ayilaa-places.json to local URLs.
 *
 * Usage: node scripts/download-ayilaa-hotel-covers.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const CONCURRENCY = 4;

mkdirSync(OUT_DIR, { recursive: true });

function extFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const ext = extname(path).toLowerCase();
    if (ext === '.jfif') return '.jpg';
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return ext;
  } catch {
    /* ignore */
  }
  return '.jpg';
}

function pickCover(place) {
  const candidates = [place.image, ...(place.images || [])].filter(Boolean);
  return (
    candidates.find((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) || candidates[0] || null
  );
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
    console.warn(`FAIL ${url}: ${err.message}`);
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

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const hotels = data.places.filter((p) => p.kind === 'hotel');
console.log(`Hotels to cover: ${hotels.length}`);

let ok = 0;
let fail = 0;

await mapPool(hotels, CONCURRENCY, async (place) => {
  const remote = pickCover(place);
  if (!remote) {
    fail++;
    return;
  }
  const ext = extFromUrl(remote);
  const file = `${place.external_id}${ext}`;
  const dest = join(OUT_DIR, file);
  const localUrl = `/film/covers/ayilaa/${file}`;
  const saved = await download(remote, dest);
  if (saved) {
    place.image = localUrl;
    place.local_cover = localUrl;
    place.remote_image = remote;
    // Keep remote gallery; first slot mirrors local cover for consumers that only read images[0]
    place.images = [localUrl, ...(place.images || []).filter((u) => u !== remote && u !== localUrl)].slice(
      0,
      8,
    );
    ok++;
    if (ok % 25 === 0) console.log(`downloaded ${ok}/${hotels.length}`);
  } else {
    fail++;
  }
});

writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ ok, fail, outDir: OUT_DIR }, null, 2));
