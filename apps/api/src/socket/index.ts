import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import type { ServerToClientEvents, ClientToServerEvents } from "@powerwatch/shared";
import { prisma } from "../lib/prisma.js";

let io: Server<ClientToServerEvents, ServerToClientEvents>;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL ?? "http://localhost:3000" },
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

export async function emitZoneUpdate(zoneId: string, snapshot: Record<string, unknown>) {
  if (!io) return;
  const payload = { zoneId, ...snapshot } as any;
  io.to(`zone:${zoneId}`).emit("zone:update", payload);

  // Les clients s'abonnent par ville : on relaie aussi dans la room city
  try {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      select: { cityId: true },
    });
    if (zone) io.to(`city:${zone.cityId}`).emit("zone:update", payload);
  } catch {
    // pas bloquant si la zone a été supprimée
  }
}
