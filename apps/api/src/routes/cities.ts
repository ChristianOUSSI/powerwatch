import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const citiesRouter = Router();

// GET /api/cities — villes disponibles avec centre pour la carte
citiesRouter.get("/", async (_req, res) => {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, slug: true, lat: true, lng: true },
    orderBy: { name: "asc" },
  });
  return res.json(cities);
});
