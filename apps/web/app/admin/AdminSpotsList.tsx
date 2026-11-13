"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ChargingSpot } from "@powerwatch/shared";

const TYPE_LABEL: Record<string, string> = {
  cafe: "Café / Cyber",
  restaurant: "Restaurant",
  station: "Station service",
  mosque: "Mosquée",
  church: "Église",
  hotel: "Hôtel",
  other: "Autre",
};

export function AdminSpotsList() {
  const [spots, setSpots] = useState<ChargingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getToken();
    if (!token) return;
    try {
      setSpots(await adminFetch<ChargingSpot[]>("/api/admin/spots", token));
    } catch {
      setSpots([]);
    } finally {
      setLoading(false);
    }
  }

  async function verify(id: string) {
    const token = getToken();
    if (!token) return;
    await adminFetch(`/api/admin/spots/${id}/verify`, token, { method: "POST" });
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, verified: true } : s)));
  }

  async function remove(id: string) {
    const token = getToken();
    if (!token) return;
    await adminFetch(`/api/admin/spots/${id}`, token, { method: "DELETE" });
    setSpots((prev) => prev.filter((s) => s.id !== id));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-zinc-500 text-sm">Chargement…</p>;
  if (!spots.length) return <p className="text-zinc-500 text-sm">Aucun lieu de charge.</p>;

  return (
    <div className="space-y-2">
      {spots.map((s) => (
        <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
          {s.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{s.name}</p>
            <p className="text-xs text-zinc-500">
              {TYPE_LABEL[s.type] ?? s.type}
              {s.address ? ` · ${s.address}` : ""}
            </p>
            <p className="text-xs text-zinc-600">{s.upvotes} votes{s.verified ? " · Vérifié" : ""}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {!s.verified && (
              <button
                onClick={() => verify(s.id)}
                className="text-xs text-green-400 hover:text-green-300 border border-green-800 rounded-lg px-2 py-1 transition"
              >
                Vérifier
              </button>
            )}
            <button
              onClick={() => remove(s.id)}
              className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-2 py-1 transition"
            >
              Suppr.
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
