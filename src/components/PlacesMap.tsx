"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PlaceWithImage } from "@/lib/supabase/types";

const markerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#d4a24c;border:2px solid #f3ecdc;box-shadow:0 0 0 4px rgba(212,162,76,.25)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ places }: { places: PlaceWithImage[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = places.filter((p) => p.lat != null && p.lng != null) as Array<
      PlaceWithImage & { lat: number; lng: number }
    >;
    if (!pts.length) {
      map.setView([5.5, 12.5], 6);
      return;
    }
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
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
  const withCoords = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null),
    [places],
  );

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] text-sm text-[var(--muted)]">
        Chargement de la carte…
      </div>
    );
  }

  return (
    <div className="h-full min-h-[320px] overflow-hidden rounded-2xl border border-[var(--line)]">
      <MapContainer
        center={[5.5, 12.5]}
        zoom={6}
        className="h-full w-full [&_.leaflet-tile-pane]:saturate-[.85] [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds places={withCoords} />
        {withCoords.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={markerIcon}
            eventHandlers={{
              click: () => onSelect?.(place.id),
            }}
            opacity={selectedId && selectedId !== place.id ? 0.45 : 1}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {[place.neighborhood, place.city].filter(Boolean).join(" · ")}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
