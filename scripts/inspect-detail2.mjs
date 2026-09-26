import { readFileSync } from "node:fs";
import { join } from "node:path";

const h = readFileSync(join(process.env.TEMP, "ayilaa-detail.html"), "utf8");

// Look for tab content / about / presentation
const tabs = [...h.matchAll(/id="([^"]*tab[^"]*)"|tab-pane[\s\S]{0,200}/gi)].slice(0, 20);
console.log("tabs", tabs.map((t) => t[0].slice(0, 120)));

const sections = [
  "Présentation",
  "A propos",
  "À propos",
  "Description",
  "Services",
  "attraction-about",
  "about-attraction",
  "detail-description",
  "content-description",
];
for (const s of sections) {
  const i = h.indexOf(s);
  if (i >= 0) console.log("\n", s, "\n", h.slice(i, i + 600).replace(/\s+/g, " "));
}

// address fields
const street = h.match(/itemprop="streetAddress"[^>]*content="([^"]*)"/i)?.[1];
const locality = h.match(/itemprop="addressLocality"[^>]*content="([^"]*)"/i)?.[1];
const region = h.match(/itemprop="addressRegion"[^>]*content="([^"]*)"/i)?.[1];
const country = h.match(/itemprop="addressCountry"[^>]*content="([^"]*)"/i)?.[1];
console.log({ street, locality, region, country });

// rating
const rating = h.match(/itemprop="ratingValue"[^>]*content="([^"]*)"/i)?.[1];
const likes = h.match(/(\d+)\s*likes?/i)?.[1];
console.log({ rating, likes });

// title from mapConfig or meta
const mapName = h.match(/mapConfig\s*=\s*\{[\s\S]*?name:\s*"([^"]+)"/)?.[1];
console.log("mapName", mapName);

// all servesCuisine
const cuisines = [...h.matchAll(/itemprop="servesCuisine"[^>]*content="([^"]+)"/gi)].map((m) => m[1]);
console.log("cuisines", cuisines);

// opening hours all
const hours = [...h.matchAll(/itemprop="openingHours"[^>]*content="([^"]+)"/gi)].map((m) => m[1]);
console.log("hours", hours);

// long text paragraphs near Localisation
const locIdx = h.indexOf("Localisation:");
console.log(h.slice(locIdx, locIdx + 1200).replace(/\s+/g, " "));
