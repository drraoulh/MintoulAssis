import { readFileSync } from "node:fs";
import { join } from "node:path";

const h = readFileSync(join(process.env.TEMP, "ayilaa-detail.html"), "utf8");

const markers = [
  "schema.org",
  "itemprop=",
  "latitude",
  "longitude",
  "geo",
  "address",
  "telephone",
  "priceRange",
  "servesCuisine",
  "openingHours",
  "description",
  "attraction-description",
  "À propos",
  "Localisation",
  "Contact",
  "data-lat",
  "data-lng",
  "google.com/maps",
  "maps.google",
];

for (const m of markers) {
  const i = h.toLowerCase().indexOf(m.toLowerCase());
  if (i >= 0) {
    console.log("\n===", m, "===");
    console.log(h.slice(Math.max(0, i - 80), i + 350).replace(/\s+/g, " "));
  }
}

// Title h1
const h1 = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
console.log("\nh1", h1);

const og = Object.fromEntries(
  [...h.matchAll(/property="og:([^"]+)"[^>]*content="([^"]*)"/gi)].map((m) => [
    m[1],
    m[2],
  ]),
);
console.log("og", og);
