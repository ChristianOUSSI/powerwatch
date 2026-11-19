"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSocket } from "@/hooks/useSocket";
import { API_URL } from "@/lib/api";
import { ElectricBar } from "@/components/ui/ElectricBar";
import type { CityPublic } from "@powerwatch/shared";

interface FreeReport {
  id: string;
  type: string;
  lat: number;
  lng: number;
  clusterId: string;
  createdAt: string;
  expiresAt: string;
}

interface CityItem {
  id?: string;
  slug: string;
  label: string;
  center: [number, number];
  zoom: number;
}

// Couleurs des signalements (mêmes codes que la légende)
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
const FALLBACK_CITIES: CityItem[] = [
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
  const [cities, setCities] = useState<CityItem[]>(FALLBACK_CITIES);
  const [citySlug, setCitySlug] = useState("douala");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [citiesPaused, setCitiesPaused] = useState(false);
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
              id: c.id,
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

  // Charge les signalements libres pour la ville sélectionnée
  const loadFreeReports = useCallback((slug: string) => {
    fetch(`${API_URL}/api/free-reports?city=${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((data: FreeReport[]) => {
        if (!Array.isArray(data)) throw new Error("Réponse invalide");
        setFreeReports(data);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadError(true);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    loadFreeReports(citySlug);
  }, [citySlug, loadFreeReports]);

  // Filet de sécurité : recharge silencieuse si le socket tombe
  useEffect(() => {
    const t = setInterval(() => loadFreeReports(citySlug), 90_000);
    return () => clearInterval(t);
  }, [citySlug, loadFreeReports]);

  // Si la ville par défaut n'existe pas dans la liste chargée, prendre la première
  useEffect(() => {
    if (cities.length > 0 && !cities.some((c) => c.slug === citySlug)) {
      setCitySlug(cities[0].slug);
    }
  }, [cities, citySlug]);

  function locateMe() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(latlng);
        setUserAccuracy(pos.coords.accuracy ?? null);
        mapRef.current?.flyTo(latlng, Math.max(mapRef.current.getZoom(), 17), { duration: 0.8 });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        // Message exact selon le code d'erreur GPS
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError("Localisation refusée : autorise la position dans les réglages du navigateur");
        } else if (err.code === err.TIMEOUT) {
          setLocateError("Localisation trop lente : réessaie à l'extérieur");
        } else {
          setLocateError("Position GPS indisponible pour le moment");
        }
      },
      // Haute précision + pas de cache : pointage exact sur la position réelle
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // Socket temps réel sur la ville sélectionnée
  useSocket(currentCity.id);

  return (
    <div className="relative h-full w-full">
      {/* Villes couvertes : défilement automatique, pause au toucher */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] w-[min(94vw,600px)] overflow-hidden bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-full"
        onPointerDown={() => setCitiesPaused(true)}
        onPointerUp={() => setCitiesPaused(false)}
        onPointerLeave={() => setCitiesPaused(false)}
      >
        <div
          className="flex w-max animate-marquee py-1.5"
          style={{
            animationDuration: `${Math.max(20, cities.length * 2)}s`,
            animationPlayState: citiesPaused ? "paused" : "running",
          }}
        >
          {/* Deux moitiés identiques pour une boucle sans couture */}
          {[0, 1].map((half) => (
            <div key={half} className="flex items-center gap-1.5 pr-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 px-2 shrink-0">
                Zones couvertes
              </span>
              {cities.map((city) => (
                <button
                  key={`${half}-${city.slug}`}
                  onClick={() => setCitySlug(city.slug)}
                  className={`text-[11px] px-3 py-1 rounded-full transition font-medium whitespace-nowrap ${
                    citySlug === city.slug
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {city.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* Fondus sur les bords */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-zinc-950/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-zinc-950/80 to-transparent" />
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
          onClick={() => { setLoading(true); loadFreeReports(citySlug); }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-red-950/90 border border-red-800 text-red-200 text-xs px-4 py-2 rounded-full backdrop-blur active:scale-95 transition"
        >
          Connexion impossible, toucher pour réessayer
        </button>
      )}

      {/* Erreur de localisation GPS */}
      {locateError && (
        <button
          onClick={() => setLocateError(null)}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-red-950/90 border border-red-800 text-red-200 text-xs px-4 py-2 rounded-full backdrop-blur active:scale-95 transition"
        >
          {locateError}
        </button>
      )}

      {/* Chargement des zones : simple barre électrique en haut, sans bloquer la carte */}
      {loading && (
        <div className="absolute top-0 inset-x-0 z-[300] px-2 pt-1 pointer-events-none">
          <ElectricBar />
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
            radius={9}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.4, weight: 2 }}
          >
            <Popup>
              <div className="p-1.5 text-xs">
                <p className="font-semibold text-zinc-200">Ta position exacte</p>
                <p className="text-zinc-500 font-mono">
                  {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                </p>
                {userAccuracy !== null && userAccuracy < 100 && (
                  <p className="text-zinc-600">Précision ~{Math.round(userAccuracy)} m</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
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

      </MapContainer>
    </div>
  );
}
