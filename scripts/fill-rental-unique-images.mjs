/**
 * Ensure every curated rental has a UNIQUE cover image (no shared fallback / hash).
 * Sources: shop website og:image (if unused), then Wikimedia Commons, then Openverse.
 *
 * Usage: node scripts/fill-rental-unique-images.mjs
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public/film/covers/rentals');
const ENRICHED = resolve(ROOT, 'src/lib/film/data/rentals-enriched.json');
const CURATED = resolve(ROOT, 'src/lib/film/data/rentals-curated.ts');
const UA =
  'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; rental-covers) Mozilla/5.0';

mkdirSync(OUT_DIR, { recursive: true });

function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function fileHash(path) {
  return sha256(readFileSync(path));
}

function parseCurated(src) {
  const blocks = [...src.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?\n\s*\},/g)];
  return blocks.map((m) => {
    const block = m[0];
    return {
      id: m[1],
      name: block.match(/name:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'") || m[1],
      category: block.match(/category:\s*'([^']+)'/)?.[1] || 'vehicle',
      city: block.match(/city:\s*'((?:\\'|[^'])*)'/)?.[1] || '',
      brand: block.match(/brand:\s*'((?:\\'|[^'])*)'/)?.[1] || '',
      website: block.match(/website:\s*'((?:\\'|[^'])*)'/)?.[1] || null,
      source: block.match(/source:\s*'((?:\\'|[^'])*)'/)?.[1] || null,
    };
  });
}

const CATEGORY_QUERIES = {
  vehicle: [
    'car rental fleet sedan',
    'airport car hire vehicles',
    'SUV rental Africa',
    'Toyota Land Cruiser Africa',
    'Peugeot rental car',
    'Mercedes taxi Africa',
    'Hyundai rental sedan',
    '4x4 rental vehicle dirt road',
    'luxury car hire Africa',
    'compact car rental lot',
    'pickup truck rental',
    'minibus hire Africa',
    'airport shuttle van rental',
    'SUV black rental',
  ],
  equipment: [
    'cinema camera rental kit',
    'film lighting LED panel',
    'video production studio lights',
    'aerial lift cherry picker',
    'construction crane truck',
    'diesel generator rental',
    'film set lighting equipment',
    'professional camera gimbal',
  ],
  event: [
    'event marquee tent rental',
    'wedding canopy chairs',
    'LED stage lighting event',
    'party tent outdoor Africa',
  ],
  boat: [
    'pleasure boat rental tropical',
    'zodiac boat river Africa',
    'jet ski rental beach',
    'kayak paddle tropical river',
  ],
  'two-wheel': ['motorbike rental Africa', 'scooter hire tropical'],
};

function queriesFor(shop, index) {
  const pool = CATEGORY_QUERIES[shop.category] || CATEGORY_QUERIES.vehicle;
  const brand = (shop.brand || shop.name).split(/[—·\-]/)[0].trim();
  return [
    `${brand} ${shop.city} Cameroon`,
    `${brand} car rental`,
    `${shop.name} ${shop.city}`,
    pool[index % pool.length],
    pool[(index + 3) % pool.length],
    pool[(index + 7) % pool.length],
  ].filter(Boolean);
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(t);
    return null;
  }
}

function metaImage(html) {
  const patterns = [
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && !/whatsapp|favicon|icon|1x1|pixel/i.test(m[1])) return m[1];
  }
  return null;
}

async function wikimediaUrls(query, limit = 8) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('origin', '*');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrnamespace', '6');
  api.searchParams.set('gsrlimit', String(limit));
  api.searchParams.set('gsrsearch', query);
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|size|mime');
  api.searchParams.set('iiurlwidth', '1280');
  const data = await fetchJson(api.href);
  const pages = data?.query?.pages || {};
  const urls = [];
  for (const p of Object.values(pages)) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (!/^image\/(jpeg|png|webp)/i.test(info.mime || '')) continue;
    if ((info.size || 0) < 8000) continue;
    const u = info.thumburl || info.url;
    if (u) urls.push(u);
  }
  return urls;
}

async function openverseUrls(query, limit = 8) {
  const api = new URL('https://api.openverse.org/v1/images/');
  api.searchParams.set('q', query);
  api.searchParams.set('page_size', String(limit));
  api.searchParams.set('license', 'pdm,cc0,cc-by');
  api.searchParams.set('extension', 'jpg,png');
  const data = await fetchJson(api.href);
  return (data?.results || [])
    .map((r) => r.url || r.thumbnail)
    .filter(Boolean);
}

async function downloadUnique(url, dest, usedHashes) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 28000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4000) throw new Error('too small');
    const hash = sha256(buf);
    if (usedHashes.has(hash)) throw new Error('duplicate hash');
    writeFileSync(dest, buf);
    usedHashes.add(hash);
    return hash;
  } catch (err) {
    clearTimeout(t);
    if (existsSync(dest)) {
      try {
        unlinkSync(dest);
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
}

function extFromUrl(url) {
  try {
    const e = extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(e)) return e === '.jpeg' ? '.jpg' : e;
  } catch {
    /* ignore */
  }
  return '.jpg';
}

