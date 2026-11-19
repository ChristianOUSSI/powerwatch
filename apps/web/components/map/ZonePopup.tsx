"use client";

import type { ZonePublic } from "@powerwatch/shared";
import { useZonesStore } from "@/store/zones";

const STATUS: Record<string, { dot: string; label: string; cls: string }> = {
  STABLE:   { dot: "bg-green-500",  label: "Courant présent",  cls: "text-green-400" },
  UNSTABLE: { dot: "bg-orange-500", label: "Tension instable", cls: "text-orange-400" },
  OUTAGE:   { dot: "bg-red-500",    label: "Coupure",          cls: "text-red-400" },
  UNKNOWN:  { dot: "bg-zinc-500",   label: "Pas de données",   cls: "text-zinc-500" },
};

function sinceText(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h${m > 0 ? m + "min" : ""} sans courant`;
  return `${m} min sans courant`;
}

export function ZonePopup({ zone }: { zone: ZonePublic }) {
  const snap = zone.snapshot;
  const info = STATUS[snap?.status ?? "UNKNOWN"];
  const selectZone = useZonesStore((s) => s.selectZone);
  const requestReport = useZonesStore((s) => s.requestReport);

  return (
    <div className="min-w-[180px] space-y-1.5">
      <p className="font-bold text-sm text-zinc-100">{zone.name}</p>
      <p className={`text-xs font-semibold flex items-center gap-1.5 ${info.cls}`}>
        <span className={`w-2 h-2 rounded-full ${info.dot}`} />
        {info.label}
      </p>
      {snap?.outageSince && snap.status === "OUTAGE" && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-2 py-1">
          <p className="text-xs text-red-300 font-medium">
            {sinceText(snap.outageSince)}
          </p>
          <p className="text-[10px] text-red-500">
            depuis {new Date(snap.outageSince).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
      {snap && (
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{snap.activeReports} signalement{snap.activeReports > 1 ? "s" : ""} récent{snap.activeReports > 1 ? "s" : ""}</span>
        </div>
      )}
      <button
        onClick={() => { selectZone(zone.id); requestReport(); }}
        className="w-full mt-1 bg-orange-500 hover:bg-orange-400 text-white text-[11px] font-semibold py-1.5 rounded-lg transition"
      >
        Signaler ce quartier
      </button>
    </div>
  );
}
