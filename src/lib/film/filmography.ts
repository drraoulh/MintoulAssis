/**
 * Structured filmography / credits research for Cameroon cinema entities
 * (people, films, series). Pulls the full Wikipedia wikitext (FR + EN) so
 * tables like "Filmographie" keep their years and roles, plus Wikidata credits.
 */

import { extractCinemaSearchTerms } from '@/lib/film/research-cinema';

const UA = 'SmartMboaFilmBot/1.0 (+https://smartmboatour.com; filmography)';

export type WorkTable = {
  section: string;
  header: string[];
  rows: string[][];
};

export type WikiDossier = {
  lang: 'fr' | 'en';
  title: string;
  url: string;
  lead: string;
  infobox: { key: string; value: string }[];
  biography: string;
  tables: WorkTable[];
  lists: { section: string; items: string[] }[];
};

export type WikidataCredit = {
  title: string;
  year?: string;
  roles: string[];
  kind?: string;
};

export type EntityDossier = {
  query: string;
  wiki: WikiDossier[];
  wikidata: { id: string; label: string; credits: WikidataCredit[] } | null;
  block: string;
  citations: { title: string; url: string; type: 'WEB' }[];
};

const WORK_SECTION_RE =
  /filmograph|r[ée]alisations?|[œo]euvres|productions?|s[ée]ries|films?\b|t[ée]l[ée]vision|cin[ée]ma|courts?[- ]m[ée]trages?|longs?[- ]m[ée]trages?|documentaires?|th[ée][âa]tre|r[ôo]les?|works|filmography|television|movies|distribution|casting|fiche technique|synopsis|[ée]pisodes|saisons?|seasons?|cast\b|distinctions|r[ée]compenses|prix|nominations|awards|honours|discograph/i;

const BIO_SECTION_RE = /biograph|carri[eè]re|parcours|d[ée]buts|formation|vie|career|early life|personal life/i;

const SKIP_SECTION_RE =
  /notes|r[ée]f[ée]rences|bibliograph|liens externes|voir aussi|articles connexes|external links|see also|further reading|sources/i;

const INFOBOX_SKIP_KEY_RE =
  /image|légende|legende|caption|upright|taille|alt|couleur|color|colonne|signature|logo|carte|map|coordonn|blason|site|charte|embed|module|pos\b/i;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');
}

function nameTokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

async function getJson<T>(url: string, timeoutMs = 10_000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Wikitext → plain text ──────────────────────────────────────────────

const KEEP_LAST_PARAM_TEMPLATES =
  /^(lang|langue|nobr|nowrap|souligner|italique|small|petit|japonais|date-|date|nom|sc|abbr|lien|ill|interlanguage link|lang-[a-z]+|film|titre|title|nihongo|nobreak)$/i;

function stripTemplates(text: string): string {
  let out = text;
  for (let guard = 0; guard < 40 && out.includes('{{'); guard++) {
    const next = out.replace(/\{\{([^{}]*)\}\}/g, (_m, inner: string) => {
      const parts = inner.split('|').map((p) => p.trim());
      const name = (parts[0] || '').trim();
      if (name === '!') return '|';
      if (/^(date|dts)|naissance|d[ée]c[èe]s|birth|death|start date|end date|film date/i.test(name)) {
        const positional = parts.slice(1).filter((p) => p && !p.includes('='));
        if (positional.length >= 3 && positional.slice(0, 3).every((p) => /^\d+$/.test(p))) {
          const [y, m, d] = positional;
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return positional.join(' ');
      }
      if (/^(ill|lien|interlanguage link)$/i.test(name)) {
        return (parts.find((p, i) => i > 0 && !p.includes('=')) || '').trim();
      }
      if (KEEP_LAST_PARAM_TEMPLATES.test(name)) {
        const positional = parts.slice(1).filter((p) => !/^[\w-]+\s*=/.test(p));
        return positional[positional.length - 1] || '';
      }
      return '';
    });
    if (next === out) break;
    out = next;
  }
  return out.replace(/\{\{|\}\}/g, '');
}

export function wikitextToPlain(text: string): string {
  let t = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  t = stripTemplates(t);
  t = t
    .replace(/\[\[(?:Fichier|File|Image|Catégorie|Category):[^\]]*(?:\[\[[^\]]*\]\][^\]]*)*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/[^\]]+\]/g, '')
    .replace(/'''''|'''|''/g, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ');
  return t
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanCell(raw: string): string {
  let cell = raw;
  // Cell attributes: `style="…" | content` (single pipe, not inside links)
  const attr = cell.match(
    /^\s*[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|"]+)(?:\s+[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|"]+))*\s*\|(?!\|)([\s\S]*)$/i,
  );
  if (attr) cell = attr[1];
  return wikitextToPlain(cell).replace(/\s*\/\s*$/, '').replace(/\s+/g, ' ').trim();
}

