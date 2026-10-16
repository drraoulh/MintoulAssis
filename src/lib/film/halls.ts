/** Projection halls / cinemas for premieres and public screenings. */

export type HallSuitability =
  | 'premiere'
  | 'public-screening'
  | 'festival'
  | 'cultural';

export type HallStatus = 'active' | 'verify';

export type CapacityStatus = 'verified' | 'indicative' | 'unknown';

export interface ProjectionHall {
  id: string;
  slug: string;
  name: string;
  city: string;
  regionId: string;
  addressFr: string;
  addressEn: string;
  neighborhoodFr?: string;
  neighborhoodEn?: string;
  latitude: number;
  longitude: number;
  /** Seat count when known; null = confirm with venue. */
  capacitySeats: number | null;
  capacityStatus: CapacityStatus;
  capacityNoteFr: string;
  capacityNoteEn: string;
  descriptionFr: string;
  descriptionEn: string;
  suitableFor: HallSuitability[];
  status: HallStatus;
  statusNoteFr?: string;
  statusNoteEn?: string;
  /** Local cover image path under /public. */
  image: string;
  /** Extra venue photos (detail gallery). Cover is `image`. */
  gallery?: string[];
  /** True when `image` is a regional placeholder, not the venue itself. */
  imageIsRegional?: boolean;
  website?: string;
  bookingHintFr: string;
  bookingHintEn: string;
}

/**
 * Capacities are only filled when we have a reliable figure.
 * Otherwise capacityStatus is unknown/indicative — always confirm before booking a premiere.
 */
