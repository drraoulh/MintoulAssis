import { createServerClient } from "@/lib/supabase/server";
import type { PlaceWithImage } from "@/lib/supabase/types";
import { safeImageUrl } from "@/lib/images";

export type PlaceFilters = {
  city?: string;
  q?: string;
  category?: string;
  limit?: number;
  withCoordsOnly?: boolean;
};

export async function getPlaces(filters: PlaceFilters = {}): Promise<PlaceWithImage[]> {
  const supabase = createServerClient();
  const limit = Math.min(filters.limit ?? 48, 120);

  let query = supabase
    .from("places")
    .select(
      "id, region_id, name, slug, category, city, neighborhood, short_description, description, lat, lng, tags, season, source_url, phone, price_from, currency, rating, review_count, likes_count, cuisines, kb_text, place_images(url, alt)",
    )
    .order("likes_count", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.withCoordsOnly) {
    query = query.not("lat", "is", null).not("lng", "is", null);
  }
  if (filters.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,city.ilike.%${filters.q}%,neighborhood.ilike.%${filters.q}%,short_description.ilike.%${filters.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((place) => ({
    ...place,
    image_url: safeImageUrl(place.place_images?.[0]?.url) ?? null,
  })) as PlaceWithImage[];
}

export async function getCities(): Promise<string[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("places")
    .select("city")
    .not("city", "is", null)
    .limit(2000);

  if (error) throw new Error(error.message);

  const cities = [...new Set((data ?? []).map((row) => row.city as string).filter(Boolean))];
  return cities.sort((a, b) => a.localeCompare(b, "fr"));
}

export async function getPlaceStats() {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("places")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return { places: count ?? 0 };
}

export async function searchPlacesForGuide(query: string, limit = 12) {
  const supabase = createServerClient();
  const terms = query
    .toLowerCase()
    .split(/[\s,;.!?]+/)
    .filter((t) => t.length > 2)
    .slice(0, 6);

  let builder = supabase
    .from("places")
    .select(
      "id, name, slug, category, city, neighborhood, short_description, description, lat, lng, price_from, rating, likes_count, cuisines, tags, source_url, kb_text",
    )
    .limit(limit);

  if (terms.length) {
    const or = terms
      .flatMap((t) => [
        `name.ilike.%${t}%`,
        `city.ilike.%${t}%`,
        `kb_text.ilike.%${t}%`,
        `neighborhood.ilike.%${t}%`,
      ])
      .join(",");
    builder = builder.or(or);
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data ?? [];
}
