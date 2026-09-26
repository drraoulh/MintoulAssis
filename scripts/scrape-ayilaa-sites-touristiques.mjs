import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const BASE = "https://ayilaa.com";
const CATEGORY_PATH = "/fr/categorie/14/sites-touristiques";
const TOTAL_PAGES = 13;
const CATEGORY_SLUG = "sites-touristiques";
const SCHEMA_TYPE = "TouristAttraction";
const EXPECTED_MIN = 200;
const CONCURRENCY = 2;
const REQUEST_GAP_MS = 350;
const DATA_DIR = resolve(process.cwd(), "data/ayilaa-tourisme");
const LISTINGS_FILE = resolve(DATA_DIR, "listings.json");
const DETAILS_FILE = resolve(DATA_DIR, "details.json");
const PROGRESS_FILE = resolve(DATA_DIR, "progress.json");

mkdirSync(DATA_DIR, { recursive: true });

function loadEnv() {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
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

function decodeHtml(text = "") {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ocirc;/g, "ô")
    .replace(/&icirc;/g, "î")
    .replace(/&ucirc;/g, "û")
    .replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;/g, "'")
    .replace(/&oelig;/g, "œ")
    .replace(/&hellip;/g, "…")
    .replace(/&#39;/g, "'")
    .replace(/&deg;/g, "°");
}

