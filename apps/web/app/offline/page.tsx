"use client";

import { useEffect } from "react";

export default function OfflinePage() {
  // Retour réseau : recharge pour afficher la carte à jour
  useEffect(() => {
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 017 0" />
          <path d="M2 8.82a15 15 0 014.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 012.22 1.68" />
          <path d="M5 13a10 10 0 015.24-2.76" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-orange-400 mb-2">Pas de connexion</h1>
      <p className="text-zinc-400 text-sm max-w-xs">
        La carte affichée vient du cache. Tes signalements seront envoyés automatiquement
        quand le réseau reviendra.
      </p>
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-2 w-full max-w-xs">
        <p className="text-xs font-semibold text-zinc-400">En attendant :</p>
        <p className="text-sm text-zinc-300">Baisse la luminosité de ton écran</p>
        <p className="text-sm text-zinc-300">Active le mode avion pour économiser la batterie</p>
        <p className="text-sm text-zinc-300">Va dans un endroit avec du courant pour recharger</p>
        <p className="text-sm text-zinc-300">Les coupures à Douala durent en moyenne 2 à 4h</p>
      </div>
      <button
        onClick={() => window.location.href = "/"}
        className="mt-6 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-full text-sm transition"
      >
        Réessayer
      </button>
    </div>
  );
}
