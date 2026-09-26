/**
 * Web search for SmartMboa: Tavily first, Brave Search as fallback.
 * Results are injected into the LLM prompt (no OpenRouter web plugin).
 */

export type WebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  provider: "tavily" | "brave";
};

export type WebSearchResult = {
  hits: WebSearchHit[];
  provider: "tavily" | "brave" | "none";
  query: string;
};

const DEFAULT_MAX = 5;
const TIMEOUT_MS = 12_000;

export function webSearchEnvEnabled(): boolean {
  const flag = (
    process.env.WEB_SEARCH_ENABLED ||
    process.env.OPENROUTER_WEB_SEARCH ||
    "1"
  )
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return Boolean(tavilyKey() || braveKey());
}

function tavilyKey(): string | null {
  const k = process.env.TAVILY_API_KEY?.trim();
  return k || null;
}

function braveKey(): string | null {
  const k =
    process.env.BRAVE_SEARCH_API_KEY?.trim() ||
    process.env.BRAVE_API_KEY?.trim();
  return k || null;
}

function maxResults(requested?: number): number {
  const fromEnv = parseInt(process.env.WEB_SEARCH_MAX_RESULTS || "", 10);
  const n = requested ?? (Number.isFinite(fromEnv) ? fromEnv : DEFAULT_MAX);
  return Math.min(10, Math.max(1, n));
}

function cleanHit(
  title: unknown,
  url: unknown,
  snippet: unknown,
  provider: "tavily" | "brave",
): WebSearchHit | null {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  return {
    title: String(title || url).replace(/\s+/g, " ").trim().slice(0, 160),
    url: url.trim().slice(0, 500),
    snippet: String(snippet || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 420),
    provider,
  };
}

async function searchTavily(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<WebSearchHit[]> {
  const key = tavilyKey();
  if (!key) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
      max_results: limit,
      topic: "general",
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tavily HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };
  const hits: WebSearchHit[] = [];
  for (const r of data.results || []) {
    const hit = cleanHit(r.title, r.url, r.content, "tavily");
    if (hit) hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}

async function searchBrave(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<WebSearchHit[]> {
  const key = braveKey();
  if (!key) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(limit));
  // Brave has no CM country code; keep French language without a wrong country filter.
  url.searchParams.set("search_lang", "fr");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": key,
    },
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brave HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    web?: {
      results?: {
        title?: string;
        url?: string;
        description?: string;
        extra_snippets?: string[];
      }[];
    };
  };
  const hits: WebSearchHit[] = [];
  for (const r of data.web?.results || []) {
    const snippet =
      r.description ||
      (Array.isArray(r.extra_snippets) ? r.extra_snippets.join(" ") : "");
    const hit = cleanHit(r.title, r.url, snippet, "brave");
    if (hit) hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}

/**
 * Search the web: Tavily → Brave fallback. Never throws; returns empty on total failure.
 */
export async function searchWeb(opts: {
  query: string;
  maxResults?: number;
  signal?: AbortSignal;
}): Promise<WebSearchResult> {
  const query = opts.query.replace(/\s+/g, " ").trim();
  if (!query || !webSearchEnvEnabled()) {
    return { hits: [], provider: "none", query };
  }

  const limit = maxResults(opts.maxResults);
  const timeoutMs = Math.min(
    30_000,
    Math.max(
      3_000,
      parseInt(process.env.WEB_SEARCH_TIMEOUT_SECONDS || "", 10) * 1000 ||
        TIMEOUT_MS,
    ),
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (tavilyKey()) {
      try {
        const hits = await searchTavily(query, limit, controller.signal);
        if (hits.length) {
          return { hits, provider: "tavily", query };
        }
        console.warn("[web-search] Tavily returned 0 hits — trying Brave");
      } catch (err) {
        console.warn("[web-search] Tavily failed — trying Brave", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (braveKey()) {
      try {
        const hits = await searchBrave(query, limit, controller.signal);
        if (hits.length) {
          return { hits, provider: "brave", query };
        }
      } catch (err) {
        console.warn("[web-search] Brave failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { hits: [], provider: "none", query };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Build a Cameroon-focused tourism search query from the user message. */
export function buildTourismWebQuery(opts: {
  userText: string;
  cityHint?: string | null;
  lodging?: boolean;
  restaurant?: boolean;
  parks?: boolean;
  activity?: boolean;
}): string {
  const city = opts.cityHint?.trim();
  const topic = opts.lodging
    ? "hôtel hébergement lodging hotel"
    : opts.restaurant
      ? "restaurant gastronomie où manger"
      : opts.parks
        ? "parc national réserve nature tourisme"
        : opts.activity
          ? "que faire activités tourisme attractions"
          : "tourisme";
  const base = opts.userText.replace(/\s+/g, " ").trim().slice(0, 180);
  return [base, city, topic, "Cameroun Cameroon"]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatWebHitsForPrompt(hits: WebSearchHit[]): string {
  if (!hits.length) return "";
  return hits
    .map(
      (h, i) =>
        `${i + 1}. ${h.title}\n   URL: ${h.url}\n   Extrait: ${h.snippet || "(pas d'extrait)"}`,
    )
    .join("\n");
}

export function webHitsToCitations(
  hits: WebSearchHit[],
): { title: string; url: string; type: "WEB" }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string; type: "WEB" }[] = [];
  for (const h of hits) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push({ title: h.title, url: h.url, type: "WEB" });
  }
  return out;
}
