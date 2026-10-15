import type { DirectoryCategory, FilmDirectoryEntry } from '@/lib/film/types';

export const DIRECTORY_CATEGORIES: {
  id: DirectoryCategory;
  fr: string;
  en: string;
}[] = [
  { id: 'production-company', fr: 'Sociétés de production', en: 'Production companies' },
  { id: 'producer', fr: 'Producteurs', en: 'Producers' },
  { id: 'director', fr: 'Réalisateurs', en: 'Directors' },
  { id: 'dop', fr: 'Chefs opérateur', en: 'Cinematographers' },
  { id: 'sound', fr: 'Son', en: 'Sound' },
  { id: 'location-scout', fr: 'Repérage', en: 'Location scouts' },
  { id: 'fixer', fr: 'Fixers', en: 'Fixers' },
  { id: 'equipment-rental', fr: 'Location matériel', en: 'Equipment rental' },
  { id: 'studio', fr: 'Studios', en: 'Studios' },
  { id: 'post', fr: 'Post-production', en: 'Post-production' },
  { id: 'casting', fr: 'Casting', en: 'Casting' },
  { id: 'transport', fr: 'Transport / logistique', en: 'Transport / logistics' },
];

/** Curated starter directory — verify contacts before production use. */
export const FILM_DIRECTORY: FilmDirectoryEntry[] = [
  {
    id: 'prod-douala-atlas',
    name: 'Atlas Screen Cameroun',
    category: 'production-company',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    specialtyFr: 'Fiction, pubs, coordination multi-régions.',
    specialtyEn: 'Fiction, commercials, multi-region coordination.',
    contact: 'production@example.cm',
  },
  {
    id: 'prod-yaounde-baobab',
    name: 'Baobab Films Yaoundé',
    category: 'production-company',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    specialtyFr: 'Documentaire, institutionnel, partenariats publics.',
    specialtyEn: 'Documentary, institutional, public partnerships.',
  },
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
    id: 'rental-douala',
    name: 'Gulf Cam Rental',
    category: 'equipment-rental',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    specialtyFr: 'Caméras cinéma, optiques, LED, grip léger.',
    specialtyEn: 'Cinema cameras, glass, LED, light grip.',
  },
  {
    id: 'studio-yaounde',
    name: 'Studio Mfoundi',
    category: 'studio',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    specialtyFr: 'Plateau cyclorama, salle VO, régie lumière.',
    specialtyEn: 'Cyclorama stage, VO booth, lighting desk.',
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
  {
    id: 'transport-nord',
    name: 'Sahel Unit Logistics',
    category: 'transport',
    cityFr: 'Maroua',
    cityEn: 'Maroua',
    regionId: 'extreme-nord',
    specialtyFr: '4×4, portage, convois parc Waza / Rhumsiki.',
    specialtyEn: '4×4, porters, Waza / Rhumsiki convoys.',
  },
  {
    id: 'dop-freelance',
    name: 'Lens & Laterite Collective',
    category: 'dop',
    cityFr: 'Douala',
    cityEn: 'Douala',
    regionId: 'littoral',
    specialtyFr: 'Image fiction / doc, drones certifiés.',
    specialtyEn: 'Fiction/doc image, certified drones.',
  },
  {
    id: 'sound-field',
    name: 'Écho Brousse',
    category: 'sound',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    specialtyFr: 'Prise de son nature et tournage mobile.',
    specialtyEn: 'Nature location sound and mobile units.',
  },
  {
    id: 'director-indie',
    name: 'Réseau Réalisateurs Mintoul',
    category: 'director',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    regionId: 'centre',
    specialtyFr: 'Mise en relation réalisateurs FR/EN locaux.',
    specialtyEn: 'Matchmaking for local FR/EN directors.',
  },
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
      const hay = `${e.name} ${e.specialtyFr} ${e.specialtyEn} ${e.cityFr}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
