import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(join(process.env.TEMP, "ayilaa-app.js"), "utf8");

// Find strings containing categorie, attraction, load, filter, page
const strings = [...text.matchAll(/["'`]([^"'`]{8,200})["'`]/g)]
  .map((m) => m[1])
  .filter((s) =>
    /categorie|attraction|load|filter|page|restaurant|paginate|scroll|more/i.test(
      s,
    ),
  );

console.log([...new Set(strings)].slice(0, 100).join("\n"));

// Also look near AttractionMenuPagination
const idx = text.indexOf("AttractionMenuPagination");
console.log("\n--- near AttractionMenuPagination ---\n");
console.log(text.slice(Math.max(0, idx - 500), idx + 1500));
