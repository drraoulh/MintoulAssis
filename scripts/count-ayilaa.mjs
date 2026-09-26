import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });
try {
  const r = await sql`select count(*)::int as n from places where source = 'ayilaa'`;
  console.log(`ayilaa places in DB: ${r[0].n}`);
} finally {
  await sql.end();
}
