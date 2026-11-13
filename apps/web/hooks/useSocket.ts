"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@powerwatch/shared";
import { useZonesStore } from "@/store/zones";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function useSocket(cityId?: string) {
  const updateZoneSnapshot = useZonesStore((s) => s.updateZoneSnapshot);
  const socketRef = useRef(socketInstance);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        transports: ["websocket"],
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });
      socketInstance = socketRef.current;
    }

    const socket = socketRef.current;

    const onZoneUpdate: ServerToClientEvents["zone:update"] = ({ zoneId, ...snapshot }) => {
      updateZoneSnapshot(zoneId, snapshot as any);
    };
    socket.on("zone:update", onZoneUpdate);

    if (cityId) {
      socket.emit("city:subscribe", cityId);
    }

    return () => {
      socket.off("zone:update", onZoneUpdate);
      if (cityId) socket.emit("city:unsubscribe", cityId);
    };
  }, [cityId, updateZoneSnapshot]);

  return socketRef.current;
}
