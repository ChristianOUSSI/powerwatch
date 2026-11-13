import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const spotsRouter = Router();

// GET /api/spots?city=douala&lat=4.05&lng=9.70&radius=5
spotsRouter.get("/", async (req, res) => {
  const spots = await prisma.chargingSpot.findMany({
    where: req.query.zoneId ? { zoneId: req.query.zoneId as string } : undefined,
    orderBy: [{ verified: "desc" }, { upvotes: "desc" }],
    take: 50,
  });
  return res.json(spots);
});

// POST /api/spots — signalement communautaire d'un lieu de charge
spotsRouter.post("/", async (req, res) => {
  const data = z.object({
    name: z.string().min(2).max(80),
    type: z.enum(["cafe", "restaurant", "station", "mosque", "church", "hotel", "other"]),
    lat: z.number(),
    lng: z.number(),
    zoneId: z.string().optional(),
    address: z.string().max(200).optional(),
    photoUrl: z.string().url().max(500).optional(),
  }).parse(req.body);

  const spot = await prisma.chargingSpot.create({ data });
  return res.status(201).json(spot);
});

// POST /api/spots/:id/upvote
spotsRouter.post("/:id/upvote", async (req, res) => {
  await prisma.chargingSpot.update({
    where: { id: req.params.id },
    data: { upvotes: { increment: 1 } },
  });
  return res.json({ ok: true });
});
