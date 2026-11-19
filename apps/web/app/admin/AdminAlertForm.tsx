"use client";

import { useEffect, useState } from "react";
import { adminFetch, apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { CityPublic, ZonePublic } from "@powerwatch/shared";

export function AdminAlertForm() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    source: "ENEO",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: "",
    zoneId: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [zones, setZones] = useState<(ZonePublic & { cityName?: string })[]>([]);

  // Liste des quartiers pour éviter de demander un ID technique à l'admin
  useEffect(() => {
    Promise.all([
      apiFetch<ZonePublic[]>("/api/zones"),
      apiFetch<CityPublic[]>("/api/cities"),
    ])
      .then(([z, c]) => {
        const cityName = new Map(c.map((x) => [x.id, x.name]));
        setZones(z.map((zone) => ({ ...zone, cityName: cityName.get(zone.cityId) })));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { setError("Session expirée, reconnecte-toi."); return; }
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await adminFetch("/api/admin/alerts", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          endsAt: form.endsAt || undefined,
          zoneId: form.zoneId || undefined,
        }),
      });
      setSuccess(true);
      setForm((f) => ({ ...f, title: "", message: "" }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
      <h2 className="text-sm font-semibold text-zinc-300">Publier une alerte officielle</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Source</label>
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          >
            <option>ENEO</option>
            <option>AES</option>
            <option>SOCADEL</option>
            <option>Autre</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Quartier (optionnel)</label>
          <select
            value={form.zoneId}
            onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Toute la ville / national</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.cityName ? `${z.cityName} - ` : ""}{z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Titre</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="ex: Maintenance programmée Bonamoussadi"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Message</label>
        <textarea
          required
          rows={3}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Détails de la coupure / maintenance…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Début</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Fin prévue</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && <p className="text-green-400 text-xs">Alerte publiée.</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
      >
        {loading ? "Publication…" : "Publier l'alerte"}
      </button>
    </form>
  );
}
