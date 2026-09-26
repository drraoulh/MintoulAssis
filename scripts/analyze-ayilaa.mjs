import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("tmp-ayilaa.html", "utf8");

// Find card / listing patterns
const cardMatches = [...html.matchAll(/href="(\/fr\/[^"]+)"[^>]*>[\s\S]{0,200}?/gi)].slice(0, 5);

// Look for establishment links
const estLinks = [...html.matchAll(/href="(\/fr\/(?:etablissement|lieu|place|coin|business|annonce)[^"]*)"/gi)];
console.log("est links count", estLinks.length, estLinks.slice(0, 10).map((m) => m[1]));

const allFr = [...html.matchAll(/href="(\/fr\/[^"#?]+)"/gi)].map((m) => m[1]);
const unique = [...new Set(allFr)].filter((h) => !h.includes("categorie") && !h.includes("page"));
console.log("unique fr links sample", unique.slice(0, 40));

// Find images near cards
const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)]
  .map((m) => m[1])
  .filter((s) => !s.includes("whatsapp") && !s.includes("logo") && !s.includes("icon"))
  .slice(0, 30);
console.log("imgs", imgs);

// Dump a chunk around first restaurant name
const idx = html.indexOf("O'san");
console.log("around Osan:\n", html.slice(Math.max(0, idx - 800), idx + 1200));
