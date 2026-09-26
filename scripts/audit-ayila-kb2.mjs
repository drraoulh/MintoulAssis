import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const env = Object.fromEntries(
  readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1, prepare: false });

try {
  const exact = await sql`
    select count(*)::int as n from kb_documents
    where title = 'Ayila' or content like 'Nom: Ayila%'
  `;
  const brandish = await sql`
    select p.category, count(*)::int as n
    from places p
    where p.name ~* '^ayila''?a?$'
       or p.kb_text like 'Nom: Ayila%'
    group by p.category
  `;
  const sourceField = await sql`
    select count(*)::int as n from kb_documents where source = 'ayilaa'
  `;
  const sampleWrong = await sql`
    select title, left(content, 120) as preview
    from kb_documents
    where title = 'Ayila' or content like 'Nom: Ayila%'
    limit 5
  `;
  console.log({
    exactBrandBugInKb: exact[0].n,
    placesStillBrandAyila: brandish,
    kbRowsWithSourceAyilaa: sourceField[0].n,
    sampleWrong,
  });
} finally {
  await sql.end();
}
