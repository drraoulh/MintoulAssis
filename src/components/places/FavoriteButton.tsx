'use client';

import { Heart } from 'lucide-react';
import type { MouseEvent } from 'react';

import { useLocale } from '@/lib/i18n';
import { triggerHaptic } from '@/lib/haptics';
import type { WishlistPlace } from '@/lib/types';
import { useWishlist } from '@/lib/use-wishlist';

type FavoriteButtonProps = {
  place: WishlistPlace;
  /** overlay: on card image; button: pill with label; icon: compact circle */
  variant?: 'overlay' | 'button' | 'icon';
  className?: string;
};

export function FavoriteButton({
  place,
  variant = 'overlay',
  className = '',
}: FavoriteButtonProps) {
  const { t } = useLocale();
  const { isLiked, toggle, ready } = useWishlist();
  const liked = ready && isLiked(place.id);

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      ...place,
      likedAt: place.likedAt ?? new Date().toISOString(),
    });
    triggerHaptic(liked ? 'light' : 'success');
  };

  const label = liked ? t('wishlist.unlike') : t('wishlist.like');

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={liked}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[0.97] ${
          liked
            ? 'border-[#CE1126]/40 bg-[#CE1126]/10 text-[#CE1126]'
            : 'border-[var(--line)] bg-white text-[var(--green-deep)] hover:border-[#CE1126]/50 hover:bg-[#CE1126]/5'
        } ${className}`}
      >
        <Heart
          className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
          aria-hidden
        />
        {liked ? t('wishlist.liked') : t('wishlist.like')}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={liked}
        aria-label={label}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] ${
          liked
            ? 'border-[#CE1126]/40 bg-[#CE1126]/10 text-[#CE1126]'
            : 'border-[var(--line)] bg-white text-[var(--green-deep)] hover:border-[#CE1126]/50'
        } ${className}`}
      >
        <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={label}
      className={`absolute right-2.5 top-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55 active:scale-[0.95] ${
        liked ? 'text-[#FF6B7A]' : ''
      } ${className}`}
    >
      <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} aria-hidden />
    </button>
  );
}
