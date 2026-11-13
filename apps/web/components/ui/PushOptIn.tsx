"use client";

import { useEffect, useState } from "react";
import { useZonesStore } from "@/store/zones";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const DISMISS_KEY = "pw_push_dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushOptIn() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const zones = useZonesStore((s) => s.zones);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Attend que la bannière d'installation PWA disparaisse (max ~30 s)
    let tries = 0;
    const check = () => {
      if (!document.querySelector("[data-pwa-prompt]") || tries++ > 15) {
        setVisible(true);
      } else {
        setTimeout(check, 2000);
      }
    };
    check();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      // Clé publique : variable d'env en priorité, endpoint API en secours
      let key = VAPID_KEY;
      if (!key) {
        const r = await fetch(`${API_URL}/api/push/vapid-key`);
        if (r.ok) key = (await r.json()).key;
      }
      if (!key) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });

      await fetch(`${API_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          cityId: zones[0]?.cityId ?? undefined,
        }),
      });

      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed left-4 right-4 z-30 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl animate-fade-in"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="text-sm font-semibold text-zinc-100">Alertes coupure</p>
      <p className="text-xs text-zinc-500 mt-0.5">
        Sois prévenu dès qu'une coupure est signalée dans ta ville.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={enable}
          disabled={busy}
          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl transition"
        >
          {busy ? "Activation…" : "Activer les alertes"}
        </button>
        <button
          onClick={dismiss}
          className="px-3 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
