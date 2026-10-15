/** Filmmaker entry path inside the Film Production world. */

export const FILM_AUDIENCE_KEY = 'smartmboa_film_audience';

export type FilmAudience = 'international' | 'local';

export function getFilmAudience(): FilmAudience | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(FILM_AUDIENCE_KEY);
    if (v === 'international' || v === 'local') return v;
    return null;
  } catch {
    return null;
  }
}

export function setFilmAudience(audience: FilmAudience): void {
  try {
    localStorage.setItem(FILM_AUDIENCE_KEY, audience);
  } catch {
    /* ignore */
  }
}

export function clearFilmAudience(): void {
  try {
    localStorage.removeItem(FILM_AUDIENCE_KEY);
  } catch {
    /* ignore */
  }
}
