import { writeFileSync } from "node:fs";

const url = "https://ayilaa.com/fr/categorie/11/restauration";
const res = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
  },
});
const html = await res.text();
console.log("status", res.status, "len", html.length);

writeFileSync("tmp-ayilaa.html", html);

const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log("scripts", scripts.slice(0, 30));

const links = [...html.matchAll(/href=["']([^"']*(?:lieu|place|etablissement|coin|detail)[^"']*)["']/gi)]
  .map((m) => m[1])
  .slice(0, 40);
console.log("detail links", links);

const apis = [...html.matchAll(/https?:\/\/[^"'\\\s]+/gi)]
  .map((m) => m[0])
  .filter((u) => /api|cdn|storage|supabase|firebase|amazonaws|cloudinary/i.test(u))
  .slice(0, 40);
console.log("interesting urls", [...new Set(apis)]);

const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (nextData) {
  writeFileSync("tmp-next-data.json", nextData[1]);
  console.log("found __NEXT_DATA__");
}

const nuxt = html.match(/window\.__NUXT__\s*=/);
console.log("nuxt", !!nuxt);

const jsonChunks = [...html.matchAll(/\{"[^"]{3,40}":\s*(?:"[^"]*"|\[|\{|\d)/g)].slice(0, 10);
console.log("json-ish", jsonChunks.map((m) => m[0].slice(0, 80)));
