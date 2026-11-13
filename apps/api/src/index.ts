import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
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

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
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

// WebSocket
initSocket(httpServer);

// Jobs récurrents
startSnapshotJob();

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, () => {
  console.log(`[PowerWatch API] running on port ${PORT}`);
});
