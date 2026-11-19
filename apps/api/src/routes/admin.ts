import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { strictRateLimiter } from "../middlewares/rateLimiter.js";
import { emitAlertNew } from "../socket/index.js";

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET manquant en production");
}
const secret = JWT_SECRET ?? "dev-only-secret";

// ── Auth ──────────────────────────────────────────────────────────────
adminRouter.post("/login", strictRateLimiter, async (req, res) => {
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string().min(8) })
    .parse(req.body);

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const token = jwt.sign({ id: admin.id, role: admin.role }, secret, {
    expiresIn: "8h",
  });
  return res.json({ token });
});

// ── Middleware JWT ──────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé." });
  try {
    (req as Request & { admin?: jwt.JwtPayload }).admin = jwt.verify(
      auth.slice(7),
      secret
    ) as jwt.JwtPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide." });
  }
}

adminRouter.use(requireAdmin);

// ── Liste des signalements (pagination) ────────────────────────────
adminRouter.get("/reports", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const take = 50;
  const reports = await prisma.report.findMany({
    where: { status: { in: ["ACTIVE", "FLAGGED"] } },
    include: { zone: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * take,
    take,
  });
  return res.json(reports);
});

// ── Dashboard stats ──────────────────────────────────────────────────
adminRouter.get("/stats", async (_req, res) => {
  const [totalReports, activeReports, totalUsers, outageZones] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.zoneSnapshot.count({
      where: {
        status: "OUTAGE",
        computedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    }),
  ]);
  return res.json({ totalReports, activeReports, totalUsers, outageZones });
});

// ── Modération ──────────────────────────────────────────────────────
adminRouter.post("/reports/:id/flag", async (req, res) => {
  const existing = await prisma.report.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Signalement introuvable." });

  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: "FLAGGED" },
  });
  // Pénalise le trust score et suspend après 3 signalements flagués
  const user = await prisma.user.update({
    where: { id: report.userId },
    data: {
      spamFlags: { increment: 1 },
      trustScore: { decrement: 0.2 },
    },
  });
  if (user.spamFlags >= 3) {
    await prisma.user.update({
      where: { id: user.id },
      data: { bannedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
  }
  return res.json({ ok: true });
});

// ── Modération des lieux de charge ─────────────────────────────────
adminRouter.get("/spots", async (_req, res) => {
  const spots = await prisma.chargingSpot.findMany({
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return res.json(spots);
});

adminRouter.post("/spots/:id/verify", async (req, res) => {
  const existing = await prisma.chargingSpot.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Lieu introuvable." });

  const spot = await prisma.chargingSpot.update({
    where: { id: req.params.id },
    data: { verified: true },
  });
  return res.json(spot);
});

adminRouter.delete("/spots/:id", async (req, res) => {
  const existing = await prisma.chargingSpot.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Lieu introuvable." });

  await prisma.chargingSpot.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

// ── Alertes officielles ───────────────────────────────────────────────
adminRouter.post("/alerts", async (req, res) => {
  const data = z.object({
    zoneId: z.string().optional(),
    title: z.string().min(3),
    message: z.string().min(5),
    source: z.string().default("ENEO"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
  }).parse(req.body);

  const alert = await prisma.officialAlert.create({ data });
  emitAlertNew({
    id: alert.id,
    zoneId: alert.zoneId ?? undefined,
    title: alert.title,
    message: alert.message,
    source: alert.source,
    startsAt: alert.startsAt.toISOString(),
    endsAt: alert.endsAt?.toISOString(),
  });
  return res.status(201).json(alert);
});
