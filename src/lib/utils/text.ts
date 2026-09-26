const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  eacute: 'é',
  Eacute: 'É',
  egrave: 'è',
  Egrave: 'È',
  ecirc: 'ê',
  Ecirc: 'Ê',
  euml: 'ë',
  agrave: 'à',
  Agrave: 'À',
  acirc: 'â',
  auml: 'ä',
  ccedil: 'ç',
  Ccedil: 'Ç',
  icirc: 'î',
  Icirc: 'Î',
  iuml: 'ï',
  ocirc: 'ô',
  oelig: 'œ',
  ucirc: 'û',
  ugrave: 'ù',
  uuml: 'ü',
  yuml: 'ÿ',
};

/** Decode HTML entities and strip tags so catalog copy is readable. */
export function decodeHtmlEntities(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = raw.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
  return text.replace(/\s+/g, ' ').trim();
}

export function placeCategoryLabel(category: string | null | undefined): string {
  const c = (category ?? '').toLowerCase();
  if (/restaur|food|cuisine/.test(c)) return 'Restaurant';
  if (/hotel|héberg|heberg|lodg|resort|auberge/.test(c)) return 'Hébergement';
  if (/transport/.test(c)) return 'Transport';
  if (/site|touris/.test(c)) return 'Site';
  if (/culture|musee|musée|heritage|patrimoine/.test(c)) return 'Culture';
  return category?.trim() || 'Lieu';
}

export function isTouristAttraction(category: string | null | undefined): boolean {
  return /site|touris|parc|plage|nature|musee|musée|culture|heritage|patrimoine/i.test(
    category ?? '',
  );
}

/**
 * Truncate for cards without cutting mid-word / mid-sentence when possible.
 */
export function truncateReadable(
  raw: string | null | undefined,
  maxLen = 220,
): string {
  const text = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
  if (!text || text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('。'),
  );
  if (sentenceEnd >= Math.floor(maxLen * 0.45)) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const wordEnd = slice.lastIndexOf(' ');
  const base = (wordEnd > 40 ? slice.slice(0, wordEnd) : slice).trim();
  return `${base.replace(/[,;:–—-]+$/, '')}…`;
}
