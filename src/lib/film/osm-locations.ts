/**
 * Hotels, villas, houses and villages from OpenStreetMap (scripts/build-film-osm-data.mjs),
 * shaped as filming locations. Practical notes are per-type guidance to confirm on site.
 */

import osm from '@/lib/film/data/osm-places.json';
import type {
  AccessLevel,
  CostTier,
  FilmLocationKind,
  FilmLocationMeta,
  FilmLook,
  FilmSeason,
  PlaceContact,
  RentalShop,
} from '@/lib/film/types';
import { REGIONS } from '@/lib/regions';

type OsmStay = PlaceContact & {
  id: string;
  osm: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  city?: string;
  regionId?: string;
  stars?: number;
  rooms?: number;
  image?: string;
  population?: number;
};

type OsmData = {
  generatedAt: string;
  attribution: string;
  rentals: RentalShop[];
  stays: OsmStay[];
  villages: OsmStay[];
};

const DATA = osm as unknown as OsmData;

export const OSM_ATTRIBUTION = DATA.attribution || '© OpenStreetMap contributors (ODbL)';

const COASTAL = /kribi|limb[ée]|douala|idenau|campo|bota|tiko|londji|eboundja|ebodj|batanga|debundscha/i;

type Notes = Pick<
  FilmLocationMeta,
  'accessFr' | 'accessEn' | 'powerFr' | 'powerEn' | 'permitFr' | 'permitEn' | 'practicalFr' | 'practicalEn'
>;

const NOTES: Record<Exclude<FilmLocationKind, 'site'>, Notes> = {
  hotel: {
    accessFr: 'Accès routier en ville — parking et zone de déchargement à réserver auprès de l’établissement.',
    accessEn: 'Urban road access — book parking and a loading area with the property.',
    powerFr: 'Réseau électrique, souvent doublé d’un groupe électrogène — confirmer la puissance disponible pour l’éclairage.',
    powerEn: 'Grid power, often backed by a generator — confirm available load for lighting.',
    permitFr: 'Accord écrit de la direction ; autorisation municipale si tournage en façade ou sur la voie publique.',
    permitEn: 'Written agreement from management; city permit if shooting the façade or on the street.',
    practicalFr: 'Réserver chambres, hall, piscine ou restaurant hors affluence ; prévoir une chambre régie / loge et l’hébergement équipe sur place.',
    practicalEn: 'Book rooms, lobby, pool or restaurant off-peak; plan a production room / green room and crew lodging on site.',
  },
  villa: {
    accessFr: 'Accès privé — vérifier le gabarit du portail et des allées pour les véhicules techniques.',
    accessEn: 'Private access — check gate and driveway clearance for technical vehicles.',
    powerFr: 'Réseau + groupe éventuel : vérifier compteur et ampérage avant le jour J.',
    powerEn: 'Grid plus possible generator: check the meter and amperage before shoot day.',
    permitFr: 'Contrat de location et accord écrit du propriétaire ; prévenir le voisinage.',
    permitEn: 'Rental contract and written owner consent; notify the neighbours.',
    practicalFr: 'Décor résidentiel haut de gamme : protéger sols et mobilier, assurance dommages recommandée.',
    practicalEn: 'Upscale residential set: protect floors and furniture, damage insurance recommended.',
  },
  house: {
    accessFr: 'Accès résidentiel — stationnement des véhicules techniques à organiser dans la rue.',
    accessEn: 'Residential access — arrange street parking for technical vehicles.',
    powerFr: 'Réseau domestique limité — groupe électrogène conseillé pour l’éclairage.',
    powerEn: 'Limited domestic supply — a generator is advised for lighting.',
    permitFr: 'Accord écrit du propriétaire ou du gérant ; informer le quartier / chef de bloc.',
    permitEn: 'Written consent from the owner or manager; inform the neighbourhood / block chief.',
    practicalFr: 'Intérieurs réalistes et authentiques ; prévoir un état des lieux avant et après tournage.',
    practicalEn: 'Realistic, authentic interiors; plan a condition report before and after the shoot.',
  },
  village: {
    accessFr: 'Route secondaire ou piste selon la saison — 4x4 recommandé en saison des pluies.',
    accessEn: 'Secondary road or track depending on season — 4x4 recommended in the rainy season.',
    powerFr: 'Réseau souvent absent ou instable — groupe électrogène indispensable.',
    powerEn: 'Grid often absent or unstable — a generator is essential.',
    permitFr: 'Accord du chef de village / chefferie et de la sous-préfecture ; compensation communautaire à prévoir.',
    permitEn: 'Consent from the village chief / chiefdom and the sub-prefecture; plan community compensation.',
    practicalFr: 'Briefer la communauté avant le jour J, respecter les lieux sacrés, rémunérer les figurants ; prévoir eau et repas équipe.',
    practicalEn: 'Brief the community beforehand, respect sacred places, pay extras; plan water and crew meals.',
  },
};

