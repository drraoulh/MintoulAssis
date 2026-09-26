/**
 * Répare noms "Ayila" + URLs images tronquées/espaces
 * à partir des listings, sans re-scraper.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const DATA_DIR = resolve("data/ayilaa");
const LISTINGS = resolve(DATA_DIR, "listings.json");
const DETAILS = resolve(DATA_DIR, "details.json");

function loadEnv() {
  const envFile = readFileSync(resolve(".env.local"), "utf8");
  return Object.fromEntries(
    envFile
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
}

function isBrandName(name) {
  return !name || /^ayila['’`]?a?$/i.test(String(name).trim());
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim().replace(/&amp;/g, "&");
  if (!cleaned.startsWith("http")) return null;
  try {
    const url = new URL(cleaned.replace(/ /g, "%20"));
    url.pathname = url.pathname
      .split("/")
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    return url.toString();
  } catch {
    return cleaned.replace(/ /g, "%20");
  }
}

function rebuildKb(d) {
  return [
    `Nom: ${d.name}`,
    `Catégorie: restauration`,
    d.city ? `Ville: ${d.city}` : null,
    d.neighborhood ? `Quartier: ${d.neighborhood}` : null,
    d.state ? `Région/État: ${d.state}` : null,
    d.price_from ? `Prix à partir de: ${d.price_from} XAF / personne` : null,
    d.rating ? `Note: ${d.rating}/5` : null,
    d.cuisines?.length ? `Types: ${d.cuisines.join(", ")}` : null,
    d.description ? `Description: ${d.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const listings = JSON.parse(readFileSync(LISTINGS, "utf8"));
const byId = new Map(listings.map((l) => [String(l.external_id), l]));

let details = existsSync(DETAILS) ? JSON.parse(readFileSync(DETAILS, "utf8")) : [];
let fixedNames = 0;
let fixedImages = 0;

details = details.map((d) => {
  const listing = byId.get(String(d.external_id));
  let changed = false;
  let name = d.name;
  if (isBrandName(name) && listing?.name && !isBrandName(listing.name)) {
    name = listing.name;
    fixedNames++;
    changed = true;
  }

  const rawImages = [...(d.images || []), d.image, listing?.image].filter(Boolean);
  const normalized = rawImages
    .map(normalizeImageUrl)
    .filter((u) => u && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u));
  // Prefer listing cover if detail gallery was truncated
  const images = [...new Set(normalized)];
  if (listing?.image) {
    const cover = normalizeImageUrl(listing.image);
    if (cover && !images.includes(cover)) images.unshift(cover);
  }

  if (JSON.stringify(images) !== JSON.stringify(d.images || [])) {
    fixedImages++;
    changed = true;
  }

  const next = {
    ...d,
    name,
    image: images[0] || normalizeImageUrl(listing?.image) || d.image,
    images,
  };
  if (changed) next.kb_text = rebuildKb(next);
  return next;
});

writeFileSync(DETAILS, JSON.stringify(details, null, 2));
console.log(`Local repair: names=${fixedNames}, images=${fixedImages}, total=${details.length}`);

const env = loadEnv();
const sql = postgres(env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 30,
});

try {
  let updated = 0;
  for (const d of details) {
    if (!d.external_id) continue;
    const images = d.images || [];
    const rows = await sql`
      update public.places set
        name = ${d.name},
        kb_text = ${d.kb_text || null},
        short_description = coalesce(${d.short_description || null}, short_description),
        description = coalesce(${d.description || null}, description),
        updated_at = now()
      where source = 'ayilaa' and external_id = ${String(d.external_id)}
      returning id
    `;
    if (!rows.length) continue;
    const placeId = rows[0].id;

    if (images.length) {
      await sql`delete from public.place_images where place_id = ${placeId}`;
      await sql`
        insert into public.place_images (place_id, url, alt)
        select ${placeId}, x.url, ${d.name}
        from unnest(${images}::text[]) as x(url)
      `;
    } else if (d.image) {
      await sql`delete from public.place_images where place_id = ${placeId}`;
      await sql`
        insert into public.place_images (place_id, url, alt)
        values (${placeId}, ${d.image}, ${d.name})
      `;
    }

    updated++;
    if (updated % 100 === 0) console.log(`DB repair ${updated}/${details.length}`);
  }
  const count = await sql`select count(*)::int as n from places where source='ayilaa' and name ilike 'ayila%'`;
  console.log(`DB repair done: ${updated}. Remaining Ayila-like names: ${count[0].n}`);
} finally {
  await sql.end({ timeout: 5 });
}
