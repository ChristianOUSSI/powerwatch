import "dotenv/config";
import "express-async-errors"; // capture les erreurs des handlers async (Express 4)
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { ZodError } from "zod";
import { initSocket } from "./socket/index.js";
import { reportsRouter } from "./routes/reports.js";
import { zonesRouter } from "./routes/zones.js";
import { adminRouter } from "./routes/admin.js";
import { spotsRouter } from "./routes/spots.js";
import { alertsRouter } from "./routes/alerts.js";
import { citiesRouter } from "./routes/cities.js";
import { pushRouter } from "./routes/push.js";
import { startSnapshotJob } from "./jobs/snapshot.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1); // derrière Nginx : IP réelle pour le rate limiter
app.use(helmet());
app.use(compression()); // gzip : économie de données mobiles
// CORS : origine principale (FRONTEND_URL) + previews Vercel (*.vercel.app).
// Les routes admin restent protégées par JWT quelle que soit l'origine.
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
app.use(
  cors({
    origin: [frontendUrl, /\.vercel\.app$/],
    credentials: false,
  })
);
app.use(express.json({ limit: "10kb" })); // petite limite → économie bande passante

// Routes publiques
app.use("/api/zones", zonesRouter);
app.use("/api/reports", rateLimiter, reportsRouter);
app.use("/api/spots", spotsRouter);
app.use("/api/cities", citiesRouter);
app.use("/api/push", pushRouter);
app.use("/api/alerts", alertsRouter);

// Routes admin (JWT middleware intégré dans le router)
app.use("/api/admin", adminRouter);

// 404 JSON
app.use((_req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});

// Erreurs : Zod → 400 propre, le reste → 500 JSON
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.flatten() });
  }
  console.error("[api]", err);
  return res.status(500).json({ error: "Erreur interne." });
});

// WebSocket
initSocket(httpServer);

// Jobs récurrents
startSnapshotJob();

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`[PowerWatch API] running on port ${PORT}`);
});
