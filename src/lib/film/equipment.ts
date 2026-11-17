import studiosData from '@/lib/film/data/studios-materiel.json';
import type { FilmEquipmentItem } from '@/lib/film/types';

const BAD_IMAGE = /whatsapp|globe\.png|favicon|icon|logo-only|1x1|pixel/i;

function cleanImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (BAD_IMAGE.test(src)) return null;
  return src;
}

type Scraped = {
  id: string;
  name: string;
  kind: FilmEquipmentItem['kind'];
  cityFr: string;
  cityEn: string;
  specialtyFr: string;
  specialtyEn: string;
  notesFr?: string;
  notesEn?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  image?: string | null;
};

function normalizeKind(kind: FilmEquipmentItem['kind']): 'camera' | 'studio' {
  return kind === 'studio' ? 'studio' : 'camera';
}

/** Live studios & matériel scraped from their websites. */
export const FILM_EQUIPMENT: FilmEquipmentItem[] = (studiosData.items as Scraped[]).map(
  (item) => ({
    id: item.id,
    nameFr: item.name,
    nameEn: item.name,
    kind: normalizeKind(item.kind),
    cityFr: item.cityFr,
    cityEn: item.cityEn,
    notesFr: item.specialtyFr || item.notesFr || '',
    notesEn: item.specialtyEn || item.notesEn || '',
    phone: item.phone,
    email: item.email,
    website: item.website,
    address: item.address,
    image: cleanImage(item.image),
  }),
);

/** Filters kept on the Matériel page (drone / son / équipe / grip / lumière removed). */
export const EQUIPMENT_KINDS = [
  { id: 'camera' as const, fr: 'Caméra', en: 'Camera' },
  { id: 'studio' as const, fr: 'Studio', en: 'Studio' },
];
