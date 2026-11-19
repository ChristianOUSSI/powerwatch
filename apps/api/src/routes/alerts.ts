import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const alertsRouter = Router();

// GET /api/alerts : alertes actives (publiques)
alertsRouter.get("/", async (_req, res) => {
  const now = new Date();
  const alerts = await prisma.officialAlert.findMany({
    where: {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { startsAt: "desc" },
    take: 10,
  });
  return res.json(alerts);
});
