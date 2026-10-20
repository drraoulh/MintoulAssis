import { Castle, Hotel, House, Mountain, Tent, type LucideIcon } from 'lucide-react';

import type { FilmLocationKind } from '@/lib/film/types';

export const KIND_ICONS: Record<FilmLocationKind, LucideIcon> = {
  site: Mountain,
  hotel: Hotel,
  villa: Castle,
  house: House,
  village: Tent,
};
