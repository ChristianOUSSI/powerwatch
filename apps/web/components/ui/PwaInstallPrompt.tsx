"use client";

import { useEffect, useState } from "react";

// L'événement beforeinstallprompt est disponible sur Android Chrome/WebView
// Il n'existe PAS sur iOS (on affiche un guide manuel à la place)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pw_pwa_dismissed";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Déjà installée (standalone) → ne pas afficher
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Déjà rejeté → ne pas afficher pendant 7 jours
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY);
    } catch {
      // localStorage indisponible (navigation privée stricte) : on continue
    }
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 3600 * 1000) return;

    // Détection iOS (Safari)
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (ios) {
      setIsIos(true);
      // Affiche après 3s sur iOS
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android Chrome : écoute l'événement natif
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Affiche après 4s pour ne pas interrompre le chargement de la carte
      setTimeout(() => setShow(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShow(false);
    setDeferredPrompt(null);
  }

  if (!show || isInstalled) return null;

  // ── Guide iOS (pas de prompt natif) ───────────────────────────────
  if (isIos) {
    return (
      <div data-pwa-prompt className="fixed left-4 right-4 z-50 animate-slide-up" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
              </svg>
            </span>
            <div>
              <p className="font-bold text-sm text-zinc-100">Installer PowerWatch</p>
              <p className="text-xs text-zinc-400 mt-1">
                Appuie sur <span className="font-semibold text-orange-400">□↑</span> (partage) en bas de Safari, puis{" "}
                <span className="font-semibold text-orange-400">"Sur l'écran d'accueil"</span>
              </p>
            </div>
          </div>
          {/* Flèche vers le bas pointant vers la barre Safari */}
          <div className="flex justify-center mt-2">
            <span className="text-orange-400 text-xl animate-bounce">↓</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Prompt Android natif ──────────────────────────────────────────
  return (
    <div data-pwa-prompt className="fixed left-4 right-4 z-50 animate-slide-up" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="bg-zinc-900 border border-orange-800 rounded-2xl p-4 shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-zinc-100">Installer PowerWatch</p>
            <p className="text-xs text-zinc-400">Accès rapide, fonctionne hors-ligne</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-xl transition"
          >
            Plus tard
          </button>
          <button
            onClick={install}
            className="flex-1 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-400 rounded-xl transition"
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
