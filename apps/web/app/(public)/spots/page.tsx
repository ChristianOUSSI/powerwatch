"use client";

import { useEffect, useState } from "react";
import type { ChargingSpot } from "@powerwatch/shared";
import { AddSpotForm } from "./AddSpotForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Badge typographique par type de lieu (couleurs distinctes, rendu cohérent)
const TYPE_INFO: Record<string, { badge: string; label: string; cls: string }> = {
  cafe:       { badge: "C", label: "Café / Cyber",   cls: "bg-orange-900/50 text-orange-300 border-orange-800/50" },
  restaurant: { badge: "R", label: "Restaurant",     cls: "bg-rose-900/50 text-rose-300 border-rose-800/50" },
  station:    { badge: "S", label: "Station service",cls: "bg-amber-900/50 text-amber-300 border-amber-800/50" },
  mosque:     { badge: "M", label: "Mosquée",        cls: "bg-emerald-900/50 text-emerald-300 border-emerald-800/50" },
  church:     { badge: "É", label: "Église",         cls: "bg-sky-900/50 text-sky-300 border-sky-800/50" },
  hotel:      { badge: "H", label: "Hôtel",          cls: "bg-violet-900/50 text-violet-300 border-violet-800/50" },
  other:      { badge: "+", label: "Autre",          cls: "bg-zinc-800 text-zinc-300 border-zinc-700" },
};

const FILTER_OPTIONS = [
  { key: "all",        label: "Tous" },
  { key: "cafe",       label: "Cafés" },
  { key: "station",    label: "Stations" },
  { key: "restaurant", label: "Restos" },
  { key: "hotel",      label: "Hôtels" },
  { key: "other",      label: "Autres" },
];

export default function SpotsPage() {
  const [spots, setSpots]   = useState<ChargingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]   = useState("all");
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/spots`);
      if (r.ok) setSpots(await r.json());
    } finally {
      setLoading(false);
    }
  }

  async function upvote(id: string) {
    if (upvoted.has(id)) return; // un seul vote par session
    await fetch(`${API_URL}/api/spots/${id}/upvote`, { method: "POST" });
    setUpvoted((prev) => new Set(prev).add(id));
    setSpots((prev) => prev.map((s) => s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s));
  }

  function openMaps(spot: ChargingSpot) {
    const url = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
    window.open(url, "_blank", "noopener");
  }

  useEffect(() => { load(); }, []);

  const displayed = filter === "all"
    ? spots
    : spots.filter((s) => s.type === filter);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base">Où charger ?</h1>
            <p className="text-xs text-zinc-500">Lieux avec de l'électricité</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-full font-medium transition mt-1"
          >
            + Ajouter
          </button>
        </div>
        {/* Filtres */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition ${
                filter === f.key
                  ? "bg-orange-500 text-white font-medium"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modal ajout */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setShowForm(false)}
        >
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <AddSpotForm onAdded={() => { setShowForm(false); load(); }} />
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Compteur */}
        {!loading && (
          <p className="text-xs text-zinc-600 mb-3">{displayed.length} lieu{displayed.length > 1 ? "x" : ""}</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                <path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 01-10 0V8z"/><path d="M12 17v5"/>
              </svg>
            </div>
            <p className="text-sm text-zinc-400">Aucun lieu pour ce filtre</p>
            <p className="text-xs text-zinc-600">Sois le premier à en ajouter un !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed
              .sort((a, b) => b.upvotes - a.upvotes)
              .map((spot) => {
              const info = TYPE_INFO[spot.type] ?? TYPE_INFO.other;
              const voted = upvoted.has(spot.id);
              return (
                <div
                  key={spot.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  {spot.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spot.photoUrl}
                      alt={spot.name}
                      loading="lazy"
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold shrink-0 ${info.cls}`}>
                      {info.badge}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{spot.name}</p>
                        {spot.verified && (
                          <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-800/50 px-1.5 py-0.5 rounded-full">
                            Vérifié
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{info.label}</p>
                      {spot.address && (
                        <p className="text-xs text-zinc-600 mt-1 truncate">{spot.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {/* Bouton Maps */}
                    <button
                      onClick={() => openMaps(spot)}
                      className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition flex-1 justify-center"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Voir sur Maps
                    </button>

                    {/* Upvote */}
                    <button
                      onClick={() => upvote(spot.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${
                        voted
                          ? "bg-orange-900/50 text-orange-300 border border-orange-800/50"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.3a2 2 0 002-1.7l1.4-9a2 2 0 00-2-2.3H14z"/>
                        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                      </svg>
                      {spot.upvotes}
                    </button>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
