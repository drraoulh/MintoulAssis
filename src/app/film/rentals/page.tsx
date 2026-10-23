'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  CarFront,
  ChevronRight,
  KeyRound,
  LayoutGrid,
  PartyPopper,
  Phone,
  Sailboat,
  Search,
  Store,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

import { PlaceContactCard } from '@/components/film/PlaceContactCard';
import { TourismMap } from '@/components/maps/TourismMap';
import { OSM_ATTRIBUTION } from '@/lib/film/osm-locations';
import { RENTAL_CATEGORIES, RENTAL_SHOPS, filterRentals } from '@/lib/film/rentals';
import type { RentalCategory, RentalShop } from '@/lib/film/types';
import { useLocale } from '@/lib/i18n';
import { REGIONS } from '@/lib/regions';
import type { MapMarker } from '@/lib/types';

const CATEGORY_ICONS: Record<RentalCategory, LucideIcon> = {
  vehicle: CarFront,
  'two-wheel': Bike,
  boat: Sailboat,
  equipment: Wrench,
  event: PartyPopper,
};

function regionLabel(id: string | undefined, fr: boolean) {
  const r = REGIONS.find((x) => x.id === id);
  return r ? (fr ? r.nameFr : r.nameEn) : '';
}

export default function FilmRentalsPage() {
  const { locale } = useLocale();
  const fr = locale === 'fr';
  const [category, setCategory] = useState<RentalCategory | 'all'>('all');
  const [regionId, setRegionId] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<RentalShop | null>(null);

  const shops = useMemo(() => filterRentals({ category, regionId, q }), [category, regionId, q]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: RENTAL_SHOPS.length };
    for (const s of RENTAL_SHOPS) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, []);
  const markers: MapMarker[] = useMemo(
    () => shops.map((s) => ({ id: s.id, name: s.name, latitude: s.lat, longitude: s.lon, category: s.category })),
    [shops],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {fr ? 'Location' : 'Rentals'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {fr ? 'Location de véhicules & matériel' : 'Vehicle & equipment rental'}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">
          {fr
            ? 'Voitures, 4x4, motos, bateaux, matériel et équipement événementiel : les boutiques et agences de location au Cameroun, avec leurs coordonnées et leur position exacte.'
            : 'Cars, 4x4s, motorbikes, boats, gear and event equipment: rental shops and agencies across Cameroon, with contact details and exact location.'}
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={fr ? 'Catégories' : 'Categories'}>
        {([{ id: 'all', fr: 'Tout', en: 'All' }, ...RENTAL_CATEGORIES] as const).map((c) => {
          const Icon = c.id === 'all' ? LayoutGrid : CATEGORY_ICONS[c.id];
          const n = counts[c.id] ?? 0;
          if (c.id !== 'all' && n === 0) return null;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? 'border-[#F5E80C] bg-[#F5E80C] text-black'
                  : 'border-white/15 text-white/70 hover:border-[#F5E80C]/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {fr ? c.fr : c.en}
              <span className={active ? 'text-black/60' : 'text-white/35'}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:p-4">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={fr ? 'Nom, ville, quartier…' : 'Name, city, district…'}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35 focus:border-[#F5E80C]/50"
          />
        </label>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
          aria-label={fr ? 'Région' : 'Region'}
        >
          <option value="all">{fr ? 'Toutes les régions' : 'All regions'}</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {fr ? r.nameFr : r.nameEn}
            </option>
          ))}
        </select>
      </div>

      {markers.length ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <TourismMap markers={markers} className="h-64 sm:h-80" />
        </div>
      ) : null}

      <p className="mt-6 text-sm text-white/45">
        {fr ? `${shops.length} boutique(s) / agence(s)` : `${shops.length} shop(s) / agency(ies)`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((s) => {
          const Icon = CATEGORY_ICONS[s.category];
          const cat = RENTAL_CATEGORIES.find((c) => c.id === s.category);
          const place = [s.city, regionLabel(s.regionId, fr)].filter(Boolean).join(' · ');
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#F5E80C]/40 hover:bg-white/[0.06]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E30D13]/25 text-[#F5E80C]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold text-[#F8F5ED]">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-[#F5E80C]/85">
                  {fr ? cat?.fr : cat?.en}
                </span>
                <span className="mt-1 block truncate text-xs text-white/50">{place || '—'}</span>
                {s.phone ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/60">
                    <Phone className="h-3 w-3" aria-hidden />
                    {s.phone}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/30 group-hover:text-[#F5E80C]" aria-hidden />
            </button>
          );
        })}
      </div>

      {shops.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/50">
          {fr ? 'Aucune boutique ne correspond à ces filtres.' : 'No shop matches these filters.'}
        </p>
      ) : null}

      <section className="mt-10 grid gap-3 rounded-2xl border border-[#F5E80C]/25 bg-[#F5E80C]/[0.06] p-5 sm:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[#F8F5ED]">
            <KeyRound className="h-5 w-5 text-[#F5E80C]" aria-hidden />
            {fr ? 'Avant de louer' : 'Before you rent'}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            {(fr
              ? [
                  'Demandez un devis écrit : tarif jour / semaine, kilométrage, carburant.',
                  'Vérifiez assurance, caution et état des lieux (photos au départ et au retour).',
                  'Véhicules : chauffeur inclus ou non, permis et pièces exigés.',
                  'Prévoyez une marge pour les pistes en saison des pluies (4x4).',
                ]
              : [
                  'Ask for a written quote: day / week rate, mileage, fuel.',
                  'Check insurance, deposit and condition report (photos at pick-up and return).',
                  'Vehicles: driver included or not, licence and documents required.',
                  'Allow extra time on dirt roads in the rainy season (4x4).',
                ]
            ).map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5E80C]" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <p className="text-sm text-white/65">
            {fr
              ? 'Caméras, lumière, son, drones et studios : consultez aussi le catalogue matériel de tournage.'
              : 'Cameras, lighting, sound, drones and studios: see the filming gear catalogue too.'}
          </p>
          <Link
            href="/film/equipment"
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#E30D13] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#B80A0F]"
          >
            <Store className="h-4 w-4" aria-hidden />
            {fr ? 'Matériel & studios' : 'Gear & studios'}
          </Link>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-white/35">
        {fr
          ? `Annuaire SmartMboa (coordonnées vérifiées en ligne, oct. 2026) et ${OSM_ATTRIBUTION}`
          : `SmartMboa directory (details verified online, Oct 2026) and ${OSM_ATTRIBUTION}`}
      </p>

      {selected ? <RentalModal shop={selected} fr={fr} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function RentalModal({ shop, fr, onClose }: { shop: RentalShop; fr: boolean; onClose: () => void }) {
  const Icon = CATEGORY_ICONS[shop.category];
  const cat = RENTAL_CATEGORIES.find((c) => c.id === shop.category);
  const region = regionLabel(shop.regionId, fr);
  const description = (fr ? shop.descriptionFr : shop.descriptionEn) ?? shop.description;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-labelledby="rental-title">
      <button type="button" className="absolute inset-0 bg-black/75" aria-label={fr ? 'Fermer' : 'Close'} onClick={onClose} />
      <div className="relative flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#111] shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E30D13]/25 text-[#F5E80C]">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="rental-title" className="font-display text-xl font-bold text-[#F8F5ED]">
              {shop.name}
            </h2>
            <p className="text-xs font-semibold text-[#F5E80C]/85">
              {fr ? cat?.fr : cat?.en}
              {shop.brand && shop.brand !== shop.name ? ` · ${shop.brand}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-white/50">
              {[shop.city, region, fr ? 'Cameroun' : 'Cameroon'].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label={fr ? 'Fermer' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <TourismMap
              markers={[{ id: shop.id, name: shop.name, latitude: shop.lat, longitude: shop.lon }]}
              className="h-52"
            />
          </div>
          {description ? <p className="text-sm leading-relaxed text-white/75">{description}</p> : null}
          <PlaceContactCard contact={shop} city={shop.city} latitude={shop.lat} longitude={shop.lon} />
          {shop.approximate ? (
            <p className="text-[11px] text-[#F5E80C]/70">
              {fr
                ? 'Position approximative (quartier / rue) — appelez la boutique pour l’adresse exacte.'
                : 'Approximate position (district / street) — call the shop for the exact address.'}
            </p>
          ) : null}
          <p className="text-[11px] text-white/40">
            {fr
              ? 'Tarifs, disponibilités et conditions à confirmer directement auprès de la boutique.'
              : 'Confirm rates, availability and terms directly with the shop.'}
          </p>
        </div>
      </div>
    </div>
  );
}
