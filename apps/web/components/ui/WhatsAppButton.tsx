"use client";

import React from "react";
import { useZonesStore } from "@/store/zones";

// Numéro WhatsApp de contact direct (format international sans +)
const WHATSAPP_NUMBER = "237691223916";
const CONTACT_SITE = "https://codeaxis.vercel.app";

export function WhatsAppButton() {
  const { zones, selectedZoneId, userLocation, setUserLocation } = useZonesStore();
  const [locating, setLocating] = React.useState(false);

  async function locateMe() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      });
    } catch {
      // position indisponible : on partage sans coordonnées
    } finally {
      setLocating(false);
    }
  }

  function buildMessage() {
    const locationPart = userLocation
      ? `\nMa position : ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}\nhttps://maps.google.com/?q=${userLocation.lat},${userLocation.lng}\n`
      : "";

    if (selectedZoneId) {
      const zone = zones.find((z) => z.id === selectedZoneId);
      const snap = zone?.snapshot;
      if (zone && snap) {
        const status =
          snap.status === "OUTAGE"   ? "Coupure générale" :
          snap.status === "UNSTABLE" ? "Courant instable" :
          snap.status === "STABLE"   ? "Courant présent" :
          "Pas de données récentes";
        const since = snap.outageSince
          ? ` depuis ${new Date(snap.outageSince).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : "";
        return encodeURIComponent(
          `PowerWatch Cameroun\n\n${zone.name} : ${status}${since}\n${snap.activeReports} signalement(s) actif(s)\n${locationPart}\nContact : ${CONTACT_SITE}`
        );
      }
    }
    return encodeURIComponent(
      `PowerWatch Cameroun : Suivi des coupures d'électricité en temps réel\n${locationPart}\nContact : ${CONTACT_SITE}`
    );
  }

  function share() {
    // Lien WhatsApp direct vers le numéro de contact, message pré-rempli
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildMessage()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={share}
      onContextMenu={(e) => { e.preventDefault(); locateMe(); }}
      aria-label="Contacter sur WhatsApp (appui long pour ajouter ma position)"
      className={`fixed right-4 z-40 flex items-center justify-center w-12 h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 rounded-full shadow-xl transition ${locating ? "animate-pulse" : ""}`}
      style={{ bottom: "calc(9.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <svg viewBox="0 0 32 32" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.663 4.607 1.81 6.5L4 29l7.727-1.788A12.94 12.94 0 0 0 16 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10a10.93 10.93 0 0 1-5.47-1.46l-.39-.23-4.05.937.974-3.95-.25-.4A9.96 9.96 0 0 1 6 15c0-5.514 4.486-10 10-10zm-3.16 5.5c-.22 0-.576.082-.878.408-.3.326-1.148 1.12-1.148 2.733 0 1.613 1.173 3.172 1.337 3.39.163.217 2.307 3.52 5.59 4.794 2.764 1.07 3.327.858 3.926.804.598-.054 1.93-.788 2.203-1.55.272-.76.272-1.413.19-1.55-.082-.136-.299-.217-.626-.38-.327-.163-1.93-.953-2.23-1.062-.298-.108-.516-.163-.734.163-.217.326-.843 1.062-1.034 1.28-.19.218-.38.245-.707.082-.327-.163-1.38-.508-2.628-1.622-.972-.866-1.628-1.934-1.82-2.26-.19-.327-.02-.503.144-.665.146-.144.327-.38.49-.57.163-.19.217-.327.327-.544.109-.218.054-.408-.027-.57-.082-.163-.72-1.77-.992-2.42-.247-.59-.507-.52-.707-.53l-.6-.01z"/>
      </svg>
    </button>
  );
}