const shops = parseCurated(readFileSync(CURATED, 'utf8'));
const enriched = existsSync(ENRICHED)
  ? JSON.parse(readFileSync(ENRICHED, 'utf8'))
  : { byId: {} };
enriched.byId = enriched.byId || {};

/** Track hashes already used by assigned covers. */
const usedHashes = new Set();
const usedPaths = new Set();

function registerExisting(path) {
  if (!path || !path.startsWith('/film/covers/')) return false;
  const abs = resolve(ROOT, 'public' + path);
  if (!existsSync(abs)) return false;
  try {
    const h = fileHash(abs);
    if (usedHashes.has(h)) return false;
    usedHashes.add(h);
    usedPaths.add(path);
    return true;
  } catch {
    return false;
  }
}

// First pass: keep unique existing assignments; drop duplicates / missing files.
for (const shop of shops) {
  const row = enriched.byId[shop.id] || { id: shop.id };
  const img = row.image;
  if (img && registerExisting(img)) {
    enriched.byId[shop.id] = { ...row, image: img };
  } else {
    enriched.byId[shop.id] = { ...row, id: shop.id, image: null };
  }
}

let filled = 0;
let i = 0;
for (const shop of shops) {
  const row = enriched.byId[shop.id];
  if (row.image) {
    console.log(`keep ${shop.id} → ${row.image}`);
    i++;
    continue;
  }

  console.log(`fill ${shop.id} (${shop.name})`);
  const candidates = [];

  // Try shop website / source page once
  for (const page of [shop.website, shop.source].filter(Boolean)) {
    if (/exa\.ai|goafricaonline|facebook|findglocal/i.test(page)) continue;
    const html = await fetchText(page);
    if (!html) continue;
    let og = metaImage(html);
    if (og) {
      try {
        og = new URL(og, page).href;
      } catch {
        /* keep */
      }
      if (!/whatsapp|globe\.png|favicon/i.test(og)) candidates.push(og);
    }
  }

  for (const q of queriesFor(shop, i)) {
    const wiki = await wikimediaUrls(q, 6);
    candidates.push(...wiki);
    if (candidates.length < 4) {
      const ov = await openverseUrls(q, 6);
      candidates.push(...ov);
    }
    if (candidates.length >= 10) break;
  }

  let assigned = null;
  for (const url of candidates) {
    const ext = extFromUrl(url);
    const destName = `${shop.id}${ext}`;
    const dest = join(OUT_DIR, destName);
    const publicPath = `/film/covers/rentals/${destName}`;
    if (usedPaths.has(publicPath)) continue;
    try {
      await downloadUnique(url, dest, usedHashes);
      usedPaths.add(publicPath);
      assigned = publicPath;
      console.log(`  OK ${publicPath} ← ${url.slice(0, 80)}`);
      break;
    } catch (err) {
      /* try next */
    }
  }

  if (!assigned) {
    console.warn(`  FAIL no unique image for ${shop.id}`);
  } else {
    filled++;
    enriched.byId[shop.id] = {
      ...row,
      id: shop.id,
      image: assigned,
      scrapedAt: new Date().toISOString(),
    };
  }
  i++;
}

enriched.scrapedAt = new Date().toISOString();
writeFileSync(ENRICHED, JSON.stringify(enriched, null, 2));
console.log(`Done. Newly filled=${filled}. Unique covers=${usedPaths.size}/${shops.length}`);
