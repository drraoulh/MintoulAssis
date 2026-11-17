/** Lightweight HTML meta / body helpers for event enrichment. */

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripHtml(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absUrl(raw: string, base?: string): string | null {
  const cleaned = decodeHtmlEntities(raw).trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned.startsWith('data:')) return null;
  try {
    return new URL(cleaned, base).href;
  } catch {
    return null;
  }
}

/** Prefer Open Graph / Twitter / first large content image. */
export function extractOgImage(html: string, baseUrl?: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const url = absUrl(m[1], baseUrl);
      if (url) return url;
    }
  }
  // First reasonably sized img in article-ish markup
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (/avatar|logo|icon|sprite|1x1|pixel/i.test(src)) continue;
    const url = absUrl(src, baseUrl);
    if (url) return url;
  }
  return null;
}

export function extractMetaDescription(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const text = decodeHtmlEntities(m[1]).replace(/\s+/g, ' ').trim();
      if (text.length > 40) return text;
    }
  }
  return null;
}

/** Pull a readable article body excerpt (not the full page chrome). */
export function extractArticleBody(html: string, maxLen = 1200): string | null {
  const articleMatch =
    html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i) ||
    html.match(/<div[^>]+class=["'][^"']*(?:entry-content|post-content|article-content|content-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const chunk = articleMatch?.[1] || html;
  const text = stripHtml(chunk);
  if (text.length < 80) return null;
  return text.slice(0, maxLen).trim();
}

export function extractRssEnclosureImage(itemXml: string): string | null {
  const enc = itemXml.match(
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*(?:type=["']image\/[^"']+["'])?/i,
  );
  if (enc?.[1] && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(enc[1])) {
    return decodeHtmlEntities(enc[1]);
  }
  const media =
    itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
    itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (media?.[1]) return decodeHtmlEntities(media[1]);
  const img = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img?.[1]) return decodeHtmlEntities(img[1]);
  return null;
}
