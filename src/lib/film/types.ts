/** Film Production domain types — locations share IDs/slugs with tourism places. */

export type FilmLook =
  | 'coast'
  | 'savanna'
  | 'forest'
  | 'urban'
  | 'mountain'
  | 'cultural'
  | 'waterfall'
  | 'lake';

export type FilmSeason = 'dry' | 'rainy' | 'year-round';

/** Relative shoot cost for local productions (crew/logistics, not hotel rates). */
export type CostTier = 'budget' | 'moderate' | 'premium';

/** How hard it is to reach and work the location with a small unit. */
export type AccessLevel = 'easy' | 'moderate' | 'demanding';

export interface FilmLocationMeta {
  /** Same id/slug as tourism catalog when the place is shared. */
  placeId: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  regionId: string;
  cityFr: string;
  cityEn: string;
  looks: FilmLook[];
  season: FilmSeason;
  latitude: number;
  longitude: number;
  /** Local or catalog cover — prefer resolvePlaceImage at render time. */
  coverHint?: string;
  accessFr: string;
  accessEn: string;
  powerFr: string;
  powerEn: string;
  permitFr: string;
  permitEn: string;
  practicalFr: string;
  practicalEn: string;
  costTier: CostTier;
  accessLevel: AccessLevel;
  /** True when this record is also promoted as a tourist destination. */
  alsoTourism: boolean;
  tourismHref?: string;
}

export type ResourceKind = 'training' | 'festival' | 'funding' | 'call';

export interface FilmResource {
  id: string;
  kind: ResourceKind;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  cityFr: string;
  cityEn: string;
  /** Only verified entries are shown. */
  verified: true;
  url?: string;
  periodFr?: string;
  periodEn?: string;
}

export interface LocalFilmProfile {
  name: string;
  role: string;
  city: string;
  bio: string;
  specialties: string;
  contact: string;
  projectTitle?: string;
  updatedAt: string;
}

export type DirectoryCategory =
  | 'producer'
  | 'director'
  | 'dop'
  | 'sound'
  | 'production-company'
  | 'location-scout'
  | 'fixer'
  | 'equipment-rental'
  | 'studio'
  | 'post'
  | 'casting'
  | 'transport';

export interface FilmDirectoryEntry {
  id: string;
  name: string;
  category: DirectoryCategory;
  cityFr: string;
  cityEn: string;
  regionId: string;
  specialtyFr: string;
  specialtyEn: string;
  contact?: string;
  website?: string;
}

export interface FilmEquipmentItem {
  id: string;
  nameFr: string;
  nameEn: string;
  kind: 'camera' | 'lighting' | 'grip' | 'sound' | 'drone' | 'studio' | 'crew';
  cityFr: string;
  cityEn: string;
  notesFr: string;
  notesEn: string;
}

export interface FilmAuthority {
  id: string;
  nameFr: string;
  nameEn: string;
  roleFr: string;
  roleEn: string;
  cityFr: string;
  cityEn: string;
  contactHintFr: string;
  contactHintEn: string;
}

export interface FilmProcedureStep {
  id: string;
  order: number;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
}

export interface FilmChecklistItem {
  id: string;
  labelFr: string;
  labelEn: string;
}

export interface FilmChecklist {
  id: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  items: FilmChecklistItem[];
}
