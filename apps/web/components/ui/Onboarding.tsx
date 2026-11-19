"use client";

import { useEffect, useState } from "react";

const KEY = "pw_onboarded";

const STEPS = [
  {
    title: "Vois le courant en direct",
    text: "Chaque quartier est coloré : vert = courant, orange = instable, rouge = coupure.",
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    title: "Signale en 2 touches",
    text: "Touche le bouton orange en bas, choisis ton quartier et dis si le courant est coupé ou rétabli.",
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    title: "Trouve où charger",
    text: "L'onglet Charger liste les cafés, stations et restos avec de l'électricité pendant les coupures.",
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 01-10 0V8z"/><path d="M12 17v5"/>
      </svg>
    ),
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Présentation de l'application"
        className="w-full sm:max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
              </svg>
            </div>
            <span className="font-bold text-sm">Bienvenue sur PowerWatch</span>
          </div>
          <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none px-2" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-orange-400 shrink-0">
                <s.Icon />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">{s.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="w-full mt-5 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition text-sm"
        >
          C'est parti
        </button>
        <p className="text-center text-[10px] text-zinc-600 mt-2">
          Tu pourras revoir cette aide dans l'onglet Aide.
        </p>
      </div>
    </div>
  );
}
