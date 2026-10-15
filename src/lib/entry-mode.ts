/** Which world the user chose after the intro gateway. */

import { clearFilmAudience } from '@/lib/film/audience';

export const ENTRY_MODE_KEY = 'smartmboa_entry_mode';

export type EntryMode = 'tourism' | 'film';

export function getEntryMode(): EntryMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(ENTRY_MODE_KEY);
    if (v === 'tourism' || v === 'film') return v;
    return null;
  } catch {
    return null;
  }
}

export function setEntryMode(mode: EntryMode): void {
  try {
    localStorage.setItem(ENTRY_MODE_KEY, mode);
  } catch {
    /* private mode / unavailable */
  }
}

export function clearEntryMode(): void {
  try {
    localStorage.removeItem(ENTRY_MODE_KEY);
  } catch {
    /* ignore */
  }
  clearFilmAudience();
}