function stripTags(html = "") {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function metaContent(html, prop, attr = "itemprop") {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${prop}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeHtml(m[1] || m[2] || "") : null;
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

function nameFromPath(path) {
  const slug = path?.match(/\/\d+-([^/?#]+)/)?.[1];
  if (!slug) return null;
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  const cleaned = decodeHtml(String(raw)).trim().replace(/\\+/g, "");
  if (!cleaned.startsWith("http")) return null;
  try {
    const url = new URL(cleaned.replace(/ /g, "%20"));
    url.pathname = url.pathname
      .split("/")
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
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
  const seeds = [listing?.image, ...(listing?.images || [])];
  return [
    ...new Set(
      [...fromMeta, ...fromAttrs, ...seeds]
        .map(normalizeImageUrl)
        .filter((u) => u && !u.includes("tr?id=")),
    ),
  ];
}

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function cityToRegionSlug(city = "", state = "") {
  const hay = `${city} ${state}`.toLowerCase();
  const map = [
    [["yaound", "mfou", "mbalmayo", "obala"], "centre"],
    [["douala", "edéa", "edea", "nkongsamba", "yabassi"], "littoral"],
    [["kribi", "ebolowa", "sangmelima", "campo"], "sud"],
    [["limb", "buea", "tiko", "muyuka", "idenao"], "sud-ouest"],
    [["bafoussam", "dschang", "bangangte", "foumban", "mbouda"], "ouest"],
    [["bamenda", "wum", "nkambe"], "nord-ouest"],
    [["bertoua", "abatang", "batouri", "yokadouma"], "est"],
    [["ngaound", "meiganga", "tibati"], "adamaoua"],
    [["garoua", "poli", "guider"], "nord"],
    [["maroua", "mokolo", "kousseri", "yagoua"], "extreme-nord"],
  ];
  for (const [keys, slug] of map) {
    if (keys.some((k) => hay.includes(k))) return slug;
  }
  return null;
}

async function fetchText(pathOrUrl, retries = 5) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9",
          Referer: `${BASE}${CATEGORY_PATH}`,
        },
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      const wait = 1500 * (i + 1);
      console.warn(`retry ${i + 1}/${retries} ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, wait));
      if (i === retries - 1) throw err;
    }
  }
  throw new Error(`Failed ${url}`);
}

function parseListingPage(html) {
  const cards = [...html.matchAll(/<div class="card"[^>]*itemscope[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi)];
  // Fallback: split by Restaurant schema cards more loosely
  const blocks = html.split('itemscope itemtype="https://schema.org/TouristAttraction"').slice(1);
  const items = [];

  for (const block of blocks) {
    const chunk = block.slice(0, 3500);
    const url = metaContent(`<meta ${chunk}`, "url") || chunk.match(/href="(\/fr\/[^"]+\/\d+-[^"]+)"/)?.[1];
    const name = metaContent(`<meta ${chunk}`, "name");
    if (!url || !name) continue;
    const externalId = url.match(/\/(\d+)-/)?.[1] || null;
    const image = normalizeImageUrl(metaContent(`<meta ${chunk}`, "image"));
    const phone = metaContent(`<meta ${chunk}`, "telephone");
    const priceFrom = parsePrice(metaContent(`<meta ${chunk}`, "priceRange"));
    const street = metaContent(`<meta ${chunk}`, "streetAddress");
    const city = metaContent(`<meta ${chunk}`, "addressLocality");
    const rating = Number(metaContent(`<meta ${chunk}`, "ratingValue") || "") || null;
    const reviewCount = Number(metaContent(`<meta ${chunk}`, "reviewCount") || "") || null;
    const likes =
      Number(chunk.match(/likes-counter-\d+"[^>]*>\s*\((\d+)\s*likes\)/i)?.[1] || "") ||
      reviewCount;

    items.push({
      external_id: externalId,
      name: isBrandName(name) ? nameFromPath(url) || name : name,
      path: url,
      source_url: `${BASE}${url}`,
      image,
      phone: phone && phone !== "Non disponible" ? phone : null,
      price_from: priceFrom,
      neighborhood: street && street !== "Non disponible" ? street : null,
      city,
      rating,
      review_count: reviewCount,
      likes_count: likes,
      category: CATEGORY_SLUG,
    });
  }

  // Deduplicate by external_id
  const map = new Map();
  for (const item of items) {
    if (item.external_id) map.set(item.external_id, item);
  }
  return [...map.values()];
}

function parseDetailPage(html, listing) {
  const name = extractPlaceName(html, listing);
  const phoneRaw = metaContent(html, "telephone");
  const images = extractImages(html, listing);
  const image = images[0] || normalizeImageUrl(listing.image);
  const city = metaContent(html, "addressLocality") || listing.city;
  const neighborhood = metaContent(html, "streetAddress") || listing.neighborhood;
  const country = metaContent(html, "addressCountry") || "CM";
  const priceFrom = parsePrice(metaContent(html, "priceRange")) ?? listing.price_from;
  const cuisines = allMetaContents(html, "servesCuisine");
  const geo = html.match(/name="geo\.position"\s+content="([^;]+);([^"]+)"/i);
  const lat = geo ? Number(geo[1]) : Number(html.match(/latitude:\s*parseFloat\("([^"]+)"\)/)?.[1]) || null;
  const lng = geo ? Number(geo[2]) : Number(html.match(/longitude:\s*parseFloat\("([^"]+)"\)/)?.[1]) || null;
  const placename = html.match(/name="geo\.placename"\s+content="([^"]+)"/i)?.[1] || city;
  const regionCode = html.match(/name="geo\.region"\s+content="([^"]+)"/i)?.[1] || null;

  const descriptionHtml = html.match(/<p itemprop="description">([\s\S]*?)<\/p>\s*<\/section>/i)?.[1] || "";
  const description = stripTags(descriptionHtml);

  const reviews = [...html.matchAll(/itemprop="review"[\s\S]*?itemprop="reviewBody"\s+content="([^"]*)"[\s\S]*?itemprop="datePublished"\s+content="([^"]*)"/gi)]
    .slice(0, 20)
    .map((m) => ({
      body: decodeHtml(m[1]),
      date: m[2],
      author: null,
    }));

  // Enrich authors if present nearby — optional
  const reviewBlocks = [...html.matchAll(/<span itemprop="review"[\s\S]*?<\/span>\s*(?=<span itemprop="review"|<div class="d-flex)/gi)];
  const richReviews = reviewBlocks.slice(0, 15).map((block) => {
    const author = block[0].match(/itemprop="name"\s*\n?\s*content="([^"]+)"/)?.[1];
    const body = block[0].match(/itemprop="reviewBody"\s+content="([^"]*)"/)?.[1];
    const date = block[0].match(/itemprop="datePublished"\s+content="([^"]*)"/)?.[1];
    return {
      author: author ? decodeHtml(author) : null,
      body: body ? decodeHtml(body) : null,
      date: date || null,
    };
  }).filter((r) => r.body);

  const hoursRows = [...html.matchAll(/<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/gi)]
    .map((m) => ({
      day: decodeHtml(m[1]).trim(),
      open: decodeHtml(m[2]).trim(),
      close: decodeHtml(m[3]).trim(),
    }))
    .filter((h) => h.day && !/jours/i.test(h.day));

  const rating =
    Number(html.match(/itemprop="ratingValue"[^>]*content="([^"]+)"/i)?.[1] || "") ||
    listing.rating;
  const reviewCount =
    Number(html.match(/itemprop="reviewCount"[^>]*content="([^"]+)"/i)?.[1] || "") ||
    listing.review_count;
  const likes =
    Number(html.match(/\((\d+)&nbsp;likes/i)?.[1] || html.match(/\((\d+)\s*likes/i)?.[1] || "") ||
    listing.likes_count;

  const state = html.match(/state=([^&"']+)/i)?.[1]
    ? decodeURIComponent(html.match(/state=([^&"']+)/i)[1])
    : placename;

  const tags = [...new Set([CATEGORY_SLUG, "tourisme", ...cuisines.map((c) => c.toLowerCase())])];

  const kbText = [
    `Nom: ${name}`,
    `Catégorie: ${CATEGORY_SLUG}`,
    city ? `Ville: ${city}` : null,
    neighborhood ? `Quartier: ${neighborhood}` : null,
    state ? `Région/État: ${state}` : null,
    priceFrom ? `Prix à partir de: ${priceFrom} XAF / personne` : null,
    rating ? `Note: ${rating}/5 (${reviewCount || 0} avis, ${likes || 0} likes)` : null,
    cuisines.length ? `Types: ${cuisines.join(", ")}` : null,
    description ? `Description: ${description}` : null,
    richReviews.length
      ? `Avis: ${richReviews
          .slice(0, 5)
          .map((r) => r.body)
          .join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...listing,
    name,
    phone: phoneRaw && phoneRaw !== "Non disponible" ? phoneRaw : listing.phone,
    image: image || listing.image,
    images,
    city: city || listing.city,
    neighborhood: neighborhood && neighborhood !== "Non disponible" ? neighborhood : listing.neighborhood,
    state,
    country,
    region_code: regionCode,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    price_from: priceFrom,
    cuisines,
    tags,
    description: description || null,
    short_description: description ? description.slice(0, 220) : null,
    rating,
    review_count: reviewCount,
    likes_count: likes,
    hours: hoursRows,
    reviews: richReviews.length ? richReviews : reviews,
    kb_text: kbText,
  };
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function scrapeListings() {
  if (existsSync(LISTINGS_FILE)) {
    const existing = JSON.parse(readFileSync(LISTINGS_FILE, "utf8"));
    if (existing.length >= EXPECTED_MIN) {
      console.log(`Listings déjà présents: ${existing.length}`);
      return existing;
    }
  }

  const all = new Map();
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const path = page === 1 ? CATEGORY_PATH : `${CATEGORY_PATH}?page=${page}`;
    const html = await fetchText(path);
    const items = parseListingPage(html);
    for (const item of items) all.set(item.external_id, item);
    console.log(`Listing page ${page}/${TOTAL_PAGES} → +${items.length} (total ${all.size})`);
    if (page % 10 === 0) {
      writeFileSync(LISTINGS_FILE, JSON.stringify([...all.values()], null, 2));
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const listings = [...all.values()];
  writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
  console.log(`Listings OK: ${listings.length}`);
  return listings;
}

async function scrapeDetails(listings, { forceErrors = true } = {}) {
  const done = existsSync(DETAILS_FILE)
    ? new Map(JSON.parse(readFileSync(DETAILS_FILE, "utf8")).map((d) => [d.external_id, d]))
    : new Map();

  const pending = listings.filter((l) => {
    const existing = done.get(l.external_id);
    if (!existing) return true;
    if (forceErrors && (existing.scrape_error || !existing.description)) return true;
    if (forceErrors && isBrandName(existing.name)) return true;
    if (
      forceErrors &&
      (existing.images || []).some((u) => !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(String(u)))
    ) {
      return true;
    }
    return false;
  });
  console.log(`Détails: ${done.size - pending.length} OK, ${pending.length} à (re)faire`);

  let completed = 0;
  await mapPool(pending, CONCURRENCY, async (listing) => {
    await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    try {
      const html = await fetchText(listing.path);
      const detail = parseDetailPage(html, listing);
      delete detail.scrape_error;
      done.set(listing.external_id, detail);
    } catch (err) {
      console.error(`FAIL ${listing.external_id} ${listing.path}: ${err.message}`);
      const prev = done.get(listing.external_id) || listing;
      done.set(listing.external_id, {
        ...prev,
        ...listing,
        images: prev.images?.length ? prev.images : listing.image ? [listing.image] : [],
        description: prev.description || null,
        kb_text:
          prev.kb_text ||
          `Nom: ${listing.name}\nCatégorie: ${CATEGORY_SLUG}\nVille: ${listing.city || ""}`,
        scrape_error: err.message,
      });
    }
    completed++;
    if (completed % 25 === 0 || completed === pending.length) {
      writeFileSync(DETAILS_FILE, JSON.stringify([...done.values()], null, 2));
      const ok = [...done.values()].filter((d) => d.description && !d.scrape_error).length;
      writeFileSync(
        PROGRESS_FILE,
        JSON.stringify(
          { done: done.size, ok, total: listings.length, at: new Date().toISOString() },
          null,
          2,
        ),
      );
      console.log(`Détails progress ${completed}/${pending.length} | OK total ${ok}/${listings.length}`);
    }
  });

  const details = [...done.values()];
  writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2));
  return details;
}

async function withRetry(label, fn, retries = 6) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err?.message || String(err);
      const wait = 1200 * (i + 1);
      console.warn(`DB retry ${i + 1}/${retries} ${label}: ${msg}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

function createSql() {
  const env = loadEnv();
  return postgres(env.DATABASE_URL, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });
}

async function upsertToDb(details) {
  let sql = createSql();

  try {
    await withRetry("schema", () =>
      sql.unsafe(readFileSync(resolve(process.cwd(), "supabase/schema-kb.sql"), "utf8")),
    );

    const regions = await withRetry(
      "regions",
      () => sql`select id, slug from public.regions`,
    );
    const regionBySlug = Object.fromEntries(regions.map((r) => [r.slug, r.id]));

    let upserted = 0;
    const batchSize = 25;

    for (let i = 0; i < details.length; i += batchSize) {
      const batch = details.slice(i, i + batchSize);

      for (const d of batch) {
        await withRetry(`place ${d.external_id}`, async () => {
        try {
        const regionSlug = cityToRegionSlug(d.city, d.state);
        const regionId = regionSlug ? regionBySlug[regionSlug] || null : null;
        const baseSlug = slugify(`${d.name}-${d.city || "cm"}-${d.external_id}`);
        const slug = baseSlug || `ayilaa-${d.external_id}`;

        const [place] = await sql`
          insert into public.places (
            region_id, name, slug, category, city, neighborhood, state, country,
            short_description, description, lat, lng, tags, source_url,
            external_id, source, phone, price_from, currency, rating, review_count,
            likes_count, cuisines, hours, reviews, raw, kb_text, updated_at
          ) values (
            ${regionId},
            ${d.name},
            ${slug},
            ${CATEGORY_SLUG},
            ${d.city || null},
            ${d.neighborhood || null},
            ${d.state || null},
            ${d.country || "CM"},
            ${d.short_description || null},
            ${d.description || null},
            ${d.lat ?? null},
            ${d.lng ?? null},
            ${d.tags || [CATEGORY_SLUG]},
            ${d.source_url},
            ${d.external_id},
            ${"ayilaa"},
            ${d.phone || null},
            ${d.price_from ?? null},
            ${"XAF"},
            ${d.rating ?? null},
            ${d.review_count ?? null},
            ${d.likes_count ?? null},
            ${d.cuisines || []},
            ${sql.json(d.hours || [])},
            ${sql.json(d.reviews || [])},
            ${sql.json({ region_code: d.region_code || null, path: d.path })},
            ${d.kb_text || null},
            now()
          )
          on conflict (source, external_id) where external_id is not null
          do update set
            region_id = excluded.region_id,
            name = excluded.name,
            category = excluded.category,
            city = excluded.city,
            neighborhood = excluded.neighborhood,
            state = excluded.state,
            short_description = excluded.short_description,
            description = excluded.description,
            lat = excluded.lat,
            lng = excluded.lng,
            tags = excluded.tags,
            source_url = excluded.source_url,
            phone = excluded.phone,
            price_from = excluded.price_from,
            rating = excluded.rating,
            review_count = excluded.review_count,
            likes_count = excluded.likes_count,
            cuisines = excluded.cuisines,
            hours = excluded.hours,
            reviews = excluded.reviews,
            raw = excluded.raw,
            kb_text = excluded.kb_text,
            updated_at = now()
          returning id
        `;

        const placeId = place.id;
        const images = [...new Set([...(d.images || []), d.image].filter(Boolean))];

        await sql`delete from public.place_images where place_id = ${placeId}`;
        if (images.length) {
          await sql`
            insert into public.place_images (place_id, url, alt)
            select ${placeId}, x.url, ${d.name}
            from unnest(${images}::text[]) as x(url)
          `;
        }

        await sql`delete from public.kb_documents where place_id = ${placeId}`;
        if (d.kb_text) {
          await sql`
            insert into public.kb_documents (place_id, title, content, metadata, source)
            values (
              ${placeId},
              ${d.name},
              ${d.kb_text},
              ${sql.json({
                city: d.city,
                category: CATEGORY_SLUG,
                external_id: d.external_id,
                source_url: d.source_url,
                rating: d.rating,
                price_from: d.price_from,
              })},
              ${"ayilaa"}
            )
          `;
        }
        } catch (err) {
          try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
          sql = createSql();
          throw err;
        }
        });

        upserted++;
      }

      console.log(`DB upsert ${Math.min(i + batchSize, details.length)}/${details.length}`);
    }

    const counts = await withRetry(
      "counts",
      () => sql`
      select
        (select count(*)::int from public.places where source = 'ayilaa') as places,
        (select count(*)::int from public.place_images) as images,
        (select count(*)::int from public.kb_documents) as kb
    `,
    );
    console.log("DB counts", counts[0]);
    return counts[0];
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function upsertListingSeed(listings) {
  let sql = createSql();
  try {
    await withRetry("schema", () =>
      sql.unsafe(readFileSync(resolve(process.cwd(), "supabase/schema-kb.sql"), "utf8")),
    );
    const regions = await withRetry(
      "regions",
      () => sql`select id, slug from public.regions`,
    );
    const regionBySlug = Object.fromEntries(regions.map((r) => [r.slug, r.id]));

    let n = 0;
    for (const d of listings) {
      await withRetry(`seed ${d.external_id}`, async () => {
        try {
          const regionSlug = cityToRegionSlug(d.city, d.state);
          const regionId = regionSlug ? regionBySlug[regionSlug] || null : null;
          const slug =
            slugify(`${d.name}-${d.city || "cm"}-${d.external_id}`) || `ayilaa-${d.external_id}`;
          const kb = [
            `Nom: ${d.name}`,
            `Catégorie: ${CATEGORY_SLUG}`,
            d.city ? `Ville: ${d.city}` : null,
            d.neighborhood ? `Quartier: ${d.neighborhood}` : null,
            d.price_from ? `Prix à partir de: ${d.price_from} XAF / personne` : null,
            d.rating ? `Note: ${d.rating}/5` : null,
          ]
            .filter(Boolean)
            .join("\n");

          const [place] = await sql`
            insert into public.places (
              region_id, name, slug, category, city, neighborhood, country,
              short_description, tags, source_url, external_id, source, phone,
              price_from, currency, rating, review_count, likes_count, kb_text, updated_at
            ) values (
              ${regionId}, ${d.name}, ${slug}, ${CATEGORY_SLUG}, ${d.city || null},
              ${d.neighborhood || null}, ${"CM"},
              ${d.price_from ? `À partir de ${d.price_from} XAF / personne` : null},
              ${[CATEGORY_SLUG]}, ${d.source_url}, ${d.external_id}, ${"ayilaa"},
              ${d.phone || null}, ${d.price_from ?? null}, ${"XAF"}, ${d.rating ?? null},
              ${d.review_count ?? null}, ${d.likes_count ?? null}, ${kb}, now()
            )
            on conflict (source, external_id) where external_id is not null
            do update set
              name = excluded.name,
              city = excluded.city,
              neighborhood = excluded.neighborhood,
              price_from = coalesce(excluded.price_from, public.places.price_from),
              rating = coalesce(excluded.rating, public.places.rating),
              review_count = coalesce(excluded.review_count, public.places.review_count),
              likes_count = coalesce(excluded.likes_count, public.places.likes_count),
              kb_text = coalesce(public.places.kb_text, excluded.kb_text),
              updated_at = now()
            returning id
          `;

          if (d.image) {
            const existing =
              await sql`select id from public.place_images where place_id = ${place.id} and url = ${d.image} limit 1`;
            if (!existing.length) {
              await sql`
                insert into public.place_images (place_id, url, alt)
                values (${place.id}, ${d.image}, ${d.name})
              `;
            }
          }

          await sql`delete from public.kb_documents where place_id = ${place.id} and source = 'ayilaa'`;
          await sql`
            insert into public.kb_documents (place_id, title, content, metadata, source)
            values (
              ${place.id},
              ${d.name},
              ${kb},
              ${sql.json({ city: d.city, category: CATEGORY_SLUG, external_id: d.external_id, seed: true })},
              ${"ayilaa"}
            )
          `;
        } catch (err) {
          try {
            await sql.end({ timeout: 1 });
          } catch {
            /* ignore */
          }
          sql = createSql();
          throw err;
        }
      });

      n++;
      if (n % 100 === 0) console.log(`Seed DB ${n}/${listings.length}`);
    }
    const counts = await withRetry(
      "counts",
      () => sql`select count(*)::int as places from public.places where source = 'ayilaa'`,
    );
    console.log("Seed done", counts[0]);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const mode = process.argv[2] || "all";

if (mode === "listings") {
  await scrapeListings();
} else if (mode === "seed") {
  const listings = JSON.parse(readFileSync(LISTINGS_FILE, "utf8"));
  await upsertListingSeed(listings);
} else if (mode === "details") {
  const listings = JSON.parse(readFileSync(LISTINGS_FILE, "utf8"));
  await scrapeDetails(listings);
} else if (mode === "db") {
  const details = JSON.parse(readFileSync(DETAILS_FILE, "utf8"));
  await upsertToDb(details);
} else {
  const listings = await scrapeListings();
  await upsertListingSeed(listings);
  const details = await scrapeDetails(listings);
  await upsertToDb(details);
  console.log("DONE", details.length);
}
