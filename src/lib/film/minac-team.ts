/**
 * Official MINAC (Ministry of Arts and Culture) leadership organigram.
 * Source: https://minac.gov.cm/fr/team — checked before general web research.
 */

const TEAM_URL = 'https://minac.gov.cm/fr/team';
const ORIGIN = 'https://minac.gov.cm';
const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; minac-organigram)';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type MinacOfficial = {
  id: string;
  name: string;
  /** Honorific + full name as printed on the organigram */
  displayName: string;
  title: string;
  /** Short role from image alt when useful */
  altTitle?: string;
  photoUrl: string;
  sourceUrl: string;
};

type Cache = { at: number; people: MinacOfficial[] };

let cache: Cache | null = null;

const STOP = new Set(
  [
    'a', 'an', 'the', 'do', 'you', 'know', 'who', 'is', 'what', 'about', 'me', 'tell',
    'qui', 'est', 'ce', 'que', 'quoi', 'des', 'les', 'une', 'un', 'du', 'de', 'la', 'le',
    'pour', 'avec', 'dans', 'sur', 'par', 'and', 'or', 'of', 'in', 'to', 'for', 'on',
    'please', 'peux', 'tu', 'parler', 'connais', 'savoir', 'ministre', 'ministry',
    'minac', 'culture', 'arts', 'directeur', 'directrice', 'chef', 'division',
  ].map((s) => s.toLowerCase()),
);

function absoluteUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${ORIGIN}${src}`;
  return `${ORIGIN}/${src}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTitleAndName(blob: string, alt: string): { title: string; displayName: string } {
  const text = blob.replace(/\s+/g, ' ').trim();
  // "Title, Honorific NAME" or "Title,\nHonorific NAME"
  const m = text.match(
    /^(.+?),\s*((?:Dr\.|Pr\.|Prof\.|Mme\.|Mlle\.|M\.|Mr\.)?\s*[A-Za-zÀ-ÿ][\wÀ-ÿ'’\- ]{2,})$/u,
  );
  if (m) {
    return { title: m[1].trim(), displayName: m[2].trim().replace(/[;.,]+$/, '') };
  }
  // Title already in alt; remainder is name
  if (alt && text.toLowerCase().startsWith(alt.toLowerCase())) {
    const rest = text.slice(alt.length).replace(/^[\s,;]+/, '').trim();
    if (rest.length >= 3) return { title: alt, displayName: rest.replace(/[;.,]+$/, '') };
  }
  // "Title Honorific NAME" without comma
  const m2 = text.match(
    /^(.+?)\s+((?:Dr\.|Pr\.|Prof\.|Mme\.|Mlle\.|M\.|Mr\.)\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'’\- ]{2,})$/u,
  );
  if (m2) {
    return { title: m2[1].trim().replace(/,+$/, ''), displayName: m2[2].trim() };
  }
  return {
    title: alt || text.split(',')[0]?.trim() || 'Responsable MINAC',
    displayName: text.includes(',')
      ? text.split(',').slice(1).join(',').trim() || text
      : text,
  };
}

/** Strip honorifics for matching */
export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|pr|prof|mme|mlle|mr|m)\b\.?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTeamHtml(html: string): MinacOfficial[] {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const people: MinacOfficial[] = [];
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let td: RegExpExecArray | null;
  while ((td = tdRe.exec(body))) {
    const cell = td[1];
    const img = cell.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (!img) continue;
    const src = img[1];
    if (!/\/images\/demo\//i.test(src)) continue;
    if (/logo|facebook|twitter|youtube|instagram|amoirie/i.test(src)) continue;

    const altMatch = img[0].match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? cleanText(altMatch[1]) : '';

    const pMatch = cell.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const blob = cleanText(pMatch ? pMatch[1] : cell.replace(img[0], ' '));
    if (!blob || /reseaux|newsletter|copyright|facebook/i.test(blob)) continue;

    const { title, displayName } = parseTitleAndName(blob.replace(/\n/g, ' '), alt);
    const nameCore = normalizePersonName(displayName);
    if (nameCore.length < 4) continue;
    // Avoid junk like orphaned titles
    if (/^(directeur|conseiller|inspecteur|coordonnateur|responsable)\b/i.test(nameCore) && nameCore.split(' ').length < 3) {
      continue;
    }

    let finalTitle = title.replace(/\s+/g, ' ').trim();
    // Prefer full title from <p> over vague alts like "Responsable 6"
    if (/^responsable\s*\d*$/i.test(finalTitle) && alt && !/^responsable/i.test(alt)) {
      finalTitle = alt;
    }
    if (/^responsable\s*\d*$/i.test(finalTitle) && blob.includes(',')) {
      finalTitle = blob.split(',')[0].trim();
    }

    people.push({
      id: slugify(nameCore) || slugify(finalTitle),
      name: nameCore,
      displayName: displayName.replace(/[;]+$/, '').trim(),
      title: finalTitle,
      altTitle: alt || undefined,
      photoUrl: absoluteUrl(src),
      sourceUrl: TEAM_URL,
    });
  }

  // Dedupe by normalized name (keep first / highest in chart)
  const seen = new Set<string>();
  const out: MinacOfficial[] = [];
  for (const p of people) {
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    out.push(p);
  }
  return out;
}

export async function fetchMinacTeam(force = false): Promise<MinacOfficial[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.people;
  }
  try {
    const res = await fetch(TEAM_URL, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`MINAC team HTTP ${res.status}`);
    const html = await res.text();
    const people = parseTeamHtml(html);
    if (people.length) {
      cache = { at: Date.now(), people };
      return people;
    }
  } catch (err) {
    console.warn('[minac-team] fetch failed', err);
  }
  return cache?.people || [];
}

export function looksLikeMinacOrPersonQuery(text: string): boolean {
  if (/minac|minist[eè]re\s+des?\s+arts|minist[eè]re\s+de\s+la\s+culture|organigram|equipe\s+dirigeante|équipe\s+dirigeante/i.test(text)) {
    return true;
  }
  if (/\b(ministre|secretaire\s+general|secrétaire\s+général|directeur|directrice|inspecteur|conseiller\s+technique)\b/i.test(text)) {
    return true;
  }
  // Capitalized multi-word name
  if (/\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+){1,4})\b/u.test(text)) {
    return true;
  }
  return text.trim().split(/\s+/).length <= 8;
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Exact for short tokens; tolerates typos like Donatius → Donatus, Tangem → Tanguem. */
function tokenMatches(nameToken: string, queryTokens: string[], queryNorm: string): boolean {
  if (queryNorm.includes(nameToken)) return true;
  if (nameToken.length < 5) return false;
  const maxDist = nameToken.length >= 8 ? 2 : 1;
  return queryTokens.some((q) => q.length >= 4 && editDistance(nameToken, q) <= maxDist);
}

function scoreOfficial(person: MinacOfficial, queryNorm: string, tokens: string[]): number {
  const hay = `${person.name} ${normalizePersonName(person.displayName)} ${normalizePersonName(person.title)}`;
  let score = 0;
  if (hay.includes(queryNorm) || queryNorm.includes(person.name)) score += 20;
  // All significant tokens of the person name appear in query
  const nameTokens = person.name.split(' ').filter((t) => t.length >= 3);
  const hitName = nameTokens.filter((t) => tokenMatches(t, tokens, queryNorm));
  if (nameTokens.length && hitName.length === nameTokens.length) score += 18;
  else if (hitName.length >= 2) score += 12;
  else if (hitName.length === 1 && nameTokens.length <= 2) score += 6;

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (person.name.includes(t)) score += 5;
    else if (hay.includes(t)) score += 2;
  }
  return score;
}

export type MinacLookup = {
  matches: MinacOfficial[];
  people: MinacOfficial[];
  sourceUrl: string;
};

/**
 * Look up MINAC organigram first. Returns ranked matches for the user query.
 */
