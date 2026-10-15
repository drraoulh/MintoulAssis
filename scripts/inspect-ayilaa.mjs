import { readFileSync, writeFileSync } from "node:fs";

const h = readFileSync(`${process.env.TEMP}/ayilaa.html`, "utf8");
const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(hrefs)];
const interesting = uniq.filter((u) =>
  /lieu|coin|place|categorie|page|detail|restaurant/i.test(u),
);

console.log("interesting hrefs", interesting.slice(0, 80));
console.log("total unique hrefs", uniq.length);

const scripts = [...h.matchAll(/src="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => /js|chunk|app|vite|nuxt|next/i.test(s));
console.log("scripts", scripts.slice(0, 30));
console.log("NEXT_DATA", h.includes("__NEXT_DATA__"));
console.log("NUXT", h.includes("__NUXT__"));
console.log("window.__", /window\.__[A-Z_]+/.test(h));

const api = [
  ...h.matchAll(/https?:\/\/[^"'\\\s]+api[^"'\\\s]*/gi),
].map((m) => m[0]);
console.log("api urls", [...new Set(api)].slice(0, 30));

const dataAttrs = [...h.matchAll(/data-[a-z-]+=("[^"]*"|'[^']*')/gi)].slice(
  0,
  40,
);
console.log(
  "data attrs sample",
  dataAttrs.map((m) => m[0]).slice(0, 20),
);

// find coin/place cards
const cardLinks = [
  ...h.matchAll(/href="(\/fr\/[^"]+\/\d+\/[^"]+)"/g),
].map((m) => m[1]);
console.log("card-like", [...new Set(cardLinks)].slice(0, 40));
console.log("card-like count", new Set(cardLinks).size);

writeFileSync(
  `${process.env.TEMP}/ayilaa-sample.txt`,
  h.slice(0, 5000) + "\n\n---MID---\n\n" + h.slice(150000, 155000),
);
console.log("wrote sample");
