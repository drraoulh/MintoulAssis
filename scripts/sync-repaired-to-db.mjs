/**
 * Sync names + images from repaired details.json into Supabase (batched, resilient).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnv() {
  const envFile = readFileSync(resolve(".env.local"), "utf8");
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

async function withRetry(fn, retries = 5) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`retry ${i + 1}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw last;
}

const details = JSON.parse(readFileSync(resolve("data/ayilaa/details.json"), "utf8"));
const env = loadEnv();
let sql = postgres(env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 30,
});

let updated = 0;
try {
  for (const d of details) {
    await withRetry(async () => {
      try {
        const rows = await sql`
          update public.places set
            name = ${d.name},
            kb_text = ${d.kb_text || null},
            description = coalesce(${d.description || null}, description),
            short_description = coalesce(${d.short_description || null}, short_description),
            lat = coalesce(${d.lat ?? null}, lat),
            lng = coalesce(${d.lng ?? null}, lng),
            updated_at = now()
          where source = 'ayilaa' and external_id = ${String(d.external_id)}
          returning id
        `;
        if (!rows.length) return;
        const placeId = rows[0].id;
        const images = d.images?.length ? d.images : d.image ? [d.image] : [];
        if (images.length) {
          await sql`delete from public.place_images where place_id = ${placeId}`;
          await sql`
            insert into public.place_images (place_id, url, alt)
            select ${placeId}, x.url, ${d.name}
            from unnest(${images}::text[]) as x(url)
          `;
        }
      } catch (err) {
        try {
          await sql.end({ timeout: 1 });
        } catch {
          /* ignore */
        }
        sql = postgres(env.DATABASE_URL, {
          ssl: "require",
          max: 1,
          prepare: false,
          idle_timeout: 20,
          connect_timeout: 30,
        });
        throw err;
      }
    });
    updated++;
    if (updated % 150 === 0) console.log(`synced ${updated}/${details.length}`);
  }
  const bad = await sql`select count(*)::int as n from places where source='ayilaa' and name ~* '^ayila'`;
  const total = await sql`select count(*)::int as n from places where source='ayilaa'`;
  console.log({ updated, ayilaNamesLeft: bad[0].n, totalPlaces: total[0].n });
} finally {
  await sql.end({ timeout: 5 });
}
