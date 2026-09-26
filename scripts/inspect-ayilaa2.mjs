import { readFileSync, writeFileSync } from "node:fs";

const h = readFileSync(`${process.env.TEMP}/ayilaa.html`, "utf8");

// Find place/coin detail URLs
const patterns = [
  /\/fr\/[^"'\s]+\/\d+\/[a-z0-9-]+/gi,
  /href="([^"]*coin[^"]*)"/gi,
  /href="([^"]*lieu[^"]*)"/gi,
  /href="([^"]*etablissement[^"]*)"/gi,
  /href="([^"]*detail[^"]*)"/gi,
  /\/coins?\//gi,
  /loadMore|load_more|getPlaces|getCoins|categoryPlaces/gi,
  /route\(['"][^'"]+['"]/gi,
  /\/ajax\/[^"'\s]+/gi,
  /\/api\/[^"'\s]+/gi,
];

for (const p of patterns) {
  const m = [...h.matchAll(p)].map((x) => x[0] || x[1]).slice(0, 15);
  if (m.length) console.log(String(p), m);
}

// Extract anchors around restaurant names
const around = h.match(/O'san[\s\S]{0,500}/);
console.log("\n--- around O'san ---\n", around?.[0]?.slice(0, 500));

const card = h.match(/class="[^"]*card[^"]*"[\s\S]{0,800}/i);
console.log("\n--- card ---\n", card?.[0]?.slice(0, 800));

// Find all absolute image URLs
const imgs = [...new Set([...h.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]))];
console.log("\nimages", imgs.slice(0, 15), "count", imgs.length);

// Find slug-like place links differently
const placeHrefs = [...h.matchAll(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<h[1-6]/gi)]
  .map((m) => m[1])
  .slice(0, 30);
console.log("\nplace hrefs", placeHrefs);

writeFileSync(`${process.env.TEMP}/ayilaa-mid.html`, h.slice(80000, 120000));
