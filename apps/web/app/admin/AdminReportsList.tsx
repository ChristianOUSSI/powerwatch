"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Report {
  id: string;
  type: string;
  status: string;
  zoneId: string;
  createdAt: string;
  weight: number;
  zone?: { name: string };
}

const TYPE_META: Record<string, { label: string; dot: string }> = {
  OUTAGE:        { label: "Coupure",        dot: "bg-red-500"    },
  MICRO_OUTAGE:  { label: "Faible tension", dot: "bg-orange-500" },
  RESTORED:      { label: "Revenu",         dot: "bg-green-500"  },
};

export function AdminReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = getToken();
    if (!token) return;
    try {
      // Utilise la route zones pour récupérer les zones actives
      // puis on affiche les signalements actifs via l'endpoint admin
      const data = await adminFetch<Report[]>("/api/admin/reports", token);
      setReports(data);
    } catch {
      // Fallback : pas encore d'endpoint → liste vide
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function flagReport(id: string) {
    const token = getToken();
    if (!token) return;
    await adminFetch(`/api/admin/reports/${id}/flag`, token, { method: "POST" });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "FLAGGED" } : r));
  }

  useEffect(() => { load(); }, []);

  if (loading && !reports.length) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => { setLoading(true); load(); }}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition"
      >
        Rafraîchir
      </button>
      {!reports.length && <p className="text-zinc-500 text-sm">Aucun signalement actif.</p>}
      {reports.map((r) => (
        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${TYPE_META[r.type]?.dot ?? "bg-zinc-500"}`} />
              {TYPE_META[r.type]?.label ?? r.type}
            </p>
            <p className="text-xs text-zinc-500">
              {r.zone?.name ?? r.zoneId} ·{" "}
              {formatDistanceToNow(new Date(r.createdAt), { locale: fr, addSuffix: true })}
            </p>
            <p className="text-xs text-zinc-600">Poids: {r.weight.toFixed(1)} · {r.status}</p>
          </div>
          {r.status === "ACTIVE" && (
            <button
              onClick={() => flagReport(r.id)}
              className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-2 py-1 transition"
            >
              Flaguer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
