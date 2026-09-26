import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = ["ayilaa-app.js", "ayilaa-main.js", "ayilaa-480.js", "ayilaa.html"];
const patterns = [
  /load[_-]?more/gi,
  /category[_-]?(places|attractions|coins)/gi,
  /\/attraction[^"'\\\s]*/gi,
  /\/filter[^"'\\\s]*/gi,
  /getAttraction/gi,
  /paginate/gi,
  /offset/gi,
  /page_number/gi,
  /data-total/gi,
  /categorie\/\d+/gi,
  /\/fr\/[^"'\\\s]*attraction[^"'\\\s]*/gi,
  /route\([^)]{0,80}\)/gi,
  /axios\.[a-z]+\([^)]{0,120}\)/gi,
  /\.get\(["'`][^"'`]{0,120}/gi,
  /\.post\(["'`][^"'`]{0,120}/gi,
  /url:\s*["'`][^"'`]{0,120}/gi,
];

for (const file of files) {
  const path = join(process.env.TEMP, file);
  const text = readFileSync(path, "utf8");
  console.log("\n====", file, text.length);
  for (const p of patterns) {
    const matches = [...text.matchAll(p)].map((m) => m[0]);
    const uniq = [...new Set(matches)].slice(0, 12);
    if (uniq.length) console.log(String(p).slice(0, 40), uniq);
  }
}