/** Parse every `{| … |}` wikitable in a chunk of wikitext. */
function parseTables(text: string, section: string): WorkTable[] {
  const tables: WorkTable[] = [];
  const re = /\{\|[\s\S]*?\n\|\}/g;
  for (const m of text.matchAll(re)) {
    const lines = m[0].split('\n');
    let header: string[] = [];
    const rows: string[][] = [];
    let current: string[] | null = null;
    const flush = () => {
      if (current && current.some(Boolean)) rows.push(current);
      current = null;
    };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('{|') || line.startsWith('|+')) continue;
      if (line.startsWith('|}')) break;
      if (line.startsWith('|-')) {
        flush();
        current = [];
        continue;
      }
      if (line.startsWith('!')) {
        const cells = line.slice(1).split('!!').map(cleanCell);
        if (!rows.length && (!current || !current.length)) header.push(...cells);
        else (current ??= []).push(...cells);
        continue;
      }
      if (line.startsWith('|')) {
        const cells = line.slice(1).split('||').map(cleanCell);
        (current ??= []).push(...cells);
        continue;
      }
      // Continuation of the previous cell (multi-line content)
      if (current && current.length && line) {
        current[current.length - 1] = `${current[current.length - 1]} ${cleanCell(line)}`.trim();
      }
    }
    flush();
    header = header.filter((h, i) => h || i < header.length - 1);

    // Year columns are often rowspanned: carry the previous year forward
    if (header.length && rows.length) {
      let prevFirst = '';
      for (const r of rows) {
        if (r.length < header.length && prevFirst && !/^\d{4}/.test(r[0] || '')) {
          r.unshift(prevFirst);
        }
        if (/^\d{4}/.test(r[0] || '')) prevFirst = r[0];
      }
    }
    if (rows.length) tables.push({ section, header, rows: rows.slice(0, 120) });
  }
  return tables;
}

type RawSection = { level: number; heading: string; body: string };

function splitSections(wikitext: string): { lead: string; sections: RawSection[] } {
  const re = /^(={2,6})\s*(.+?)\s*\1\s*$/gm;
  const sections: RawSection[] = [];
  let lead = '';
  let last: { level: number; heading: string; start: number } | null = null;
  for (const m of wikitext.matchAll(re)) {
    const idx = m.index ?? 0;
    if (!last) lead = wikitext.slice(0, idx);
    else sections.push({ level: last.level, heading: last.heading, body: wikitext.slice(last.start, idx) });
    last = { level: m[1].length, heading: wikitextToPlain(m[2]), start: idx + m[0].length };
  }
  if (last) sections.push({ level: last.level, heading: last.heading, body: wikitext.slice(last.start) });
  else lead = wikitext;
  return { lead, sections };
}

function extractInfobox(wikitext: string): { key: string; value: string }[] {
  const start = wikitext.search(/\{\{\s*(Infobox|Infobox\s|Biographie2|Ébauche)/i);
  if (start < 0) return [];
  let depth = 0;
  let end = start;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++;
      i++;
    } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--;
      i++;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const body = wikitext.slice(start + 2, end - 2);
  const out: { key: string; value: string }[] = [];
  for (const part of body.split(/\n\s*\|/).slice(1)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key || INFOBOX_SKIP_KEY_RE.test(key)) continue;
    const value = wikitextToPlain(part.slice(eq + 1)).replace(/\s+/g, ' ').trim();
    if (!value || value.length > 400) continue;
    out.push({ key, value });
    if (out.length >= 25) break;
  }
  return out;
}

