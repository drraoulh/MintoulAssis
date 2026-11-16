/**
 * Resolve film cover paths for local/dev vs Supabase Storage (production).
 *
 * Local paths look like `/film/covers/ayilaa/123.jpg`.
 * When NEXT_PUBLIC_FILM_COVERS_BASE_URL is set (e.g. Supabase public bucket URL),
 * they become `${BASE}/ayilaa/123.jpg`.
 */

const LOCAL_PREFIX = '/film/covers';

export function filmCoversBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_FILM_COVERS_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

/** Turn a stored cover path into a URL usable by next/image. */
export function resolveFilmCoverUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(`${LOCAL_PREFIX}/`) || trimmed === LOCAL_PREFIX) {
    const base = filmCoversBaseUrl();
    if (base) {
      const rest = trimmed.slice(LOCAL_PREFIX.length); // keeps leading /
      return `${base}${rest}`;
    }
    return trimmed;
  }

  return trimmed;
}

export function resolveFilmCoverUrls(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const resolved = resolveFilmCoverUrl(u);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}
