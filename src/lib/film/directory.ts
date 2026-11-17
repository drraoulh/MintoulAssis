import studiosData from '@/lib/film/data/studios-materiel.json';
import type { DirectoryCategory, FilmDirectoryEntry } from '@/lib/film/types';

export const DIRECTORY_CATEGORIES: {
  id: DirectoryCategory;
  fr: string;
  en: string;
}[] = [
  { id: 'studio', fr: 'Studios', en: 'Studios' },
  { id: 'equipment-rental', fr: 'Location matériel', en: 'Equipment rental' },
  { id: 'production-company', fr: 'Sociétés de production', en: 'Production companies' },
  { id: 'producer', fr: 'Producteurs', en: 'Producers' },
  { id: 'director', fr: 'Réalisateurs', en: 'Directors' },
  { id: 'dop', fr: 'Chefs opérateur', en: 'Cinematographers' },
  { id: 'sound', fr: 'Son', en: 'Sound' },
  { id: 'location-scout', fr: 'Repérage', en: 'Location scouts' },
  { id: 'fixer', fr: 'Fixers', en: 'Fixers' },
  { id: 'post', fr: 'Post-production', en: 'Post-production' },
  { id: 'casting', fr: 'Casting', en: 'Casting' },
  { id: 'transport', fr: 'Transport / logistique', en: 'Transport / logistics' },
];

const BAD_IMAGE = /whatsapp|globe\.png|favicon|icon|logo-only|1x1|pixel/i;

function cleanImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (BAD_IMAGE.test(src)) return null;
  return src;
}

/** Real studios & matériel first (scraped), then complementary contacts. */
const STUDIOS_DIRECTORY: FilmDirectoryEntry[] = (
  studiosData.items as Array<{
    id: string;
    name: string;
    category: DirectoryCategory;
    cityFr: string;
    cityEn: string;
    regionId: string;
    specialtyFr: string;
    specialtyEn: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    image?: string | null;
  }>
).map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  cityFr: item.cityFr,
  cityEn: item.cityEn,
  regionId: item.regionId,
  specialtyFr: item.specialtyFr,
  specialtyEn: item.specialtyEn,
  phone: item.phone,
  email: item.email,
  website: item.website,
  address: item.address,
  contact: item.phone || item.email,
  image: cleanImage(item.image),
}));

const EXTRA_DIRECTORY: FilmDirectoryEntry[] = [
  {
    id: 'fixer-kribi',
    name: 'Kribi Coast Fixers',
    category: 'fixer',
    cityFr: 'Kribi',
    cityEn: 'Kribi',
    regionId: 'sud',
    specialtyFr: 'Plages, chutes, autorisations côtières.',
    specialtyEn: 'Beaches, falls, coastal permits.',
  },
  {
    id: 'scout-ouest',
    name: 'Grassfields Location Desk',
    category: 'location-scout',
    cityFr: 'Bafoussam',
    cityEn: 'Bafoussam',
    regionId: 'ouest',
    specialtyFr: 'Chefferies, plateaux, patrimoine Bamoun / Bamiléké.',
    specialtyEn: 'Chiefdoms, highlands, Bamoun / Bamileke heritage.',
  },
  {
    id: 'post-douala',
    name: 'Bonanjo Post Lab',
    category: 'post',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    specialtyFr: 'Montage, étalonnage, mixage stéréo / 5.1.',
    specialtyEn: 'Edit, color, stereo / 5.1 mix.',
  },
  {
    id: 'casting-yaounde',
    name: 'Casting Capitale',
    category: 'casting',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    specialtyFr: 'Figurants, comédiens FR/EN, doublure.',
    specialtyEn: 'Extras, FR/EN talent, doubles.',
  },
];

export const FILM_DIRECTORY: FilmDirectoryEntry[] = [
  ...STUDIOS_DIRECTORY,
  ...EXTRA_DIRECTORY,
];

export function filterDirectory(opts: {
  category?: DirectoryCategory | 'all';
  regionId?: string;
  q?: string;
}): FilmDirectoryEntry[] {
  const q = opts.q?.trim().toLowerCase();
  return FILM_DIRECTORY.filter((e) => {
    if (opts.category && opts.category !== 'all' && e.category !== opts.category) return false;
    if (opts.regionId && opts.regionId !== 'all' && e.regionId !== opts.regionId) return false;
    if (q) {
      const hay =
        `${e.name} ${e.specialtyFr} ${e.specialtyEn} ${e.cityFr} ${e.address || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