export const PROJECTION_HALLS: ProjectionHall[] = [
  {
    id: 'majestic-cinema-uy1',
    slug: 'majestic-cinema-yaounde',
    name: 'Majestic Cinema',
    city: 'Yaoundé',
    regionId: 'centre',
    addressFr: 'Université de Yaoundé I, Ngoa-Ékélé',
    addressEn: 'University of Yaoundé I, Ngoa-Ékélé',
    neighborhoodFr: 'Campus universitaire',
    neighborhoodEn: 'University campus',
    latitude: 3.8566243,
    longitude: 11.4999807,
    capacitySeats: null,
    capacityStatus: 'unknown',
    capacityNoteFr:
      'Capacité à confirmer auprès de la salle / de l’université avant une première.',
    capacityNoteEn:
      'Confirm capacity with the hall / university before booking a premiere.',
    descriptionFr:
      'Salle associée au campus de l’Université de Yaoundé I — projections de films et événements culturels. Option à examiner pour des séances et événements cinématographiques.',
    descriptionEn:
      'Hall linked to the University of Yaoundé I campus — film screenings and cultural events. Worth reviewing for cinema sessions and film events.',
    suitableFor: ['premiere', 'public-screening', 'cultural', 'festival'],
    status: 'active',
    image: '/regions/centre.jpg',
    imageIsRegional: true,
    bookingHintFr: 'Contacter l’administration / gestion culturelle du campus.',
    bookingHintEn: 'Contact campus administration / cultural management.',
  },
  {
    id: 'ifc-yaounde',
    slug: 'institut-francais-yaounde',
    name: 'Institut français du Cameroun — Yaoundé',
    city: 'Yaoundé',
    regionId: 'centre',
    addressFr: 'Avenue du Président El Hadj Ahmadou Ahidjo, Centre administratif',
    addressEn: 'Avenue du Président El Hadj Ahmadou Ahidjo, Administrative centre',
    neighborhoodFr: 'Centre administratif',
    neighborhoodEn: 'Administrative centre',
    latitude: 3.8627674,
    longitude: 11.5198979,
    capacitySeats: null,
    capacityStatus: 'unknown',
    capacityNoteFr:
      'Plusieurs espaces (salle de projection / amphithéâtre selon programmation) — demander la jauge exacte à l’IFC.',
    capacityNoteEn:
      'Several spaces (screening room / auditorium depending on programme) — ask IFC for the exact capacity.',
    descriptionFr:
      'Projections, rencontres culturelles et festivals. Cadre institutionnel solide pour premières, avant-premières et débats.',
    descriptionEn:
      'Screenings, cultural encounters, and festivals. A solid institutional setting for premieres, previews, and talks.',
    suitableFor: ['premiere', 'public-screening', 'festival', 'cultural'],
    status: 'active',
    image: '/film/halls/institut-francais-yaounde/01-facade.jpg',
    gallery: [
      '/film/halls/institut-francais-yaounde/01-facade.jpg',
      '/film/halls/institut-francais-yaounde/02-foyer-spectacle.jpg',
      '/film/halls/institut-francais-yaounde/03-scene-ecran.jpg',
      '/film/halls/institut-francais-yaounde/04-scene-concert.jpg',
    ],
    website: 'https://ifcameroun.com',
    bookingHintFr: 'Réservation via l’Institut français du Cameroun — antenne de Yaoundé.',
    bookingHintEn: 'Book via the French Institute of Cameroon — Yaoundé branch.',
  },
  {
    id: 'ifc-douala',
    slug: 'institut-francais-douala',
    name: 'Institut français du Cameroun — Douala',
    city: 'Douala',
    regionId: 'littoral',
    addressFr: 'Antenne de Douala (vérifier l’adresse exacte auprès de l’IFC)',
    addressEn: 'Douala branch (confirm exact address with IFC)',
    neighborhoodFr: 'Douala',
    neighborhoodEn: 'Douala',
    latitude: 4.0511,
    longitude: 9.7679,
    capacitySeats: null,
    capacityStatus: 'unknown',
    capacityNoteFr: 'Jauge à confirmer selon la salle utilisée pour la projection.',
    capacityNoteEn: 'Confirm capacity for the specific screening room used.',
    descriptionFr:
      'Antenne doualaise de l’IFC — projections et événements culturels, utile pour des lancements sur le littoral.',
    descriptionEn:
      'Douala branch of IFC — screenings and cultural events, useful for launches on the coast.',
    suitableFor: ['premiere', 'public-screening', 'cultural', 'festival'],
    status: 'active',
    statusNoteFr: 'Coordonnées GPS approximatives — confirmer le site exact.',
    statusNoteEn: 'Approximate GPS — confirm the exact site.',
    image: '/film/halls/institut-francais-douala/01-facade.jpg',
    gallery: [
      '/film/halls/institut-francais-douala/01-facade.jpg',
      '/film/halls/institut-francais-douala/02-salle-spectacle.jpg',
      '/film/halls/institut-francais-douala/03-projection.jpg',
      '/film/halls/institut-francais-douala/04-ecran-panel.jpg',
      '/film/halls/institut-francais-douala/05-scene-concert.jpg',
      '/film/halls/institut-francais-douala/06-scene-danse.jpg',
      '/film/halls/institut-francais-douala/07-atelier.jpg',
      '/film/halls/institut-francais-douala/08-galerie.jpg',
      '/film/halls/institut-francais-douala/09-exposition.jpg',
    ],
    website: 'https://ifcameroun.com',
    bookingHintFr: 'Réservation via l’Institut français du Cameroun — antenne de Douala.',
    bookingHintEn: 'Book via the French Institute of Cameroon — Douala branch.',
  },
  {
    id: 'cinema-eden-douala',
    slug: 'cinema-eden-douala',
    name: "Cinéma l'Eden",
    city: 'Douala',
    regionId: 'littoral',
    addressFr: 'Boulevard de la Réunification, secteur de Bessengué',
    addressEn: 'Boulevard de la Réunification, Bessengué area',
    neighborhoodFr: 'Bessengué / Deido',
    neighborhoodEn: 'Bessengué / Deido',
    latitude: 4.0546359,
    longitude: 9.7150349,
    capacitySeats: null,
    capacityStatus: 'unknown',
    capacityNoteFr:
      'Salle historique de Douala — capacité à confirmer pour une première publique.',
    capacityNoteEn:
      'Historic Douala cinema — confirm capacity for a public premiere.',
    descriptionFr:
      'Salle de cinéma connue à Douala. À considérer pour les projections publiques et les événements cinématographiques.',
    descriptionEn:
      'Well-known cinema in Douala. Consider for public screenings and film events.',
    suitableFor: ['premiere', 'public-screening', 'cultural'],
    status: 'active',
    image: '/regions/littoral.jpg',
    imageIsRegional: true,
    bookingHintFr: 'Contacter la direction de la salle pour disponibilités et jauge.',
    bookingHintEn: 'Contact the venue management for availability and capacity.',
  },
  {
    id: 'genesis-cinema-douala',
    slug: 'genesis-cinema-douala',
    name: 'Genesis Cinema',
    city: 'Douala',
    regionId: 'littoral',
    addressFr: 'Douala Grand Mall, Autoroute de l’Aviation, Nkolminta',
    addressEn: 'Douala Grand Mall, Aviation Highway, Nkolminta',
    neighborhoodFr: 'Douala Grand Mall',
    neighborhoodEn: 'Douala Grand Mall',
    latitude: 4.0223748,
    longitude: 9.7197697,
    capacitySeats: null,
    capacityStatus: 'indicative',
    capacityNoteFr:
      'Complexe multi-salles (ouverture / activités rapportées dès 2022). Jauge par salle à vérifier selon la programmation actuelle.',
    capacityNoteEn:
      'Multi-screen complex (opening / activity reported from 2022). Per-screen capacity must be verified against current programming.',
    descriptionFr:
      'Complexe de cinéma au Douala Grand Mall. Vérifier le statut actuel et la programmation avant de s’y déplacer pour une première.',
    descriptionEn:
      'Cinema complex at Douala Grand Mall. Verify current status and programming before planning a premiere visit.',
    suitableFor: ['premiere', 'public-screening'],
    status: 'verify',
    statusNoteFr: 'Statut et horaires à confirmer — vérifier avant déplacement.',
    statusNoteEn: 'Status and showtimes to confirm — verify before going.',
    image: '/regions/littoral.jpg',
    imageIsRegional: true,
    bookingHintFr: 'Contacter Genesis Cinema / Douala Grand Mall pour réservation privée.',
    bookingHintEn: 'Contact Genesis Cinema / Douala Grand Mall for a private booking.',
  },
];

export function getHall(slugOrId: string): ProjectionHall | undefined {
  const key = slugOrId.toLowerCase();
  return PROJECTION_HALLS.find((h) => h.slug === key || h.id === key);
}

export function filterHalls(opts: {
  city?: string | 'all';
  status?: HallStatus | 'all';
  q?: string;
}): ProjectionHall[] {
  const q = opts.q?.trim().toLowerCase();
  return PROJECTION_HALLS.filter((h) => {
    if (opts.city && opts.city !== 'all' && h.city.toLowerCase() !== opts.city.toLowerCase()) {
      return false;
    }
    if (opts.status && opts.status !== 'all' && h.status !== opts.status) return false;
    if (q) {
      const hay = `${h.name} ${h.city} ${h.addressFr} ${h.addressEn} ${h.descriptionFr}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const HALL_CITIES = [...new Set(PROJECTION_HALLS.map((h) => h.city))].sort((a, b) =>
  a.localeCompare(b, 'fr'),
);
