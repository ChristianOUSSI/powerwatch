import webpush from "web-push";
import { prisma } from "../lib/prisma.js";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@powerwatch.cm";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[push] VAPID keys manquantes, notifications désactivées");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC ?? null;
}

/**
 * Notifie les abonnés quand une zone bascule en coupure (transition seulement,
 * pour ne pas spammer à chaque recalcul de snapshot).
 */
export async function notifyZoneOutage(zoneId: string) {
  if (!ensureConfigured()) return;

  try {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      select: { name: true, cityId: true },
    });
    if (!zone) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { OR: [{ cityId: zone.cityId }, { cityId: null }] },
    });
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: `Coupure à ${zone.name}`,
      body: "Plusieurs signalements de coupure. Vérifie la carte pour la durée.",
      url: "/",
    });

    await Promise.allSettled(
      subs.map((s) =>
        webpush
          .sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
          .catch(async (err: { statusCode?: number }) => {
            // Abonnement mort (404/410) : on le nettoie
            if (err.statusCode === 404 || err.statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
            }
          })
      )
    );
  } catch (err) {
    console.error("[push] notifyZoneOutage", err);
  }
}
