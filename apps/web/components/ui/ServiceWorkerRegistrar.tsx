"use client";

import { useEffect } from "react";
import { useZonesStore } from "@/store/zones";
import { flushPendingReports } from "@/hooks/useOfflineReports";
import { API_URL } from "@/lib/api";

export function ServiceWorkerRegistrar() {
  const setOffline = useZonesStore((s) => s.setOffline);

  useEffect(() => {
    // État réseau initial réel (pas de flash "en ligne" si déjà hors-ligne)
    setOffline(!navigator.onLine);

    // Enregistrement du Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          console.log("[SW] Signalements en attente synchronisés");
          void flushPendingReports(API_URL);
        }
      });
    }

    // Retour réseau : renvoie les signalements en attente
    const onOnline = () => {
      setOffline(false);
      void flushPendingReports(API_URL);
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [setOffline]);

  return null;
}
