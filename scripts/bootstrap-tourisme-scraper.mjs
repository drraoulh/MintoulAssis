import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

// Bootstrap: clone restauration scraper then specialize for tourism category
const src = resolve("scripts/scrape-ayilaa-restauration.mjs");
const dst = resolve("scripts/scrape-ayilaa-sites-touristiques.mjs");
let code = readFileSync(src, "utf8");

code = code
  .replace(
    'const CATEGORY_PATH = "/fr/categorie/11/restauration";\nconst TOTAL_PAGES = 114;',
    'const CATEGORY_PATH = "/fr/categorie/14/sites-touristiques";\nconst TOTAL_PAGES = 13;\nconst CATEGORY_SLUG = "sites-touristiques";\nconst SCHEMA_TYPE = "TouristAttraction";\nconst EXPECTED_MIN = 200;',
  )
  .replace(
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa");',
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa-tourisme");',
  )
  .replace(
    'itemscope itemtype="https://schema.org/Restaurant"',
    'itemscope itemtype="https://schema.org/TouristAttraction"',
  )
  .replace(/category: "restauration"/g, 'category: CATEGORY_SLUG')
  .replace(/\["restauration"/g, '[CATEGORY_SLUG')
  .replace(/`Catégorie: restauration`/g, "`Catégorie: ${CATEGORY_SLUG}`")
  .replace(
    'Catégorie: restauration\\nVille:',
    "Catégorie: ${CATEGORY_SLUG}\\nVille:",
  )
  .replace(
    /\$\{\"restauration\"\}/g,
    "${CATEGORY_SLUG}",
  )
  .replace(
    'category: "restauration"',
    "category: CATEGORY_SLUG",
  )
  .replace(
    "if (existing.length >= 2000)",
    "if (existing.length >= EXPECTED_MIN)",
  )
  .replace(
    '[...new Set(["restauration", ...cuisines.map((c) => c.toLowerCase())])]',
    '[...new Set([CATEGORY_SLUG, "tourisme", ...cuisines.map((c) => c.toLowerCase())])]',
  );

writeFileSync(dst, code);
console.log("Wrote", dst, "bytes", code.length);