function parseDossier(lang: 'fr' | 'en', title: string, wikitext: string): WikiDossier {
  const infobox = extractInfobox(wikitext);
  const { lead, sections } = splitSections(wikitext);
  const leadPlain = wikitextToPlain(lead).replace(/^\s*\|.*$/gm, '').trim();

  const tables: WorkTable[] = [];
  const lists: { section: string; items: string[] }[] = [];
  const bio: string[] = [];
  const path: string[] = [];
  let skipLevel = 0;

  for (const s of sections) {
    path.length = Math.max(0, s.level - 2);
    path[s.level - 2] = s.heading;
    const sectionPath = path.filter(Boolean).join(' › ');
    if (skipLevel && s.level > skipLevel) continue;
    skipLevel = 0;
    if (SKIP_SECTION_RE.test(s.heading)) {
      skipLevel = s.level;
      continue;
    }
    const parentIsWork = path.slice(0, -1).some((h) => h && WORK_SECTION_RE.test(h));
    const isWork = WORK_SECTION_RE.test(s.heading) || parentIsWork;

    if (isWork) {
      const sectionTables = parseTables(s.body, sectionPath);
      tables.push(...sectionTables);
      const withoutTables = s.body.replace(/\{\|[\s\S]*?\n\|\}/g, '');
      const items = withoutTables
        .split('\n')
        .filter((l) => /^\s*[*#]/.test(l))
        .map((l) => wikitextToPlain(l.replace(/^\s*[*#:]+\s*/, '')))
        .filter((l) => l.length > 1)
        .slice(0, 80);
      if (items.length) lists.push({ section: sectionPath, items });
      else if (!sectionTables.length) {
        const prose = wikitextToPlain(withoutTables);
        if (prose.length > 40) lists.push({ section: sectionPath, items: [prose.slice(0, 1200)] });
      }
    } else if (BIO_SECTION_RE.test(s.heading) || path.some((h) => h && BIO_SECTION_RE.test(h))) {
      const prose = wikitextToPlain(s.body);
      if (prose) bio.push(prose);
    }
  }

  return {
    lang,
    title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    lead: leadPlain.slice(0, 1500),
    infobox,
    biography: bio.join('\n').slice(0, 2500),
    tables,
    lists,
  };
}

// ── Wikipedia page resolution ──────────────────────────────────────────

type WikiSearchResponse = {
  query?: { search?: { title: string }[]; searchinfo?: { suggestion?: string } };
};

function wikiSearchUrl(lang: 'fr' | 'en', query: string): string {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.searchParams.set('action', 'query');
  u.searchParams.set('list', 'search');
  u.searchParams.set('srsearch', query);
  u.searchParams.set('srlimit', '6');
  u.searchParams.set('srinfo', 'suggestion');
  u.searchParams.set('format', 'json');
  return u.toString();
}

export async function wikiSearchTitles(lang: 'fr' | 'en', query: string): Promise<string[]> {
  const data = await getJson<WikiSearchResponse>(wikiSearchUrl(lang, query));
  const titles = (data?.query?.search || []).map((s) => s.title);
  // Misspelled names ("ebenzer kepombia") → Wikipedia's "did you mean"
  const suggestion = data?.query?.searchinfo?.suggestion;
  if (!suggestion || suggestion.toLowerCase() === query.toLowerCase()) return titles;
  const corrected = await getJson<WikiSearchResponse>(wikiSearchUrl(lang, suggestion));
  const extra = (corrected?.query?.search || []).map((s) => s.title);
  return [...extra, ...titles.filter((t) => !extra.includes(t))];
}

async function fetchWikitext(
  lang: 'fr' | 'en',
  title: string,
): Promise<{ title: string; wikitext: string } | null> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.searchParams.set('action', 'parse');
  u.searchParams.set('page', title);
  u.searchParams.set('prop', 'wikitext');
  u.searchParams.set('redirects', '1');
  u.searchParams.set('format', 'json');
  const data = await getJson<{ parse?: { title?: string; wikitext?: { '*'?: string } } }>(
    u.toString(),
    12_000,
  );
  const wikitext = data?.parse?.wikitext?.['*'];
  if (!wikitext) return null;
  return { title: data?.parse?.title || title, wikitext };
}

async function resolveWikiDossier(
  lang: 'fr' | 'en',
  primary: string,
): Promise<WikiDossier | null> {
  const want = nameTokens(primary);
  if (!want.length) return null;
  const needed = Math.min(2, want.length);

  const queries =
    lang === 'fr' ? [primary, `${primary} Cameroun`] : [primary, `${primary} Cameroon`];
  const seen = new Set<string>();
  const candidates: { title: string; overlap: number }[] = [];
  for (const q of queries) {
    for (const title of await wikiSearchTitles(lang, q)) {
      if (seen.has(title)) continue;
      seen.add(title);
      if (/^(liste|list of|catégorie|category)/i.test(title)) continue;
      const tt = nameTokens(title);
      const overlap = want.filter((w) => tt.some((t) => t === w || t.startsWith(w) || w.startsWith(t))).length;
      if (overlap >= 1) candidates.push({ title, overlap });
    }
    if (candidates.some((c) => c.overlap >= needed)) break;
  }
  candidates.sort((a, b) => b.overlap - a.overlap);

  for (const c of candidates.slice(0, 3)) {
    const page = await fetchWikitext(lang, c.title);
    if (!page) continue;
    if (/^#(redirect|redirection)/i.test(page.wikitext)) continue;
    if (/\{\{\s*(homonymie|disambiguation)/i.test(page.wikitext)) continue;
    const cameroonLinked = /camer|douala|yaound|bamenda|buea/i.test(page.wikitext);
    if (!cameroonLinked && c.overlap < needed) continue;
    if (!cameroonLinked && !/film|cin[ée]ma|s[ée]rie|act(eur|rice|or|ress)|r[ée]alisat|director|producer/i.test(page.wikitext)) {
      continue;
    }
    return parseDossier(lang, page.title, page.wikitext);
  }
  return null;
}

// ── Wikidata credits ───────────────────────────────────────────────────

const CREDIT_PROPS: Record<string, { fr: string; en: string }> = {
  P57: { fr: 'réalisation', en: 'director' },
  P161: { fr: 'acteur / actrice', en: 'cast' },
  P162: { fr: 'production', en: 'producer' },
  P58: { fr: 'scénario', en: 'screenwriter' },
  P170: { fr: 'création', en: 'creator' },
  P1431: { fr: 'production exécutive', en: 'executive producer' },
  P344: { fr: 'image', en: 'cinematographer' },
};

async function fetchWikidataCredits(
  primary: string,
  locale: 'fr' | 'en',
): Promise<EntityDossier['wikidata']> {
  const s = new URL('https://www.wikidata.org/w/api.php');
  s.searchParams.set('action', 'wbsearchentities');
  s.searchParams.set('search', primary);
  s.searchParams.set('language', locale);
  s.searchParams.set('limit', '5');
  s.searchParams.set('format', 'json');
  const found = await getJson<{ search?: { id: string; label?: string; description?: string }[] }>(
    s.toString(),
    8_000,
  );
  const want = nameTokens(primary);
  const entity = (found?.search || []).find((e) => {
    const lt = nameTokens(e.label || '');
    const overlap = want.filter((w) => lt.includes(w)).length;
    return overlap >= Math.min(2, want.length);
  });
  if (!entity) return null;

  const props = Object.keys(CREDIT_PROPS).map((p) => `wdt:${p}`).join(' ');
  const sparql = `SELECT ?work ?workLabel ?prop ?kindLabel (YEAR(MIN(?d)) AS ?y) WHERE {
  VALUES ?prop { ${props} }
  ?work ?prop wd:${entity.id} .
  OPTIONAL { ?work wdt:P577 ?d }
  OPTIONAL { ?work wdt:P580 ?d }
  OPTIONAL { ?work wdt:P31 ?kind }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${locale},fr,en". }
} GROUP BY ?work ?workLabel ?prop ?kindLabel LIMIT 300`;
  const data = await getJson<{
    results?: {
      bindings?: {
        work: { value: string };
        workLabel?: { value: string };
        prop: { value: string };
        kindLabel?: { value: string };
        y?: { value: string };
      }[];
    };
  }>(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, 10_000);

  const byWork = new Map<string, WikidataCredit>();
  for (const b of data?.results?.bindings || []) {
    const title = b.workLabel?.value;
    if (!title || /^Q\d+$/.test(title)) continue;
    const pid = b.prop.value.split('/').pop() || '';
    const role = CREDIT_PROPS[pid]?.[locale] || pid;
    const prev = byWork.get(b.work.value);
    if (prev) {
      if (!prev.roles.includes(role)) prev.roles.push(role);
      if (!prev.year && b.y?.value) prev.year = b.y.value;
    } else {
      byWork.set(b.work.value, {
        title,
        year: b.y?.value,
        roles: [role],
        kind: b.kindLabel?.value,
      });
    }
  }
  const credits = [...byWork.values()].sort(
    (a, b) => (parseInt(a.year || '9999', 10) || 9999) - (parseInt(b.year || '9999', 10) || 9999),
  );
  return { id: entity.id, label: entity.label || primary, credits };
}

// ── Prompt formatting ──────────────────────────────────────────────────

function formatTable(t: WorkTable): string {
  const head = t.header.length ? `   [${t.header.join(' | ')}]\n` : '';
  return `${head}${t.rows.map((r) => `   - ${r.filter(Boolean).join(' | ')}`).join('\n')}`;
}

function formatDossier(d: WikiDossier): string {
  const parts: string[] = [
    `### Wikipédia ${d.lang.toUpperCase()} — ${d.title}\nURL: ${d.url}`,
  ];
  if (d.lead) parts.push(`Résumé:\n${d.lead}`);
  if (d.infobox.length) {
    parts.push(`Infobox:\n${d.infobox.map((f) => `   - ${f.key}: ${f.value}`).join('\n')}`);
  }
  if (d.biography) parts.push(`Biographie / carrière:\n${d.biography}`);
  for (const t of d.tables) parts.push(`Tableau « ${t.section} »:\n${formatTable(t)}`);
  for (const l of d.lists) {
    parts.push(`Liste « ${l.section} »:\n${l.items.map((i) => `   - ${i}`).join('\n')}`);
  }
  return parts.join('\n').slice(0, 9_000);
}

function formatWikidata(w: NonNullable<EntityDossier['wikidata']>): string {
  if (!w.credits.length) return '';
  return `### Wikidata — ${w.label} (${w.id})\nURL: https://www.wikidata.org/wiki/${w.id}\n${w.credits
    .slice(0, 80)
    .map((c) => `   - ${c.year || '????'} | ${c.title} | ${c.roles.join(', ')}${c.kind ? ` | ${c.kind}` : ''}`)
    .join('\n')}`;
}

const ENTITY_INTENT_RE =
  /filmograph|r[ée]alis|produi|product|[œo]euvres?|films?\s+(de|d['’]|avec)|s[ée]ries?\s+(de|d['’]|avec)|r[ôo]les?|jou[eé]|casting|distribution|acteurs?|actrices?|synopsis|qui\s+est|c['’]est\s+qui|connais|parle[- ]moi|biograph|carri[eè]re|n[ée]e?\s+(le|en|à)|movies?|works|starr|cast\b|played|directed|produced|who\s+is|tell\s+me\s+about|career|born/i;

const LOGISTICS_RE =
  /permis|autorisation|proc[ée]dure|visa|douane|lieux?\s+de\s+tournage|location\s+scout|fixer|mat[ée]riel|equipment|salle|hall|budget|financement|funding|subvention|appel\s+[àa]\s+projets/i;

/** True when the message names (or asks about) a person, film or series. */
export function shouldFetchDossier(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  const named =
    /[«"“][^»"”]{2,80}[»"”]/.test(t) ||
    /\b[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][\p{L}'’-]+/u.test(t);
  if (named) return true;
  if (LOGISTICS_RE.test(t)) return false;
  if (ENTITY_INTENT_RE.test(t)) return true;
  // Bare lowercase name, e.g. "ebenezer kepombia"
  return t.split(' ').length <= 4 && !/\?$/.test(t);
}

/**
 * Build a grounded dossier (bio + filmography with years and roles) for the
 * person / film / series named in the user's message.
 */
export async function fetchEntityDossier(
  userText: string,
  locale: 'fr' | 'en',
): Promise<EntityDossier | null> {
  const terms = extractCinemaSearchTerms(userText);
  const primary = terms[0]?.trim();
  if (!primary || nameTokens(primary).length === 0) return null;

  const [fr, en, wikidata] = await Promise.all([
    resolveWikiDossier('fr', primary),
    resolveWikiDossier('en', primary),
    fetchWikidataCredits(primary, locale).catch(() => null),
  ]);

  const wiki = [fr, en].filter((d): d is WikiDossier => Boolean(d));
  if (!wiki.length && !wikidata?.credits.length) return null;

  const blocks = [...wiki.map(formatDossier)];
  if (wikidata?.credits.length) blocks.push(formatWikidata(wikidata));

  const citations: EntityDossier['citations'] = wiki.map((d) => ({
    title: `${d.title} (Wikipedia ${d.lang.toUpperCase()})`,
    url: d.url,
    type: 'WEB',
  }));
  if (wikidata?.credits.length) {
    citations.push({
      title: `${wikidata.label} (Wikidata)`,
      url: `https://www.wikidata.org/wiki/${wikidata.id}`,
      type: 'WEB',
    });
  }

  return { query: primary, wiki, wikidata, block: blocks.join('\n\n'), citations };
}

/** Deterministic markdown answer when no LLM is available. */
export function composeDossierAnswer(d: EntityDossier, locale: 'fr' | 'en'): string {
  const main = d.wiki[0];
  const name = main?.title || d.wikidata?.label || d.query;
  const out: string[] = [`## ${name}`, ''];
  if (main?.lead) {
    const sentences = main.lead.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
    out.push(sentences, '');
  }

  const tables = d.wiki.flatMap((w) => w.tables);
  const lists = d.wiki.flatMap((w) => w.lists);
  const hasWorks = tables.length || lists.length || d.wikidata?.credits.length;

  if (hasWorks) {
    out.push(locale === 'en' ? '### Filmography & works' : '### Filmographie & réalisations', '');
  }
  const seenSections = new Set<string>();
  for (const t of tables) {
    if (seenSections.has(t.section)) continue;
    seenSections.add(t.section);
    out.push(`**${t.section}**`, '');
    if (t.header.length >= 2) {
      out.push(`| ${t.header.join(' | ')} |`, `| ${t.header.map(() => '---').join(' | ')} |`);
      for (const r of t.rows) {
        const cells = t.header.map((_, i) => (r[i] || '').replace(/\|/g, '/'));
        out.push(`| ${cells.join(' | ')} |`);
      }
    } else {
      for (const r of t.rows) out.push(`- ${r.filter(Boolean).join(' — ')}`);
    }
    out.push('');
  }
  for (const l of lists) {
    if (seenSections.has(l.section)) continue;
    seenSections.add(l.section);
    out.push(`**${l.section}**`, '', ...l.items.slice(0, 40).map((i) => `- ${i}`), '');
  }
  if (!tables.length && !lists.length && d.wikidata?.credits.length) {
    for (const c of d.wikidata.credits.slice(0, 40)) {
      out.push(`- **${c.year || '—'}** — *${c.title}* (${c.roles.join(', ')})`);
    }
    out.push('');
  }

  return out.join('\n').trim();
}
