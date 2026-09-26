"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { PlaceCard } from "@/components/PlaceCard";
import { GuideChat } from "@/components/GuideChat";
import type { PlaceWithImage } from "@/lib/supabase/types";

const PlacesMap = dynamic(
  () => import("@/components/PlacesMap").then((m) => m.PlacesMap),
  { ssr: false },
);

export function DiscoverClient({
  initialPlaces,
  cities,
  totalPlaces,
}: {
  initialPlaces: PlaceWithImage[];
  cities: string[];
  totalPlaces: number;
}) {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialPlaces.filter((place) => {
      if (city && place.city?.toLowerCase() !== city.toLowerCase()) return false;
      if (!query) return true;
      const hay = `${place.name} ${place.city} ${place.neighborhood} ${place.short_description}`.toLowerCase();
      return hay.includes(query);
    });
  }, [initialPlaces, city, q]);

  const mapPlaces = useMemo(
    () => filtered.filter((p) => p.lat != null && p.lng != null),
    [filtered],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.28em] uppercase text-[var(--accent)]">
            MINTOUL · Découverte
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
            Explore le Cameroun
          </h1>
          <p className="mt-3 max-w-xl text-[var(--muted)]">
            {totalPlaces.toLocaleString("fr-FR")} lieux en base — filtre, carte et guide
            intelligent pour trouver où aller.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un lieu…"
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-[rgba(22,36,28,0.8)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[rgba(22,36,28,0.8)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="h-[420px] lg:h-[560px]">
          <PlacesMap places={mapPlaces} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <GuideChat />
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Lieux</h2>
          <p className="text-sm text-[var(--muted)]">{filtered.length} résultats</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              active={selectedId === place.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
        {!filtered.length ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Aucun lieu pour ce filtre. Élargis la recherche.
          </p>
        ) : null}
      </section>
    </div>
  );
}
