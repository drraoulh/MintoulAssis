-- Cameroun · Afrique en miniature
-- Lecture publique (anon). Écriture uniquement via DATABASE_URL / service role.

create extension if not exists "pgcrypto";

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  center_lat double precision,
  center_lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text,
  city text,
  short_description text,
  description text,
  lat double precision,
  lng double precision,
  tags text[] not null default '{}',
  season text,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  url text not null,
  alt text,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  query text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists places_region_id_idx on public.places (region_id);
create index if not exists places_category_idx on public.places (category);
create index if not exists place_images_place_id_idx on public.place_images (place_id);

alter table public.regions enable row level security;
alter table public.places enable row level security;
alter table public.place_images enable row level security;
alter table public.itinerary_cache enable row level security;

drop policy if exists "regions_public_read" on public.regions;
create policy "regions_public_read"
  on public.regions for select
  to anon, authenticated
  using (true);

drop policy if exists "places_public_read" on public.places;
create policy "places_public_read"
  on public.places for select
  to anon, authenticated
  using (true);

drop policy if exists "place_images_public_read" on public.place_images;
create policy "place_images_public_read"
  on public.place_images for select
  to anon, authenticated
  using (true);

-- Cache itinéraires : lecture serveur uniquement (pas d'accès anon)
-- Les inserts se font avec DATABASE_URL (rôle postgres, bypass RLS).

insert into public.regions (name, slug, description, center_lat, center_lng)
values
  ('Adamaoua', 'adamaoua', 'Hauts plateaux, élevage et portes du Nord.', 7.32, 13.58),
  ('Centre', 'centre', 'Yaoundé, forêts et collines du cœur politique.', 3.87, 11.52),
  ('Est', 'est', 'Forêt dense, Dja et biodiversité.', 4.43, 13.68),
  ('Extrême-Nord', 'extreme-nord', 'Sahel, Waza, Mandara et traditions kotoko.', 10.59, 14.32),
  ('Littoral', 'littoral', 'Douala, mangroves et porte atlantique.', 4.05, 9.77),
  ('Nord', 'nord', 'Bénoué, savane et parcs nationaux.', 9.30, 13.39),
  ('Nord-Ouest', 'nord-ouest', 'Grassfields, chefferies et hauts plateaux.', 6.00, 10.15),
  ('Ouest', 'ouest', 'Bamiléké, Foumban, lacs de cratère.', 5.48, 10.42),
  ('Sud', 'sud', 'Kribi, chutes de la Lobé, océan et forêt.', 2.94, 11.15),
  ('Sud-Ouest', 'sud-ouest', 'Mont Cameroun, Limbé et côte volcanique.', 4.15, 9.24)
on conflict (slug) do nothing;
