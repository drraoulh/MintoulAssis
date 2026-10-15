import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("tmp-ayilaa.html", "utf8");

// Extract card blocks by looking for listing anchors
const pattern =
  /<a[^>]+href="(\/fr\/[^"]+\/\d+-[^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
const cards = [...html.matchAll(pattern)];
console.log("cards", cards.length);
if (cards[0]) {
  writeFileSync("tmp-card0.html", cards[0][0]);
  console.log(cards[0][0].slice(0, 2500));
}

// Also try broader container
const idx = html.toLowerCase().indexOf("o'san");
console.log("idx", idx);
if (idx > 0) {
  writeFileSync("tmp-around-osan.html", html.slice(idx - 2000, idx + 3000));
}
