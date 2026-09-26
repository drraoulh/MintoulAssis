import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

process.env.AYILAA_MAX_PAGES = "1";
process.env.AYILAA_MAX_DETAILS = "3";

// Patch via env-aware small runner
writeFileSync(
  resolve("scripts/_test-scrape.mjs"),
  `
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

// Reuse parse by importing logic dynamically — instead run minimal inline test
const CATEGORY_URL = "https://ayilaa.com/fr/categorie/11/restauration";
const BASE = "https://ayilaa.com";

function loadEnv() {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  return Object.fromEntries(
    envFile.split(/\\r?\\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
  );
}

const env = loadEnv();
const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });
const kbSql = readFileSync(resolve("supabase/schema-kb.sql"), "utf8");
await sql.unsafe(kbSql);
console.log("KB schema OK");

const html = await fetch(CATEGORY_URL).then((r) => r.text());
const links = [...html.matchAll(/href="(\\/fr\\/[^"]+\\/(\\d+)-[^"]+)"/gi)]
  .filter((m) => /restauration|restaurant|creperie|cabaret|lounge|fast-food|cafe/i.test(m[1]))
  .slice(0, 3);
console.log("sample links", links.map((m) => m[1]));

const detail = await fetch(BASE + links[0][1]).then((r) => r.text());
const map = detail.match(/const mapConfig\\s*=\\s*\\{([\\s\\S]*?)\\};/);
console.log("name", map?.[1]?.match(/name:\\s*"([^"]*)"/)?.[1]);
console.log("lat", map?.[1]?.match(/latitude:\\s*parseFloat\\("([^"]*)"\\)/)?.[1]);
await sql.end();
`,
);

const child = spawn("node", ["scripts/_test-scrape.mjs"], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 1));
