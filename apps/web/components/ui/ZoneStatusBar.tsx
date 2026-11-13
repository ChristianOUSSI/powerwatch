"use client";

import { useZonesStore } from "@/store/zones";

export function ZoneStatusBar() {
  const { zones, isOffline } = useZonesStore();

  const counts = zones.reduce(
    (acc, z) => {
      const s = z.snapshot?.status ?? "UNKNOWN";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = zones.length;

  return (
    <div className="flex items-center gap-2">
      {/* Pastille temps réel */}
      <span className="flex items-center gap-1" title={isOffline ? "Hors-ligne" : "Données en direct"}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOffline ? "bg-yellow-500" : "bg-green-500 animate-pulse"
          }`}
        />
        <span className={`text-[9px] font-medium ${isOffline ? "text-yellow-500" : "text-green-500"}`}>
          {isOffline ? "HORS-LIGNE" : "EN DIRECT"}
        </span>
      </span>
      {total > 0 && (
        <div className="flex items-center gap-1.5 text-[11px]">
          {counts.OUTAGE   ? <span className="text-red-400 font-semibold">{counts.OUTAGE} en coupure</span>  : null}
          {counts.UNSTABLE ? <span className="text-orange-400">{counts.UNSTABLE} instable{counts.UNSTABLE > 1 ? "s" : ""}</span> : null}
          {!counts.OUTAGE && !counts.UNSTABLE && counts.STABLE ? (
            <span className="text-green-400">Tout stable</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
