import { practicalFor } from '@/lib/film/location-practical';
import type {
  AccessLevel,
  CostTier,
  FilmLocationMeta,
  FilmLook,
} from '@/lib/film/types';
import { LOCAL_PLACE_COVERS } from '@/lib/place-images';

type FilmLocationSeed = Omit<FilmLocationMeta, 'costTier' | 'accessLevel'>;

/**
 * Filming locations that share identity with tourism destinations where marked.
 * Coordinates are indicative for map pins; always confirm on scouting.
 */
const FILM_LOCATION_SEEDS: FilmLocationSeed[] = [
  {
    placeId: 'chutes-de-la-lobe',
    slug: 'chutes-de-la-lobe',
    nameFr: 'Chutes de la Lobé',
    nameEn: 'Lobé Falls',
    regionId: 'sud',
    cityFr: 'Kribi',
    cityEn: 'Kribi',
    looks: ['waterfall', 'coast', 'forest'],
    season: 'year-round',
    latitude: 2.881,
    longitude: 9.895,
    accessFr: 'Route goudronnée depuis Kribi (~8 km). Parking + sentier court.',
    accessEn: 'Paved road from Kribi (~8 km). Parking and a short trail.',
    powerFr: 'Pas de courant sur site — générateur recommandé.',
    powerEn: 'No on-site power — bring a generator.',
    permitFr: 'Autorisation locale + sensibilisation communauté riveraine.',
    permitEn: 'Local authorization and community outreach required.',
    practicalFr: 'Embruns, sol glissant, lumière forte en milieu de journée.',
    practicalEn: 'Spray mist, slippery ground, harsh midday light.',
    alsoTourism: true,
    tourismHref: '/destinations/chutes-de-la-lobe',
  },
  {
    placeId: 'kribi-plages',
    slug: 'kribi-plages',
    nameFr: 'Plages de Kribi',
    nameEn: 'Kribi Beaches',
    regionId: 'sud',
    cityFr: 'Kribi',
    cityEn: 'Kribi',
    looks: ['coast'],
    season: 'dry',
    latitude: 2.937,
    longitude: 9.908,
    accessFr: 'Accès urbain facile ; plusieurs plages publiques.',
    accessEn: 'Easy urban access; several public beaches.',
    powerFr: 'Hôtels et bars proches — raccordement possible selon lieu.',
    powerEn: 'Nearby hotels/bars — hookups possible by venue.',
    permitFr: 'Mairie / tourisme local pour tournages commerciaux.',
    permitEn: 'City hall / local tourism for commercial shoots.',
    practicalFr: 'Marées, public, vent côtier — planifier tôt le matin.',
    practicalEn: 'Tides, public traffic, coastal wind — shoot early.',
    alsoTourism: true,
    tourismHref: '/destinations/kribi-plages',
  },
  {
    placeId: 'mont-cameroun',
    slug: 'mont-cameroun',
    nameFr: 'Mont Cameroun',
    nameEn: 'Mount Cameroon',
    regionId: 'sud-ouest',
    cityFr: 'Buea',
    cityEn: 'Buea',
    looks: ['mountain', 'forest'],
    season: 'dry',
    latitude: 4.217,
    longitude: 9.172,
    accessFr: 'Départs guidés depuis Buea ; véhicule 4×4 pour camps bas.',
    accessEn: 'Guided starts from Buea; 4×4 for lower camps.',
    powerFr: 'Aucun hors base — toute autonomie batterie / générateur.',
    powerEn: 'None off-base — full battery/generator autonomy.',
    permitFr: 'Parc / guides agréés ; quota et sécurité obligatoires.',
    permitEn: 'Park / licensed guides; quotas and safety mandatory.',
    practicalFr: 'Altitude, météo changeante, portage — alléger le kit.',
    practicalEn: 'Altitude, shifting weather, porters — travel light.',
    alsoTourism: true,
    tourismHref: '/destinations/mont-cameroun',
  },
  {
    placeId: 'down-beach-limbe',
    slug: 'down-beach-limbe',
    nameFr: 'Down Beach Limbé',
    nameEn: 'Limbe Down Beach',
    regionId: 'sud-ouest',
    cityFr: 'Limbé',
    cityEn: 'Limbe',
    looks: ['coast', 'urban'],
    season: 'dry',
    latitude: 4.007,
    longitude: 9.207,
    accessFr: 'Centre-ville Limbé, accès véhicule + piétons.',
    accessEn: 'Limbe town center; vehicle and foot access.',
    powerFr: 'Restaurants et hôtels en bordure.',
    powerEn: 'Seaside restaurants and hotels nearby.',
    permitFr: 'Autorités municipales pour installations longues.',
    permitEn: 'Municipal permits for long setups.',
    practicalFr: 'Sable noir volcanique — contraste fort, reflets chauds.',
    practicalEn: 'Black volcanic sand — strong contrast, warm bounce.',
    alsoTourism: true,
    tourismHref: '/destinations/down-beach-limbe',
  },
  {
    placeId: 'jardin-botanique-limbe',
    slug: 'jardin-botanique-limbe',
    nameFr: 'Jardin botanique de Limbé',
    nameEn: 'Limbe Botanical Garden',
    regionId: 'sud-ouest',
    cityFr: 'Limbé',
    cityEn: 'Limbe',
    looks: ['forest', 'cultural'],
    season: 'year-round',
    latitude: 4.015,
    longitude: 9.211,
    accessFr: 'Entrée payante, horaires d’ouverture à respecter.',
    accessEn: 'Ticketed entry; respect opening hours.',
    powerFr: 'Limité près des bâtiments d’accueil.',
    powerEn: 'Limited near reception buildings.',
    permitFr: 'Demande écrite à la direction du jardin.',
    permitEn: 'Written request to garden management.',
    practicalFr: 'Canopée dense, lumière tachetée — idéale pour nature / doc.',
    practicalEn: 'Dense canopy, dappled light — ideal for nature/docs.',
    alsoTourism: true,
    tourismHref: '/destinations/jardin-botanique-limbe',
  },
  {
    placeId: 'parc-waza',
    slug: 'parc-waza',
    nameFr: 'Parc national de Waza',
    nameEn: 'Waza National Park',
    regionId: 'extreme-nord',
    cityFr: 'Waza',
    cityEn: 'Waza',
    looks: ['savanna'],
    season: 'dry',
    latitude: 11.333,
    longitude: 14.667,
    accessFr: 'Piste depuis Maroua / Kousseri ; véhicule tout-terrain.',
    accessEn: 'Track from Maroua / Kousseri; off-road vehicle.',
    powerFr: 'Camps/lodges uniquement — autonomie totale en brousse.',
    powerEn: 'Camps/lodges only — full autonomy in the bush.',
    permitFr: 'MINFOF / parc ; escortes guides obligatoires.',
    permitEn: 'MINFOF / park; guided escorts required.',
    practicalFr: 'Faune, poussière, chaleur — téléobjectifs et protection.',
    practicalEn: 'Wildlife, dust, heat — long lenses and weather sealing.',
    alsoTourism: true,
    tourismHref: '/destinations/parc-waza',
  },
  {
    placeId: 'rhumsiki',
    slug: 'rhumsiki',
    nameFr: 'Rhumsiki',
    nameEn: 'Rhumsiki',
    regionId: 'extreme-nord',
    cityFr: 'Rhumsiki',
    cityEn: 'Rhumsiki',
    looks: ['mountain', 'cultural', 'savanna'],
    season: 'dry',
    latitude: 10.483,
    longitude: 13.567,
    accessFr: 'Route depuis Maroua via Mokolo ; 4×4 recommandé en saison.',
    accessEn: 'Road from Maroua via Mokolo; 4×4 recommended in season.',
    powerFr: 'Hébergements village — capacité limitée.',
    powerEn: 'Village lodgings — limited capacity.',
    permitFr: 'Chefferie / autorités locales pour scènes village.',
    permitEn: 'Chiefdom / local authorities for village scenes.',
    practicalFr: 'Pics volcaniques emblématiques — golden hour exceptionnelle.',
    practicalEn: 'Iconic volcanic peaks — exceptional golden hour.',
    alsoTourism: true,
    tourismHref: '/destinations/rhumsiki',
  },
  {
    placeId: 'palais-royal-foumban',
    slug: 'palais-royal-foumban',
    nameFr: 'Palais royal de Foumban',
    nameEn: 'Foumban Royal Palace',
    regionId: 'ouest',
    cityFr: 'Foumban',
    cityEn: 'Foumban',
    looks: ['cultural', 'urban'],
    season: 'year-round',
    latitude: 5.729,
    longitude: 10.898,
    accessFr: 'Centre Foumban ; parking à proximité.',
    accessEn: 'Foumban center; parking nearby.',
    powerFr: 'Possible près du complexe muséal selon accord.',
    powerEn: 'Possible near museum complex by agreement.',
    permitFr: 'Palais / sultanat — protocole culturel strict.',
    permitEn: 'Palace / sultanate — strict cultural protocol.',
    practicalFr: 'Architecture Bamoun, textiles, cour — idéal patrimoine.',
    practicalEn: 'Bamoun architecture, textiles, courtyard — heritage looks.',
    alsoTourism: true,
    tourismHref: '/destinations/palais-royal-foumban',
  },
  {
    placeId: 'chefferie-bandjoun',
    slug: 'chefferie-bandjoun',
    nameFr: 'Chefferie de Bandjoun',
    nameEn: 'Bandjoun Chiefdom',
    regionId: 'ouest',
    cityFr: 'Bandjoun',
    cityEn: 'Bandjoun',
    looks: ['cultural'],
    season: 'year-round',
    latitude: 5.375,
    longitude: 10.412,
    accessFr: 'Route depuis Bafoussam (~20 min).',
    accessEn: 'Road from Bafoussam (~20 min).',
    powerFr: 'Limité — prévoir autonomie.',
    powerEn: 'Limited — bring autonomy.',
    permitFr: 'Chefferie : request formelle avant tout tournage.',
    permitEn: 'Chiefdom: formal request before any shoot.',
    practicalFr: 'Cases à toiture, cérémonies — respect des interdits.',
    practicalEn: 'Thatched compounds, ceremonies — respect taboos.',
    alsoTourism: true,
    tourismHref: '/destinations/chefferie-bandjoun',
  },
  {
    placeId: 'monument-reunification-yaounde',
    slug: 'monument-reunification-yaounde',
    nameFr: 'Monument de la Réunification',
    nameEn: 'Reunification Monument',
    regionId: 'centre',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    looks: ['urban', 'cultural'],
    season: 'year-round',
    latitude: 3.848,
    longitude: 11.502,
    accessFr: 'Quartier du Lac ; accès véhicule facile.',
    accessEn: 'Lac district; easy vehicle access.',
    powerFr: 'Urbain — possibles points de raccordement à négocier.',
    powerEn: 'Urban — power hookups negotiable.',
    permitFr: 'Préfecture / police pour occupation d’espace public.',
    permitEn: 'Prefecture / police for public-space occupation.',
    practicalFr: 'Skyline Yaoundé, symbolique nationale, trafic à gérer.',
    practicalEn: 'Yaoundé skyline, national symbolism; manage traffic.',
    alsoTourism: true,
    tourismHref: '/destinations/monument-reunification-yaounde',
  },
  {
    placeId: 'parc-dja',
    slug: 'parc-dja',
    nameFr: 'Réserve de faune du Dja',
    nameEn: 'Dja Faunal Reserve',
    regionId: 'sud',
    cityFr: 'Somalomo',
    cityEn: 'Somalomo',
    looks: ['forest'],
    season: 'dry',
    latitude: 3.0,
    longitude: 12.833,
    accessFr: 'Logistique lourde depuis Yaoundé / Abong-Mbang.',
    accessEn: 'Heavy logistics from Yaoundé / Abong-Mbang.',
    powerFr: 'Aucune — expédition autonome.',
    powerEn: 'None — fully autonomous expedition.',
    permitFr: 'MINFOF + UNESCO / gestion parc ; délais longs.',
    permitEn: 'MINFOF + UNESCO / park management; long lead times.',
    practicalFr: 'Forêt primaire UNESCO — doc nature, sons riches.',
    practicalEn: 'UNESCO primary forest — nature docs, rich sound.',
    alsoTourism: true,
    tourismHref: '/destinations/parc-dja',
  },
  {
    placeId: 'lac-barombi-mbo',
    slug: 'lac-barombi-mbo',
    nameFr: 'Lac Barombi Mbo',
    nameEn: 'Lake Barombi Mbo',
    regionId: 'sud-ouest',
    cityFr: 'Kumba',
    cityEn: 'Kumba',
    looks: ['lake', 'forest'],
    season: 'year-round',
    latitude: 4.663,
    longitude: 9.404,
    accessFr: 'Depuis Kumba ; sentiers et pirogues locales.',
    accessEn: 'From Kumba; trails and local canoes.',
    powerFr: 'Aucun sur berge éloignée.',
    powerEn: 'None on remote shores.',
    permitFr: 'Autorités locales + sensibilisation pêcheurs.',
    permitEn: 'Local authorities and fisher outreach.',
    practicalFr: 'Crater lake calme — reflets, brume matinale.',
    practicalEn: 'Calm crater lake — reflections, morning mist.',
    alsoTourism: true,
    tourismHref: '/destinations/lac-barombi-mbo',
  },
];

