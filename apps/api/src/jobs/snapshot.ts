import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { recalcZone } from "../routes/reports.js";
import { emitZoneUpdate } from "../socket/index.js";

// Rétention : l'endpoint /history plafonne à 30 jours, on garde 31 jours max
const SNAPSHOT_RETENTION_DAYS = 31;

/**
 * Toutes les 2 minutes : recalcule les snapshots des zones actives
 * et celles dont le dernier état est encore OUTAGE/UNSTABLE
 * (pour les laisser redescendre proprement quand les signalements expirent).
 */
export function startSnapshotJob() {
  cron.schedule("*/2 * * * *", async () => {
    try {
      const now = new Date();

      // 1. Expirer d'abord les signalements périmés : sinon ils seraient
      // encore comptés ACTIVE dans le calcul de score de ce passage.
      await prisma.report.updateMany({
        where: { status: "ACTIVE", expiresAt: { lt: now } },
        data: { status: "EXPIRED" },
      });

      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      // Zones à recalculer :
      // - tout signalement créé dans les 6 dernières heures (peu importe le statut,
      //   pour repasser en UNKNOWN/STABLE quand tout a expiré)
      // - zones dont le DERNIER snapshot est encore OUTAGE/UNSTABLE
      //   (sinon elles resteraient affichées en coupure indéfiniment)
      const [recentReportZones, latestSnapshots] = await Promise.all([
        prisma.report.findMany({
          where: { createdAt: { gte: sixHoursAgo } },
          select: { zoneId: true },
          distinct: ["zoneId"],
        }),
        prisma.zoneSnapshot.findMany({
          orderBy: { computedAt: "desc" },
          distinct: ["zoneId"],
          select: { zoneId: true, status: true },
        }),
      ]);

      const staleZoneIds = latestSnapshots
        .filter((s) => s.status === "OUTAGE" || s.status === "UNSTABLE")
        .map((s) => s.zoneId);

      const activeZoneIds = [
        ...new Set([
          ...recentReportZones.map((r) => r.zoneId),
          ...staleZoneIds,
        ]),
      ];

      // Recalcul en parallèle : les zones sont indépendantes
      await Promise.all(
        activeZoneIds.map(async (zoneId) => {
          try {
            const snapshot = await recalcZone(zoneId);
            await emitZoneUpdate(zoneId, snapshot);
          } catch (err) {
            console.error(`[snapshot job] zone ${zoneId}`, err);
          }
        })
      );

      // 3. Clamp du trust score + purge des vieux snapshots
      await Promise.all([
        prisma.user.updateMany({
          where: { trustScore: { gt: 2 } },
          data: { trustScore: 2 },
        }),
        prisma.user.updateMany({
          where: { trustScore: { lt: 0 } },
          data: { trustScore: 0 },
        }),
        prisma.zoneSnapshot.deleteMany({
          where: {
            computedAt: {
              lt: new Date(now.getTime() - SNAPSHOT_RETENTION_DAYS * 24 * 3600 * 1000),
            },
          },
        }),
      ]);
    } catch (err) {
      console.error("[snapshot job]", err);
    }
  });

  console.log("[PowerWatch] Snapshot job démarré (toutes les 2 min)");
}
