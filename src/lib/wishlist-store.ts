import type { WishlistPlace } from './types';

const KEY = 'smartmboa.wishlist.v1';
export const WISHLIST_EVENT = 'smartmboa:wishlist';

function notify(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

export function loadWishlist(): WishlistPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistPlace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWishlist(places: WishlistPlace[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(places));
  notify();
}

export function isInWishlist(id: string): boolean {
  return loadWishlist().some((p) => p.id === id);
}

export function toggleWishlist(place: WishlistPlace): WishlistPlace[] {
  const list = loadWishlist();
  const idx = list.findIndex((p) => p.id === place.id);
  let next: WishlistPlace[];
  if (idx >= 0) {
    next = list.filter((p) => p.id !== place.id);
  } else {
    next = [
      ...list,
      {
        ...place,
        likedAt: place.likedAt ?? new Date().toISOString(),
      },
    ];
  }
  saveWishlist(next);
  return next;
}

export function removeFromWishlist(id: string): WishlistPlace[] {
  const next = loadWishlist().filter((p) => p.id !== id);
  saveWishlist(next);
  return next;
}

export function clearWishlist(): WishlistPlace[] {
  saveWishlist([]);
  return [];
}

/** Build a chat prompt so the assistant can plan from liked places. */
export function buildWishlistItineraryPrompt(
  places: WishlistPlace[],
  locale: 'fr' | 'en' = 'fr',
): string {
  const labels = places.map((p) => {
    const where = [p.city, p.region].filter(Boolean).join(', ');
    return where ? `${p.name} (${where})` : p.name;
  });
  const list = labels.join(', ');
  if (locale === 'en') {
    return `Create a practical day itinerary in Cameroon from these places on my wishlist: ${list}. Suggest a logical order, estimated visit times, transport tips between stops, and a short daily summary.`;
  }
  return `Génère un itinéraire pratique d'une journée au Cameroun à partir de ces lieux de ma wishlist : ${list}. Propose un ordre logique, des durées de visite estimées, des conseils de transport entre les étapes, et un court résumé de la journée.`;
}

export function wishlistPlaceHref(place: WishlistPlace): string {
  if (place.slug) return `/lieux/${encodeURIComponent(place.slug)}`;
  return `/destinations/${encodeURIComponent(place.id)}`;
}
