import { clearAllAuthFiles } from '@/lib/film/producer-auth';
import type { LocalFilmProfile, ProducerAuthentication } from '@/lib/film/types';

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

/** Persist authentication metadata without wiping other profile fields. */
export function saveProfileAuthentication(
  authentication: ProducerAuthentication | undefined,
): LocalFilmProfile | null {
  const existing = getLocalProfile();
  if (!existing) {
    const stub = saveLocalProfile({
      name: '',
      role: '',
      city: '',
      bio: '',
      specialties: '',
      contact: '',
      authentication,
    });
    return stub;
  }
  return saveLocalProfile({
    ...existing,
    authentication,
  });
}

export function clearLocalProfile(): void {
  try {
    localStorage.removeItem(FILM_PROFILE_KEY);
  } catch {
    /* ignore */
  }
  void clearAllAuthFiles();
}

/** True once the producer auth form was successfully submitted. */
export function isProducerAuthSubmitted(): boolean {
  return Boolean(getLocalProfile()?.authentication?.submittedAt);
}
