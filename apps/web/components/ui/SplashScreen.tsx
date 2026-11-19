"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Afficher le splash pendant 2.5s puis fade out
    const timer = setTimeout(() => setFading(true), 2000);
    const hideTimer = setTimeout(() => setShow(false), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Fond animé électrique */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-zinc-950 to-red-900/20" />
        {/* Particules électriques */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        <div className="relative">
          {/* Halo électrique */}
          <div className="absolute inset-0 bg-orange-500/30 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-zinc-900 border-2 border-orange-500/50 rounded-3xl p-6 shadow-2xl">
            {/* Image du logo CODE AXIS - à placer dans apps/web/public/icons/code_axis_logo.png */}
            <Image
              src="/icons/code_axis_logo.png"
              alt="Code Axis Digital Cameroun"
              width={200}
              height={200}
              className="object-contain"
              priority
              onError={(e) => {
                // Fallback si l'image n'existe pas encore
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Fallback texte si image absente */}
            <div className="text-center">
              <h1 className="text-4xl font-black text-orange-400 tracking-tight">CODE AXIS</h1>
              <p className="text-sm text-zinc-400 mt-1">DIGITAL CAMEROON</p>
            </div>
          </div>
        </div>

        {/* Titre PowerWatch */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">PowerWatch</h2>
          <p className="text-sm text-zinc-400">Cameroun</p>
        </div>

        {/* Barre de chargement électrique */}
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 animate-[loading_2s_ease-in-out_infinite]" />
        </div>
        <p className="text-xs text-zinc-500">Chargement…</p>
      </div>

      {/* Animation CSS pour la barre */}
      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
