'use client';

import { FavoriteButton } from '@/components/places/FavoriteButton';

type PlaceFavoriteProps = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  neighborhood?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** Client like control for the server-rendered `/lieux/[slug]` page. */
export function PlaceFavoriteActions(props: PlaceFavoriteProps) {
  return (
    <FavoriteButton
      variant="button"
      place={{
        id: props.id,
        name: props.name,
        slug: props.slug,
        city: props.city ?? props.neighborhood ?? undefined,
        category: props.category ?? undefined,
        imageUrl: props.imageUrl,
        latitude: props.lat ?? null,
        longitude: props.lng ?? null,
      }}
    />
  );
}
