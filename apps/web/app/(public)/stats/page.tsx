"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ElectricBar } from "@/components/ui/ElectricBar";

interface ZoneStat {
  key: string;
  label: string;
  lat: number;
  lng: number;
  reports: number;
  outages: number;
  instables: number;
  retablis: number;
  firstAt: string | null;
  lastAt: string | null;
  minDurationMin: number | null;
  maxDurationMin: number | null;
  ongoing: number;
}

interface StatsResponse {
  period: string;
  generatedAt: string;
  totalReports: number;
  totalZones: number;
  zones: ZoneStat[];
  villes: ZoneStat[];
  departements: ZoneStat[];
  regions: ZoneStat[];
  arrondissements: ZoneStat[];
}

type Level = "zones" | "villes" | "departements" | "arrondissements" | "regions";
type Period = "24h" | "7d" | "30d";
type SortKey = "outages" | "duration" | "reports";

const LEVELS: { key: Level; label: string }[] = [
  { key: "zones", label: "Quartiers" },
  { key: "villes", label: "Villes" },
  { key: "departements", label: "Départements" },
  { key: "arrondissements", label: "Arrondissements" },
  { key: "regions", label: "Régions" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "outages", label: "Plus de coupures" },
  { key: "duration", label: "Coupure la plus longue" },
  { key: "reports", label: "Plus de signalements" },
];

