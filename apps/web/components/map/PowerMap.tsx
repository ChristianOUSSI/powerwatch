"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useZonesStore } from "@/store/zones";
import { useSocket } from "@/hooks/useSocket";
import { API_URL } from "@/lib/api";
import { ZonePopup } from "./ZonePopup";
import type { CityPublic, ZonePublic } from "@powerwatch/shared";

interface FreeReport {
  id: string;
  type: string;
  lat: number;
  lng: number;
  clusterId: string;
  createdAt: string;
  expiresAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  STABLE:   "zone-stable",
  UNSTABLE: "zone-unstable",
  OUTAGE:   "zone-outage",
  UNKNOWN:  "zone-unknown",
};

// Couleurs de secours pour les zones sans polygone (seed initial)
const STATUS_COLOR: Record<string, string> = {
  STABLE:   "#22c55e",
  UNSTABLE: "#f97316",
  OUTAGE:   "#ef4444",
  UNKNOWN:  "#52525b",
};

// Fonds de carte gratuits, sans clé API
const MAP_LAYERS = [
  {
    id: "dark",
    label: "Sombre",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, EPA, NPS &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 16,
  },
  {
    id: "plan",
    label: "Plan",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom: 19,
  },
] as const;

type MapLayerId = (typeof MAP_LAYERS)[number]["id"];

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
  const [loadError, setLoadError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [freeReports, setFreeReports] = useState<FreeReport[]>([]);
  const [mapLayer, setMapLayer] = useState<MapLayerId>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("pw_map_layer");
    return MAP_LAYERS.some((l) => l.id === saved) ? (saved as MapLayerId) : "dark";
  });
  const mapRef = useRef<L.Map | null>(null);

  function chooseLayer(id: MapLayerId) {
    setMapLayer(id);
    try { window.localStorage.setItem("pw_map_layer", id); } catch {}
  }

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
        // L'API peut renvoyer {error: ...} : ne jamais stocker autre chose
        // qu'un tableau, sinon zones.map plante tout le rendu.
        if (!Array.isArray(data)) throw new Error("Réponse invalide");
        setZones(data);
        setLoading(false);
        setLoadError(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadError(true);
      });
  }, [setZones]);

  // Charge les signalements libres pour la ville sélectionnée
  const loadFreeReports = useCallback((slug: string) => {
    fetch(`${API_URL}/api/free-reports?city=${slug}`)
      .then((r) => r.json())
      .then((data: FreeReport[]) => {
        if (Array.isArray(data)) {
          setFreeReports(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadZones(citySlug);
    loadFreeReports(citySlug);
  }, [citySlug, loadZones, loadFreeReports]);

  // Filet de sécurité : le socket peut tomber sur mobile, on recharge en silence
  useEffect(() => {
    const t = setInterval(() => {
      loadZones(citySlug, true);
      loadFreeReports(citySlug);
    }, 90_000);
    return () => clearInterval(t);
  }, [citySlug, loadZones, loadFreeReports]);

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
      {/* Sélecteur de ville, flottant en haut de la carte */}
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

      {/* Sélecteur de fond de carte, en haut à droite */}
      <div className="absolute top-11 right-3 z-[400] flex gap-1 bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-full p-1">
        {MAP_LAYERS.map((layer) => (
          <button
            key={layer.id}
            onClick={() => chooseLayer(layer.id)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition font-medium ${
              mapLayer === layer.id
                ? "bg-orange-500 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Erreur de chargement : pastille avec retry */}
      {loadError && !loading && (
        <button
          onClick={() => loadZones(citySlug)}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-red-950/90 border border-red-800 text-red-200 text-xs px-4 py-2 rounded-full backdrop-blur active:scale-95 transition"
        >
          Connexion impossible, toucher pour réessayer
        </button>
      )}

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
        className={`absolute bottom-24 right-3 z-[400] w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur transition ${
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
      <div className="absolute bottom-24 left-3 z-[400] bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl p-2 space-y-1">
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

      {/* isolate : piège les z-index internes de Leaflet (jusqu'à 1000)
          pour que légende, nav et FAB restent au-dessus de la carte */}
      <MapContainer
        center={currentCity.center}
        zoom={currentCity.zoom}
        className="h-full w-full isolate"
        zoomControl={false}
      >
        {/* Fonds de carte gratuits, sans clé API (CARTO en exige une) */}
        {(() => {
          const layer = MAP_LAYERS.find((l) => l.id === mapLayer) ?? MAP_LAYERS[0];
          return (
            <TileLayer
              key={layer.id}
              url={layer.url}
              attribution={layer.attribution}
              maxZoom={layer.maxZoom}
            />
          );
        })()}

        <FlyTo center={currentCity.center} zoom={currentCity.zoom} />
        <MapHandle onReady={(m) => { mapRef.current = m; }} />

        {userPos && (
          <CircleMarker
            center={userPos}
            radius={7}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.35, weight: 2 }}
          />
        )}

        {/* Signalements libres (points individuels) */}
        {freeReports.map((report) => {
          // Calculer le statut localement pour chaque signalement
          const status = report.type === "OUTAGE" ? "OUTAGE" : report.type === "MICRO_OUTAGE" ? "UNSTABLE" : "STABLE";
          const color = STATUS_COLOR[status] ?? "#52525b";

          return (
            <CircleMarker
              key={report.id}
              center={[report.lat, report.lng]}
              radius={6}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <p className="text-xs font-semibold mb-1">
                    {new Date(report.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className={
                    report.type === "OUTAGE" ? "text-red-400" :
                    report.type === "MICRO_OUTAGE" ? "text-orange-400" :
                    "text-green-400"
                  }>
                    {report.type === "OUTAGE" ? "🔴 Coupure" : report.type === "MICRO_OUTAGE" ? "🟠 Instable" : "🟢 Rétabli"}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {zones.map((zone) => {
          const status = zone.snapshot?.status ?? "UNKNOWN";
          const isSelected = zone.id === selectedZoneId;

          // Zones sans polygone : marqueur au centroïde
          if (!zone.polygon) {
            return (
              <CircleMarker
                key={`${zone.id}-${status}-${isSelected}`}
                center={[zone.centroidLat, zone.centroidLng]}
                radius={isSelected ? 12 : 9}
                pathOptions={{
                  color: STATUS_COLOR[status],
                  fillColor: STATUS_COLOR[status],
                  fillOpacity: isSelected ? 0.85 : 0.55,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => selectZone(zone.id) }}
              >
                <Popup>
                  <ZonePopup zone={zone} />
                </Popup>
              </CircleMarker>
            );
          }

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
