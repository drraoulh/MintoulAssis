import { CURATED_RENTALS } from '@/lib/film/data/rentals-curated';
import { OSM_RENTALS, cleanCity } from '@/lib/film/osm-locations';
import type { RentalCategory, RentalShop } from '@/lib/film/types';

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Researched shops first; OSM fills in the rest (same-name duplicates dropped). */
export const RENTAL_SHOPS: RentalShop[] = [
  ...CURATED_RENTALS,
  ...OSM_RENTALS.filter(
    (o) => !CURATED_RENTALS.some((c) => key(c.name).startsWith(key(o.name)) || key(o.name).startsWith(key(c.name))),
  ).map((o) => ({ ...o, city: cleanCity(o.city) })),
];

export const RENTAL_CATEGORIES: { id: RentalCategory; fr: string; en: string }[] = [
  { id: 'vehicle', fr: 'Voitures & véhicules', en: 'Cars & vehicles' },
  { id: 'two-wheel', fr: 'Motos & vélos', en: 'Motorbikes & bikes' },
  { id: 'boat', fr: 'Bateaux', en: 'Boats' },
  { id: 'equipment', fr: 'Matériel & équipement', en: 'Gear & equipment' },
  { id: 'event', fr: 'Événementiel & décor', en: 'Events & set dressing' },
];

export function filterRentals(opts: {
  category?: RentalCategory | 'all';
  regionId?: string;
  q?: string;
}): RentalShop[] {
  const q = opts.q?.trim().toLowerCase();
  return RENTAL_SHOPS.filter((s) => {
    if (opts.category && opts.category !== 'all' && s.category !== opts.category) return false;
    if (opts.regionId && opts.regionId !== 'all' && s.regionId !== opts.regionId) return false;
    if (q) {
      const hay = `${s.name} ${s.city ?? ''} ${s.address ?? ''} ${s.brand ?? ''} ${s.description ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort(
    (a, b) =>
      Number(Boolean(b.phone || b.website)) - Number(Boolean(a.phone || a.website)) ||
      a.name.localeCompare(b.name),
  );
}
