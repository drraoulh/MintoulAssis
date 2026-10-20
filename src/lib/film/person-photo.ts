/**
 * Fetch a public portrait for a Cameroon cinema / culture personality.
 * Prefer Wikipedia (FR then EN); fall back to Africiné / CINAF Open Graph images.
 */

import type { PersonUI } from '@/lib/types';
import { wikiSearchTitles } from '@/lib/film/filmography';
import { extractCinemaSearchTerms } from '@/lib/film/research-cinema';

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; person-photo)';

export type OnlinePersonProfile = PersonUI & {
  extract?: string;
  wikiLang?: 'fr' | 'en';
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanWikiThumb(url: string): string {
  // Drop tracking params that can break some image CDNs
  try {
    const u = new URL(url);
    u.search = '';
    return u.toString();
  } catch {
    return url.split('?')[0];
  }
}

function looksLikePersonPage(opts: {
  title: string;
  description?: string;
  extract?: string;
  type?: string;
}): boolean {
  if (opts.type === 'disambiguation') return false;
  const blob = `${opts.title} ${opts.description || ''} ${opts.extract || ''}`.toLowerCase();
  if (/\bliste\b|\blist of\b|\bcatégorie\b|\bcategory\b/i.test(opts.title)) return false;
  // Film/series pages — skip for person cards
  if (
    /\b(film|série|serie|movie|album|festival|catégorie|category)\b/i.test(opts.description || '') &&
    !/\b(acteur|actrice|réalisateur|réalisatrice|producteur|productrice|cinéaste|videographer|director|actor|actress|screenwriter|scénariste)\b/i.test(
      blob,
    )
  ) {
    return false;
  }
  return (
    /\b(acteur|actrice|réalisateur|réalisatrice|producteur|productrice|cinéaste|scénariste|vidéographe|videographer|director|actor|actress|screenwriter|filmmaker|artiste|chanteur|chanteuse|ministre|professeur|enseignant)\b/i.test(
      blob,
    ) || /\b(né|née|born)\b/i.test(opts.extract || '')
  );
}

async function wikiSummary(
  lang: 'fr' | 'en',
  title: string,
): Promise<{
  title: string;
  description?: string;
  extract?: string;
  type?: string;
  photoUrl?: string;
  pageUrl: string;
} | null> {
  try {
    const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const res = await fetch(sumUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const sum = (await res.json()) as {
      title?: string;
      description?: string;
      extract?: string;
      type?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    // Prefer thumbnail for faster chat cards; fall back to original
    const photo =
      sum.thumbnail?.source || sum.originalimage?.source
        ? cleanWikiThumb(sum.thumbnail?.source || sum.originalimage!.source!)
        : undefined;
    return {
      title: sum.title || title,
      description: sum.description,
      extract: sum.extract,
      type: sum.type,
      photoUrl: photo,
      pageUrl:
        sum.content_urls?.desktop?.page ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    };
  } catch {
    return null;
  }
}

async function wikiFindPerson(
  lang: 'fr' | 'en',
  query: string,
): Promise<OnlinePersonProfile | null> {
  try {
    const titles = (await wikiSearchTitles(lang, query)).slice(0, 4);
    const summaries = await Promise.all(titles.map((t) => wikiSummary(lang, t)));

    for (const summary of summaries) {
      if (!summary) continue;
      if (
        !looksLikePersonPage({
          title: summary.title,
          description: summary.description,
          extract: summary.extract,
          type: summary.type,
        })
      ) {
        continue;
      }
      // Prefer pages whose title overlaps the query name
      const qn = query.toLowerCase();
      const tn = summary.title.toLowerCase();
      const nameBits = qn
        .split(/[^\p{L}]+/u)
        .filter((w) => w.length >= 3)
        .slice(0, 4);
      const overlap = nameBits.filter(
        (b) => tn.includes(b) || tn.split(/[^\p{L}]+/u).some((w) => w.length >= 5 && b.length >= 5 && w.slice(0, 4) === b.slice(0, 4)),
      ).length;
      if (overlap < Math.min(2, nameBits.length)) continue;

      return {
        id: `wiki-${lang}-${slugify(summary.title)}`,
        name: summary.title,
        title: summary.description || undefined,
        organization:
          lang === 'fr' ? 'Cinéma / culture — Cameroun' : 'Cameroon cinema / culture',
        photoUrl: summary.photoUrl || null,
        sourceUrl: summary.pageUrl,
        sourceLabel: lang === 'fr' ? 'Wikipédia' : 'Wikipedia',
        extract: summary.extract,
        wikiLang: lang,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function ogImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const og =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );
    const src = og?.[1]?.trim();
    if (!src || !/^https?:\/\//i.test(src)) return null;
    return src;
  } catch {
    return null;
  }
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

type WebImage = { imageUrl: string; pageUrl: string | null; title: string };

function nameTokens(s: string): string[] {
  return slugify(s)
    .split('-')
    .filter((t) => t.length >= 3);
}

/** Bing Images (no API key): bare name first (most precise), then with a Cameroon cinema hint. */
async function bingPortrait(name: string): Promise<WebImage | null> {
  const [plain, hinted] = await Promise.all([
    bingPortraitQuery(name, name),
    bingPortraitQuery(name, `${name} cameroun cinéma`),
  ]);
  return plain || hinted;
}

/** Returns the first portrait whose caption / page URL names the person. */
async function bingPortraitQuery(name: string, query: string): Promise<WebImage | null> {
  const want = nameTokens(name);
  if (!want.length) return null;
  try {
    const url = new URL('https://www.bing.com/images/search');
    url.searchParams.set('q', query);
    url.searchParams.set('qft', '+filterui:face-portrait');
    url.searchParams.set('form', 'IRFLTR');
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
      signal: AbortSignal.timeout(6_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    for (const m of html.matchAll(/\sm="(\{[^"]+\})"/g)) {
      let meta: { murl?: string; turl?: string; purl?: string; t?: string };
      try {
        meta = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      } catch {
        continue;
      }
      const thumb = meta.turl || meta.murl;
      if (!thumb || !/^https:\/\//i.test(thumb)) continue;
      const hay = slugify(`${meta.t || ''} ${meta.purl || ''}`);
      const overlap = want.filter((w) => hay.includes(w)).length;
      if (overlap < Math.min(2, want.length)) continue;
      return { imageUrl: thumb, pageUrl: meta.purl || null, title: meta.t || name };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function enrichPhotoFromCatalogs(
  name: string,
  profile: OnlinePersonProfile,
  allowWebSearch: boolean,
): Promise<OnlinePersonProfile> {
  if (profile.photoUrl) return profile;
  const slug = slugify(name);
  const catalogs = [
    `https://www.africine.org/personne/${slug}`,
    `https://www.cinaf.tv/fr/artistes/${slug}`,
  ];
  if (/kepombia|mitoumba/i.test(name)) {
    catalogs.push('https://www.cinaf.tv/fr/artistes/ebenzer-kepombia-c29');
  }

  // All probes in parallel; pick by source priority (catalog pages before web search)
  const [catalogHits, web] = await Promise.all([
    Promise.all(catalogs.map(async (url) => ({ url, img: await ogImageFromUrl(url) }))),
    allowWebSearch ? bingPortrait(name) : Promise.resolve(null),
  ]);

  const catalog = catalogHits.find((c) => c.img);
  if (catalog?.img) {
    return {
      ...profile,
      photoUrl: catalog.img,
      sourceUrl: profile.sourceUrl || catalog.url,
      sourceLabel:
        profile.sourceLabel || (catalog.url.includes('cinaf') ? 'CINAF' : 'Africiné'),
    };
  }
  if (web) {
    return {
      ...profile,
      photoUrl: web.imageUrl,
      sourceUrl: profile.sourceUrl || web.pageUrl,
      sourceLabel: profile.sourceUrl ? profile.sourceLabel : 'Web',
    };
  }
  return profile;
}

/** Name-shaped term that the user didn't phrase as a film / series title. */
function looksLikePersonName(term: string, userText: string): boolean {
  const words = term.trim().split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (/^(le|la|les|l['’]|un|une|des|du|the|a|an)$/i.test(words[0])) return false;
  if (/joue\s+dans|casting|distribution|acteurs?\s+(de|du|des|dans)|cast\s+of|starring|\bsaison\b|\bépisode\b/i.test(userText)) {
    return false;
  }
  // "la série X" / "le film X" (but not "les films de X")
  if (/\b(la\s+s[ée]rie|le\s+film|the\s+(series|film|movie))\b/i.test(userText)) return false;
  // "… de La Bataille des chéries" — the term was preceded by an article in the original text
  const first = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp(`\\b(le|la|les|l['’]|the)\\s+${first}`, 'i').test(userText);
}

export function looksLikePersonResearchQuery(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (
    /\b(qui\s+est|who\s+is|do\s+you\s+know|connais[- ]tu|parle[- ]moi\s+de|tell\s+me\s+about|c['’]est\s+qui|filmograph\w*|r[ée]alisations?\s+de|films?\s+(de|d['’]|par|r[ée]alis\w*|produit\w*)|s[ée]ries?\s+(de|d['’]|par|r[ée]alis\w*|produit\w*)|r[ée]alis[ée]e?s?\s+par|produits?\s+par|r[ôo]les?\s+de|[œo]euvres?\s+de|movies?\s+(of|by)|works\s+of|directed\s+by|produced\s+by)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // Capitalized multi-word proper name
  if (
    /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+){1,4})\b/u.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve the best online person profile (with photo when available).
 */
export async function fetchOnlinePersonProfile(
  userText: string,
): Promise<OnlinePersonProfile | null> {
  if (!looksLikePersonResearchQuery(userText)) return null;

  const terms = extractCinemaSearchTerms(userText);
  const primary = terms[0] || userText.trim();
  if (primary.length < 3) return null;
  // Cast / film / series questions get the dossier, not a single portrait
  if (!looksLikePersonName(primary, userText) && !/\b(qui\s+est|who\s+is|c['’]est\s+qui)\b/i.test(userText)) {
    return null;
  }

  // Prefer FR Wikipedia for Cameroon personalities, then EN — searched in parallel
  const candidates = await Promise.all([
    wikiFindPerson('fr', `${primary} Cameroun`),
    wikiFindPerson('fr', primary),
    wikiFindPerson('en', primary),
    wikiFindPerson('en', `${primary} Cameroon`),
  ]);
  let best: OnlinePersonProfile | null = candidates.find(Boolean) ?? null;

  if (!best) {
    // Minimal stub so we can still try catalog / web photos
    best = {
      id: `web-${slugify(primary)}`,
      name: primary.replace(/(^|[\s-])(\p{Ll})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase()),
      title: undefined,
      organization: 'Industrie cinéma camerounaise',
      photoUrl: null,
      sourceUrl: null,
      sourceLabel: 'Web',
    };
  }

  const wikiPerson = best.sourceLabel !== 'Web';
  best = await enrichPhotoFromCatalogs(
    primary,
    best,
    wikiPerson || looksLikePersonName(primary, userText),
  );
  // Drop stub with neither photo nor useful title/extract
  if (!best.photoUrl && !best.title && !best.extract && best.sourceLabel === 'Web') {
    return null;
  }
  // Prefer profiles that at least have a photo or a solid bio line
  if (!best.photoUrl && !best.title && !(best.extract && best.extract.length > 40)) {
    return null;
  }
  return best;
}

export function onlineProfileToPersonUI(p: OnlinePersonProfile): PersonUI {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    organization: p.organization,
    photoUrl: p.photoUrl,
    sourceUrl: p.sourceUrl,
    sourceLabel: p.sourceLabel,
  };
}
