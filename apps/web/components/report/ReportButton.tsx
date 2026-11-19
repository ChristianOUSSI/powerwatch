"use client";

import { useState, useEffect, useRef, type ComponentType } from "react";
import { useZonesStore } from "@/store/zones";
import { queueReport, flushPendingReports, countPendingReports } from "@/hooks/useOfflineReports";
import { useSwipeDismiss } from "@/hooks/useSwipeDismiss";
import { API_URL } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import type { ReportType } from "@powerwatch/shared";

// Distance approximative en km (projection équirectangulaire, largement suffisant à l'échelle d'une ville)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dx = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dy = lat2 - lat1;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

function PowerIcon({ off = false }: { off?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 11-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
      {off && <line x1="4" y1="4" x2="20" y2="20" />}
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 12 6 12 9 5 13 19 16 12 22 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  );
}

type ReportOption = {
  type: ReportType;
  Icon: ComponentType;
  label: string;
  sub: string;
  cls: string;
  iconCls: string;
};

// Les classes hover doivent être écrites en entier pour être vues par Tailwind
const OPTIONS: ReportOption[] = [
  {
    type: "OUTAGE",
    Icon: () => <PowerIcon off />,
    label: "Coupure totale",
    sub: "Plus d'électricité du tout",
    cls: "bg-red-900/30 border-red-700/60 hover:bg-red-900/60",
    iconCls: "text-red-400",
  },
  {
    type: "MICRO_OUTAGE",
    Icon: WaveIcon,
    label: "Tension faible",
    sub: "Ampoule rouge / courant instable",
    cls: "bg-orange-900/30 border-orange-700/60 hover:bg-orange-900/60",
    iconCls: "text-orange-400",
  },
  {
    type: "RESTORED",
    Icon: CheckIcon,
    label: "Courant revenu !",
    sub: "L'électricité est rétablie",
    cls: "bg-green-900/30 border-green-700/60 hover:bg-green-900/60",
    iconCls: "text-green-400",
  },
];

