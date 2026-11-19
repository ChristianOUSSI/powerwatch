"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@powerwatch/shared";
import { useZonesStore } from "@/store/zones";
import { API_URL } from "@/lib/api";

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
      updateZoneSnapshot(zoneId, snapshot);
    };
    socket.on("zone:update", onZoneUpdate);

    // Alertes officielles : relais via un event DOM pour les composants abonnés
    const onAlertNew: ServerToClientEvents["alert:new"] = (alert) => {
      window.dispatchEvent(new CustomEvent("pw:alert", { detail: alert }));
    };
    socket.on("alert:new", onAlertNew);

    // Les rooms socket.io sont liées à la connexion : il faut se
    // réabonner à chaque (re)connexion, sinon les updates sont perdues.
    const subscribe = () => {
      if (cityId) socket.emit("city:subscribe", cityId);
    };
    socket.on("connect", subscribe);
    subscribe();

    return () => {
      socket.off("zone:update", onZoneUpdate);
      socket.off("alert:new", onAlertNew);
      socket.off("connect", subscribe);
      if (cityId) socket.emit("city:unsubscribe", cityId);
    };
  }, [cityId, updateZoneSnapshot]);

  return socketRef.current;
}
