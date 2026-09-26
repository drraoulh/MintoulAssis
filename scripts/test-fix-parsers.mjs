import { readFileSync } from "node:fs";

// Inline minimal copy of extractors to validate sample HTML
function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function allMetaContents(html, prop) {
  const re = new RegExp(
    `<meta[^>]+itemprop=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*itemprop=["']${prop}["'][^>]*>`,
    "gi",
  );
  const out = [];
  for (const m of html.matchAll(re)) {
    const v = decodeHtml(m[1] || m[2] || "").trim();
    if (v && v !== "Non disponible") out.push(v);
  }
  return [...new Set(out)];
}

function isBrandName(name) {
  return !name || /^ayila['’`]?a?$/i.test(String(name).trim());
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  const cleaned = decodeHtml(String(raw)).trim();
  try {
    const url = new URL(cleaned.replace(/ /g, "%20"));
    url.pathname = url.pathname
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");
    return url.toString();
  } catch {
    return cleaned.replace(/ /g, "%20");
  }
}

function extractPlaceName(html, listing) {
  const titleName = html
    .match(/<title>\s*Ayila['’`]?a?\s*\|\s*([^<\n]+)/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  const metaNames = allMetaContents(html, "name").filter((n) => !isBrandName(n));
  const candidates = [listing?.name, titleName, ...metaNames].filter(
    (n) => n && !isBrandName(n),
  );
  return candidates[0] || listing?.name || titleName || "Lieu inconnu";
}

function extractImages(html, listing) {
  const fromAttrs = [
    ...html.matchAll(
      /(?:src|content|data-src|href)=["'](https:\/\/ayilaa\.s3\.eu-west-1\.amazonaws\.com\/attraction\/[^"']+)["']/gi,
    ),
  ].map((m) => m[1]);
  const fromMeta = allMetaContents(html, "image");
  return [
    ...new Set(
      [...fromMeta, ...fromAttrs, listing?.image]
        .map(normalizeImageUrl)
        .filter((u) => u && !u.includes("tr?id=")),
    ),
  ];
}

const html = readFileSync("data/ayilaa/sample-detail.html", "utf8");
const listing = {
  name: "Les Palétuviers Matanda",
  image:
    "https://ayilaa.s3.eu-west-1.amazonaws.com/attraction/logos/653911d689dae_1698238934_Les Palétuviers Matanda (6).jpg",
};
console.log({
  name: extractPlaceName(html, { name: "Ayila" }),
  nameFromListing: extractPlaceName(html, listing),
  images: extractImages(html, listing).slice(0, 5),
});
