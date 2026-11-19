"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Stats {
  totalReports: number;
  activeReports: number;
  totalUsers: number;
  outageZones: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    adminFetch<Stats>("/api/admin/stats", token)
      .then(setStats)
      .catch(console.error);
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh toutes les 30 s : le dashboard reste vivant sans recharger
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const cards = [
    { label: "Signalements actifs", value: stats?.activeReports ?? "-", color: "text-orange-400" },
    { label: "Total signalements",  value: stats?.totalReports  ?? "-", color: "text-zinc-300"   },
    { label: "Utilisateurs",        value: stats?.totalUsers    ?? "-", color: "text-blue-400"   },
    { label: "Zones en coupure",    value: stats?.outageZones   ?? "-", color: "text-red-400"    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          {stats ? (
            <>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{c.label}</p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-7 w-12" />
              <div className="skeleton h-3 w-24" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
