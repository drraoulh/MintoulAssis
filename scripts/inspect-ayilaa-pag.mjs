import { readFileSync } from "node:fs";
import { join } from "node:path";

const chunks = [
  "ayilaa-app.js",
  "ayilaa-480.js",
  "ayilaa-719.js",
  "ayilaa-125.js",
  "ayilaa-100.js",
  "ayilaa-791.js",
];

// download missing ones first via sync? we'll assume only existing
for (const f of ["ayilaa-app.js", "ayilaa-480.js"]) {
  const text = readFileSync(join(process.env.TEMP, f), "utf8");
  const idx = text.indexOf("99024:");
  const idx2 = text.indexOf("AttractionMenuPagination");
  console.log(f, "99024", idx, "name", idx2);
  if (idx > -1) {
    console.log(text.slice(idx, idx + 2500));
  }
}

const html = readFileSync(join(process.env.TEMP, "ayilaa.html"), "utf8");
// find pagination / infinite scroll container
const markers = [
  "data-total",
  "data-category-id",
  "load-more",
  "loadMore",
  "page=",
  "current_page",
  "next_page",
  "infinite",
  "attraction-list",
  "attractions-list",
  "category-attractions",
];
for (const m of markers) {
  const i = html.indexOf(m);
  if (i >= 0) console.log("\nHTML marker", m, "\n", html.slice(i - 120, i + 300));
}