export const FILM_LOCATIONS: FilmLocationMeta[] = FILM_LOCATION_SEEDS.map((seed) => ({
  ...seed,
  ...practicalFor(seed.slug),
}));

export const FILM_LOOKS: { id: FilmLook; fr: string; en: string }[] = [
  { id: 'coast', fr: 'Côte', en: 'Coast' },
  { id: 'savanna', fr: 'Savane', en: 'Savanna' },
  { id: 'forest', fr: 'Forêt', en: 'Forest' },
  { id: 'urban', fr: 'Urbain', en: 'Urban' },
  { id: 'mountain', fr: 'Montagne', en: 'Mountain' },
  { id: 'cultural', fr: 'Patrimoine', en: 'Heritage' },
  { id: 'waterfall', fr: 'Chutes', en: 'Waterfalls' },
  { id: 'lake', fr: 'Lacs', en: 'Lakes' },
];

export function getFilmLocation(slugOrId: string): FilmLocationMeta | undefined {
  const key = slugOrId.toLowerCase();
  return FILM_LOCATIONS.find((l) => l.slug === key || l.placeId === key);
}

export function filterFilmLocations(opts: {
  regionId?: string;
  look?: FilmLook | 'all';
  q?: string;
  costTier?: CostTier | 'all';
  accessLevel?: AccessLevel | 'all';
}): FilmLocationMeta[] {
  const q = opts.q?.trim().toLowerCase();
  return FILM_LOCATIONS.filter((loc) => {
    if (opts.regionId && opts.regionId !== 'all' && loc.regionId !== opts.regionId) {
      return false;
    }
    if (opts.look && opts.look !== 'all' && !loc.looks.includes(opts.look)) return false;
    if (opts.costTier && opts.costTier !== 'all' && loc.costTier !== opts.costTier) {
      return false;
    }
    if (
      opts.accessLevel &&
      opts.accessLevel !== 'all' &&
      loc.accessLevel !== opts.accessLevel
    ) {
      return false;
    }
    if (q) {
      const hay = `${loc.nameFr} ${loc.nameEn} ${loc.cityFr} ${loc.cityEn} ${loc.looks.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filmLocationCover(loc: FilmLocationMeta): string | null {
  return (
    LOCAL_PLACE_COVERS[loc.placeId] ||
    LOCAL_PLACE_COVERS[loc.slug] ||
    loc.coverHint ||
    null
  );
}
