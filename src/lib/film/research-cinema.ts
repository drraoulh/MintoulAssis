/**
 * Live research for Cameroon cinema people / films / industry.
 * Uses free Wikipedia APIs always; Tavily/Brave when configured.
 */

import {
  buildCinemaWebQuery,
  formatWebHitsForPrompt,
  searchWeb,
  webHitsToCitations,
  webSearchEnvEnabled,
  type WebSearchHit,
} from '@/lib/web-search';

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; film-research)';

const STOP = new Set(
  [
    'a', 'an', 'the', 'do', 'you', 'know', 'who', 'is', 'what', 'about', 'me', 'tell',
    'qui', 'est', 'ce', 'que', 'quoi', 'des', 'les', 'une', 'un', 'du', 'de', 'la', 'le',
    'pour', 'avec', 'dans', 'sur', 'par', 'and', 'or', 'of', 'in', 'to', 'for', 'on',
    'please', 'peux', 'tu', 'me', 'parler', 'connais', 'savoir', 'infos', 'information',
    // Question / intent words that must never end up in an entity search
    'quel', 'quels', 'quelle', 'quelles', 'sont', 'ont', 'été', 'ete', 'liste', 'lister',
    'donne', 'donner', 'moi', 'toutes', 'tous', 'tout', 'ses', 'son', 'sa', 'leur', 'leurs',
    'combien', 'quand', 'comment', 'pourquoi', 'année', 'annee', 'années', 'annees', 'date',
    'dates', 'filmographie', 'filmography', 'réalisation', 'realisation', 'réalisations',
    'realisations', 'œuvre', 'oeuvre', 'œuvres', 'oeuvres', 'productions', 'production',
    'films', 'film', 'séries', 'series', 'série', 'serie', 'rôles', 'roles', 'rôle', 'role',
    'joué', 'joue', 'jouer', 'réalisé', 'realise', 'produit', 'produits', 'créé', 'cree',
    'réaliser', 'realiser', 'réalisés', 'realises', 'réalisées', 'realisees', 'produire',
    'fait', 'faits', 'faites', 'travaux', 'projets', 'projet', 'récents', 'recents',
    'acteurs', 'actrices', 'casting', 'distribution', 'biographie', 'bio', 'carrière',
    'carriere', 'parle', 'dis', 'raconte', 'peut', 'aussi', 'plus', 'récentes', 'recentes',
    'which', 'list', 'movies', 'movie', 'works', 'filmmaker', 'made', 'directed', 'produced',
    'has', 'have', 'his', 'her', 'their', 'all', 'with', 'when', 'how', 'many', 'give',
    'show', 'year', 'years', 'cast', 'played', 'starred', 'biography', 'career', 'are',
    'was', 'were', 'did', 'does', 'cameroun', 'cameroon', 'camerounais', 'camerounaise',
    'cameroonian', 'cinéma', 'cinema', 'acteur', 'actrice', 'actor', 'actress',
    'réalisateur', 'realisateur', 'réalisatrice', 'realisatrice', 'producteur',
    'productrice', 'producer', 'director',
  ].map((s) => s.toLowerCase()),
);

