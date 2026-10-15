import { readFileSync } from "node:fs";

const h = readFileSync("data/ayilaa/sample-tourisme.html", "utf8");
const types = [...h.matchAll(/itemtype="https:\/\/schema\.org\/([^"]+)"/g)].map((m) => m[1]);
console.log("types", [...new Set(types)]);

const pages = [...h.matchAll(/categorie\/14\/sites-touristiques\?page=(\d+)/g)].map((m) => Number(m[1]));
console.log("maxPage", Math.max(0, ...pages), "unique", [...new Set(pages)].sort((a, b) => a - b));

const blocks = h.split(/itemscope itemtype="https:\/\/schema\.org\/[^"]+"/).length - 1;
console.log("blocks", blocks);

const restaurant = (h.match(/schema\.org\/Restaurant/g) || []).length;
const tourist = (h.match(/schema\.org\/TouristAttraction/g) || []).length;
const local = (h.match(/schema\.org\/LocalBusiness/g) || []).length;
const place = (h.match(/schema\.org\/Place/g) || []).length;
console.log({ restaurant, tourist, local, place });

const links = [...h.matchAll(/href="(\/fr\/[^"]+\/\d+-[^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(links)].filter((u) => !u.includes("/categorie/"));
console.log("sample links", unique.slice(0, 10));
console.log("unique place links", unique.length);

const indicator = h.match(/pagination-indicator[\s\S]{0,400}/)?.[0];
console.log("indicator", indicator?.replace(/\s+/g, " ").slice(0, 300));
