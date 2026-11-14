/**
 * Re-fetches Ayila'a hotel detail pages for hotels with thin galleries,
 * extracts all attraction media URLs, downloads them locally, updates JSON.
 *
 * Usage: node scripts/enrich-hotel-galleries.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const BASE = 'https://ayilaa.com';
const MIN_GALLERY = 8;
const MAX_PER_HOTEL = 24;
const CONCURRENCY = 3;
const REQUEST_GAP_MS = 220;
/** Set ENRICH_ALL=1 to re-scan every hotel detail page for missing media. */
const ENRICH_ALL = process.env.ENRICH_ALL === '1';

mkdirSync(OUT_DIR, { recursive: true });

function decodeHtml(text = '') {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/');
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  let cleaned = decodeHtml(String(raw)).trim().replace(/\\+/g, '');
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  if (!cleaned.startsWith('http')) return null;
  try {
    const url = new URL(cleaned.replace(/ /g, '%20'));
    if (!/ayilaa\.s3\.eu-west-1\.amazonaws\.com/i.test(url.hostname)) return null;
    if (!/\/attraction\//i.test(url.pathname)) return null;
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

function extractAllImages(html) {
  const found = [];
  const patterns = [
    /(?:src|data-src|data-lazy|data-original|content|href)=["'](https:\/\/ayilaa\.s3[^"']+)["']/gi,
    /["'](https:\/\/ayilaa\.s3\.eu-west-1\.amazonaws\.com\/attraction\/[^"']+)["']/gi,
    /url\((['"]?)(https:\/\/ayilaa\.s3[^)'"]+)\1\)/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const raw = m[2] || m[1];
      const u = normalizeImageUrl(raw);
      if (u && !u.includes('tr?id=')) found.push(u);
    }
  }
  // Prefer media (interiors/exteriors) over logos
  const uniq = [...new Set(found)];
  return uniq.sort((a, b) => {
    const sa = a.includes('/media/') ? 2 : a.includes('/logos/') ? 0 : 1;
    const sb = b.includes('/media/') ? 2 : b.includes('/logos/') ? 0 : 1;
    return sb - sa;
  });
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

async function fetchText(url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Referer: `${BASE}/fr/categorie/56/hotel`,
        },
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`Failed ${url}`);
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
    console.warn(`  FAIL img ${url.slice(0, 88)}: ${err.message}`);
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

function localCount(place) {
  return [...(place.gallery || []), ...(place.images || [])]
    .filter((u) => String(u).startsWith('/film/covers/'))
    .filter((u, i, a) => a.indexOf(u) === i)
    .filter((u) => existsSync(join(ROOT, 'public', u))).length;
}

function mediaLocalCount(place) {
  // Count gallery slots that look like media downloads (id-N.ext), not only the cover.
  return [...(place.gallery || place.images || [])].filter((u) =>
    /\/film\/covers\/ayilaa\/\d+-\d+\./.test(String(u)),
  ).length;
}

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const hotels = data.places.filter((p) => p.kind === 'hotel');

const targets = ENRICH_ALL
  ? hotels
  : hotels.filter((p) => {
      const n = localCount(p);
      const mediaN = mediaLocalCount(p);
      return n < MIN_GALLERY || mediaN < 5;
    });

console.log(
  `Hotels total ${hotels.length}; to enrich ${targets.length}` +
    (ENRICH_ALL ? ' (ALL)' : ` (gallery < ${MIN_GALLERY} or media < 5)`),
);

let enriched = 0;
let imageOk = 0;
let imageFail = 0;

await mapPool(targets, CONCURRENCY, async (place) => {
  await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
  const url = place.source_url || (place.path ? `${BASE}${place.path}` : null);
  if (!url) return;

  try {
    process.stdout.write(`GET ${place.name}… `);
    const html = await fetchText(url);
    const remote = extractAllImages(html).slice(0, MAX_PER_HOTEL);
    console.log(`${remote.length} remote (${remote.filter((u) => u.includes('/media/')).length} media)`);

    const localExisting = [...(place.gallery || []), ...(place.images || []), place.local_cover, place.image]
      .filter((u) => String(u).startsWith('/film/covers/'))
      .filter((u, i, a) => a.indexOf(u) === i);

    const gallery = [...localExisting];

    for (let i = 0; i < remote.length; i++) {
      const remoteUrl = remote[i];
      const ext = extFromUrl(remoteUrl);
      const file = `${place.external_id}-g${i + 1}${ext}`;
      const dest = join(OUT_DIR, file);
      const localUrl = `/film/covers/ayilaa/${file}`;
      if (gallery.includes(localUrl)) continue;
      const saved = await download(remoteUrl, dest);
      if (saved) {
        gallery.push(localUrl);
        imageOk++;
      } else {
        imageFail++;
      }
    }

    const uniq = [...new Set(gallery)].slice(0, MAX_PER_HOTEL);
    if (uniq.length) {
      place.gallery = uniq;
      place.images = uniq;
      place.image = uniq[0];
      place.local_cover = uniq[0];
      place.remote_images = remote;
      enriched++;
    }
  } catch (err) {
    console.warn(`FAIL page ${place.name}: ${err.message}`);
  }

  if (enriched % 15 === 0) writeFileSync(DATA, JSON.stringify(data, null, 2));
});

writeFileSync(DATA, JSON.stringify(data, null, 2));

const after = hotels.map((p) => localCount(p));
console.log(
  JSON.stringify(
    {
      enriched,
      imageOk,
      imageFail,
      avgLocal: (after.reduce((a, b) => a + b, 0) / hotels.length).toFixed(1),
      belowMin: after.filter((n) => n < MIN_GALLERY).length,
    },
    null,
    2,
  ),
);
