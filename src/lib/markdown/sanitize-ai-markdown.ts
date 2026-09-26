/**
 * Clean AI markdown before rendering: nested/broken links, raw HTML risks, etc.
 */

export type ExtractedSource = {
  title: string;
  url: string;
};

function hostnameLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || url;
  } catch {
    return url.slice(0, 48);
  }
}

/** Unwrap nested markdown links like [label]([url](url)) or [label](url1)(url2). */
export function fixNestedMarkdownLinks(text: string): string {
  let out = text;
  // [text]([https://x](https://x)) or [text]([https://x](https://y))
  out = out.replace(
    /\[([^\]]+)\]\(\[(https?:\/\/[^\]\s]+)\]\((https?:\/\/[^)]+)\)\)/gi,
    (_m, label: string, _inner: string, url: string) => `[${label}](${url})`,
  );
  // [text](https://x)(https://y) → keep first url
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\((https?:\/\/[^)\s]+)\)/gi,
    (_m, label: string, url: string) => `[${label}](${url})`,
  );
  // [[text](url)](url) 
  out = out.replace(
    /\[\[([^\]]+)\]\((https?:\/\/[^)]+)\)\]\((https?:\/\/[^)]+)\)/gi,
    (_m, label: string, url: string) => `[${label}](${url})`,
  );
  // [domain.com](url) with empty or same - leave as is
  // Bare [https://...](https://...) → domain label
  out = out.replace(
    /\[(https?:\/\/[^\]\s]+)\]\((https?:\/\/[^)]+)\)/gi,
    (_m, shown: string, url: string) => `[${hostnameLabel(url || shown)}](${url || shown})`,
  );
  return out;
}

/** Turn bare URLs into markdown links with short labels (skip those already in md links). */
export function linkifyBareUrls(text: string): string {
  // Protect existing markdown links
  const placeholders: string[] = [];
  const protectedText = text.replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi, (m) => {
    placeholders.push(m);
    return `\u0000MD${placeholders.length - 1}\u0000`;
  });

  const linked = protectedText.replace(
    /(^|[\s(])(https?:\/\/[^\s<>\)\]"']+)/gi,
    (_m, pre: string, url: string) => {
      const clean = url.replace(/[.,;:!?)]+$/, '');
      const trailing = url.slice(clean.length);
      return `${pre}[${hostnameLabel(clean)}](${clean})${trailing}`;
    },
  );

  return linked.replace(/\u0000MD(\d+)\u0000/g, (_m, i: string) => placeholders[Number(i)] ?? '');
}

/**
 * Pull markdown links + optional trailing "## Sources" section into a source list.
 * Returns cleaned body (sources section removed) and extracted sources.
 */
export function extractSourcesFromMarkdown(text: string): {
  body: string;
  sources: ExtractedSource[];
} {
  const sources: ExtractedSource[] = [];
  const seen = new Set<string>();

  const push = (title: string, url: string) => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
    seen.add(u);
    sources.push({ title: title.trim() || hostnameLabel(u), url: u });
  };

  // Split off a trailing Sources section if present
  const sourcesSection = text.match(
    /\n{1,}#{0,3}\s*(?:sources?|références?|references?|voir les sources)\s*:?\s*\n([\s\S]*)$/i,
  );
  let body = text;
  let section = '';
  if (sourcesSection && sourcesSection.index != null) {
    body = text.slice(0, sourcesSection.index).trimEnd();
    section = sourcesSection[1] ?? '';
  }

  const collectFrom = (chunk: string) => {
    const re = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) {
      push(m[1] || hostnameLabel(m[2]), m[2]);
    }
  };

  collectFrom(section);
  // Also collect from body for ui_sources, but keep links in body for markdown render
  // User wants no mid-text source clutter — strip markdown links from body to plain text labels
  // when we're moving them to the Sources panel. Keep natural names.
  collectFrom(body);

  // Remove a dedicated sources bullet list only; leave in-body links as markdown (rendered as clean links)
  return { body, sources };
}

/** Soften mid-body citation noise: convert [domain](url) to just domain text optionally — we keep links as clickable short labels via markdown. */
export function normalizeMarkdownStructure(text: string): string {
  let out = text.replace(/\r\n/g, '\n');
  // Headings glued after punctuation / text → own paragraph
  out = out.replace(/([^\n])\s+(#{1,6}\s+)/g, '$1\n\n$2');
  // List items glued after punctuation → new line
  out = out.replace(/([.:;!?])\s+(\*{1,2}|[-+]|•|\d+\.)\s+/g, '$1\n\n$2 ');
  // Nested bullets glued mid-line: " : * Item" / "  * Sub"
  out = out.replace(/([^\n])\s+(\*(?!\*)\s+)/g, '$1\n$2');
  // Collapse 3+ blank lines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function prepareAiMarkdown(raw: string): {
  markdown: string;
  sources: ExtractedSource[];
} {
  let text = (raw || '').replace(/\r\n/g, '\n').trim();
  // Undo common double-escaped sequences
  if (text.includes('\\n') && !text.includes('\n\n')) {
    text = text.replace(/\\n/g, '\n');
  }
  text = text.replace(/\\\*/g, '*').replace(/\\_/g, '_');
  text = normalizeMarkdownStructure(text);

  text = fixNestedMarkdownLinks(text);
  text = linkifyBareUrls(text);

  const { body, sources } = extractSourcesFromMarkdown(text);
  return { markdown: body || text, sources };
}
