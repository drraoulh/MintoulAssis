import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LISTINGS = resolve("data/ayilaa/listings.json");
const DETAILS = resolve("data/ayilaa/details.json");

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
const details = JSON.parse(readFileSync(DETAILS, "utf8"));

let fixedNames = 0;
let fixedImages = 0;

const next = details.map((d) => {
  const listing = byId.get(String(d.external_id));
  let name = d.name;
  if (isBrandName(name)) {
    if (listing?.name && !isBrandName(listing.name)) {
      name = listing.name;
      fixedNames++;
    }
  }

  const candidates = [...(d.images || []), d.image, listing?.image]
    .map(normalizeImageUrl)
    .filter((u) => u && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u));
  const images = [...new Set(candidates)];
  if (listing?.image) {
    const cover = normalizeImageUrl(listing.image);
    if (cover && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(cover)) {
      const without = images.filter((u) => u !== cover);
      images.length = 0;
      images.push(cover, ...without);
    }
  }

  if (JSON.stringify(images) !== JSON.stringify(d.images || [])) fixedImages++;

  const row = {
    ...d,
    name,
    image: images[0] || normalizeImageUrl(listing?.image) || null,
    images,
  };
  row.kb_text = rebuildKb(row);
  return row;
});

writeFileSync(DETAILS, JSON.stringify(next, null, 2));
const stillBad = next.filter((d) => isBrandName(d.name)).length;
const sample = next.find((d) => String(d.external_id) === "12184");
console.log({
  total: next.length,
  fixedNames,
  fixedImages,
  stillBad,
  sample: sample
    ? { name: sample.name, image: sample.image, images0: sample.images?.[0] }
    : null,
});
