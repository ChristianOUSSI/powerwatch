import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const freeReportsRouter = Router();

// ── Endpoint pour récupérer les signalements libres avec clustering ──────────
freeReportsRouter.get("/", async (req, res) => {
  const city = req.query.city as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : 0.1; // ~10km par défaut

  try {
    // Si ville spécifiée, on filtre par les zones de cette ville
    // Sinon, on prend tous les signalements libres dans le rayon
    let reports;

    if (city) {
      // Récupérer les zones de la ville pour filtrer par lat/lng approximatif
      const cityData = await prisma.city.findUnique({
        where: { slug: city },
        include: { zones: true },
      });

      if (!cityData) {
        return res.status(404).json({ error: "Ville non trouvée" });
      }

      // Filtrer les signalements libres dans le rayon de la ville
      const minLat = cityData.lat - radius;
      const maxLat = cityData.lat + radius;
      const minLng = cityData.lng - radius;
      const maxLng = cityData.lng + radius;

      reports = await prisma.report.findMany({
        where: {
          status: "ACTIVE",
          zoneId: null, // signalements libres uniquement
          lat: { gte: minLat, lte: maxLat },
          lng: { gte: minLng, lte: maxLng },
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }, // 6h
        },
        select: {
          id: true,
          type: true,
          lat: true,
          lng: true,
          clusterId: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    } else {
      // Sans ville, on prend tous les signalements libres récents
      reports = await prisma.report.findMany({
        where: {
          status: "ACTIVE",
          zoneId: null,
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          type: true,
          lat: true,
          lng: true,
          clusterId: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }

    // Retourner les signalements individuels (pas de clustering)
    const result = reports.map((report) => ({
      id: report.id,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      clusterId: report.clusterId,
      createdAt: report.createdAt,
      expiresAt: report.expiresAt,
    }));

    res.json(result);
  } catch (err) {
    console.error("[freeReports GET]", err);
    res.status(500).json({ error: "Erreur interne." });
  }
});
