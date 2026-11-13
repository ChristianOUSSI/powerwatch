"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useZonesStore } from "@/store/zones";
import { useSocket } from "@/hooks/useSocket";
import { ZonePopup } from "./ZonePopup";
import type { CityPublic, ZonePublic } from "@powerwatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STATUS_CLASS: Record<string, string> = {
  STABLE:   "zone-stable",
  UNSTABLE: "zone-unstable",
  OUTAGE:   "zone-outage",
  UNKNOWN:  "zone-unknown",
};

// Repli si l'API villes est injoignable
const FALLBACK_CITIES: { slug: string; label: string; center: [number, number]; zoom: number }[] = [
  { slug: "douala",    label: "Douala",    center: [4.0511, 9.7679],   zoom: 13 },
  { slug: "yaounde",   label: "Yaoundé",   center: [3.8480, 11.5021],  zoom: 13 },
  { slug: "bafoussam", label: "Bafoussam", center: [5.4777, 10.4192],  zoom: 14 },
];

// Composant interne pour changer la vue de la carte
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

// Expose l'instance Leaflet à un composant parent (pour le bouton "ma position")
function MapHandle({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export default function PowerMap() {
  const { zones, setZones, selectZone, selectedZoneId } = useZonesStore();
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [citySlug, setCitySlug] = useState("douala");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Charge les villes depuis l'API (fallback sur la liste locale)
  useEffect(() => {
    fetch(`${API_URL}/api/cities`)
      .then((r) => r.json())
      .then((data: CityPublic[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCities(
            data.map((c) => ({
              slug: c.slug,
              label: c.name,
              center: [c.lat, c.lng] as [number, number],
              zoom: 13,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const currentCity = cities.find((c) => c.slug === citySlug) ?? cities[0] ?? FALLBACK_CITIES[0];

  const loadZones = useCallback((slug: string, silent = false) => {
    if (!silent) setLoading(true);
    fetch(`${API_URL}/api/zones?city=${slug}`)
      .then((r) => r.json())
      .then((data: ZonePublic[]) => {
        setZones(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [setZones]);

  useEffect(() => { loadZones(citySlug); }, [citySlug, loadZones]);

  // Filet de sécurité : le socket peut tomber sur mobile, on recharge en silence
  useEffect(() => {
    const t = setInterval(() => loadZones(citySlug, true), 90_000);
    return () => clearInterval(t);
  }, [citySlug, loadZones]);

  // Si la ville par défaut n'existe pas dans la liste chargée, prendre la première
  useEffect(() => {
    if (cities.length > 0 && !cities.some((c) => c.slug === citySlug)) {
      setCitySlug(cities[0].slug);
    }
  }, [cities, citySlug]);

  function locateMe() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(latlng);
        mapRef.current?.flyTo(latlng, Math.max(mapRef.current.getZoom(), 15), { duration: 0.8 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Socket temps réel sur la première zone pour récupérer le cityId
  const cityId = zones[0]?.cityId;
  useSocket(cityId);

  return (
    <div className="relative h-full w-full">
      {/* Sélecteur de ville — flottant en haut de la carte */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] flex gap-1 bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-full p-1">
        {cities.map((city) => (
          <button
            key={city.slug}
            onClick={() => setCitySlug(city.slug)}
            className={`text-xs px-3 py-1 rounded-full transition font-medium ${
              citySlug === city.slug
                ? "bg-orange-500 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {city.label}
          </button>
        ))}
      </div>

      {/* Indicateur de chargement */}
      {loading && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
            </svg>
            Chargement des zones…
          </div>
        </div>
      )}

      {/* Bouton ma position */}
      <button
        onClick={locateMe}
        aria-label="Ma position"
        className={`absolute bottom-20 right-3 z-[400] w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur transition ${
          locating
            ? "bg-orange-500 border-orange-400 text-white animate-pulse"
            : "bg-zinc-950/80 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
        }`}
      >
        {locating ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        )}
      </button>

      {/* Légende */}
      <div className="absolute bottom-20 left-3 z-[400] bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl p-2 space-y-1">
        {[
          { cls: "bg-green-500", label: "Courant" },
          { cls: "bg-orange-500", label: "Instable" },
          { cls: "bg-red-500",   label: "Coupure" },
          { cls: "bg-zinc-600",  label: "Inconnu" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.cls} opacity-70`} />
            <span className="text-[10px] text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>

      <MapContainer
        center={currentCity.center}
        zoom={currentCity.zoom}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <FlyTo center={currentCity.center} zoom={currentCity.zoom} />
        <MapHandle onReady={(m) => { mapRef.current = m; }} />

        {userPos && (
          <CircleMarker
            center={userPos}
            radius={7}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.35, weight: 2 }}
          />
        )}

        {zones.map((zone) => {
          if (!zone.polygon) return null;
          const status = zone.snapshot?.status ?? "UNKNOWN";
          const isSelected = zone.id === selectedZoneId;
          return (
            <GeoJSON
              key={`${zone.id}-${status}-${isSelected}`}
              data={zone.polygon as GeoJSON.GeoJsonObject}
              style={{
                className: STATUS_CLASS[status],
                ...(isSelected ? { weight: 3, fillOpacity: 0.6 } : {}),
              }}
              eventHandlers={{ click: () => selectZone(zone.id) }}
            >
              <Popup>
                <ZonePopup zone={zone} />
              </Popup>
            </GeoJSON>
          );
        })}
      </MapContainer>
    </div>
  );
}
