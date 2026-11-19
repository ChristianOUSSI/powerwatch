import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getOrCreateUser } from "../services/user.js";
import { emitZoneUpdate } from "../socket/index.js";
import { notifyZoneOutage } from "../services/push.js";
import { computeZoneScore } from "../lib/zoneScore.js";

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

    // Anti-flood : 1 signalement par zone par utilisateur.
    // Fenêtre plus courte pour RESTORED : le courant peut revenir vite
    // après une coupure, il ne faut pas bloquer ce signalement 15 min.
    const windowMinutes = type === "RESTORED" ? 2 : 15;
    const recent = await prisma.report.findFirst({
      where: {
        userId: user.id,
        zoneId,
        createdAt: { gte: new Date(Date.now() - windowMinutes * 60 * 1000) },
        status: "ACTIVE",
      },
    });
    if (recent) {
      return res
        .status(429)
        .json({ error: `Trop de signalements. Attends ${windowMinutes} min.` });
    }

    const expiresAt = new Date(Date.now() + TTL[type] * 60 * 1000);

    // Un RESTORED annule les signalements de coupure encore actifs dans la zone.
    // On épargne les signalements de moins de 2 min : un "courant rétabli"
    // ne doit pas annuler une coupure fraîchement signalée par un tiers.
    if (type === "RESTORED") {
      await prisma.report.updateMany({
        where: {
          zoneId,
          status: "ACTIVE",
          type: { in: ["OUTAGE", "MICRO_OUTAGE"] },
          createdAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
        },
        data: { status: "SUPERSEDED" },
      });
    }

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
      const trustGains = new Map<string, number>();
      await Promise.all(
        similar.map(async (r) => {
          if (r.confirmedBy.includes(user.id)) return;
          await prisma.report.update({
            where: { id: r.id },
            data: { confirmedBy: { push: user.id } },
          });
          trustGains.set(r.userId, (trustGains.get(r.userId) ?? 0) + 0.05);
        })
      );
      await Promise.all(
        [...trustGains].map(([userId, gain]) =>
          prisma.user.update({
            where: { id: userId },
            data: { trustScore: { increment: gain } },
          })
        )
      );
    }

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

  const { outageScore, activeReports, restoredReports, oldestOutage, status } =
    computeZoneScore(reports, now);

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
