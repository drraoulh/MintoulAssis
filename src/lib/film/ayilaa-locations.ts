/**
 * Hotels, restaurants and tourist sites from Ayila'a (scripts/build-film-ayilaa-data.mjs),
 * shaped as filming locations with cover images and contact info.
 */

import ayilaa from '@/lib/film/data/ayilaa-places.json';
import type {
  AccessLevel,
  CostTier,
  FilmLocationKind,
  FilmLocationMeta,
  FilmLook,
  FilmSeason,
} from '@/lib/film/types';

type AyilaaPlace = {
  id: string;
  external_id: string;
  kind: 'hotel' | 'restaurant' | 'site' | 'house' | 'villa';
  category?: string | null;
  forceLook?: FilmLook | null;
  name: string;
  city: string;
  regionId: string;
  lat: number;
  lon: number;
  image: string | null;
  images: string[];
  gallery?: string[];
  local_cover?: string | null;
  remote_image?: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  price_from: number | null;
  rating: number | null;
  cuisines: string[];
  description: string | null;
  openingHours: string | null;
  source_url: string;
};

type AyilaaData = {
  generatedAt: string;
  attribution: string;
  counts: Record<string, number>;
  places: AyilaaPlace[];
};

const DATA = ayilaa as unknown as AyilaaData;

export const AYILAA_ATTRIBUTION =
  DATA.attribution || "Ayila'a (ayilaa.com) — images hébergées sur ayilaa.s3";

const COASTAL =
  /kribi|limb[ée]|douala|idenau|campo|bota|tiko|londji|eboundja|ebodj|batanga|debundscha/i;

type Notes = Pick<
  FilmLocationMeta,
  | 'accessFr'
  | 'accessEn'
  | 'powerFr'
  | 'powerEn'
  | 'permitFr'
  | 'permitEn'
  | 'practicalFr'
  | 'practicalEn'
>;

