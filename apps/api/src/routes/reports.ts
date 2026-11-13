import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getOrCreateUser } from "../services/user.js";
import { emitZoneUpdate } from "../socket/index.js";
import { notifyZoneOutage } from "../services/push.js";

export const reportsRouter = Router();

const ReportSchema = z.object({
  type: z.enum(["OUTAGE", "MICRO_OUTAGE", "RESTORED"]),
  zoneId: z.string().cuid(),
  deviceId: z.string().min(10).max(128),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// TTL par type de signalement (en minutes)
const TTL: Record<string, number> = {
  OUTAGE: 360,       // 6h
  MICRO_OUTAGE: 120, // 2h
  RESTORED: 60,      // 1h
};

reportsRouter.post("/", async (req, res) => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { type, zoneId, deviceId, lat, lng } = parsed.data;

  try {
    const user = await getOrCreateUser(deviceId);

    // Vérif ban
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({ error: "Compte suspendu temporairement." });
    }

    // Anti-flood : 1 signalement par zone par 15 min
    const recent = await prisma.report.findFirst({
      where: {
        userId: user.id,
        zoneId,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        status: "ACTIVE",
      },
    });
    if (recent) {
      return res.status(429).json({ error: "Trop de signalements. Attends 15 min." });
    }

    const expiresAt = new Date(Date.now() + TTL[type] * 60 * 1000);

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        zoneId,
        type,
        weight: user.trustScore,
        // Arrondir coords à ~200m pour anonymat
        lat: lat ? Math.round(lat * 1000) / 1000 : undefined,
        lng: lng ? Math.round(lng * 1000) / 1000 : undefined,
        expiresAt,
      },
    });

    // Mise à jour trust score (récompense légère)
    const trustGain = type === "RESTORED" ? 0.05 : 0;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        reportCount: { increment: 1 },
        ...(trustGain ? { trustScore: { increment: trustGain } } : {}),
      },
    });

    // Confirmation croisée : un signalement identique récent d'un autre utilisateur
    // renforce la fiabilité de celui qui l'avait posté en premier
    if (type !== "RESTORED") {
      const similar = await prisma.report.findMany({
        where: {
          zoneId,
          type,
          status: "ACTIVE",
          userId: { not: user.id },
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
        select: { id: true, confirmedBy: true, userId: true },
        take: 10,
      });
      for (const r of similar) {
        if (r.confirmedBy.includes(user.id)) continue;
        await prisma.report.update({
          where: { id: r.id },
          data: { confirmedBy: { push: user.id } },
        });
        await prisma.user.update({
          where: { id: r.userId },
          data: { trustScore: { increment: 0.05 } },
        });
      }
    }

    // Plafonne le trust score à 2.0 pour tout le monde (nettoyage périodique léger)
    await prisma.user.updateMany({
      where: { trustScore: { gt: 2.0 } },
      data: { trustScore: 2.0 },
    });

    // Déclenche recalcul immédiat du snapshot de zone
    const snapshot = await recalcZone(zoneId);
    emitZoneUpdate(zoneId, snapshot);

    return res.status(201).json({ id: report.id });
  } catch (err) {
    console.error("[reports POST]", err);
    return res.status(500).json({ error: "Erreur interne." });
  }
});

// ── Recalcul snapshot inline (aussi appelé par le job) ──────────────
export async function recalcZone(zoneId: string) {
  const now = new Date();
  const window = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6h

  const reports = await prisma.report.findMany({
    where: { zoneId, status: "ACTIVE", createdAt: { gte: window } },
    select: { type: true, weight: true, createdAt: true },
  });

  let outageScore = 0;
  let activeReports = 0;
  let restoredReports = 0;
  let oldestOutage: Date | null = null;

  for (const r of reports) {
    if (r.type === "OUTAGE" || r.type === "MICRO_OUTAGE") {
      const decay = Math.exp(-(now.getTime() - r.createdAt.getTime()) / (2 * 3600 * 1000));
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

  // Continuité : si la zone était déjà en difficulté, on conserve le début réel
  // de la coupure au lieu de le recalculer depuis les signalements récents
  const prev = await prisma.zoneSnapshot.findFirst({
    where: { zoneId },
    orderBy: { computedAt: "desc" },
    select: { status: true, outageSince: true },
  });
  const prevBad = prev && (prev.status === "OUTAGE" || prev.status === "UNSTABLE");
  const nowBad = status === "OUTAGE" || status === "UNSTABLE";
  const outageSince =
    nowBad && prevBad && prev.outageSince
      ? prev.outageSince
      : status === "OUTAGE" ? oldestOutage : null;

  const snapshot = await prisma.zoneSnapshot.create({
    data: {
      zoneId,
      status,
      outageScore,
      activeReports,
      restoredReports,
      outageSince,
    },
  });

  // Push uniquement à la transition vers la coupure (pas à chaque recalcul)
  if (status === "OUTAGE" && prev?.status !== "OUTAGE") {
    void notifyZoneOutage(zoneId);
  }

  return snapshot;
}
