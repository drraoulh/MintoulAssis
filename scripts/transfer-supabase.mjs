/**
 * Copie regions, places, place_images, kb_documents, itinerary_cache
 * de DATABASE_URL vers DEST_DATABASE_URL.
 *
 * Usage:
 *   DEST_DATABASE_URL=postgresql://... node scripts/transfer-supabase.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnv() {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  return Object.fromEntries(
    envFile
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
}

function connect(url) {
  return postgres(url, {
    ssl: "require",
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 30,
  });
}

async function withRetry(label, fn, retries = 6) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`retry ${i + 1}/${retries} ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw last;
}

const env = loadEnv();
const srcUrl = env.DATABASE_URL;
const destUrl = process.env.DEST_DATABASE_URL || env.DEST_DATABASE_URL;

if (!srcUrl) throw new Error("DATABASE_URL manquante");
if (!destUrl) {
  throw new Error(
    "DEST_DATABASE_URL manquante. Ajoute l’URI pooler du nouveau projet dans .env.local.",
  );
}
if (srcUrl === destUrl) throw new Error("Source et destination sont identiques.");

const src = connect(srcUrl);
const dest = connect(destUrl);

const TABLES = ["regions", "places", "place_images", "kb_documents", "itinerary_cache"];

try {
  console.log("Applying schema on destination…");
  await withRetry("schema", () =>
    dest.unsafe(readFileSync(resolve("supabase/schema.sql"), "utf8")),
  );
  await withRetry("schema-kb", () =>
    dest.unsafe(readFileSync(resolve("supabase/schema-kb.sql"), "utf8")),
  );

  await dest.unsafe(`
    truncate table
      public.itinerary_cache,
      public.kb_documents,
      public.place_images,
      public.places,
      public.regions
    restart identity cascade
  `);

  for (const table of TABLES) {
    const [{ n }] = await src.unsafe(`select count(*)::int as n from public.${table}`);
    console.log(`Copy ${table}: ${n} rows`);
    if (!n) continue;

    const rows = await src.unsafe(`select * from public.${table}`);
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await withRetry(`${table} ${i}`, () => dest`insert into ${dest(table)} ${dest(batch)}`);
      console.log(`  ${table} ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
  }

  const counts = await dest`
    select
      (select count(*)::int from public.regions) as regions,
      (select count(*)::int from public.places) as places,
      (select count(*)::int from public.place_images) as images,
      (select count(*)::int from public.kb_documents) as kb
  `;
  console.log("Destination OK", counts[0]);
} finally {
  await src.end({ timeout: 5 });
  await dest.end({ timeout: 5 });
}