const NOTES: Record<'hotel' | 'restaurant' | 'site' | 'house' | 'villa', Notes> = {
  hotel: {
    accessFr:
      'Accès routier en ville — parking et zone de déchargement à réserver auprès de l’établissement.',
    accessEn: 'Urban road access — book parking and a loading area with the property.',
    powerFr:
      'Réseau électrique, souvent doublé d’un groupe électrogène — confirmer la puissance pour l’éclairage.',
    powerEn: 'Grid power, often backed by a generator — confirm available load for lighting.',
    permitFr:
      'Accord écrit de la direction ; autorisation municipale si tournage en façade ou sur la voie publique.',
    permitEn: 'Written agreement from management; city permit if shooting the façade or on the street.',
    practicalFr:
      'Réserver chambres, hall, piscine ou restaurant hors affluence ; prévoir loge équipe et hébergement sur place.',
    practicalEn:
      'Book rooms, lobby, pool or restaurant off-peak; plan a green room and crew lodging on site.',
  },
  restaurant: {
    accessFr: 'Accès urbain — livraison et stationnement technique à confirmer avec le gérant.',
    accessEn: 'Urban access — confirm delivery and technical parking with management.',
    powerFr: 'Cuisine et salle équipées — vérifier prises et ampérage avant éclairage cinéma.',
    powerEn: 'Kitchen and dining powered — check outlets and amperage before film lighting.',
    permitFr: 'Accord écrit du propriétaire ; tournage hors service ou privatisation recommandée.',
    permitEn: 'Written owner consent; shoot off-hours or book a private buyout.',
    practicalFr:
      'Idéal pour intérieurs, scènes de repas et base catering équipe ; protéger sols et vaisselle.',
    practicalEn:
      'Good for interiors, dining scenes and crew catering base; protect floors and tableware.',
  },
  house: {
    accessFr: 'Accès résidentiel — stationnement des véhicules techniques à organiser dans la rue.',
    accessEn: 'Residential access — arrange street parking for technical vehicles.',
    powerFr: 'Réseau domestique limité — groupe électrogène conseillé pour l’éclairage.',
    powerEn: 'Limited domestic supply — a generator is advised for lighting.',
    permitFr: 'Accord écrit du propriétaire ou du gérant ; informer le quartier / chef de bloc.',
    permitEn: 'Written consent from the owner or manager; inform the neighbourhood / block chief.',
    practicalFr:
      'Maisons d’hôtes et auberges : intérieurs réalistes ; prévoir un état des lieux avant/après tournage.',
    practicalEn:
      'Guesthouses and lodges: realistic interiors; plan a condition report before/after the shoot.',
  },
  villa: {
    accessFr: 'Accès privé — vérifier le gabarit du portail et des allées pour les véhicules techniques.',
    accessEn: 'Private access — check gate and driveway clearance for technical vehicles.',
    powerFr: 'Réseau + groupe éventuel : vérifier compteur et ampérage avant le jour J.',
    powerEn: 'Grid plus possible generator: check the meter and amperage before shoot day.',
    permitFr: 'Contrat de location et accord écrit du propriétaire ; prévenir le voisinage.',
    permitEn: 'Rental contract and written owner consent; notify the neighbours.',
    practicalFr:
      'Décor résidentiel haut de gamme : protéger sols et mobilier, assurance dommages recommandée.',
    practicalEn:
      'Upscale residential set: protect floors and furniture, damage insurance recommended.',
  },
  site: {
    accessFr: 'Accès variable (route, piste ou sentier) — scouting obligatoire avant le jour J.',
    accessEn: 'Access varies (road, track or trail) — scouting required before shoot day.',
    powerFr: 'Souvent hors réseau — prévoir groupe électrogène et autonomie batteries.',
    powerEn: 'Often off-grid — bring a generator and battery autonomy.',
    permitFr:
      'Autorisation locale / chefferie / parc selon le site ; sensibiliser la communauté riveraine.',
    permitEn: 'Local / chiefdom / park permit depending on the site; brief neighbouring communities.',
    practicalFr:
      'Lumières naturelles fortes, météo changeante — planifier créneaux tôt le matin / fin de journée.',
    practicalEn: 'Strong natural light, shifting weather — plan early morning / late afternoon windows.',
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

/** Urban monuments wrongly caught by a naive /lac/ match on "Place". */
const NEVER_LAKE =
  /place\s+charles\s+atangana|place\s+de\s+l['’]?ind[eé]pendance/i;

function looksFor(rec: AyilaaPlace): FilmLook[] {
  if (rec.forceLook === 'mountain' || rec.category === 'mont') {
    return ['mountain'];
  }
  if (rec.forceLook === 'waterfall' || rec.category === 'chutte-deau') {
    return ['waterfall'];
  }
  if (rec.forceLook === 'coast' || rec.category === 'plage') {
    return ['coast'];
  }
  if (rec.forceLook === 'museum' || rec.category === 'musee') {
    return ['museum'];
  }
  const hay = `${rec.city} ${rec.name}`;
  if (NEVER_LAKE.test(hay) || NEVER_LAKE.test(rec.name)) {
    return ['cultural'];
  }
  if (rec.forceLook === 'lake' || rec.category === 'lac') {
    return ['lake'];
  }
  if (rec.kind === 'site') {
    // Primary look first — used for exact ambiance filtering.
    if (/chute|fall|cascade/i.test(hay)) return ['waterfall', 'forest'];
    // Word-boundary: avoid matching the "lac" inside "Place".
    if (/\blacs?\b|\blake\b|\bcrat[eè]res?\b/i.test(hay)) return ['lake', 'mountain'];
    if (/mus[eé]e|blackitude/i.test(hay)) return ['museum'];
    if (/chefferie|palais|monument|patrimoine|place\b/i.test(hay)) {
      return ['cultural'];
    }
    if (/plage|beach|côte|coast/i.test(hay)) return ['coast'];
    if (/mont|mountain|colline/i.test(hay)) return ['mountain', 'forest'];
    if (COASTAL.test(hay)) return ['coast', 'cultural'];
    return ['cultural', 'forest'];
  }
  if (rec.kind === 'house' || rec.kind === 'villa') {
    if (COASTAL.test(hay)) return ['coast', 'urban'];
    return ['urban', 'cultural'];
  }
  if (COASTAL.test(hay)) return ['coast', 'urban'];
  return ['urban'];
}

function costTierFor(kind: AyilaaPlace['kind'], priceFrom: number | null): CostTier {
  if (kind === 'site') return 'budget';
  if (kind === 'house' && !priceFrom) return 'moderate';
  if (!priceFrom) return 'moderate';
  if (priceFrom >= 25000) return 'premium';
  if (priceFrom <= 5000) return 'budget';
  return 'moderate';
}

function accessLevelFor(kind: AyilaaPlace['kind'], regionId: string): AccessLevel {
  if (kind !== 'site') return 'easy';
  if (regionId === 'extreme-nord' || regionId === 'est' || regionId === 'adamaoua') return 'demanding';
  return 'moderate';
}

function pickGallery(rec: AyilaaPlace): string[] {
  const candidates = [...(rec.gallery || []), ...(rec.images || []), rec.image, rec.local_cover].filter(
    Boolean,
  ) as string[];
  const seen = new Set<string>();
  const locals: string[] = [];
  const remotes: string[] = [];
  for (const u of candidates) {
    if (seen.has(u)) continue;
    seen.add(u);
    // Prefer locally downloaded / Storage-backed paths.
    if (u.startsWith('/film/covers/')) {
      locals.push(u);
      continue;
    }
    // Keep non-Ayila'a remotes (e.g. Supabase). Ayila'a S3 often 403s via next/image.
    if (/^https?:\/\//i.test(u) && !/ayilaa\.s3/i.test(u)) {
      remotes.push(u);
    }
  }
  if (locals.length || remotes.length) return [...locals, ...remotes];

  // Last resort: single Ayila'a remote cover if nothing else exists.
  const fallback = rec.remote_image;
  return fallback && /^https?:\/\//i.test(fallback) ? [fallback] : [];
}

function pickCover(rec: AyilaaPlace): string | undefined {
  return pickGallery(rec)[0];
}

function cleanText(s?: string | null): string | undefined {
  if (!s) return undefined;
  const out = s
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&eacute;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ocirc;/gi, 'ô')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return out || undefined;
}

function toLocation(rec: AyilaaPlace): FilmLocationMeta {
  const kind: FilmLocationKind = rec.kind;
  const city = rec.city || '';
  const slug = `${slugify(rec.name)}-${rec.external_id}`;
  const season: FilmSeason = 'year-round';
  const notes = NOTES[rec.kind];
  const descFr = cleanText(rec.description);

  return {
    placeId: slug,
    slug,
    kind,
    nameFr: rec.name,
    nameEn: rec.name,
    regionId: rec.regionId || '',
    cityFr: city,
    cityEn: city,
    looks: looksFor(rec),
    season,
    latitude: rec.lat,
    longitude: rec.lon,
    coverHint: pickCover(rec),
    gallery: pickGallery(rec),
    stars: rec.rating ? Math.round(rec.rating) : undefined,
    contact: {
      phone: rec.phone || undefined,
      whatsapp: rec.whatsapp || undefined,
      website: rec.website || rec.source_url,
      address: rec.address || undefined,
      openingHours: rec.openingHours || undefined,
    },
    ...notes,
    practicalFr: descFr
      ? `${descFr}${notes.practicalFr ? ` — ${notes.practicalFr}` : ''}`
      : notes.practicalFr,
    practicalEn: descFr
      ? `${descFr}${notes.practicalEn ? ` — ${notes.practicalEn}` : ''}`
      : notes.practicalEn,
    costTier: costTierFor(rec.kind, rec.price_from),
    accessLevel: accessLevelFor(rec.kind, rec.regionId),
    alsoTourism: rec.kind === 'site',
    tourismHref: rec.kind === 'site' ? `/destinations/${slug}` : undefined,
  };
}

export const AYILAA_FILM_LOCATIONS: FilmLocationMeta[] = (() => {
  const byExt = new Map<string, AyilaaPlace>();
  for (const r of DATA.places || []) {
    if (!r.name || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
    const prev = byExt.get(r.external_id);
    if (!prev) {
      byExt.set(r.external_id, r);
      continue;
    }
    const lookScore = (x: AyilaaPlace) =>
      x.forceLook === 'mountain' ||
      x.category === 'mont' ||
      x.forceLook === 'lake' ||
      x.category === 'lac' ||
      x.forceLook === 'waterfall' ||
      x.category === 'chutte-deau' ||
      x.forceLook === 'coast' ||
      x.category === 'plage' ||
      x.forceLook === 'museum' ||
      x.category === 'musee'
        ? 3
        : 0;
    const prefer = lookScore(r) - lookScore(prev);
    if (prefer > 0 || (prefer === 0 && (r.images?.length || 0) >= (prev.images?.length || 0))) {
      byExt.set(r.external_id, r);
    }
  }
  const bySlug = new Map<string, FilmLocationMeta>();
  for (const loc of [...byExt.values()].map(toLocation)) {
    if (!bySlug.has(loc.slug)) bySlug.set(loc.slug, loc);
  }
  return [...bySlug.values()];
})();

/** Normalize names for soft matching against OSM stays. */
export function ayilaaNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(hotel|hôtel|restaurant|resto|auberge|residence|résidence)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}

/** Cover image lookup by normalized name (for enriching OSM hotels). */
export const AYILAA_COVER_BY_NAME: Map<string, string> = new Map();
for (const p of DATA.places || []) {
  const cover = p.image || p.images?.[0];
  if (!cover || !p.name) continue;
  const key = ayilaaNameKey(p.name);
  if (key && !AYILAA_COVER_BY_NAME.has(key)) AYILAA_COVER_BY_NAME.set(key, cover);
}
