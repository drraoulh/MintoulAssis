/**
 * Builds src/lib/film/data/osm-places.json from OpenStreetMap (© OpenStreetMap contributors, ODbL):
 * - rentals: car / vehicle / boat / equipment / event rental shops
 * - stays: hotels, villas, guest houses, houses usable as filming locations
 * - villages: notable villages (name list below)
 *
 * Usage: node scripts/build-film-osm-data.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'src/lib/film/data/osm-places.json');
const BBOX = '1.65,8.45,13.1,16.2'; // Cameroon (S,W,N,E)
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Villages often used or suited for shoots → expected region (disambiguates homonyms). */
const VILLAGES = {
  'Ebodjé': 'sud', 'Londji': 'sud', 'Grand Batanga': 'sud', 'Lolodorf': 'sud', 'Campo': 'sud',
  'Bafut': 'nord-ouest', 'Oku': 'nord-ouest', 'Elak': 'nord-ouest', 'Wum': 'nord-ouest',
  'Ndop': 'nord-ouest', 'Bali': 'nord-ouest', 'Batibo': 'nord-ouest',
  'Rhumsiki': 'extreme-nord', 'Djingliya': 'extreme-nord', 'Tourou': 'extreme-nord',
  'Mokolo': 'extreme-nord', 'Oudjilla': 'extreme-nord', 'Mora': 'extreme-nord',
  'Bana': 'ouest', 'Bandjoun': 'ouest', 'Bamendjou': 'ouest', 'Bangangté': 'ouest',
  'Batoufam': 'ouest', 'Foumban': 'ouest', 'Bamenyam': 'ouest', 'Fongo-Tongo': 'ouest', 'Dschang': 'ouest',
  'Mbalmayo': 'centre', 'Nanga-Eboko': 'centre',
  'Idenau': 'sud-ouest', 'Bota': 'sud-ouest', 'Mamfé': 'sud-ouest',
  'Mindourou': 'est', 'Poli': 'nord', 'Tcholliré': 'nord', 'Rey Bouba': 'nord',
};

/** Accent-insensitive regex fragment ("Ebodjé" also matches "Ebodje"). */
function looseName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]/g, '[- ]?')
    .replace(/e/gi, '[eéèê]')
    .replace(/a/gi, '[aàâ]')
    .replace(/o/gi, '[oô]')
    .replace(/u/gi, '[uûù]')
    .replace(/i/gi, '[iîï]');
}

/** Cameroon border (simplified) for point-in-polygon — the bbox also covers neighbours. */
async function cameroonPolygon() {
  const url =
    'https://nominatim.openstreetmap.org/search?country=Cameroon&format=json&limit=1&polygon_geojson=1&polygon_threshold=0.005';
  const res = await fetch(url, { headers: { 'User-Agent': 'SmartMboaFilm/1.0 (smartmboatour.com)' } });
  const [hit] = await res.json();
  const g = hit.geojson;
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const CM = await cameroonPolygon();
const inCameroon = (e) => CM.some(([outer, ...holes]) => inRing(e.lon, e.lat, outer) && !holes.some((h) => inRing(e.lon, e.lat, h)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(body, label) {
  const q = `[out:json][timeout:120][bbox:${BBOX}];(${body});out center tags;`;
  let wait = 5_000;
  for (let attempt = 0; attempt < 8; attempt++) {
    const host = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(host, {
        method: 'POST',
        body: new URLSearchParams({ data: q }),
        headers: { 'User-Agent': 'SmartMboaFilm/1.0 (smartmboatour.com; film locations)' },
        signal: AbortSignal.timeout(150_000),
      });
      if (res.ok) {
        const json = await res.json();
        console.log(`${label}: ${json.elements.length} elements (${host})`);
        return json.elements.map((e) => ({
          osm: `${e.type}/${e.id}`,
          lat: e.lat ?? e.center?.lat,
          lon: e.lon ?? e.center?.lon,
          tags: e.tags || {},
        }));
      }
      console.warn(`${label}: ${host} → ${res.status}, retry in ${wait / 1000}s`);
    } catch (err) {
      console.warn(`${label}: ${host} → ${String(err).slice(0, 80)}, retry in ${wait / 1000}s`);
    }
    await sleep(wait);
    wait = Math.min(wait * 2, 90_000);
  }
  throw new Error(`${label}: all Overpass attempts failed`);
}

const pick = (t, ...keys) => keys.map((k) => t[k]).find((v) => typeof v === 'string' && v.trim())?.trim();

function contact(t) {
  const street = [pick(t, 'addr:housenumber'), pick(t, 'addr:street')].filter(Boolean).join(' ');
  return {
    phone: pick(t, 'phone', 'contact:phone', 'contact:mobile', 'mobile'),
    website: pick(t, 'website', 'contact:website', 'url'),
    email: pick(t, 'email', 'contact:email'),
    whatsapp: pick(t, 'contact:whatsapp'),
    facebook: pick(t, 'contact:facebook', 'facebook'),
    openingHours: pick(t, 'opening_hours'),
    address: [street, pick(t, 'addr:suburb', 'addr:district')].filter(Boolean).join(', ') || undefined,
    city: pick(t, 'addr:city', 'is_in:city'),
  };
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null));
}

