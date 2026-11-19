"use client";

import { useEffect, useState } from "react";
import { ElectricBar } from "./ElectricBar";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Splash court : fade out après ~1.5s
    const timer = setTimeout(() => setFading(true), 1500);
    const hideTimer = setTimeout(() => setShow(false), 2000);
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
      {/* Barre de chargement électrique centrée */}
      <div className="flex flex-col items-center space-y-4 px-10 w-full max-w-xs">
        <p className="text-sm font-bold text-zinc-300 tracking-wide">PowerWatch</p>
        <ElectricBar label="Chargement…" />
      </div>
    </div>
  );
}