export function ReportButton() {
  const { selectedZoneId, zones, isOffline, selectZone, reportRequested, clearReportRequest } = useZonesStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" | "info" } | null>(null);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [autoZone, setAutoZone] = useState(false);
  const [pending, setPending] = useState(0);
  const swipe = useSwipeDismiss(() => setOpen(false));
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const locatingRef = useRef(false);

  // Nombre de signalements en attente de sync (IndexedDB)
  useEffect(() => {
    countPendingReports().then(setPending).catch(() => {});
  }, []);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  function showToast(text: string, kind: "ok" | "err" | "info" = "info") {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3500);
  }

  // Demande la position une seule fois, puis garde les coordonnées pour le signalement
  function ensureLocation() {
    if (posRef.current || locatingRef.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    locatingRef.current = true;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locatingRef.current = false;
        setLocating(false);
      },
      () => { locatingRef.current = false; setLocating(false); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  // À l'ouverture : géolocalise et sélectionne le quartier le plus proche si rien n'est choisi
  function handleOpen() {
    setOpen(true);
    ensureLocation();
    if (!selectedZoneId && posRef.current) {
      pickNearestZone(posRef.current);
    }
  }

  // Se déclenche aussi quand la position arrive après l'ouverture du drawer
  useEffect(() => {
    if (!open || selectedZoneId || !posRef.current) return;
    pickNearestZone(posRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locating]);

  function pickNearestZone(pos: { lat: number; lng: number }) {
    let best: { id: string; d: number } | null = null;
    for (const z of zones) {
      const d = distanceKm(pos.lat, pos.lng, z.centroidLat, z.centroidLng);
      if (!best || d < best.d) best = { id: z.id, d };
    }
    // Auto-sélection seulement si le quartier est à moins de ~20 km
    if (best && best.d < 20) {
      selectZone(best.id);
      setAutoZone(true);
    }
  }

  async function handleReport(type: ReportType) {
    if (!selectedZoneId) {
      showToast("Appuie d'abord sur un quartier sur la carte", "info");
      setOpen(false);
      return;
    }

    setLoading(type);
    const payload = {
      type,
      zoneId: selectedZoneId,
      deviceId: getDeviceId(),
      ...(posRef.current ?? {}),
    };

    try {
      if (isOffline) {
        await queueReport(payload);
        setPending((p) => p + 1);
        navigator.vibrate?.(30);
        showToast("Mis en attente (hors-ligne)", "info");
      } else {
        const res = await fetch(`${API_URL}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccess(true);
          setAutoZone(false);
          navigator.vibrate?.(60);
          showToast("Signalement envoyé, merci !", "ok");
          setTimeout(() => setSuccess(false), 2000);
          await flushPendingReports(API_URL);
          countPendingReports().then(setPending).catch(() => {});
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(typeof err.error === "string" ? err.error : "Erreur d'envoi", "err");
        }
      }
    } catch {
      await queueReport(payload);
      setPending((p) => p + 1);
      navigator.vibrate?.(30);
      showToast("Réseau indisponible, signalement en attente", "info");
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  // Ouverture demandée depuis ailleurs (ex : bouton dans la popup d'une zone)
  useEffect(() => {
    if (reportRequested) {
      clearReportRequest();
      handleOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportRequested]);

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const toastColors = {
    ok:   "bg-green-950/95 border border-green-700 text-green-200",
    err:  "bg-red-950/95 border border-red-700 text-red-200",
    info: "bg-zinc-800/95 border border-zinc-700 text-zinc-100",
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`toast ${toastColors[toast.kind]}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      {/* Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl animate-slide-up"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
              ...swipe.style,
            }}
            onClick={(e) => e.stopPropagation()}
            {...swipe.handlers}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            <div className="px-5 pb-2 space-y-1">
              <p className="text-center text-sm font-semibold text-zinc-200">
                Que se passe-t-il dans ton quartier ?
              </p>
              {selectedZone ? (
                <p className="text-center text-xs text-orange-400">
                  {selectedZone.name}
                  {autoZone && posRef.current ? " (détecté automatiquement)" : ""}
                </p>
              ) : (
                <p className="text-center text-xs text-zinc-600">
                  {locating ? "Localisation en cours…" : "Aucun quartier sélectionné"}
                </p>
              )}
            </div>

            {/* Sélecteur de quartier : fonctionne sans GPS ni tap sur la carte */}
            {!selectedZone && zones.length > 0 && (
              <div className="px-4 pb-2">
                <p className="text-center text-[10px] text-zinc-600 mb-1.5">
                  Ou choisis ton quartier directement :
                </p>
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 justify-center pb-1">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => { selectZone(z.id); setAutoZone(false); }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 active:bg-zinc-700 transition"
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 space-y-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleReport(opt.type)}
                  disabled={loading !== null}
                  className={`w-full flex items-center gap-4 p-4 border rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60 ${opt.cls}`}
                >
                  <span className={`shrink-0 ${opt.iconCls}`}>
                    <opt.Icon />
                  </span>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm text-zinc-100">{opt.label}</p>
                    <p className="text-xs text-zinc-500">{opt.sub}</p>
                  </div>
                  {loading === opt.type && (
                    <svg className="animate-spin w-4 h-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pastille du quartier sélectionné (tap pour désélectionner) */}
      {selectedZone && !open && (
        <button
          onClick={() => selectZone(null)}
          className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/95 border border-orange-800/60 text-orange-300 text-xs font-medium rounded-full backdrop-blur active:scale-95 transition"
          style={{ bottom: "calc(8.5rem + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)" }}
          aria-label={`Quartier ${selectedZone.name}, toucher pour changer`}
        >
          {selectedZone.name}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      {/* FAB */}
      <button
        onClick={handleOpen}
        className={`fixed z-40 flex items-center gap-2 px-5 py-3 font-bold rounded-full shadow-2xl transition-all active:scale-95 text-sm ${
          success
            ? "bg-green-500 text-white"
            : "bg-orange-500 hover:bg-orange-400 text-white"
        }`}
        style={{
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: success ? "translate(-50%, -4px) scale(1.08)" : "translateX(-60%)",
        }}
        aria-label="Signaler une coupure"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.36 6.64a9 9 0 11-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
        {success ? "Envoyé !" : "Signaler"}
        {pending > 0 && !success && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-zinc-800 border border-zinc-600 text-[10px] font-bold text-orange-300 flex items-center justify-center">
            {pending}
          </span>
        )}
      </button>
    </>
  );
}
