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

const sql = postgres(loadEnv().DATABASE_URL, { ssl: "require", max: 1, prepare: false });

try {
  const byTitle = await sql`
    select count(*)::int as n
    from kb_documents
    where title ~* 'ayila'
  `;
  const byContent = await sql`
    select count(*)::int as n
    from kb_documents
    where content ~* 'ayila'
  `;
  const contentNom = await sql`
    select count(*)::int as n
    from kb_documents
    where content ~* '^Nom:\\s*Ayila'
  `;
  const samples = await sql`
    select id, title, left(content, 180) as preview, metadata->>'external_id' as external_id
    from kb_documents
    where title ~* 'ayila' or content ~* '^Nom:\\s*Ayila'
    order by created_at desc
    limit 8
  `;
  const placesAyila = await sql`
    select count(*)::int as n from places where name ~* '^ayila'
  `;
  const placesKb = await sql`
    select count(*)::int as n from places where kb_text ~* '^Nom:\\s*Ayila'
  `;

  console.log({
    kbTitleAyila: byTitle[0].n,
    kbContentMentionsAyila: byContent[0].n,
    kbContentStartsNomAyila: contentNom[0].n,
    placesNamedAyila: placesAyila[0].n,
    placesKbNomAyila: placesKb[0].n,
    samples,
  });
} finally {
  await sql.end();
}