export async function lookupMinacOfficials(userText: string): Promise<MinacLookup> {
  const people = await fetchMinacTeam();
  const q = userText.replace(/\s+/g, ' ').trim();
  const queryNorm = normalizePersonName(q);
  const tokens = queryNorm
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

  if (!people.length) {
    return { matches: [], people, sourceUrl: TEAM_URL };
  }

  // List whole organigram
  if (/organigram|equipe\s+dirigeante|équipe\s+dirigeante|toute\s+l['’]?equipe|all\s+(the\s+)?(team|leadership)/i.test(q)) {
    return { matches: people.slice(0, 20), people, sourceUrl: TEAM_URL };
  }

  // Role shortcuts (ministre, SG, directeur cinéma…)
  const roleMatchers: { re: RegExp; pick: (p: MinacOfficial) => boolean }[] = [
    {
      re: /ministre(\s+des?\s+arts|\s+de\s+la\s+culture)?|minister\s+of\s+(arts|culture)/i,
      pick: (p) => /^ministre\b/i.test(p.title),
    },
    {
      re: /secr[eé]taire\s+g[eé]n[eé]ral/i,
      pick: (p) => /secretaire\s+general|secrétaire\s+général/i.test(p.title),
    },
    {
      re: /inspecteur\s+g[eé]n[eé]ral/i,
      pick: (p) => /inspecteur\s+general|inspecteur\s+général/i.test(p.title),
    },
    {
      re: /cin[eé]matograph|audiovisuel|productions?\s+audiovisuelles/i,
      pick: (p) => /cin[eé]matograph|audiovisuel/i.test(p.title),
    },
  ];
  for (const rm of roleMatchers) {
    if (rm.re.test(q)) {
      const roleHits = people.filter(rm.pick);
      if (roleHits.length) {
        return { matches: roleHits.slice(0, 5), people, sourceUrl: TEAM_URL };
      }
    }
  }

  const scored = people
    .map((p) => ({ p, score: scoreOfficial(p, queryNorm, tokens) }))
    .filter((x) => x.score >= 8)
    .sort((a, b) => b.score - a.score);

  return {
    matches: scored.slice(0, 5).map((x) => x.p),
    people,
    sourceUrl: TEAM_URL,
  };
}

export function formatMinacForPrompt(matches: MinacOfficial[], locale: 'fr' | 'en'): string {
  if (!matches.length) return '';
  const lines = matches.map(
    (p, i) =>
      `${i + 1}. ${p.displayName}\n   Titre / fonction: ${p.title}`,
  );
  if (locale === 'en') {
    return `OFFICIAL MINAC ORGANIGRAM — authoritative for titles (the UI shows their photo):\n${lines.join('\n')}`;
  }
  return `ORGANIGRAMME OFFICIEL MINAC — référence pour les titres (l’UI affiche leur photo) :\n${lines.join('\n')}`;
}

export function composeMinacAnswer(
  locale: 'fr' | 'en',
  matches: MinacOfficial[],
): string {
  if (!matches.length) return '';
  if (matches.length === 1) {
    const p = matches[0];
    if (locale === 'en') {
      return `## ${p.displayName}

**${p.title}** — Ministry of Arts and Culture (MINAC), Cameroon.`;
    }
    return `## ${p.displayName}

**${p.title}** — Ministère des Arts et de la Culture (MINAC), Cameroun.`;
  }

  const list = matches
    .map((p) => `- **${p.displayName}** — ${p.title}`)
    .join('\n');
  if (locale === 'en') {
    return `## MINAC leadership

${list}`;
  }
  return `## Équipe dirigeante du MINAC

${list}`;
}

/** UI payload for chat person cards */
export function minacToPersonCards(matches: MinacOfficial[]) {
  return matches.map((p) => ({
    id: p.id,
    name: p.displayName,
    title: p.title,
    organization: 'MINAC — Ministère des Arts et de la Culture',
    photoUrl: p.photoUrl,
    sourceUrl: p.sourceUrl,
    sourceLabel: 'Organigramme MINAC',
  }));
}
