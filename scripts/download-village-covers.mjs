/**
 * Downloads cover images for OSM film villages via Wikipedia / Wikimedia Commons.
 * Writes files to public/film/covers/villages/ and updates osm-places.json image fields.
 *
 * Usage: node scripts/download-village-covers.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = process.cwd();
const OSM = resolve(ROOT, 'src/lib/film/data/osm-places.json');
const OUT_DIR = resolve(ROOT, 'public/film/covers/villages');
const UA = 'SmartMboaFilm/1.0 (village covers; contact: smartmboatour.com)';

mkdirSync(OUT_DIR, { recursive: true });

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function wikiThumb(title, lang = 'fr') {
  const url = new URL(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.originalimage?.source || data.thumbnail?.source || null;
}

async function commonsSearch(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `${query} Cameroon`);
  url.searchParams.set('gsrlimit', '5');
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('iiurlwidth', '1280');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    const src = info?.thumburl || info?.url;
    if (src && /\.(jpe?g|png|webp)/i.test(src)) return src;
  }
  return null;
}

const ALIASES = {
  Tourou: ['Rhumsiki', 'Kapsiki', 'Monts Mandara'],
  'Fongo-Tongo': ['Dschang', 'Fongo Tongo'],
  Bamendjou: ['Bafoussam', 'Bamendjou Cameroun'],
  Londji: ['Kribi', 'Londji plage', 'Plage de Londji'],
  Ébodjé: ['Ebodje', 'Ebodjé', "Campo Ma'an", 'Campo', 'Kribi'],
  'Rey Bouba': ['Rey-Bouba', 'Lamidat de Rey Bouba', 'Garoua', 'Nord Cameroun'],
  Djingliya: ['Rhumsiki', 'Djingliya Cameroun', 'Kapsiki'],
  Oku: ['Lake Oku', 'Oku Cameroon'],
  Campo: ['Campo Beach', 'Parc national de Campo-Ma\'an'],
};

async function findImage(name) {
  const aliases = ALIASES[name] || [];
  const queries = [
    `${name} (Cameroun)`,
    `${name}, Cameroon`,
    name,
    ...aliases.flatMap((a) => [`${a} (Cameroun)`, `${a}, Cameroon`, a]),
  ];
  for (const q of queries) {
    for (const lang of ['fr', 'en']) {
      try {
        const img = await wikiThumb(q, lang);
        if (img) return img;
      } catch {
        /* continue */
      }
    }
  }
  for (const q of [name, ...aliases]) {
    try {
      const img = await commonsSearch(q);
      if (img) return img;
    } catch {
      /* continue */
    }
  }
  return null;
}

async function download(url, dest) {
  if (existsSync(dest)) return true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
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

const data = JSON.parse(readFileSync(OSM, 'utf8'));
const villages = data.villages || [];
let ok = 0;
let miss = 0;

for (const v of villages) {
  const slug = slugify(v.name);
  const existingLocal =
    v.image && String(v.image).startsWith('/film/covers/villages/')
      ? v.image
      : null;
  if (existingLocal && existsSync(join(ROOT, 'public', existingLocal))) {
    console.log(`skip ${v.name}`);
    continue;
  }

  // Prefer keeping a working remote if already present and reachable is unknown — still localize.
  let remote = v.image && /^https?:\/\//i.test(v.image) ? v.image : null;
  if (!remote) {
    process.stdout.write(`search ${v.name}… `);
    remote = await findImage(v.name);
    console.log(remote ? 'hit' : 'miss');
  } else {
    console.log(`localize ${v.name}`);
  }

  if (!remote) {
    miss++;
    continue;
  }

  let ext = '.jpg';
  try {
    const e = extname(new URL(remote).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(e)) ext = e === '.jpeg' ? '.jpg' : e;
  } catch {
    /* keep jpg */
  }
  const file = `${slug}${ext}`;
  const dest = join(OUT_DIR, file);
  const local = `/film/covers/villages/${file}`;
  if (await download(remote, dest)) {
    v.image = local;
    v.remote_image = remote;
    ok++;
  } else {
    miss++;
  }
  await new Promise((r) => setTimeout(r, 400));
}

writeFileSync(OSM, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ villages: villages.length, ok, miss }, null, 2));
