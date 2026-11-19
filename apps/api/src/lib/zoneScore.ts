// Calcul pur du score de zone : aucune dépendance DB, facilement testable.

export interface ScoredReport {
  type: "OUTAGE" | "MICRO_OUTAGE" | "RESTORED" | string;
  weight: number;
  createdAt: Date;
}

export interface ZoneScoreResult {
  outageScore: number;      // 0-100
  activeReports: number;
  restoredReports: number;
  oldestOutage: Date | null;
  status: "OUTAGE" | "UNSTABLE" | "STABLE" | "UNKNOWN";
}

const DECAY_TAU_MS = 2 * 3600 * 1000; // constante de temps : poids divisé par e toutes les 2h

export function computeZoneScore(reports: ScoredReport[], now: Date): ZoneScoreResult {
  let outageScore = 0;
  let activeReports = 0;
  let restoredReports = 0;
  let oldestOutage: Date | null = null;

  for (const r of reports) {
    if (r.type === "OUTAGE" || r.type === "MICRO_OUTAGE") {
      const ageMs = now.getTime() - r.createdAt.getTime();
      const decay = Math.exp(-ageMs / DECAY_TAU_MS);
      outageScore += r.weight * decay * (r.type === "OUTAGE" ? 1 : 0.5);
      activeReports++;
      if (!oldestOutage || r.createdAt < oldestOutage) oldestOutage = r.createdAt;
    } else if (r.type === "RESTORED") {
      restoredReports++;
      outageScore -= r.weight * 0.8;
    }
  }

  outageScore = Math.max(0, Math.min(100, outageScore * 10));

  const status =
    outageScore >= 60 ? "OUTAGE" :
    outageScore >= 25 ? "UNSTABLE" :
    activeReports > 0 || restoredReports > 0 ? "STABLE" :
    "UNKNOWN";

  return { outageScore, activeReports, restoredReports, oldestOutage, status };
}
