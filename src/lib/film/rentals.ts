import enrichedData from '@/lib/film/data/rentals-enriched.json';
import { CURATED_RENTALS } from '@/lib/film/data/rentals-curated';
import { OSM_RENTALS, cleanCity } from '@/lib/film/osm-locations';
import type { RentalCategory, RentalShop } from '@/lib/film/types';

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

type Enrichment = {
  image?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  address?: string | null;
};

const BY_ID = (enrichedData as { byId?: Record<string, Enrichment> }).byId || {};

/** Strip website / social links — rentals UI keeps phone, email, address, map only. */
function forPublicDirectory(shop: RentalShop): RentalShop {
  const extra = BY_ID[shop.id] || {};
  const { website: _w, facebook: _f, ...rest } = shop;
  return {
    ...rest,
    image: extra.image || shop.image || null,
    phone: shop.phone || extra.phone || undefined,
    email: shop.email || extra.email || undefined,
    whatsapp: shop.whatsapp || extra.whatsapp || undefined,
    address: shop.address || extra.address || undefined,
  };
}

/** Researched shops first; OSM fills in the rest (same-name duplicates dropped). */
export const RENTAL_SHOPS: RentalShop[] = [
  ...CURATED_RENTALS.map(forPublicDirectory),
  ...OSM_RENTALS.filter(
    (o) =>
      !CURATED_RENTALS.some(
        (c) => key(c.name).startsWith(key(o.name)) || key(o.name).startsWith(key(c.name)),
      ),
  ).map((o) => forPublicDirectory({ ...o, city: cleanCity(o.city) })),
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
      const hay =
        `${s.name} ${s.city ?? ''} ${s.address ?? ''} ${s.brand ?? ''} ${s.description ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort(
    (a, b) =>
      Number(Boolean(b.phone || b.image)) - Number(Boolean(a.phone || a.image)) ||
      a.name.localeCompare(b.name),
  );
}
