"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { useSwipeDismiss } from "@/hooks/useSwipeDismiss";

const TYPES = [
  { value: "cafe",       label: "Café / Cyber" },
  { value: "restaurant", label: "Restaurant" },
  { value: "station",    label: "Station-service" },
  { value: "hotel",      label: "Hôtel" },
  { value: "mosque",     label: "Mosquée" },
  { value: "church",     label: "Église" },
  { value: "other",      label: "Autre" },
];

export function AddSpotForm({ onAdded, onClose }: { onAdded: () => void; onClose?: () => void }) {
  const swipe = useSwipeDismiss(() => onClose?.());
  const [form, setForm] = useState({ name: "", type: "cafe", address: "", lat: "", lng: "", photoUrl: "" });
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function useGPS() {
    if (!navigator.geolocation) { setError("GPS non disponible"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude.toFixed(5));
        set("lng", pos.coords.longitude.toFixed(5));
        setGpsLoading(false);
      },
      () => { setError("Impossible d'obtenir ta position"); setGpsLoading(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.lat || !form.lng || isNaN(lat) || isNaN(lng)) {
      setError("Coordonnées requises, utilise le bouton GPS ou saisis-les");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Coordonnées invalides (latitude -90 à 90, longitude -180 à 180)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/spots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          photoUrl: form.photoUrl || undefined,
          lat,
          lng,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Erreur d'envoi");
      } else {
        onAdded();
      }
    } catch {
      setError("Réseau indisponible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border-t border-zinc-700 rounded-t-3xl animate-slide-up"
      style={{
        paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        ...swipe.style,
      }}
      {...swipe.handlers}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-4">
        <div className="w-10 h-1 bg-zinc-700 rounded-full" />
      </div>

      <div className="px-5 pb-2">
        <h2 className="text-sm font-bold text-zinc-100">Ajouter un lieu de charge</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Aide la communauté à trouver où se brancher</p>
      </div>

      <div className="px-5 py-3 space-y-3">
        <input
          required
          placeholder="Nom du lieu (ex: Cyber Café Akwa)"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
        />

        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("type", t.value)}
              className={`text-xs py-2 px-3 rounded-xl border transition text-left ${
                form.type === t.value
                  ? "bg-orange-900/50 border-orange-700 text-orange-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          placeholder="Adresse (optionnel)"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
        />

        <input
          placeholder="Photo du lieu (lien, optionnel)"
          type="url"
          value={form.photoUrl}
          onChange={(e) => set("photoUrl", e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
        />

        {/* Coordonnées : GPS auto ou saisie manuelle */}
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Latitude"
            inputMode="decimal"
            value={form.lat}
            onChange={(e) => set("lat", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
          />
          <input
            placeholder="Longitude"
            inputMode="decimal"
            value={form.lng}
            onChange={(e) => set("lng", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        {/* GPS */}
        <button
          type="button"
          onClick={useGPS}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {gpsLoading ? "Localisation…" : "Remplir avec ma position GPS"}
        </button>

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-sm"
        >
          {loading ? "Envoi en cours…" : "Ajouter ce lieu"}
        </button>
      </div>
    </form>
  );
}
