-- Enrichissement places + Knowledge Base pour le guide IA

alter table public.places
  add column if not exists external_id text,
  add column if not exists source text default 'ayilaa',
  add column if not exists neighborhood text,
  add column if not exists state text,
  add column if not exists country text default 'CM',
  add column if not exists phone text,
  add column if not exists price_from numeric,
  add column if not exists currency text default 'XAF',
  add column if not exists rating numeric,
  add column if not exists review_count integer,
  add column if not exists likes_count integer,
  add column if not exists cuisines text[] not null default '{}',
  add column if not exists hours jsonb,
  add column if not exists reviews jsonb,
  add column if not exists raw jsonb,
  add column if not exists kb_text text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists places_external_id_source_uidx
  on public.places (source, external_id)
  where external_id is not null;

create index if not exists places_city_idx on public.places (city);
create index if not exists places_tags_gin on public.places using gin (tags);
create index if not exists places_kb_text_fts
  on public.places using gin (to_tsvector('french', coalesce(kb_text, '')));

-- Documents KB (chunks pour RAG / Gemini)
create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete cascade,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}',
  source text not null default 'ayilaa',
  created_at timestamptz not null default now()
);

create index if not exists kb_documents_place_id_idx on public.kb_documents (place_id);
create index if not exists kb_documents_fts
  on public.kb_documents using gin (to_tsvector('french', content));

alter table public.kb_documents enable row level security;

drop policy if exists "kb_documents_public_read" on public.kb_documents;
create policy "kb_documents_public_read"
  on public.kb_documents for select
  to anon, authenticated
  using (true);
