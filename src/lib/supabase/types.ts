export type Region = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  center_lat: number | null;
  center_lng: number | null;
};

export type Place = {
  id: string;
  region_id: string | null;
  name: string;
  slug: string;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  short_description: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  season: string | null;
  source_url: string | null;
  phone: string | null;
  price_from: number | null;
  currency: string | null;
  rating: number | null;
  review_count: number | null;
  likes_count: number | null;
  cuisines: string[];
  kb_text: string | null;
};

export type PlaceImage = {
  id: string;
  place_id: string;
  url: string;
  alt: string | null;
  storage_path: string | null;
};

export type PlaceWithImage = Place & {
  place_images?: Pick<PlaceImage, "url" | "alt">[] | null;
  image_url?: string | null;
};
