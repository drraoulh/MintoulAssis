"use client";

import Image from "next/image";
import Link from "next/link";
import type { PlaceWithImage } from "@/lib/supabase/types";
import { safeImageUrl } from "@/lib/images";

function formatPrice(place: PlaceWithImage) {
  if (place.price_from == null) return null;
  return `dès ${Number(place.price_from).toLocaleString("fr-FR")} ${place.currency || "XAF"}`;
}

export function PlaceCard({
  place,
  active,
  onSelect,
}: {
  place: PlaceWithImage;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  const price = formatPrice(place);
  const imageUrl = safeImageUrl(place.image_url);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(place.id)}
      className={`group w-full overflow-hidden rounded-2xl border text-left transition ${
        active
          ? "border-[var(--accent)] bg-[rgba(212,162,76,0.08)]"
          : "border-[var(--line)] bg-[rgba(22,36,28,0.72)] hover:border-[rgba(212,162,76,0.45)]"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-elevated)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={place.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width:768px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Cameroun
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight">
            {place.name}
          </h3>
          {place.rating != null ? (
            <span className="shrink-0 rounded-full bg-[rgba(212,162,76,0.15)] px-2 py-0.5 text-xs text-[var(--accent-soft)]">
              {place.rating}/5
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {[place.neighborhood, place.city].filter(Boolean).join(" · ") || "Cameroun"}
        </p>
        {place.short_description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-[#d8d2c4]">
            {place.short_description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--muted)]">
          {price ? <span>{price}</span> : null}
          <Link
            href={`/lieux/${place.slug}`}
            className="ml-auto text-[var(--accent-soft)] underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Voir
          </Link>
        </div>
      </div>
    </button>
  );
}
