import { readFileSync } from "node:fs";
import { join } from "node:path";

const h = readFileSync(join(process.env.TEMP, "ayilaa-detail.html"), "utf8");
const infos = h.match(
  /id="infos"[^>]*>([\s\S]*?)(?:id="[^"]+" role="tabpanel"|<\/div>\s*<\/div>\s*<\/div>\s*<div class="row)/i,
);
console.log("infos length", infos?.[1]?.length);
console.log(infos?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1500));

const likes = h.match(/likes-counter-\d+[^>]*>[\s\S]*?(\d+)/i)?.[1];
const stars = h.match(/fs-6 fw-bold">([0-9.]+)</)?.[1];
console.log({ likes, stars });

// short description from listing card style on detail?
const short = h.match(/A partir de[^<]+/i)?.[0];
console.log("price line", short);
