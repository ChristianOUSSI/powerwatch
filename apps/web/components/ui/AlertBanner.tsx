"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import type { OfficialAlertPublic } from "@powerwatch/shared";

interface Alert { id: string; title: string; message: string; source: string }

export function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAlerts)
      .catch(() => {});

    // Alertes publiées en temps réel via Socket.io (relais DOM par useSocket)
    const onAlert = (e: Event) => {
      const alert = (e as CustomEvent<OfficialAlertPublic>).detail;
      setAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev]));
    };
    window.addEventListener("pw:alert", onAlert);
    return () => window.removeEventListener("pw:alert", onAlert);
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
