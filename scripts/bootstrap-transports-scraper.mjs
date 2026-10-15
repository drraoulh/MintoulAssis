import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("scripts/scrape-ayilaa-hotels.mjs");
const dst = resolve("scripts/scrape-ayilaa-transports.mjs");
let code = readFileSync(src, "utf8");

code = code
  .replace(
    'const CATEGORY_PATH = "/fr/categorie/12/hotels-et-hebergements";\nconst TOTAL_PAGES = 69;\nconst CATEGORY_SLUG = "hotels-et-hebergements";\nconst SCHEMA_TYPE = "Hotel";\nconst EXPECTED_MIN = 1200;',
    'const CATEGORY_PATH = "/fr/categorie/16/transports";\nconst TOTAL_PAGES = 12;\nconst CATEGORY_SLUG = "transports";\nconst SCHEMA_TYPE = "BusStation";\nconst EXPECTED_MIN = 200;',
  )
  .replace(
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa-hotels");',
    'const DATA_DIR = resolve(process.cwd(), "data/ayilaa-transports");',
  )
  .replace(
    'itemscope itemtype="https://schema.org/Hotel"',
    'itemscope itemtype="https://schema.org/BusStation"',
  )
  .replace(
    '[...new Set([CATEGORY_SLUG, "hotel", "hebergement", ...cuisines.map((c) => c.toLowerCase())])]',
    '[...new Set([CATEGORY_SLUG, "transport", ...cuisines.map((c) => c.toLowerCase())])]',
  );

writeFileSync(dst, code);
console.log("Wrote", dst);