function trimStopwords(phrase: string): string {
  const words = phrase.split(/\s+/);
  while (words.length && STOP.has(words[0].toLowerCase())) words.shift();
  while (words.length && STOP.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ');
}

export function extractCinemaSearchTerms(userText: string): string[] {
  const text = userText.replace(/\s+/g, ' ').trim();
  const named: string[] = [];

  // Quoted names
  for (const m of text.matchAll(/[«"“]([^»"”]{2,80})[»"”]/g)) {
    named.push(m[1].trim());
  }

  // Capitalized multi-word names (Ebenezer Kepombia, Jean-Pierre Bekolo)
  const capitalized: string[] = [];
  for (const m of text.matchAll(
    /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+){1,4})\b/gu,
  )) {
    const t = trimStopwords(m[1].trim());
    if (t.split(/\s+/).length >= 2) capitalized.push(t);
  }
  named.push(...capitalized.sort((a, b) => b.length - a.length));

  // Remaining content words (filter stopwords) — handles lowercase names
  const words = text
    .split(/[^\p{L}\p{N}'’-]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w.toLowerCase()));
  const terms = [...named];
  if (words.length) terms.push(words.join(' '));

  // Dedupe; named entities first, then the content-word fallback
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out.length ? out : [text.slice(0, 120)];
}

async function wikiSearch(lang: 'fr' | 'en', query: string): Promise<WebSearchHit[]> {
  try {
    const searchUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', '3');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: { search?: { title: string; snippet: string; pageid: number }[] };
    };
    const hits: WebSearchHit[] = [];
    for (const item of data.query?.search || []) {
      const title = item.title;
      const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      // Fetch intro extract
      let snippet = item.snippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      try {
        const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
        const sumRes = await fetch(sumUrl, {
          headers: { 'User-Agent': UA, Accept: 'application/json' },
          signal: AbortSignal.timeout(8_000),
          cache: 'no-store',
        });
        if (sumRes.ok) {
          const sum = (await sumRes.json()) as { extract?: string; description?: string };
          if (sum.extract) snippet = sum.extract.slice(0, 600);
          else if (sum.description) snippet = sum.description;
        }
      } catch {
        /* keep search snippet */
      }
      hits.push({
        title: `${title} (Wikipedia ${lang.toUpperCase()})`,
        url: pageUrl,
        snippet,
        provider: 'tavily', // type requires tavily|brave — treat as research hit
      });
    }
    return hits;
  } catch {
    return [];
  }
}

async function africineHint(name: string): Promise<WebSearchHit | null> {
  // Direct person slug guess + site search page
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const url = `https://www.africine.org/personne/${slug}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (/404|page introuvable|not found/i.test(html.slice(0, 2000))) return null;
    const title =
      html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ||
      `Africiné — ${name}`;
    const desc =
      html
        .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim() ||
      html
        .match(/<p[^>]*>([^<]{80,400})<\/p>/i)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim() ||
      `Fiche Africiné pour ${name} (cinéma africain).`;
    return {
      title: title.slice(0, 160),
      url,
      snippet: desc.slice(0, 420),
      provider: 'brave',
    };
  } catch {
    return null;
  }
}

/** CINAF catalogue probe (Cameroon / African VOD — strong on local TV series). */
async function cinafHint(name: string): Promise<WebSearchHit | null> {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // Known CINAF artist paths often drop accents / typo variants
  const urls = [`https://www.cinaf.tv/fr/artistes/${slug}`];
  // CINAF slug for Kepombia uses a common typo ("Ebenzer")
  if (/kepombia|mitoumba/i.test(name)) {
    urls.push('https://www.cinaf.tv/fr/artistes/ebenzer-kepombia-c29');
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (/404|page introuvable|not found|aucun résultat/i.test(html.slice(0, 2500))) {
        continue;
      }
      const title =
        html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ||
        `CINAF — ${name}`;
      const desc =
        html
          .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
          ?.replace(/\s+/g, ' ')
          .trim() ||
        html
          .match(/<p[^>]*>([^<]{60,400})<\/p>/i)?.[1]
          ?.replace(/\s+/g, ' ')
          .trim() ||
        `Fiche artiste CINAF (cinéma / séries camerounaises) pour ${name}.`;
      return {
        title: title.slice(0, 160),
        url,
        snippet: desc.slice(0, 420),
        provider: 'brave',
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** DuckDuckGo HTML lite — free web hits when Tavily/Brave keys are absent. */
async function duckDuckGoHits(query: string): Promise<WebSearchHit[]> {
  try {
    const url = new URL('https://html.duckduckgo.com/html/');
    url.searchParams.set('q', query);
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const html = await res.text();
    const hits: WebSearchHit[] = [];
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)>|)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && hits.length < 5) {
      let href = m[1];
      // DDG redirect wrapper
      const uddg = href.match(/[?&]uddg=([^&]+)/);
      if (uddg) {
        try {
          href = decodeURIComponent(uddg[1]);
        } catch {
          /* keep */
        }
      }
      if (!/^https?:\/\//i.test(href)) continue;
      if (/duckduckgo\.com/i.test(href)) continue;
      const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const snippet = (m[3] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) continue;
      hits.push({
        title: title.slice(0, 160),
        url: href,
        snippet: snippet.slice(0, 420) || `Résultat web pour : ${query}`,
        provider: 'brave',
      });
    }
    return hits;
  } catch {
    return [];
  }
}

export type CinemaResearch = {
  hits: WebSearchHit[];
  provider: 'wikipedia' | 'mixed' | 'web' | 'none';
  query: string;
  block: string;
  citations: { title: string; url: string; type: 'WEB' }[];
};

/**
 * Always research online for Cameroon film-industry questions.
 * Wikipedia (free) + optional Tavily/Brave + Africiné page probe.
 */
export async function researchCameroonCinema(
  userText: string,
): Promise<CinemaResearch> {
  const terms = extractCinemaSearchTerms(userText);
  const primary = terms[0] || userText;
  const cameroonQuery = `${primary} Cameroun cinéma`;

  const tasks: Promise<WebSearchHit[]>[] = [
    wikiSearch('fr', cameroonQuery),
    wikiSearch('fr', primary),
    wikiSearch('en', `${primary} Cameroon cinema`),
    wikiSearch('en', `${primary} Cameroonian`),
  ];

  // Africiné + CINAF direct probes for the main name
  tasks.push(africineHint(primary).then((h) => (h ? [h] : [])));
  tasks.push(cinafHint(primary).then((h) => (h ? [h] : [])));

  // Free web when paid search keys are missing
  if (!webSearchEnvEnabled()) {
    tasks.push(duckDuckGoHits(`${primary} Cameroun cinéma OR actor OR réalisateur OR producteur`));
    tasks.push(duckDuckGoHits(`${primary} Cameroon film OR producer OR actress`));
  }

  if (webSearchEnvEnabled()) {
    tasks.push(
      searchWeb({
        query: buildCinemaWebQuery({
          userText: cameroonQuery,
          personOrFilm: true,
        }),
        maxResults: 6,
      }).then((r) => r.hits),
    );
    tasks.push(
      searchWeb({
        query: `${primary} producteur réalisateur acteur Cameroun`,
        maxResults: 5,
      }).then((r) => r.hits),
    );
  }

  const batches = await Promise.all(tasks);
  const seen = new Set<string>();
  const hits: WebSearchHit[] = [];
  for (const batch of batches) {
    for (const h of batch) {
      if (seen.has(h.url)) continue;
      // Prefer Cameroon / African cinema relevance
      const blob = `${h.title} ${h.snippet}`.toLowerCase();
      const relevant =
        /cameroun|cameroon|africain|africa|cin[eé]|film|s[eé]rie|acteur|r[eé]alisat|producteur|yaound|douala|mitoumba|canal\s*2/i.test(
          blob,
        ) || /wikipedia|africin[eé]/i.test(h.title);
      if (!relevant && hits.length >= 2) continue;
      seen.add(h.url);
      hits.push(h);
      if (hits.length >= 10) break;
    }
    if (hits.length >= 10) break;
  }

  const hasWiki = hits.some((h) => /wikipedia/i.test(h.url));
  const hasWeb = hits.some((h) => !/wikipedia|africine/i.test(h.url));
  const provider: CinemaResearch['provider'] =
    hits.length === 0
      ? 'none'
      : hasWiki && hasWeb
        ? 'mixed'
        : hasWiki
          ? 'wikipedia'
          : 'web';

  return {
    hits,
    provider,
    query: cameroonQuery,
    block: formatWebHitsForPrompt(hits),
    citations: webHitsToCitations(hits),
  };
}
