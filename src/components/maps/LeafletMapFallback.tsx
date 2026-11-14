'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { CAMEROON_CENTER, CAMEROON_DEFAULT_ZOOM } from '@/lib/google-maps';
import type { MapMarker } from '@/lib/types';

const pin = L.divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#D6A84F;border:2px solid #fff;box-shadow:0 2px 8px rgba(11,61,46,0.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const darkPin = L.divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#d4a24c;border:2px solid #f3ecdc;box-shadow:0 0 0 4px rgba(212,162,76,.25)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (!markers.length) {
      map.setView([CAMEROON_CENTER.lat, CAMEROON_CENTER.lng], CAMEROON_DEFAULT_ZOOM);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 12);
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.latitude, m.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, markers]);
  return null;
}

export function LeafletMapFallback({
  markers,
  className = 'h-80',
  dark = false,
  selectedId,
  onSelect,
}: {
  markers: MapMarker[];
  className?: string;
  dark?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const center: [number, number] = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [CAMEROON_CENTER.lat, CAMEROON_CENTER.lng];
  const zoom = markers.length === 1 ? 12 : CAMEROON_DEFAULT_ZOOM;
  const icon = dark ? darkPin : pin;
  const tiles = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = dark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div
      className={`relative z-0 isolate min-w-0 w-full overflow-hidden rounded-2xl border border-[var(--line)] ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="!h-full !w-full min-h-[inherit]"
        style={{ width: '100%', height: '100%', maxWidth: '100%' }}
      >
        <TileLayer attribution={attribution} url={tiles} />
        <FitMarkers markers={markers} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.latitude, m.longitude]}
            icon={icon}
            opacity={selectedId && selectedId !== m.id ? 0.45 : 1}
            eventHandlers={{
              click: () => onSelect?.(m.id),
            }}
          >
            <Popup>
              <strong>{m.name}</strong>
              {m.category ? <div>{m.category}</div> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
