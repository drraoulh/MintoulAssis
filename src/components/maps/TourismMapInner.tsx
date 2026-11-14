'use client';

import { APIProvider, InfoWindow, Map, Marker } from '@vis.gl/react-google-maps';
import { useMemo, useState } from 'react';

import { LeafletMapFallback } from '@/components/maps/LeafletMapFallback';
import {
  CAMEROON_CENTER,
  CAMEROON_DEFAULT_ZOOM,
  getGoogleMapsApiKey,
} from '@/lib/google-maps';
import { useLocale } from '@/lib/i18n';
import type { MapMarker } from '@/lib/types';

export function TourismMapInner({
  markers,
  className = 'h-80',
}: {
  markers: MapMarker[];
  className?: string;
}) {
  const { t, locale } = useLocale();
  const apiKey = getGoogleMapsApiKey();
  const [activeId, setActiveId] = useState<string | null>(null);

  const center = useMemo(() => {
    if (!markers.length) return CAMEROON_CENTER;
    if (markers.length === 1) {
      return { lat: markers[0].latitude, lng: markers[0].longitude };
    }
    const lat =
      markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length;
    const lng =
      markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length;
    return { lat, lng };
  }, [markers]);

  const zoom = markers.length === 1 ? 12 : markers.length ? 7 : CAMEROON_DEFAULT_ZOOM;
  const active = markers.find((m) => m.id === activeId) ?? null;

  if (!markers.length) {
    return (
      <div
        className={`flex min-w-0 w-full items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-4 text-center text-sm text-[var(--muted)] ${className}`}
      >
        {t('map.empty')}
      </div>
    );
  }

  if (!apiKey) {
    return <LeafletMapFallback markers={markers} className={className} />;
  }

  return (
    <div
      className={`relative z-0 isolate min-w-0 w-full overflow-hidden rounded-2xl border border-[var(--line)] ${className}`}
    >
      <APIProvider apiKey={apiKey} language={locale === 'fr' ? 'fr' : 'en'} region="CM">
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl
          style={{ width: '100%', height: '100%' }}
          className="!h-full !w-full min-h-[inherit]"
        >
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={{ lat: m.latitude, lng: m.longitude }}
              title={m.name}
              onClick={() => setActiveId(m.id)}
            />
          ))}
          {active ? (
            <InfoWindow
              position={{ lat: active.latitude, lng: active.longitude }}
              onCloseClick={() => setActiveId(null)}
            >
              <div className="max-w-[200px] text-sm text-black">
                <strong>{active.name}</strong>
                {active.category ? <div>{active.category}</div> : null}
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}
