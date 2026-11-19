import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";

export const spotsRouter = Router();

// Distance approximative en km (équirectangulaire, suffisant à l'échelle d'une ville)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dx = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dy = lat2 - lat1;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

// GET /api/spots?city=douala&lat=4.05&lng=9.70&radius=5&zoneId=...
spotsRouter.get("/", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusKm = Math.min(parseFloat(req.query.radius as string) || 0, 50);
  const hasGeoFilter = Number.isFinite(lat) && Number.isFinite(lng) && radiusKm > 0;

  const spots = await prisma.chargingSpot.findMany({
    where: req.query.zoneId ? { zoneId: req.query.zoneId as string } : undefined,
    orderBy: [{ verified: "desc" }, { upvotes: "desc" }],
    take: hasGeoFilter ? 500 : 100,
  });

  if (!hasGeoFilter) return res.json(spots);
  return res.json(
    spots.filter((s) => distanceKm(lat, lng, s.lat, s.lng) <= radiusKm)
  );
});

// POST /api/spots : signalement communautaire d'un lieu de charge
spotsRouter.post("/", rateLimiter, async (req, res) => {
  const data = z.object({
    name: z.string().min(2).max(80),
    type: z.enum(["cafe", "restaurant", "station", "mosque", "church", "hotel", "other"]),
    lat: z.number(),
    lng: z.number(),
    zoneId: z.string().optional(),
    address: z.string().max(200).optional(),
    photoUrl: z.string().url().max(500).optional(),
  }).parse(req.body);

  const name = data.name.trim();

  // Anti-doublon : même nom à moins de ~200 m = lieu déjà signalé
  const duplicate = await prisma.chargingSpot.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      lat: { gte: data.lat - 0.002, lte: data.lat + 0.002 },
      lng: { gte: data.lng - 0.002, lte: data.lng + 0.002 },
    },
  });
  if (duplicate) return res.status(200).json({ ...duplicate, duplicate: true });

  const spot = await prisma.chargingSpot.create({
    data: { ...data, name },
  });
  return res.status(201).json(spot);
});

// POST /api/spots/:id/upvote : un vote par appareil (deviceId)
spotsRouter.post("/:id/upvote", rateLimiter, async (req, res) => {
  const deviceId = z.string().min(10).max(128).optional().parse(
    req.body?.deviceId
  );

  const spot = await prisma.chargingSpot.findUnique({
    where: { id: req.params.id },
    select: { id: true, upvotedBy: true },
  });
  if (!spot) return res.status(404).json({ error: "Lieu introuvable." });

  // Déjà voté depuis cet appareil : on répond OK sans recompter
  if (deviceId && spot.upvotedBy.includes(deviceId)) {
    return res.json({ ok: true, already: true });
  }

  await prisma.chargingSpot.update({
    where: { id: req.params.id },
    data: {
      upvotes: { increment: 1 },
      ...(deviceId ? { upvotedBy: { push: deviceId } } : {}),
    },
  });
  return res.json({ ok: true });
});