function rentalCategory(t) {
  const blob = `${t.amenity || ''} ${t.shop || ''} ${t.office || ''} ${t.rental || ''} ${t.name || ''}`.toLowerCase();
  if (/boat/.test(blob)) return 'boat';
  if (/bicycle|motorcycle|\bmotos?\b/.test(blob)) return 'two-wheel';
  if (/car|vehicle|auto|voiture|4x4|bus|truck|camion/.test(blob)) return 'vehicle';
  if (/party|event|tent|chaise|sono|sound|décor|decor/.test(blob)) return 'event';
  return 'equipment';
}

function stayKind(t) {
  const name = (t.name || '').toLowerCase();
  if (/villa/.test(name)) return 'villa';
  if (/maison|house|case|résidence|residence|appart|apartment|home/.test(name) || /apartment|chalet/.test(t.tourism || '')) {
    return 'house';
  }
  if (t.tourism === 'guest_house') return /lodge|camp/.test(name) ? 'hotel' : 'house';
  return 'hotel';
}

async function wikidataImages(ids) {
  const out = {};
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 40) {
    const batch = unique.slice(i, i + 40);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SmartMboaFilm/1.0' } });
      const json = await res.json();
      for (const [id, ent] of Object.entries(json.entities || {})) {
        const file = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (file) {
          out[id] = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=960`;
        }
      }
    } catch {
      /* images are optional */
    }
  }
  return out;
}

function commonsImage(t) {
  const c = pick(t, 'wikimedia_commons');
  if (c && /^File:/i.test(c)) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(c.slice(5).replace(/ /g, '_'))}?width=960`;
  }
  const img = pick(t, 'image');
  return img && /^https:\/\/(upload|commons)\.wikimedia\.org\//.test(img) ? img : undefined;
}

const rentalsRaw = await overpass(
  [
    'nwr["amenity"~"^(car_rental|vehicle_rental|boat_rental|bicycle_rental|motorcycle_rental)$"];',
    'nwr["shop"~"^(rental|car_rental|tool_hire|party|hire)$"];',
    'nwr["office"~"rental"];',
  ].join(''),
  'rentals',
);

const staysRaw = await overpass(
  'nwr["tourism"~"^(hotel|guest_house|apartment|chalet|motel)$"]["name"];',
  'stays',
);

const villageRe = Object.keys(VILLAGES).map(looseName).join('|');
const villagesRaw = await overpass(
  `node["place"~"^(village|town|hamlet|isolated_dwelling)$"]["name"~"^(${villageRe})$",i];`,
  'villages',
);

const rentals = rentalsRaw
  .filter((e) => e.lat && e.lon && pick(e.tags, 'name') && inCameroon(e))
  .map((e) => ({
    id: e.osm.replace('/', '-'),
    osm: e.osm,
    name: pick(e.tags, 'name'),
    category: rentalCategory(e.tags),
    lat: e.lat,
    lon: e.lon,
    ...clean(contact(e.tags)),
    brand: pick(e.tags, 'brand', 'operator'),
    description: pick(e.tags, 'description', 'description:fr'),
  }))
  .map(clean);

const stayCandidates = staysRaw.filter((e) => e.lat && e.lon && pick(e.tags, 'name') && inCameroon(e));
console.log(`stays in Cameroon: ${stayCandidates.length}`);
const imgs = await wikidataImages(stayCandidates.map((e) => e.tags.wikidata));

// Keep the richest records: photo / stars / contact details first, capped per city
const scored = stayCandidates
  .map((e) => {
    const t = e.tags;
    const score =
      (imgs[t.wikidata] || commonsImage(t) ? 6 : 0) +
      (t.stars ? 3 + Number(t.stars) : 0) +
      (pick(t, 'website', 'contact:website') ? 2 : 0) +
      (pick(t, 'phone', 'contact:phone') ? 2 : 0) +
      (t['addr:city'] ? 1 : 0) +
      (/villa|maison|résidence|lodge/i.test(t.name) ? 2 : 0);
    return { e, score };
  })
  .sort((a, b) => b.score - a.score);

const perCity = new Map();
const stays = [];
for (const { e, score } of scored) {
  if (score < 2) continue;
  const t = e.tags;
  // ~0.3° cells as a city proxy (addr:city is often missing or inconsistent)
  const city = `${Math.round(e.lat * 3)}:${Math.round(e.lon * 3)}`;
  const n = perCity.get(city) || 0;
  if (n >= 8) continue;
  perCity.set(city, n + 1);
  stays.push(
    clean({
      id: e.osm.replace('/', '-'),
      osm: e.osm,
      name: pick(t, 'name'),
      kind: stayKind(t),
      lat: e.lat,
      lon: e.lon,
      stars: t.stars ? Number(t.stars) : undefined,
      rooms: t.rooms ? Number(t.rooms) : undefined,
      image: imgs[t.wikidata] || commonsImage(t),
      ...contact(t),
    }),
  );
  if (stays.length >= 120) break;
}

const seenVillage = new Set();
const villages = villagesRaw
  .filter((e) => e.lat && e.lon && inCameroon(e))
  .map((e) => ({ e, name: pick(e.tags, 'name') }))
  .filter(({ name }) => {
    const k = name.toLowerCase();
    if (seenVillage.has(k)) return false;
    seenVillage.add(k);
    return true;
  })
  .map(({ e, name }) =>
    clean({
      id: e.osm.replace('/', '-'),
      osm: e.osm,
      name,
      kind: 'village',
      lat: e.lat,
      lon: e.lon,
      wikidata: e.tags.wikidata,
      population: e.tags.population ? Number(e.tags.population) : undefined,
    }),
  );

const villageImgs = await wikidataImages(villages.map((v) => v.wikidata));
for (const v of villages) {
  if (v.wikidata && villageImgs[v.wikidata]) v.image = villageImgs[v.wikidata];
  delete v.wikidata;
}

/** Special:FilePath redirects — store the final upload.wikimedia.org thumbnail instead. */
async function resolveCommons(url) {
  if (!url || !/Special:FilePath/.test(url)) return url;
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'SmartMboaFilm/1.0' } });
    const loc = res.headers.get('location');
    return loc && /^https:\/\/upload\.wikimedia\.org\//.test(loc) ? loc : url;
  } catch {
    return url;
  }
}

