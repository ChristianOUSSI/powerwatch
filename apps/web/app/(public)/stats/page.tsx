"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { ZonePublic } from "@powerwatch/shared";

const FALLBACK_CITIES = [
  { slug: "douala",    label: "Douala" },
  { slug: "yaounde",  label: "Yaoundé" },
  { slug: "bafoussam",label: "Bafoussam" },
];

interface HistoryPoint {
  status: string;
  outageScore: number;
  outageSince: string | null;
  computedAt: string;
}

function sinceText(date: string): string {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  const m = Math.floor(((Date.now() - new Date(date).getTime()) % 3600000) / 60000);
  if (h >= 1) return `${h}h${m > 0 ? m + "min" : ""}`;
  return `${m}min`;
}

export default function StatsPage() {
  const [zones, setZones] = useState<ZonePublic[]>([]);
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [city, setCity] = useState("douala");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"outage" | "stable">("outage");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [histLoading, setHistLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState(false);

  // Villes depuis l'API
  useEffect(() => {
    fetch(`${API_URL}/api/cities`)
      .then((r) => r.json())
      .then((data: { slug: string; name: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCities(data.map((c) => ({ slug: c.slug, label: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Si la ville courante n'existe plus, prendre la première
  useEffect(() => {
    if (cities.length > 0 && !cities.some((c) => c.slug === city)) {
      setCity(cities[0].slug);
    }
  }, [cities, city]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_URL}/api/zones?city=${city}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Réponse invalide");
        setZones(data);
        setLoading(false);
        setUpdatedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [city]);

  useEffect(() => { load(); }, [load]);

  const stableZones  = zones.filter((z) => z.snapshot?.status === "STABLE");
  const problemCount = zones.filter(
    (z) => z.snapshot?.status === "OUTAGE" || z.snapshot?.status === "UNSTABLE"
  ).length;
  const totalReports = zones.reduce((s, z) => s + (z.snapshot?.activeReports ?? 0), 0);

  async function toggleHistory(zoneId: string) {
    if (expandedId === zoneId) { setExpandedId(null); return; }
    setExpandedId(zoneId);
    if (history[zoneId]) return;
    setHistLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/zones/${zoneId}/history?days=7`);
      if (res.ok) {
        const data: HistoryPoint[] = await res.json();
        setHistory((h) => ({ ...h, [zoneId]: Array.isArray(data) ? data : [] }));
      }
    } catch {
      // historique indisponible, on affiche l'état vide
    } finally {
      setHistLoading(false);
    }
  }

  const displayZones = tab === "outage"
    ? zones.filter((z) => z.snapshot?.status === "OUTAGE" || z.snapshot?.status === "UNSTABLE")
        .sort((a, b) => (b.snapshot?.outageScore ?? 0) - (a.snapshot?.outageScore ?? 0))
    : zones.filter((z) => z.snapshot?.status === "STABLE")
        .sort((a, b) => (a.name > b.name ? 1 : -1));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base text-zinc-100">Statistiques réseau</h1>
            <p className="text-xs text-zinc-500">Mise à jour en temps réel</p>
          </div>
          <ThemeToggle />
        </div>
        {/* Sélecteur ville */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
          {cities.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCity(c.slug)}
              className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap transition font-medium ${
                city === c.slug
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Résumé en langage clair */}
        {!loading && zones.length > 0 && (
          <p className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 leading-relaxed">
            <span className="font-semibold text-zinc-200">
              {cities.find((c) => c.slug === city)?.label ?? city}
            </span>
            {" : "}
            {problemCount === 0
              ? "aucun problème signalé"
              : `${problemCount} quartier${problemCount > 1 ? "x" : ""} en difficulté`}
            {" sur "}
            {zones.length} suivis
            {updatedAt && <span className="text-zinc-600"> · maj {updatedAt}</span>}
            .
          </p>
        )}

        {/* Cartes résumé */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{problemCount}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">En difficulté</p>
          </div>
          <div className="bg-green-950/40 border border-green-900/50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{stableZones.length}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Stables</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-zinc-300">{totalReports}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Signalements</p>
          </div>
        </div>

        {/* Barre de couverture */}
        {zones.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Couverture réseau</span>
              <span>{zones.length} zones suivies</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              {stableZones.length > 0 && (
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(stableZones.length / zones.length) * 100}%` }}
                />
              )}
              {problemCount > 0 && (
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${(problemCount / zones.length) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("outage")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition ${
              tab === "outage" ? "bg-red-900/60 text-red-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Problèmes ({problemCount})
          </button>
          <button
            onClick={() => setTab("stable")}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition ${
              tab === "stable" ? "bg-green-900/60 text-green-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Stables ({stableZones.length})
          </button>
        </div>

        {/* Erreur réseau */}
        {error && !loading && (
          <button
            onClick={load}
            className="w-full bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-300 active:scale-[0.99] transition"
          >
            Impossible de charger les données. Toucher pour réessayer.
          </button>
        )}

        {/* Liste */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : displayZones.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              {tab === "outage" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              {tab === "outage" ? "Aucune coupure détectée" : "Pas assez de données"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayZones.map((zone, i) => {
              const snap = zone.snapshot;
              const status = snap?.status ?? "UNKNOWN";
              const score = snap?.outageScore ?? 0;

              const isOpen = expandedId === zone.id;
              return (
                <div
                  key={zone.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleHistory(zone.id)}
                    className="w-full p-3.5 flex items-center gap-3 text-left"
                  >
                    {/* Rang */}
                    <span className="text-xs text-zinc-600 w-5 text-center shrink-0 font-mono">{i + 1}</span>

                    {/* Barre visuelle */}
                    <div className="relative w-1.5 h-10 bg-zinc-800 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-full transition-all ${
                          status === "OUTAGE"   ? "bg-red-500" :
                          status === "UNSTABLE" ? "bg-orange-500" :
                          "bg-green-500"
                        }`}
                        style={{ height: `${Math.max(10, score)}%` }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{zone.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-zinc-500">
                          {snap?.activeReports ?? 0} signal.
                        </p>
                        {snap?.outageSince && status === "OUTAGE" && (
                          <p className="text-[11px] text-red-400">
                            depuis {sinceText(snap.outageSince)}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                        status === "OUTAGE"   ? "bg-red-900/50 text-red-300"      :
                        status === "UNSTABLE" ? "bg-orange-900/50 text-orange-300" :
                        status === "STABLE"   ? "bg-green-900/50 text-green-300"  :
                        "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {status === "OUTAGE" ? "Coupure" : status === "UNSTABLE" ? "Instable" : "Stable"}
                    </span>

                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`text-zinc-600 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Graphique 7 jours */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
                      <WeeklyChart points={history[zone.id]} loading={histLoading && !history[zone.id]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const STATUS_RANK: Record<string, number> = { STABLE: 0, UNKNOWN: 1, UNSTABLE: 2, OUTAGE: 3 };
const BAR_COLOR: Record<string, string> = {
  OUTAGE: "bg-red-500",
  UNSTABLE: "bg-orange-500",
  STABLE: "bg-green-500",
  UNKNOWN: "bg-zinc-700",
};

// Graphique en barres : 7 derniers jours, statut le plus grave de la journée
function WeeklyChart({ points, loading }: { points?: HistoryPoint[]; loading: boolean }) {
  if (loading) {
    return <div className="skeleton h-24 rounded-xl" />;
  }
  if (!points || points.length === 0) {
    return <p className="text-xs text-zinc-600 text-center py-4">Pas encore d'historique pour ce quartier</p>;
  }

  // Construit 7 jours (J-6 → aujourd'hui)
  const days: { label: string; worst: string; avgScore: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const dayPoints = points.filter((p) => new Date(p.computedAt).toDateString() === key);
    let worst = "UNKNOWN";
    let scoreSum = 0;
    for (const p of dayPoints) {
      if ((STATUS_RANK[p.status] ?? 0) > (STATUS_RANK[worst] ?? 0)) worst = p.status;
      scoreSum += p.outageScore;
    }
    days.push({
      label: DAY_LETTERS[d.getDay()],
      worst,
      avgScore: dayPoints.length ? scoreSum / dayPoints.length : 0,
    });
  }

  return (
    <div>
      <p className="text-[10px] text-zinc-500 mb-2">7 derniers jours</p>
      <div className="flex items-end gap-1.5 h-24">
        {days.map((d, i) => {
          const h = Math.max(8, Math.round((d.avgScore / 100) * 100));
          const hasData = d.worst !== "UNKNOWN" || i === 6;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className={`w-full rounded-t-md transition-all ${hasData ? BAR_COLOR[d.worst] : "bg-zinc-800"}`}
                style={{ height: `${h}%`, opacity: hasData ? 0.9 : 0.5 }}
                title={`${d.worst === "OUTAGE" ? "Coupure" : d.worst === "UNSTABLE" ? "Instable" : d.worst === "STABLE" ? "Stable" : "Sans données"}`}
              />
              <span className="text-[9px] text-zinc-600">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[9px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Coupure</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500" /> Instable</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" /> Stable</span>
      </div>
    </div>
  );
}