/** "Kribi II" → "Kribi", "Communauté urbaine de Bamenda" → "Bamenda", "Limbé I" → "Limbé". */
export function cleanCity(city?: string): string | undefined {
  if (!city) return city;
  return city
    .replace(/^communaut[ée] urbaine (de |d['’])/i, '')
    .replace(/\s+(I|II|III|IV|V|VI|VII)$/, '')
    .replace(/,\s*cameroun$/i, '')
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function villageLooks(regionId?: string, city?: string): FilmLook[] {
  if (city && COASTAL.test(city)) return ['cultural', 'coast'];
  switch (regionId) {
    case 'extreme-nord':
    case 'nord':
      return ['cultural', 'savanna'];
    case 'adamaoua':
      return ['cultural', 'savanna', 'mountain'];
    case 'ouest':
    case 'nord-ouest':
      return ['cultural', 'mountain'];
    case 'littoral':
    case 'sud-ouest':
      return ['cultural', 'forest', 'coast'];
    default:
      return ['cultural', 'forest'];
  }
}

function kindOf(raw: string): Exclude<FilmLocationKind, 'site'> {
  return raw === 'villa' || raw === 'house' || raw === 'village' ? raw : 'hotel';
}

function toLocation(rec: OsmStay): FilmLocationMeta {
  const kind = kindOf(rec.kind);
  const region = REGIONS.find((r) => r.id === rec.regionId);
  const city = cleanCity(rec.city) || (kind === 'village' ? rec.name : region?.capitalFr) || '';
  const coastal = COASTAL.test(`${city} ${rec.name}`);
  const north = rec.regionId === 'extreme-nord' || rec.regionId === 'nord';

  const looks: FilmLook[] =
    kind === 'village' ? villageLooks(rec.regionId, city) : coastal ? ['urban', 'coast'] : ['urban'];
  const season: FilmSeason = kind === 'village' && north ? 'dry' : 'year-round';
  const costTier: CostTier =
    kind === 'village'
      ? 'budget'
      : kind === 'villa' || (rec.stars ?? 0) >= 4
        ? 'premium'
        : kind === 'house' || (rec.stars ?? 0) <= 2
          ? 'budget'
          : 'moderate';
  const accessLevel: AccessLevel =
    kind !== 'village' ? 'easy' : north || rec.regionId === 'est' ? 'demanding' : 'moderate';
  const slug = `${slugify(rec.name)}-${rec.id.split('-').pop()}`;

  return {
    placeId: slug,
    slug,
    kind,
    osm: rec.osm,
    nameFr: rec.name,
    nameEn: rec.name,
    regionId: rec.regionId || '',
    cityFr: city,
    cityEn: city,
    looks,
    season,
    latitude: rec.lat,
    longitude: rec.lon,
    coverHint: rec.image,
    stars: rec.stars,
    contact: {
      phone: rec.phone,
      whatsapp: rec.whatsapp,
      email: rec.email,
      website: rec.website,
      facebook: rec.facebook,
      address: rec.address,
      openingHours: rec.openingHours,
    },
    ...NOTES[kind],
    costTier,
    accessLevel,
    alsoTourism: false,
  };
}

export const OSM_FILM_LOCATIONS: FilmLocationMeta[] = [...DATA.stays, ...DATA.villages]
  .filter((r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lon))
  .map(toLocation);

export const OSM_RENTALS: RentalShop[] = DATA.rentals.filter(
  (r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lon),
);
