"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Alert { id: string; title: string; message: string; source: string }

export function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // On peut appeler /api/admin/alerts publiquement pour les alertes actives
    // Pour l'instant, on simule avec une route dédiée
    fetch(`${API_URL}/api/alerts`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAlerts)
      .catch(() => {});
  }, []);

  if (!alerts.length) return null;

  const alert = alerts[index];
  return (
    <div className="bg-orange-900/60 border-b border-orange-700 px-4 py-1.5 flex items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-orange-300">{alert.source}</span>
      <span className="text-orange-100 truncate flex-1">{alert.title} : {alert.message}</span>
      {alerts.length > 1 && (
        <button
          onClick={() => setIndex((i) => (i + 1) % alerts.length)}
          className="text-orange-400 shrink-0"
        >
          {index + 1}/{alerts.length}
        </button>
      )}
    </div>
  );
}
