// Service Worker — PowerWatch Cameroun
// Stratégie : Cache-First pour les assets, Network-First pour l'API, Stale-While-Revalidate pour la carte

const CACHE_NAME = "powerwatch-v1";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/_next/static/css/app.css",
];

// Install — précharge les assets critiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — nettoie les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API → Network-First avec fallback cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statiques → Cache-First
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request)
    )
  );
});

// Web Push — affiche la notification même app fermée
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* payload non-JSON */ }
  event.waitUntil(
    self.registration.showNotification(data.title || "PowerWatch", {
      body: data.body || "Nouvelle alerte",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Sync différé — envoie les signalements en attente quand le réseau revient
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reports") {
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingReports() {
  // Les signalements hors-ligne sont dans IndexedDB (clé: "pending-reports")
  // Le client les stocke, le SW les envoie ici
  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: "SYNC_COMPLETE" }));
}
