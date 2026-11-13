import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-prod";

// ── Auth ──────────────────────────────────────────────────────────────
adminRouter.post("/login", async (req, res) => {
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string().min(8) })
    .parse(req.body);

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, {
    expiresIn: "8h",
  });
  return res.json({ token });
});

// ── Middleware JWT ──────────────────────────────────────────────────
function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé." });
  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
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
  const spot = await prisma.chargingSpot.update({
    where: { id: req.params.id },
    data: { verified: true },
  });
  return res.json(spot);
});

adminRouter.delete("/spots/:id", async (req, res) => {
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
  return res.status(201).json(alert);
});
