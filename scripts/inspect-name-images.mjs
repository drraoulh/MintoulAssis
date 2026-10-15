import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = "https://ayilaa.com/fr/restauration/4442-restaurant-les-paletuviers-matanda";
const res = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
  },
});
const html = await res.text();
const out = resolve("data/ayilaa/sample-detail.html");
writeFileSync(out, html);

const nameMetas = [...html.matchAll(/itemprop=["']name["'][^>]*>/gi)].map((m) => m[0]);
const contentNames = [...html.matchAll(/itemprop=["']name["'][^>]*content=["']([^"']*)["']/gi)].map(
  (m) => m[1],
);
const ogTitle = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];

const imageMetas = [...html.matchAll(/itemprop=["']image["'][^>]*content=["']([^"']*)["']/gi)].map(
  (m) => m[1],
);
const s3 = [...html.matchAll(/https:\/\/ayilaa\.s3[^"'\\\s>]+/gi)].slice(0, 15);

console.log({ ogTitle, h1, title, contentNames: contentNames.slice(0, 10), imageMetas: imageMetas.slice(0, 8), s3 });
