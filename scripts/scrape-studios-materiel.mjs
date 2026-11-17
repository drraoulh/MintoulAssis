/**
 * Fetch studio / matériel websites: extract title, description, og:image,
 * download covers into public/film/covers/studios/, write studios-materiel.json.
 *
 * Usage: node scripts/scrape-studios-materiel.mjs
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public/film/covers/studios');
const OUT_JSON = resolve(ROOT, 'src/lib/film/data/studios-materiel.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(dirname(OUT_JSON), { recursive: true });

/** Seed list — real Cameroon AV studios / gear rental sites. */
const SEEDS = [
  {
    id: 'faella-studio-douala',
    name: 'FAELLA Studio',
    category: 'studio',
    kind: 'studio',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    website: 'https://studio.faellaict.com/studio-equipment-rentals/',
    phone: '+237 670 397 804 / +237 690 179 683',
    email: 'studio@faellaict.com',
    address: 'Ndobo, en face de Petrolex, Douala',
    specialtyFr:
      'Studios photo/vidéo, location caméras, objectifs, éclairage et audio — forfaits flexibles.',
    specialtyEn:
      'Photo/video studios, camera, lens, lighting and audio rental — flexible packages.',
  },
  {
    id: 'nice-communication-douala',
    name: 'Nice Communication',
    category: 'equipment-rental',
    kind: 'camera',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    website: 'http://www.nicecommunication.net/service/audio-visuel',
    phone: '+237 695 558 018',
    email: 'contact@nicecommunication.net',
    address: '345 rue Sylvani, derrière Zepol, Akwa',
    specialtyFr: 'Équipe et matériel de tournage : caméras, micros, éclairage, stabilisateurs.',
    specialtyEn: 'Crew and shooting gear: cameras, mics, lighting, stabilisers.',
  },
  {
    id: 'fahrenheit-pictures-yaounde',
    name: 'Fahrenheit Pictures',
    category: 'studio',
    kind: 'studio',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    website: 'https://fahrenheitpictures.com/rent-equipment/',
    phone: '+237 674 089 565',
    email: 'hq@fahrenheitpictures.com',
    address: 'Derrière la pharmacie Xavyo, Olézoa',
    specialtyFr: 'Location de studio et de matériel de tournage à Yaoundé.',
    specialtyEn: 'Studio and filming gear rental in Yaoundé.',
  },
  {
    id: 'ewaka-group-douala',
    name: 'EWAKA Group',
    category: 'equipment-rental',
    kind: 'camera',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    website: 'https://ewakagroup.com/equipment-rental-technical-services/',
    phone: '+237 651 58 76 33 / +237 689 62 82 55',
    email: 'info@ewakagroup.com',
    address: 'Bois des Singes, Douala',
    specialtyFr:
      'Caméras cinéma 4K/8K, lumière Aputure/Godox, son, drones, studios et support technique.',
    specialtyEn:
      '4K/8K cinema cameras, Aputure/Godox lighting, sound, drones, studios and tech support.',
  },
  {
    id: 'electro-plomb-douala',
    name: 'Electro-Plomb (Douala)',
    category: 'equipment-rental',
    kind: 'grip',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    website: 'https://electro-plomb.com/location-engins',
    phone: '+237 676 822 306 / +237 233 432 901',
    email: 'info@electro-plomb.com',
    address: 'Avenue du Dr Jamot, face à l’ancienne porte de Laquintinie',
    specialtyFr: 'Nacelles, camions grue, engins — plans en hauteur et logistique lourde.',
    specialtyEn: 'Aerial lifts, crane trucks — high-angle shots and heavy logistics.',
  },
  {
    id: 'electro-plomb-yaounde',
    name: 'Electro-Plomb (Yaoundé)',
    category: 'equipment-rental',
    kind: 'grip',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    website: 'https://electro-plomb.com/location-engins',
    phone: '+237 222 22 55 30',
    email: 'info@electro-plomb.com',
    address: 'Carrefour Abbia, sous-sol immeuble AXA',
    specialtyFr: 'Nacelles et engins de chantier pour tournages en hauteur à Yaoundé.',
    specialtyEn: 'Aerial lifts and plant for high-angle shoots in Yaoundé.',
  },
  {
    id: 'vivaterra-generators',
    name: 'VivaTerra — Groupes électrogènes',
    category: 'equipment-rental',
    kind: 'lighting',
    cityFr: 'Kouoptamo',
    cityEn: 'Kouoptamo',
    regionId: 'ouest',
    website: 'https://www.vivaterracameroun.com/product-page/location-groupe-electrogene',
    phone: '+237 655 55 00 11',
    email: 'contact@vivaterracameroun.com',
    address: 'Fabrique VivaTerra, Kouoptamo',
    specialtyFr: 'Location de groupes électrogènes dès 5 000 FCFA / jour.',
    specialtyEn: 'Generator rental from 5,000 FCFA / day.',
  },
  {
    id: 'adri-solutions-yaounde',
    name: 'ADRI Solutions',
    category: 'equipment-rental',
    kind: 'lighting',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    website: 'https://www.adrisolutions.com/services/location-de-materiel',
    phone: '+237 695 434 661',
    email: 'contact@adrisolutions.com',
    address: 'Immeuble CCA, face pharmacie du Soleil',
    specialtyFr: 'Tentes, chapiteaux, podiums, LED, écrans et sono pour plateaux / events.',
    specialtyEn: 'Tents, marquees, stages, LED, screens and PA for sets / events.',
  },
];

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

function firstImg(html, base) {
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (/avatar|logo|icon|sprite|1x1|pixel|svg/i.test(src)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(src) && !src.includes('wp-content')) continue;
    try {
      return new URL(src, base).href;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function strip(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function extFromUrl(url) {
  try {
    const ext = extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {
    /* ignore */
  }
  return '.jpg';
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18000);
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
    console.warn(`IMG FAIL ${url}: ${err.message}`);
    return false;
  }
}

const results = [];
for (const seed of SEEDS) {
  console.log(`→ ${seed.name}`);
  const html = seed.website ? await fetchText(seed.website) : null;
  let remoteImage = null;
  let pageTitle = null;
  let pageDesc = null;
  if (html) {
    pageTitle = meta(html, 'og:title') || strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    pageDesc =
      meta(html, 'og:description') ||
      meta(html, 'description') ||
      null;
    remoteImage =
      meta(html, 'og:image') ||
      meta(html, 'twitter:image') ||
      firstImg(html, seed.website);
  }

  let image = null;
  if (remoteImage) {
    try {
      remoteImage = new URL(remoteImage, seed.website).href;
    } catch {
      /* keep */
    }
    const dest = join(OUT_DIR, `${seed.id}${extFromUrl(remoteImage)}`);
    const ok = await download(remoteImage, dest);
    if (ok) image = `/film/covers/studios/${seed.id}${extFromUrl(remoteImage)}`;
  }

  const notesFr =
    (pageDesc && pageDesc.length > 40 ? pageDesc.slice(0, 420) : null) || seed.specialtyFr;
  const notesEn = seed.specialtyEn;

  results.push({
    ...seed,
    pageTitle: pageTitle || seed.name,
    notesFr,
    notesEn,
    image,
    remoteImage: remoteImage || null,
    scrapedAt: new Date().toISOString(),
  });
  console.log(`  image=${image || 'none'}`);
}

writeFileSync(OUT_JSON, JSON.stringify({ scrapedAt: new Date().toISOString(), items: results }, null, 2));
console.log(`Wrote ${results.length} items → ${OUT_JSON}`);
console.log(`Covers dir: ${OUT_DIR}`);
