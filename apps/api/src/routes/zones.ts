import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const zonesRouter = Router();

// GET /api/zones?city=douala  → toutes les zones avec dernier snapshot
zonesRouter.get("/", async (req, res) => {
  const citySlug = req.query.city as string | undefined;

  const zones = await prisma.zone.findMany({
    where: citySlug ? { city: { slug: citySlug } } : undefined,
    include: {
      snapshots: {
        orderBy: { computedAt: "desc" },
        take: 1,
      },
    },
  });

  const result = zones.map((z) => ({
    id: z.id,
    name: z.name,
    slug: z.slug,
    cityId: z.cityId,
    centroidLat: z.centroidLat,
    centroidLng: z.centroidLng,
    polygon: z.polygon,
    snapshot: z.snapshots[0] ?? null,
  }));

  return res.json(result);
});

// GET /api/zones/:id/history?days=7
zonesRouter.get("/:id/history", async (req, res) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 30);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const snapshots = await prisma.zoneSnapshot.findMany({
    where: { zoneId: req.params.id, computedAt: { gte: since } },
    orderBy: { computedAt: "asc" },
    select: { status: true, outageScore: true, outageSince: true, computedAt: true },
  });

  return res.json(snapshots);
});

// GET /api/zones/cities  → liste des villes
zonesRouter.get("/cities", async (_req, res) => {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, slug: true, lat: true, lng: true },
  });
  return res.json(cities);
});
