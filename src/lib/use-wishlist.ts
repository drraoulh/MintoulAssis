'use client';

import { useCallback, useEffect, useState } from 'react';

import type { WishlistPlace } from '@/lib/types';
import {
  WISHLIST_EVENT,
  isInWishlist,
  loadWishlist,
  removeFromWishlist,
  toggleWishlist,
} from '@/lib/wishlist-store';

export function useWishlist() {
  const [items, setItems] = useState<WishlistPlace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(loadWishlist());
      setReady(true);
    };
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isLiked = useCallback((id: string) => items.some((p) => p.id === id), [items]);

  const toggle = useCallback((place: WishlistPlace) => {
    setItems(toggleWishlist(place));
  }, []);

  const remove = useCallback((id: string) => {
    setItems(removeFromWishlist(id));
  }, []);

  return {
    items,
    count: items.length,
    ready,
    isLiked,
    toggle,
    remove,
    /** Sync check against storage (avoids flash before hydrate). */
    isLikedNow: isInWishlist,
  };
}
