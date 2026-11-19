import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import type { ZoneSnapshot } from "@prisma/client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  OfficialAlertPublic,
} from "@powerwatch/shared";
import { prisma } from "../lib/prisma.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: TypedServer | null = null;

// Cache zoneId → cityId : les zones ne changent presque jamais,
// évite une requête DB à chaque emitZoneUpdate.
const cityIdCache = new Map<string, string>();

export function initSocket(httpServer: HttpServer) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL ?? "http://localhost:3000", /\.vercel\.app$/],
    },
    // Compression → économie de données mobile
    perMessageDeflate: true,
  });

  io.on("connection", (socket) => {
    socket.on("zone:subscribe", (zoneId) => {
      socket.join(`zone:${zoneId}`);
    });
    socket.on("zone:unsubscribe", (zoneId) => {
      socket.leave(`zone:${zoneId}`);
    });
    socket.on("city:subscribe", (cityId) => {
      socket.join(`city:${cityId}`);
    });
    socket.on("city:unsubscribe", (cityId) => {
      socket.leave(`city:${cityId}`);
    });
  });

  console.log("[PowerWatch] WebSocket initialisé");
}

async function getCityId(zoneId: string): Promise<string | null> {
  const cached = cityIdCache.get(zoneId);
  if (cached) return cached;
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { cityId: true },
  });
  if (zone) cityIdCache.set(zoneId, zone.cityId);
  return zone?.cityId ?? null;
}

export async function emitZoneUpdate(zoneId: string, snapshot: ZoneSnapshot) {
  if (!io) return;
  const payload = {
    zoneId,
    status: snapshot.status,
    outageScore: snapshot.outageScore,
    activeReports: snapshot.activeReports,
    outageSince: snapshot.outageSince?.toISOString() ?? null,
    computedAt: snapshot.computedAt.toISOString(),
  };
  io.to(`zone:${zoneId}`).emit("zone:update", payload);

  // Les clients s'abonnent par ville : on relaie aussi dans la room city
  try {
    const cityId = await getCityId(zoneId);
    if (cityId) io.to(`city:${cityId}`).emit("zone:update", payload);
  } catch {
    // pas bloquant si la zone a été supprimée
  }
}

export function emitAlertNew(alert: OfficialAlertPublic) {
  io?.emit("alert:new", alert);
}
