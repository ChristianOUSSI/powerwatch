import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { recalcZone } from "../routes/reports.js";
import { emitZoneUpdate } from "../socket/index.js";

/**
 * Toutes les 2 minutes : recalcule les snapshots de toutes les zones actives.
 * "Actives" = au moins un signalement dans les 6 dernières heures.
 */
export function startSnapshotJob() {
  cron.schedule("*/2 * * * *", async () => {
    try {
      const activeZoneIds = await prisma.report
        .findMany({
          where: {
            status: "ACTIVE",
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          },
          select: { zoneId: true },
          distinct: ["zoneId"],
        })
        .then((rows) => rows.map((r) => r.zoneId));

      for (const zoneId of activeZoneIds) {
        const snapshot = await recalcZone(zoneId);
        emitZoneUpdate(zoneId, snapshot);
      }

      // Expire les vieux signalements
      await prisma.report.updateMany({
        where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
        data: { status: "EXPIRED" },
      });
    } catch (err) {
      console.error("[snapshot job]", err);
    }
  });

  console.log("[PowerWatch] Snapshot job démarré (toutes les 2 min)");
}
