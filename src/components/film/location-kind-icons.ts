import { Castle, Hotel, House, Mountain, Tent, UtensilsCrossed, type LucideIcon } from 'lucide-react';

import type { FilmLocationKind } from '@/lib/film/types';

export const KIND_ICONS: Record<FilmLocationKind, LucideIcon> = {
  site: Mountain,
  hotel: Hotel,
  restaurant: UtensilsCrossed,
  villa: Castle,
  house: House,
  village: Tent,
};
