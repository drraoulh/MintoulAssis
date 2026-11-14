/**
 * Downloads galleries for Ayila'a lake places (forceLook=lake / category=lac).
 * Usage: node scripts/download-ayilaa-lac-galleries.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'src/lib/film/data/ayilaa-places.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/ayilaa');
const BASE = 'https://ayilaa.com';
const CONCURRENCY = 3;
const MAX_PER = 16;

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

function extractAllImages(html) {
  const found = [];
  for (const re of [
    /(?:src|data-src|data-lazy|content|href)=["'](https:\/\/ayilaa\.s3[^"']+)["']/gi,
    /["'](https:\/\/ayilaa\.s3\.eu-west-1\.amazonaws\.com\/attraction\/[^"']+)["']/gi,
  ]) {
    for (const m of html.matchAll(re)) {
      const u = normalizeImageUrl(m[1]);
      if (u && !u.includes('tr?id=')) found.push(u);
    }
  }
  return [...new Set(found)].sort(
    (a, b) => (b.includes('/media/') ? 1 : 0) - (a.includes('/media/') ? 1 : 0),
  );
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

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  const res = await fetch(url, {
    signal: ctrl.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'fr',
      Referer: `${BASE}/fr/categorie/81/lac`,
    },
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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
const lakes = data.places.filter((p) => p.forceLook === 'lake' || p.category === 'lac');
console.log(`Lakes to download: ${lakes.length}`);

let ok = 0;
let fail = 0;

await mapPool(lakes, CONCURRENCY, async (place) => {
  await new Promise((r) => setTimeout(r, 180));
  let remote = [...(place.images || []), place.remote_image, place.image]
    .map(normalizeImageUrl)
    .filter(Boolean);

  if (remote.filter((u) => u.includes('/media/')).length < 2 && place.source_url) {
    try {
      const html = await fetchText(place.source_url);
      remote = [...extractAllImages(html), ...remote];
    } catch (err) {
      console.warn(`page FAIL ${place.name}: ${err.message}`);
    }
  }

  remote = [...new Set(remote)]
    .sort((a, b) => (b.includes('/media/') ? 1 : 0) - (a.includes('/media/') ? 1 : 0))
    .slice(0, MAX_PER);

  const gallery = [...(place.gallery || [])].filter((u) => String(u).startsWith('/film/covers/'));
  for (let i = 0; i < remote.length; i++) {
    const url = remote[i];
    const file = `${place.external_id}-l${i + 1}${extFromUrl(url)}`;
    const dest = join(OUT_DIR, file);
    const local = `/film/covers/ayilaa/${file}`;
    if (gallery.includes(local)) continue;
    if (await download(url, dest)) {
      gallery.push(local);
      ok++;
    } else fail++;
  }

  const uniq = [...new Set(gallery)];
  if (uniq.length) {
    place.gallery = uniq;
    place.images = uniq;
    place.image = uniq[0];
    place.local_cover = uniq[0];
  }
});

writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(
  JSON.stringify(
    {
      lakes: lakes.length,
      ok,
      fail,
      withGallery: lakes.filter((p) => (p.gallery || []).length > 1).length,
    },
    null,
    2,
  ),
);
