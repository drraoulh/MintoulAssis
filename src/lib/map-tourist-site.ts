import { safeImageUrl } from "@/lib/images";
import { REGIONS } from "@/lib/regions";
import { decodeHtmlEntities } from "@/lib/utils/text";

export type PlaceRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  short_description: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  tags?: string[] | null;
  source_url: string | null;
  phone: string | null;
  price_from: number | null;
  currency: string | null;
  cuisines?: string[] | null;
  hours?: unknown;
  regions?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  place_images?: { url: string; alt: string | null }[] | null;
};

function regionName(place: PlaceRow): string {
  const rel = place.regions;
  const row = Array.isArray(rel) ? rel[0] : rel;
  if (row?.name) return row.name;
  const city = (place.city || "").toLowerCase();
  const hit = REGIONS.find(
    (r) =>
      city.includes(r.capitalFr.toLowerCase()) ||
      city.includes(r.nameFr.toLowerCase()),
  );
  return hit?.nameFr || place.city || "Cameroun";
}

export function toTouristSite(place: PlaceRow) {
  const images = (place.place_images ?? [])
    .map((img) => safeImageUrl(img.url) || img.url)
    .filter(Boolean);
  const price =
    place.price_from != null
      ? `Dès ${Number(place.price_from).toLocaleString("fr-FR")} ${place.currency || "XAF"}`
      : null;

  return {
    id: place.id,
    name: decodeHtmlEntities(place.name),
    slug: place.slug,
    region: regionName(place),
    city: decodeHtmlEntities(place.city) || "Cameroun",
    category: place.category || "autre",
    description: decodeHtmlEntities(place.description || place.short_description || ""),
    history: null,
    culture: null,
    activities: place.cuisines?.length ? place.cuisines : place.tags || [],
    latitude: place.lat,
    longitude: place.lng,
    opening_hours: null,
    price,
    languages: ["fr", "en"],
    images,
    sources: place.source_url
      ? [{ title: "Ayila'a", url: place.source_url, verification_status: "imported" }]
      : [],
  };
}

export const PLACE_SELECT =
  "id, name, slug, category, city, neighborhood, short_description, description, lat, lng, tags, source_url, phone, price_from, currency, cuisines, hours, regions(name, slug), place_images(url, alt)";
