import { writeFileSync } from "node:fs";

const base = "https://ayilaa.com/fr/categorie/11/restauration";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function extractPlaceLinks(html) {
  const links = [
    ...html.matchAll(
      /href="(\/fr\/(?:restauration|restaurant|restaurant-[^"/]+|creperie-pizzaria-patisserie|cabaret-lounge-cafe|lounge-restaurant|fast-food|cafe)\/\d+-[^"]+)"/gi,
    ),
  ].map((m) => m[1]);
  return [...new Set(links)];
}

function extractPageNumbers(html) {
  const pages = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
  return Math.max(0, ...pages);
}

const page1 = await fetchText(base);
const maxPageHint = extractPageNumbers(page1);
const links1 = extractPlaceLinks(page1);
console.log("page1 places", links1.length, "max page hint", maxPageHint);
console.log(links1.slice(0, 5));

// Probe last page around 2265/20 ~= 113, or /15
for (const p of [100, 110, 113, 120, 150, 200, maxPageHint]) {
  if (!p) continue;
  try {
    const html = await fetchText(`${base}?page=${p}`);
    const links = extractPlaceLinks(html);
    const max = extractPageNumbers(html);
    console.log(`page ${p}: ${links.length} places, maxHint=${max}`);
  } catch (e) {
    console.log(`page ${p}: FAIL`, e.message);
  }
}

// Sample detail page
const detailUrl = "https://ayilaa.com" + links1[0];
const detail = await fetchText(detailUrl);
writeFileSync(`${process.env.TEMP}/ayilaa-detail.html`, detail);
console.log("detail url", detailUrl, "len", detail.length);

const name = detail.match(/itemprop="name"[^>]*content="([^"]+)"/i)?.[1];
const image = detail.match(/itemprop="image"[^>]*content="([^"]+)"/i)?.[1];
const desc =
  detail.match(/itemprop="description"[^>]*content="([^"]+)"/i)?.[1] ||
  detail.match(/name="description"[^>]*content="([^"]+)"/i)?.[1];
const address = detail.match(/itemprop="address"[^>]*content="([^"]+)"/i)?.[1];
const lat = detail.match(/itemprop="latitude"[^>]*content="([^"]+)"/i)?.[1];
const lng = detail.match(/itemprop="longitude"[^>]*content="([^"]+)"/i)?.[1];
const imgs = [
  ...new Set(
    [...detail.matchAll(/https:\/\/ayilaa\.s3[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map(
      (m) => m[0],
    ),
  ),
];
console.log({ name, image, desc: desc?.slice(0, 120), address, lat, lng, imgs: imgs.length });
console.log(imgs.slice(0, 8));

// Look for description body
const about = detail.match(/À propos[\s\S]{0,800}|Description[\s\S]{0,800}|Présentation[\s\S]{0,800}/i);
console.log("about snippet", about?.[0]?.replace(/\s+/g, " ").slice(0, 400));
