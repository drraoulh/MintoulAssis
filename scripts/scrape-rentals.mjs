/**
 * Scrape rental shop websites for og:image + contact hints.
 * Downloads covers to public/film/covers/rentals/
 * Writes src/lib/film/data/rentals-enriched.json (no website field for UI).
 *
 * Usage: node scripts/scrape-rentals.mjs
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CURATED = resolve(ROOT, 'src/lib/film/data/rentals-curated.ts');
const OUT_DIR = resolve(ROOT, 'public/film/covers/rentals');
const OUT_JSON = resolve(ROOT, 'src/lib/film/data/rentals-enriched.json');
const STUDIOS_JSON = resolve(ROOT, 'src/lib/film/data/studios-materiel.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

mkdirSync(OUT_DIR, { recursive: true });

const BAD_IMG = /whatsapp|globe\.png|favicon|sprite|1x1|pixel|icon[_-]|logo[_-]?(only)?|svg/i;

function decodeEntities(input) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html, prop) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i',
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return null;
}

function firstGoodImg(html, base) {
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (BAD_IMG.test(src)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(src) && !/wp-content|wixstatic|cloudinary/i.test(src)) {
      continue;
    }
    try {
      return new URL(src, base).href;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extFromUrl(url) {
  try {
    const ext = extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  } catch {
    /* ignore */
  }
  return '.jpg';
}

function extractPhone(html) {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' '));
  const m = text.match(/\+?237[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,3}/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

function extractEmail(html) {
  const m = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  return m ? m[1] : null;
}

/** Parse curated TS for rental objects with id + website. */
function parseCuratedSeeds(src) {
  const blocks = [...src.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?\n\s*\},/g)];
  const out = [];
  for (const m of blocks) {
    const block = m[0];
    const id = m[1];
    const name = block.match(/name:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'");
    const website = block.match(/website:\s*'((?:\\'|[^'])*)'/)?.[1];
    const phone = block.match(/phone:\s*'((?:\\'|[^'])*)'/)?.[1];
    const email = block.match(/email:\s*'((?:\\'|[^'])*)'/)?.[1];
    const whatsapp = block.match(/whatsapp:\s*'((?:\\'|[^'])*)'/)?.[1];
    const address = block.match(/address:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'");
    const city = block.match(/city:\s*'((?:\\'|[^'])*)'/)?.[1];
    const category = block.match(/category:\s*'([^']+)'/)?.[1];
    if (!id || !name) continue;
    out.push({ id, name, website: website || null, phone, email, whatsapp, address, city, category });
  }
  return out;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 16000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    console.warn(`FETCH FAIL ${url}: ${err.message}`);
    return null;
  }
}

async function download(url, dest) {
  if (existsSync(dest)) return true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 28000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    const st = (await import('node:fs')).statSync(dest);
    if (st.size < 2500) {
      (await import('node:fs')).unlinkSync(dest);
      return false;
    }
    return true;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`IMG FAIL ${url}: ${err.message}`);
    return false;
  }
}

const curatedSrc = readFileSync(CURATED, 'utf8');
const seeds = parseCuratedSeeds(curatedSrc);
console.log(`Curated rentals parsed: ${seeds.length}`);

/** Reuse studio covers when same id already scraped. */
let studioById = {};
if (existsSync(STUDIOS_JSON)) {
  const sj = JSON.parse(readFileSync(STUDIOS_JSON, 'utf8'));
  for (const item of sj.items || []) {
    if (item.image && !BAD_IMG.test(item.image)) studioById[item.id] = item.image;
  }
}

const enriched = {};
for (const seed of seeds) {
  console.log(`→ ${seed.name}`);
  let image = studioById[seed.id] || null;
  let phone = seed.phone || null;
  let email = seed.email || null;
  let remoteImage = null;

  if (!image && seed.website) {
    const html = await fetchText(seed.website);
    if (html) {
      if (!phone) phone = extractPhone(html);
      if (!email) email = extractEmail(html);
      remoteImage = meta(html, 'og:image') || meta(html, 'twitter:image') || firstGoodImg(html, seed.website);
      if (remoteImage && !BAD_IMG.test(remoteImage)) {
        try {
          remoteImage = new URL(remoteImage, seed.website).href;
        } catch {
          /* keep */
        }
        const dest = join(OUT_DIR, `${seed.id}${extFromUrl(remoteImage)}`);
        const ok = await download(remoteImage, dest);
        if (ok) image = `/film/covers/rentals/${seed.id}${extFromUrl(remoteImage)}`;
      }
    }
  }

  // No website in output — UI must not expose it.
  enriched[seed.id] = {
    id: seed.id,
    image,
    phone: phone || null,
    email: email || null,
    whatsapp: seed.whatsapp || null,
    address: seed.address || null,
    city: seed.city || null,
    scrapedAt: new Date().toISOString(),
  };
  console.log(`  image=${image || 'none'} phone=${phone || '—'}`);
}

writeFileSync(
  OUT_JSON,
  JSON.stringify({ scrapedAt: new Date().toISOString(), byId: enriched }, null, 2),
);
console.log(`Wrote ${Object.keys(enriched).length} → ${OUT_JSON}`);
