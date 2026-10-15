'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Hotel,
  MapPin,
  Plus,
  Sparkles,
  ExternalLink,
  Eye,
  Route,
} from 'lucide-react';

import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { CollapsibleSources } from '@/components/assistant/CollapsibleSources';
import { PlaceCard } from '@/components/places/PlaceCard';
import { TourismMap } from '@/components/maps/TourismMap';
import { Badge, Button } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { prepareAiMarkdown } from '@/lib/markdown/sanitize-ai-markdown';
import { resolvePlaceImage } from '@/lib/place-images';
import { addPlaceToTrip } from '@/lib/trip-store';
import {
  chatMarkersFromResponse,
  normalizeResponseType,
} from '@/lib/utils/response';
import type {
  ActionUI,
  BudgetUI,
  BookingUI,
  HotelUI,
  ImageUI,
  ItineraryUI,
  PlaceUI,
  SourceUI,
  StructuredChatUI,
  VisionUI,
} from '@/lib/types';

/**
 * Central structured renderer — driven by backend `response_type` + UI payloads.
 * Never invents places, prices, or coordinates.
 */
export function ResponseRenderer({
  text,
  ui,
}: {
  text: string;
  ui?: StructuredChatUI | null;
}) {
  const { t } = useLocale();
  const kind = normalizeResponseType(ui?.response_type);
  const places = ui?.places?.length ? ui.places : [];
  const hotels = ui?.hotels?.length ? ui.hotels : [];
  const markers = chatMarkersFromResponse(ui ?? {});
  const images = ui?.images?.length ? ui.images : [];
  // Place cards only for place-oriented answers (never for dishes or photos).
  const showPlaces =
    places.length > 0 &&
    (kind === 'PLACE_LIST' ||
      kind === 'PLACE_DETAILS' ||
      kind === 'NATURE' ||
      kind === 'ITINERARY' ||
      kind === 'BUDGET_TRIP' ||
      kind === 'TRAVEL_ROUTE');

  const prepared = prepareAiMarkdown(text || '');
  const mergedSources = mergeSources(ui?.ui_sources, prepared.sources);

  return (
    <div className="space-y-5">
      {prepared.markdown ? <MarkdownContent content={prepared.markdown} /> : null}

      {kind === 'INSUFFICIENT_INFORMATION' ? (
        <p className="rounded-xl bg-[var(--mint-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          {t('ui.insufficient')}
        </p>
      ) : null}

      {images.length > 0 ? <ImageGallery images={images} /> : null}

      {ui?.vision && (ui.vision.description || ui.vision.matched_place_id) ? (
        <VisionBlock vision={ui.vision} />
      ) : null}

      {kind === 'PLACE_DETAILS' && places[0] ? (
        <PlaceDetailsBlock place={places[0]} />
      ) : null}

      {showPlaces && !(kind === 'PLACE_DETAILS' && places.length === 1) ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--green-deep)]">
            📍 {t('ui.referencedPlaces')}
          </p>
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
            {places.map((p) => (
              <div
                key={p.id}
                className="w-[85%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]"
              >
                <PlaceCard site={p} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(kind === 'ITINERARY' || kind === 'BUDGET_TRIP') && ui?.itinerary ? (
        <ItineraryBlock itinerary={ui.itinerary} />
      ) : null}

      {(kind === 'BUDGET_TRIP' || kind === 'ITINERARY' || ui?.budget) &&
      ui?.budget ? (
        <BudgetBlock budget={ui.budget} />
      ) : null}

      {(kind === 'HOTEL' || hotels.length > 0) && hotels.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--green-deep)]">
            {t('ui.stays')}
          </p>
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
            {hotels.map((h) => (
              <div
                key={h.id}
                className="w-[85%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]"
              >
                <HotelBlock hotel={h} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {kind === 'BOOKING' && ui?.booking ? <BookingBlock booking={ui.booking} /> : null}

      {markers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--green-deep)]">
            {kind === 'TRAVEL_ROUTE' ? 'Trajet' : 'Carte'}
          </p>
          <TourismMap markers={markers} className="h-72" />
        </div>
      ) : null}

      {ui?.actions && ui.actions.length > 0 ? (
        <ActionsBlock actions={ui.actions} places={places} hotels={hotels} />
      ) : places.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              for (const p of places) {
                addPlaceToTrip({
                  id: p.id,
                  name: p.name,
                  city: p.city ?? undefined,
                  region: p.region ?? undefined,
                  category: p.category ?? undefined,
                  imageUrl: resolvePlaceImage(p),
                  latitude: p.latitude,
                  longitude: p.longitude,
                });
              }
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter à mon voyage
          </Button>
          <Button href="/mon-voyage" size="sm" variant="secondary">
            Voir mon voyage
          </Button>
        </div>
      ) : null}

      <CollapsibleSources sources={mergedSources} />
    </div>
  );
}

