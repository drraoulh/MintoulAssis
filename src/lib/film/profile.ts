import type { LocalFilmProfile } from '@/lib/film/types';

export const FILM_PROFILE_KEY = 'smartmboa_film_profile';

export function getLocalProfile(): LocalFilmProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FILM_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalFilmProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Omit<LocalFilmProfile, 'updatedAt'>): LocalFilmProfile {
  const next: LocalFilmProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(FILM_PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearLocalProfile(): void {
  try {
    localStorage.removeItem(FILM_PROFILE_KEY);
  } catch {
    /* ignore */
  }
}
