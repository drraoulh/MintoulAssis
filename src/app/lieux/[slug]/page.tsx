import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { safeImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: place } = await supabase
    .from("places")
    .select(
      "id, name, slug, city, neighborhood, short_description, description, phone, price_from, currency, rating, review_count, likes_count, cuisines, tags, source_url, lat, lng, place_images(url, alt)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!place) notFound();

  const images = (place.place_images ?? [])
    .map((img: { url: string; alt: string | null }) => ({
      ...img,
      url: safeImageUrl(img.url) || img.url,
    }))
    .filter((img: { url: string }) => !!img.url);
  const hero = images[0]?.url;

  return (
    <main className="mx-auto min-h-full w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
      <Link href="/decouvrir" className="text-sm text-[var(--accent-soft)] hover:underline">
        ← Retour à la découverte
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--line)]">
        <div className="relative aspect-[21/9] bg-[var(--bg-elevated)]">
          {hero ? (
            <Image src={hero} alt={place.name} fill className="object-cover" priority sizes="100vw" />
          ) : null}
        </div>
      </div>

      <header className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.25em] uppercase text-[var(--accent)]">
          {[place.neighborhood, place.city].filter(Boolean).join(" · ") || "Cameroun"}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl">
          {place.name}
        </h1>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
          {place.rating != null ? <span>Note {place.rating}/5</span> : null}
          {place.likes_count != null ? <span>{place.likes_count} likes</span> : null}
          {place.price_from != null ? (
            <span>
              Dès {Number(place.price_from).toLocaleString("fr-FR")} {place.currency || "XAF"}
            </span>
          ) : null}
          {place.phone ? <span>{place.phone}</span> : null}
        </div>
      </header>

      {place.cuisines?.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {place.cuisines.map((c: string) => (
            <span
              key={c}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}

      <article className="prose prose-invert mt-8 max-w-none">
        <p className="text-base leading-8 text-[#ddd4c4] whitespace-pre-wrap">
          {place.description || place.short_description || "Description à venir."}
        </p>
      </article>

      {images.length > 1 ? (
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.slice(1, 7).map((img: { url: string; alt: string | null }, i: number) => (
            <div key={`${img.url}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src={img.url} alt={img.alt || place.name} fill className="object-cover" sizes="33vw" />
            </div>
          ))}
        </div>
      ) : null}

      {place.source_url ? (
        <p className="mt-10 text-sm text-[var(--muted)]">
          Source :{" "}
          <a href={place.source_url} target="_blank" rel="noreferrer" className="text-[var(--accent-soft)]">
            Ayilaa
          </a>
        </p>
      ) : null}
    </main>
  );
}
