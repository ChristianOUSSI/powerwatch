"use client";

import { useEffect } from "react";
import { useZonesStore } from "@/store/zones";

export function ServiceWorkerRegistrar() {
  const setOffline = useZonesStore((s) => s.setOffline);

  useEffect(() => {
    // Enregistrement du Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_COMPLETE") {
          console.log("[SW] Signalements en attente synchronisés");
        }
      });
    }

    // Détection offline
    const onOffline = () => setOffline(true);
    const onOnline  = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
    };
  }, [setOffline]);

  return null;
}