function mergeSources(
  uiSources: SourceUI[] | null | undefined,
  fromMarkdown: { title: string; url: string }[],
): SourceUI[] {
  const out: SourceUI[] = [];
  const seen = new Set<string>();
  const push = (s: SourceUI) => {
    const url = s.url?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    out.push({ ...s, url, type: s.type || 'WEB' });
  };
  for (const s of uiSources ?? []) push(s);
  for (const s of fromMarkdown) push({ title: s.title, url: s.url, type: 'WEB' });
  return out;
}

function ImageGallery({ images }: { images: ImageUI[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--green-deep)]">Photos trouvées en ligne</p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
        {images.map((img, i) => (
          <a
            key={`${img.image_url}-${i}`}
            href={img.page_url}
            target="_blank"
            rel="noreferrer"
            className="w-[70%] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--line)] bg-white sm:w-[40%] lg:w-[28%]"
          >
            <div className="relative aspect-[4/3] bg-[var(--mint-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.alt_text || img.title || img.source_domain || 'Photo'}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="flex items-center gap-1 truncate px-3 py-2 text-xs text-[var(--muted)]">
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              {img.source_domain || img.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function PlaceDetailsBlock({ place }: { place: PlaceUI }) {
  const { t } = useLocale();
  const image = resolvePlaceImage(place);
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[var(--green-deep)] to-[var(--green)]">
        {image ? (
          <Image src={image} alt={place.name} fill className="object-cover" unoptimized />
        ) : null}
      </div>
      <div className="space-y-3 p-5">
        <h3 className="font-display text-xl font-semibold text-[var(--green-deep)]">
          {place.name}
        </h3>
        <p className="flex items-center gap-1 text-sm text-[var(--muted)]">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {[place.city, place.region].filter(Boolean).join(', ') || 'Cameroun'}
        </p>
        <div className="flex flex-wrap gap-2">
          {place.category ? <Badge>{place.category}</Badge> : null}
          {typeof place.estimated_cost_xaf === 'number' ? (
            <Badge tone="gold">{place.estimated_cost_xaf} FCFA</Badge>
          ) : null}
        </div>
        {place.description ? (
          <p className="text-sm leading-relaxed text-[var(--ink)]">{place.description}</p>
        ) : null}
        <Button href={`/destinations/${encodeURIComponent(place.id)}`} size="sm">
          {t('place.discover')}
        </Button>
      </div>
    </article>
  );
}

function ItineraryBlock({ itinerary }: { itinerary: ItineraryUI }) {
  const { t } = useLocale();
  if (!itinerary.days?.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--green-deep)]">
        <Route className="h-5 w-5 text-[var(--gold)]" aria-hidden />
        {itinerary.title || t('ui.yourTrip')}
      </h3>
      <ul className="mt-4 space-y-3">
        {itinerary.days.map((d) => (
          <li
            key={d.day}
            className="rounded-xl border border-[var(--line)] bg-[var(--ivory)] px-4 py-3"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--gold)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Jour {d.day}
            </p>
            <ul className="mt-2 space-y-1.5">
              {(d.items ?? []).map((item, i) => (
                <li key={`${item.place_id ?? item.title}-${i}`} className="text-sm">
                  {item.place_id ? (
                    <Link
                      href={`/destinations/${encodeURIComponent(item.place_id)}`}
                      className="font-medium text-[var(--green-deep)] underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--green-deep)]">{item.title}</span>
                  )}
                  {item.time ? (
                    <span className="ml-2 text-[var(--muted)]">{item.time}</span>
                  ) : null}
                  {typeof item.duration_minutes === 'number' ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      · {item.duration_minutes} min
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetBlock({ budget }: { budget: BudgetUI }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-[var(--green-deep)]">
        Budget estimé
      </h3>
      {typeof budget.total_known === 'number' ? (
        <p className="mt-2 text-2xl font-bold text-[var(--green-deep)]">
          {budget.total_known.toLocaleString('fr-FR')} {budget.currency || 'XAF'}
          <span className="ml-2 text-xs font-medium text-[var(--muted)]">
            (montants connus uniquement)
          </span>
        </p>
      ) : null}
      {budget.items?.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {budget.items.map((l) => (
            <li key={l.label} className="flex justify-between gap-4">
              <span>
                {l.label}
                {l.status === 'INDICATIVE' ? (
                  <Badge tone="gold">Indicatif</Badge>
                ) : null}
              </span>
              <span className="font-medium">
                {typeof l.amount === 'number'
                  ? `${l.amount.toLocaleString('fr-FR')} ${budget.currency || 'XAF'}`
                  : 'Information non disponible'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function HotelBlock({ hotel }: { hotel: HotelUI }) {
  const image = resolvePlaceImage({
    id: hotel.id,
    name: hotel.name,
    image_url: hotel.image_url,
  });
  const priceLabel =
    hotel.price_status === 'UNKNOWN' || hotel.price == null
      ? null
      : `${hotel.price.toLocaleString('fr-FR')} XAF`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="relative h-36 bg-gradient-to-br from-[var(--green-deep)] to-[var(--green)]">
        {image ? (
          <Image src={image} alt={hotel.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Hotel className="h-8 w-8 text-white/70" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold text-[var(--green-deep)]">{hotel.name}</p>
        {hotel.location ? (
          <p className="flex items-center gap-1 text-sm text-[var(--muted)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {hotel.location}
          </p>
        ) : null}
        {priceLabel ? (
          <Badge tone="gold">
            {hotel.price_status === 'INDICATIVE' ? 'Indicatif · ' : ''}
            {priceLabel}
          </Badge>
        ) : (
          <Badge tone="muted">Tarif non disponible</Badge>
        )}
        {hotel.demo_booking ? (
          <p className="text-xs text-[var(--muted)]">Réservation de démonstration uniquement</p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button href={`/destinations/${encodeURIComponent(hotel.id)}`} size="sm" variant="secondary">
            Détails
          </Button>
          {hotel.demo_booking || hotel.booking_available ? (
            <Button
              href={`/booking?hotel=${encodeURIComponent(hotel.id)}`}
              size="sm"
              variant="outline"
            >
              Réserver (démo)
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingBlock({ booking }: { booking: BookingUI }) {
  return (
    <div className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 text-sm">
      <p className="font-semibold text-[var(--green-deep)]">
        {booking.demo ? 'Réservation de démonstration' : 'Réservation'}
      </p>
      <p className="mt-1 text-[var(--muted)]">
        {booking.message ||
          (booking.available
            ? 'Une réservation démo peut être initiée.'
            : 'Aucune réservation réelle n’est disponible pour le moment.')}
      </p>
    </div>
  );
}

function VisionBlock({ vision }: { vision: VisionUI }) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint-soft)]/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--green)]">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        {t('nav.vision')}
      </p>
      {vision.description ? (
        <div className="mt-2">
          <MarkdownContent content={vision.description} className="text-sm" />
        </div>
      ) : null}
      {vision.matched_place_id ? (
        <div className="mt-3">
          <Button
            href={`/destinations/${encodeURIComponent(vision.matched_place_id)}`}
            size="sm"
            variant="secondary"
          >
            {t('ui.discoverPlace')}
          </Button>
        </div>
      ) : null}
      {typeof vision.confidence === 'number' ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {t('ui.confidence', { n: Math.round(vision.confidence * 100) })}
        </p>
      ) : null}
    </div>
  );
}

function ActionsBlock({
  actions,
  places,
  hotels,
}: {
  actions: ActionUI[];
  places: PlaceUI[];
  hotels: HotelUI[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const placeById = new Map(places.map((p) => [p.id, p]));
  const hotelById = new Map(hotels.map((h) => [h.id, h]));

  // Deduplicate by type+target for cleaner UI
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    const key = `${a.type}:${a.target_id ?? a.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="flex flex-wrap gap-2">
      {unique.map((action, i) => {
        const key = `${action.type}-${action.target_id ?? i}`;
        if (action.type === 'VIEW_PLACE' && action.target_id) {
          return (
            <Button
              key={key}
              href={`/destinations/${encodeURIComponent(action.target_id)}`}
              size="sm"
              variant="secondary"
            >
              {action.label || t('place.discover')}
            </Button>
          );
        }
        if (action.type === 'ADD_TO_TRIP' && action.target_id) {
          const place = placeById.get(action.target_id);
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (place) {
                  addPlaceToTrip({
                    id: place.id,
                    name: place.name,
                    city: place.city ?? undefined,
                    region: place.region ?? undefined,
                    category: place.category ?? undefined,
                    imageUrl: resolvePlaceImage(place),
                    latitude: place.latitude,
                    longitude: place.longitude,
                  });
                }
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {action.label || t('ui.addTrip')}
            </Button>
          );
        }
        if (action.type === 'PLAN_TRIP') {
          return (
            <Button key={key} href="/planifier" size="sm" variant="outline">
              {action.label || t('nav.planifier')}
            </Button>
          );
        }
        if (action.type === 'BOOK_HOTEL') {
          const hid = action.target_id || hotels[0]?.id;
          return (
            <Button
              key={key}
              href={hid ? `/booking?hotel=${encodeURIComponent(hid)}` : '/hotels'}
              size="sm"
              variant="outline"
            >
              {action.label || t('ui.bookDemo')}
            </Button>
          );
        }
        if (action.type === 'ASK_AI') {
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push('/assistant')}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {action.label || t('trip.ask')}
            </Button>
          );
        }
        if (action.type === 'VIEW_MAP') {
          return (
            <Button key={key} href="/explorer" size="sm" variant="outline">
              {action.label || t('ui.viewMap')}
            </Button>
          );
        }
        if (action.type === 'VIEW_SOURCE' && action.target_id) {
          return (
            <a
              key={key}
              href={action.target_id}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {action.label || 'Source'}
            </a>
          );
        }
        void hotelById;
        return null;
      })}
    </div>
  );
}

/** Legacy BudgetCard used by planner page */
export function BudgetCard({
  lines,
}: {
  lines: { label: string; amount: string | null }[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-[var(--green-deep)]">
        Budget estimatif
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-4">
            <span>{l.label}</span>
            <span className="font-medium">{l.amount ?? 'Information non disponible'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
        Seuls les montants fournis par le backend sont affichés.
      </p>
    </div>
  );
}

export function ItineraryCard({
  itinerary,
}: {
  itinerary?: ItineraryUI | null;
  fallbackText?: string | null;
}) {
  if (!itinerary) return null;
  return <ItineraryBlock itinerary={itinerary} />;
}
