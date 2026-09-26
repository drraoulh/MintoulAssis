import { readFileSync } from "node:fs";

const h = readFileSync("data/ayilaa/sample-transports.html", "utf8");
const pages = [...h.matchAll(/categorie\/16\/transports\?page=(\d+)/g)].map((m) => Number(m[1]));
const schemas = [...h.matchAll(/itemtype="https:\/\/schema\.org\/([^"]+)"/g)].map((m) => m[1]);
const counts = {};
for (const s of schemas) counts[s] = (counts[s] || 0) + 1;
const ignore = new Set([
  "WebPage",
  "WebSite",
  "Organization",
  "SearchAction",
  "PostalAddress",
  "AggregateRating",
]);
const placeSchemas = Object.entries(counts)
  .filter(([k]) => !ignore.has(k))
  .sort((a, b) => b[1] - a[1]);
console.log({
  maxPage: Math.max(0, ...pages),
  placeSchemas,
  main: placeSchemas[0] || null,
});
