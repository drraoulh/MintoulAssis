import { readFileSync } from "node:fs";

// Quick inline test of listing parser against saved HTML
const html = readFileSync("tmp-ayilaa.html", "utf8");

function decodeHtml(text = "") {
  return text.replace(/&#039;/g, "'").replace(/&amp;/g, "&");
}
function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+itemprop=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*itemprop=["']${prop}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeHtml(m[1] || m[2] || "") : null;
}

const blocks = html.split('itemscope itemtype="https://schema.org/Restaurant"').slice(1);
console.log("blocks", blocks.length);
const first = blocks[0].slice(0, 3500);
console.log({
  name: metaContent(`<meta ${first}`, "name"),
  url: metaContent(`<meta ${first}`, "url"),
  image: metaContent(`<meta ${first}`, "image"),
  city: metaContent(`<meta ${first}`, "addressLocality"),
});
