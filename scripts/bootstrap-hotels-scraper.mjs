import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("scripts/scrape-ayilaa-sites-touristiques.mjs");
const dst = resolve("scripts/scrape-ayilaa-hotels.mjs");
let code = readFileSync(src, "utf8");

code = code
  .replace(
    'const CATEGORY_PATH = "/fr/categorie/14/sites-touristiques";\nconst TOTAL_PAGES = 13;\nconst CATEGORY_SLUG = "sites-touristiques";\nconst SCHEMA_TYPE = "TouristAttraction";\nconst EXPECTED_MIN = 200;',
    'const CATEGORY_PATH = "/fr/categorie/12/hotels-et-hebergements";\nconst TOTAL_PAGES = 69;\nconst CATEGORY_SLUG = "hotels-et-hebergements";\nconst SCHEMA_TYPE = "Hotel";\nconst EXPECTED_MIN = 1200;',
  )
  .replace(
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa-tourisme");',
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa-hotels");',
  )
  .replace(
    'itemscope itemtype="https://schema.org/TouristAttraction"',
    'itemscope itemtype="https://schema.org/Hotel"',
  )
  .replace(
    '[...new Set([CATEGORY_SLUG, "tourisme", ...cuisines.map((c) => c.toLowerCase())])]',
    '[...new Set([CATEGORY_SLUG, "hotel", "hebergement", ...cuisines.map((c) => c.toLowerCase())])]',
  );

writeFileSync(dst, code);
console.log("Wrote", dst);
