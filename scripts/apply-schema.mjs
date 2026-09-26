import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const envPath = resolve(process.cwd(), ".env.local");
const envFile = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL manquante dans .env.local");
}

const sqlFile = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

try {
  await sql.unsafe(sqlFile);
  const regions = await sql`select count(*)::int as n from public.regions`;
  console.log(`Schema OK. Regions: ${regions[0].n}`);
} finally {
  await sql.end();
}
