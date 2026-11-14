'use client';

import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState } from 'react';

import { LeafletMapFallback } from '@/components/maps/LeafletMapFallback';
import {
  CAMEROON_CENTER,
  CAMEROON_DEFAULT_ZOOM,
  GOOGLE_MAPS_DARK_STYLE,
  getGoogleMapsApiKey,
} from '@/lib/google-maps';
import { useLocale } from '@/lib/i18n';
import type { PlaceWithImage } from '@/lib/supabase/types';
import type { MapMarker } from '@/lib/types';

function FitBounds({ places }: { places: PlaceWithImage[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const pts = places.filter(
      (p): p is PlaceWithImage & { lat: number; lng: number } =>
        p.lat != null && p.lng != null,
    );
    if (!pts.length) {
      map.setCenter(CAMEROON_CENTER);
      map.setZoom(CAMEROON_DEFAULT_ZOOM);
      return;
    }
    if (pts.length === 1) {
      map.setCenter({ lat: pts[0].lat, lng: pts[0].lng });
      map.setZoom(12);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 40);
  }, [map, places]);

  return null;
}

export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceWithImage[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const apiKey = getGoogleMapsApiKey();
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(selectedId ?? null);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (selectedId) setActiveId(selectedId);
  }, [selectedId]);

  const withCoords = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null),
    [places],
  );

  const leafletMarkers = useMemo<MapMarker[]>(
    () =>
      withCoords.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.lat!,
        longitude: p.lng!,
        category: [p.neighborhood, p.city].filter(Boolean).join(' · ') || undefined,
      })),
    [withCoords],
  );

  const active = withCoords.find((p) => p.id === activeId) ?? null;

  if (!ready) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] text-sm text-[var(--muted)]">
        {t('map.loading')}
      </div>
    );
  }

  if (!apiKey) {
    return (
      <LeafletMapFallback
        markers={leafletMarkers}
        className="h-full min-h-[320px]"
        dark
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div className="h-full min-h-[320px] overflow-hidden rounded-2xl border border-[var(--line)]">
      <APIProvider apiKey={apiKey} language={locale === 'fr' ? 'fr' : 'en'} region="CM">
        <Map
          defaultCenter={CAMEROON_CENTER}
          defaultZoom={CAMEROON_DEFAULT_ZOOM}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl
          styles={GOOGLE_MAPS_DARK_STYLE as google.maps.MapTypeStyle[]}
          style={{ width: '100%', height: '100%' }}
          className="h-full w-full"
        >
          <FitBounds places={withCoords} />
          {withCoords.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat!, lng: place.lng! }}
              title={place.name}
              opacity={selectedId && selectedId !== place.id ? 0.45 : 1}
              onClick={() => {
                setActiveId(place.id);
                onSelect?.(place.id);
              }}
            />
          ))}
          {active && active.lat != null && active.lng != null ? (
            <InfoWindow
              position={{ lat: active.lat, lng: active.lng }}
              onCloseClick={() => setActiveId(null)}
            >
              <div className="max-w-[220px] text-sm text-black">
                <strong>{active.name}</strong>
                <br />
                {[active.neighborhood, active.city].filter(Boolean).join(' · ')}
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}
