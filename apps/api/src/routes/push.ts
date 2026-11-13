import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getVapidPublicKey } from "../services/push.js";

export const pushRouter = Router();

// GET /api/push/vapid-key — clé publique pour pushManager.subscribe
pushRouter.get("/vapid-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: "Push non configuré." });
  return res.json({ key });
});

const SubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  cityId: z.string().optional(),
});

// POST /api/push/subscribe — enregistre une souscription Web Push
pushRouter.post("/subscribe", async (req, res) => {
  const parsed = SubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { endpoint, keys, cityId } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, cityId: cityId ?? null },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      cityId: cityId ?? null,
    },
  });

  return res.status(201).json({ ok: true });
});
