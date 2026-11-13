import { prisma } from "../lib/prisma.js";

/**
 * Récupère ou crée un utilisateur anonyme par deviceId.
 * Aucune donnée personnelle collectée sans consentement.
 */
export async function getOrCreateUser(deviceId: string) {
  return prisma.user.upsert({
    where: { deviceId },
    update: {},
    create: { deviceId },
  });
}

/**
 * Recalcule le trustScore d'un user.
 * Simple heuristique : cohérence des signalements avec les snapshots de zone.
 */
export async function refreshTrustScore(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Pénalise si trop de signalements flaggés
  const flagRatio =
    user.reportCount > 0 ? user.spamFlags / user.reportCount : 0;

  let score = 1.0;
  if (flagRatio > 0.3) score = 0.3;
  else if (flagRatio > 0.1) score = 0.7;
  else if (user.reportCount > 50) score = 1.5; // utilisateur fiable
  else if (user.reportCount > 10) score = 1.2;

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: score },
  });
}