function fmtDuration(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m}` : `${h} h`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [period, setPeriod] = useState<Period>("24h");
  const [level, setLevel] = useState<Level>("zones");
  const [sort, setSort] = useState<SortKey>("outages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSet, setCompareSet] = useState<ZoneStat[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_URL}/api/stats?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((d: StatsResponse) => {
        if (!d || !Array.isArray(d.zones)) throw new Error("Réponse invalide");
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const items = (() => {
    const list = data?.[level] ?? [];
    const sorted = [...list];
    if (sort === "outages") sorted.sort((a, b) => b.outages - a.outages || b.reports - a.reports);
    else if (sort === "duration") sorted.sort((a, b) => (b.maxDurationMin ?? -1) - (a.maxDurationMin ?? -1));
    else sorted.sort((a, b) => b.reports - a.reports);
    return sorted;
  })();

  function toggleCompare(z: ZoneStat) {
    setCompareSet((prev) => {
      if (prev.some((p) => p.key === z.key)) return prev.filter((p) => p.key !== z.key);
      if (prev.length >= 4) return prev;
      return [...prev, z];
    });
  }

  const totalOutages = items.reduce((s, z) => s + z.outages, 0);
  const totalOngoing = items.reduce((s, z) => s + z.ongoing, 0);
  const maxDur = items.reduce((m, z) => Math.max(m, z.maxDurationMin ?? 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base text-zinc-100">Statistiques</h1>
            <p className="text-xs text-zinc-500">
              Calculées depuis les signalements citoyens
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Période */}
        <div className="flex gap-1.5 px-4 pb-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
                period === p.key
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Niveau + tri + comparer */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none items-center">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => { setLevel(l.key); setCompareSet([]); }}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition font-medium ${
                level === l.key
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {l.label}
            </button>
          ))}
          <span className="w-px h-5 bg-zinc-800 mx-1 shrink-0" />
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-[10px] px-2.5 py-1.5 rounded-full whitespace-nowrap transition ${
                sort === s.key
                  ? "bg-zinc-200 text-zinc-900 font-semibold"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSet([]); }}
            className={`text-[10px] px-2.5 py-1.5 rounded-full whitespace-nowrap transition font-medium ${
              compareMode
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            }`}
          >
            {compareMode ? `Comparer (${compareSet.length}/4)` : "Comparer"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="space-y-2">
            <ElectricBar />
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        )}

        {error && !loading && (
          <button
            onClick={load}
            className="w-full bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-300 active:scale-[0.99] transition"
          >
            Impossible de charger les statistiques. Toucher pour réessayer.
          </button>
        )}

        {!loading && !error && data && (
          <>
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{totalOutages}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Coupures</p>
              </div>
              <div className="bg-orange-950/40 border border-orange-900/50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{totalOngoing}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">En cours</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-zinc-300">{fmtDuration(maxDur)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Coupure max</p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              {data.totalReports} signalement(s) analysé(s) · {data.totalZones} zone(s) détectée(s)
              {data.generatedAt && (
                <span className="text-zinc-600">
                  {" "}· maj {new Date(data.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>

            {/* Tableau de comparaison */}
            {compareMode && compareSet.length > 0 && (
              <CompareTable zones={compareSet} />
            )}

            {/* Liste */}
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-zinc-400">Aucun signalement sur cette période</p>
                <p className="text-xs text-zinc-600 mt-1">Les stats se remplissent dès que des gens signalent.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((z, i) => {
                  const selected = compareSet.some((p) => p.key === z.key);
                  return (
                    <button
                      key={z.key}
                      onClick={() => (compareMode ? toggleCompare(z) : undefined)}
                      disabled={!compareMode}
                      className={`w-full text-left bg-zinc-900 border rounded-2xl p-3.5 transition ${
                        selected
                          ? "border-blue-500 ring-1 ring-blue-500/40"
                          : "border-zinc-800"
                      } ${compareMode ? "active:scale-[0.99] cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600 w-6 text-center shrink-0 font-mono">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{z.label}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {z.outages > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300">
                                {z.outages} coupure{z.outages > 1 ? "s" : ""}
                              </span>
                            )}
                            {z.instables > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300">
                                {z.instables} instable{z.instables > 1 ? "s" : ""}
                              </span>
                            )}
                            {z.ongoing > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-300">
                                {z.ongoing} en cours
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-600">{z.reports} signal.</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {z.maxDurationMin != null && (
                            <p className="text-xs font-semibold text-zinc-300">{fmtDuration(z.maxDurationMin)}</p>
                          )}
                          {z.minDurationMin != null && z.minDurationMin !== z.maxDurationMin && (
                            <p className="text-[9px] text-zinc-600">min {fmtDuration(z.minDurationMin)}</p>
                          )}
                          {z.maxDurationMin == null && (
                            <p className="text-[10px] text-zinc-600">pas de durée</p>
                          )}
                        </div>
                      </div>
                      {(z.firstAt || z.lastAt) && (
                        <p className="text-[10px] text-zinc-600 mt-1.5 pl-9">
                          {fmtTime(z.firstAt)} → {fmtTime(z.lastAt)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Tableau comparatif de 2 à 4 zones
function CompareTable({ zones }: { zones: ZoneStat[] }) {
  const rows: { label: string; get: (z: ZoneStat) => string }[] = [
    { label: "Signalements", get: (z) => String(z.reports) },
    { label: "Coupures", get: (z) => String(z.outages) },
    { label: "Instables", get: (z) => String(z.instables) },
    { label: "Rétablis", get: (z) => String(z.retablis) },
    { label: "Coupures en cours", get: (z) => String(z.ongoing) },
    { label: "Durée min", get: (z) => fmtDuration(z.minDurationMin) },
    { label: "Durée max", get: (z) => fmtDuration(z.maxDurationMin) },
    { label: "Premier signalement", get: (z) => fmtTime(z.firstAt) },
    { label: "Dernier signalement", get: (z) => fmtTime(z.lastAt) },
  ];

  return (
    <div className="bg-zinc-900 border border-blue-900/50 rounded-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 bg-blue-950/30">
        <p className="text-xs font-semibold text-blue-300">Comparaison</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-3 py-2 text-zinc-500 font-medium">Critère</th>
              {zones.map((z) => (
                <th key={z.key} className="text-left px-3 py-2 font-semibold text-zinc-200 max-w-[110px] truncate">
                  {z.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-3 py-1.5 text-zinc-500">{row.label}</td>
                {zones.map((z) => (
                  <td key={z.key} className="px-3 py-1.5 text-zinc-200">{row.get(z)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