for (const rec of [...stays, ...villages]) {
  if (rec.image) rec.image = await resolveCommons(rec.image);
}

/** Nominatim reverse geocoding → official region id + city (1 req/s per usage policy). */
const REGION_IDS = [
  ['adamaoua', /adamaoua|adamawa/],
  ['centre', /centre|center/],
  ['est', /^(r[ée]gion de l['’])?est$|^east/],
  ['extreme-nord', /extr[êe]me|far.?north/],
  ['littoral', /littoral/],
  ['nord-ouest', /nord.?ouest|north.?west/],
  ['nord', /^(r[ée]gion du )?nord$|^north/],
  ['ouest', /^(r[ée]gion de l['’])?ouest$|^west/],
  ['sud-ouest', /sud.?ouest|south.?west/],
  ['sud', /^(r[ée]gion du )?sud$|^south/],
];

async function reverse(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=fr`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartMboaFilm/1.0 (smartmboatour.com; film locations)' } });
    if (!res.ok) return {};
    const j = await res.json();
    const a = j.address || {};
    const state = (a.state || a.region || '').toLowerCase().replace(/^r[ée]gion (du |de l['’]|de la |des )?/, '');
    const regionId = REGION_IDS.find(([, re]) => re.test(state))?.[0];
    return { regionId, city: a.city || a.town || a.village || a.municipality || a.county };
  } catch {
    return {};
  }
}

for (const rec of [...rentals, ...stays, ...villages]) {
  const r = await reverse(rec.lat, rec.lon);
  if (r.regionId) rec.regionId = r.regionId;
  // Geocoded locality is cleaner than free-text addr:city ("Kribi II", "Douala, Cameroun")
  if (r.city && rec.kind !== 'village') rec.city = r.city;
  await sleep(1_100);
}
console.log('reverse geocoding done');

// Drop homonyms in the wrong region (e.g. the Mokolo district of Yaoundé)
const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[- ]/g, '');
const expectedRegion = Object.fromEntries(Object.entries(VILLAGES).map(([k, v]) => [strip(k), v]));
for (let i = villages.length - 1; i >= 0; i--) {
  const want = expectedRegion[strip(villages[i].name)];
  if (want && villages[i].regionId && villages[i].regionId !== want) villages.splice(i, 1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      attribution: '© OpenStreetMap contributors (ODbL) — images: Wikimedia Commons',
      rentals,
      stays,
      villages,
    },
    null,
    1,
  )}\n`,
);
console.log(`wrote ${OUT}: ${rentals.length} rentals, ${stays.length} stays, ${villages.length} villages`);
