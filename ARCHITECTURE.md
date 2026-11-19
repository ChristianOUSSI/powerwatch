# PowerWatch Cameroun : Architecture

## Arborescence

```
powerwatch-cameroun/              monorepo Turborepo
├── apps/
│   ├── web/                      Next.js 14 (App Router) PWA
│   │   ├── app/
│   │   │   ├── layout.tsx        PWA manifest, SW registrar
│   │   │   ├── page.tsx          Page principale (carte)
│   │   │   ├── (public)/         Pages publiques (stats, spots)
│   │   │   └── admin/            Dashboard admin (JWT protégé)
│   │   ├── components/
│   │   │   ├── map/PowerMap.tsx  Leaflet + polygones GeoJSON
│   │   │   ├── map/ZonePopup.tsx Info-bulle zone
│   │   │   ├── report/           Bouton + drawer de signalement
│   │   │   └── ui/               AlertBanner, ZoneStatusBar, etc.
│   │   ├── hooks/
│   │   │   ├── useSocket.ts      Socket.io client + abonnements
│   │   │   └── useOfflineReports.ts IndexedDB queue hors-ligne
│   │   ├── store/zones.ts        Zustand (état carte + statuts)
│   │   └── public/
│   │       ├── sw.js             Service Worker (cache + sync)
│   │       └── manifest.json     PWA manifest
│   │
│   └── api/                      Node.js + Express + Socket.io
│       └── src/
│           ├── index.ts          Entrée, montage routes/socket/jobs
│           ├── routes/
│           │   ├── zones.ts      GET /api/zones, /:id/history
│           │   ├── cities.ts     GET /api/cities
│           │   ├── reports.ts    POST /api/reports + recalcZone()
│           │   ├── spots.ts      Lieux de charge (CRUD + upvote)
│           │   └── admin.ts      Auth JWT + modération + alertes
│           ├── services/user.ts  getOrCreateUser, trustScore
│           ├── jobs/snapshot.ts  Cron 2min : recalc + expire
│           ├── socket/index.ts   Socket.io init + emitZoneUpdate (rooms zone + city)
│           ├── scripts/import-osm-zones.ts Import des vrais contours de quartiers via Overpass
│           ├── middlewares/      rateLimiter
│           └── lib/prisma.ts     Singleton PrismaClient
│
└── packages/
    └── shared/
        ├── prisma/schema.prisma  Schéma DB (City, Zone, User,
        │                          Report, ZoneSnapshot, etc.)
        └── src/types.ts          Types partagés frontend/backend
```

## Flux de données

```
Utilisateur clique "Signaler"
        │
        ▼
ReportButton → POST /api/reports
        │
        ▼ (si offline)
IndexedDB queue → sync dès retour réseau (SW Background Sync)
        │
        ▼ (si online)
API : anti-flood 15min + trust score
        │
        ▼
recalcZone() : agrégation pondérée + decay temporel
        │
        ├── → ZoneSnapshot en DB
        └── → Socket.io emit("zone:update") → tous les clients abonnés
                        │
                        ▼
              Zustand store → React re-render carte
```

## Algorithme de score de zone

```
outageScore = Σ (weight × decay × typeMultiplier)
            - Σ (weight_restored × 0.8)

decay = e^(- Δt / 2h)          signalement récent = fort impact
typeMultiplier = 1.0 (OUTAGE) ou 0.5 (MICRO_OUTAGE)

OUTAGE   si score ≥ 60   → rouge
UNSTABLE si score ≥ 25   → orange
STABLE   si score < 25   → vert
UNKNOWN  si aucun rapport → gris
```

## Choix adaptés au Cameroun

| Contrainte | Choix technique |
|---|---|
| Batterie OLED | Dark mode par défaut, Tailwind |
| Données limitées | Tuiles CARTO dark (légères), WS perMessageDeflate |
| Coupures réseau | SW cache-first + IndexedDB sync différé |
| Accès mobile | Mobile-first, FAB, touch targets ≥ 48px |
| Sans compte | deviceId anonyme UUID côté client |
| Anti-spam | Rate limit IP + anti-flood 15min/zone/user + trustScore |

## Lancer le projet

```bash
# 1. Installer
npm install

# 2. Copier les variables d'environnement
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

# 3. Démarrer PostgreSQL (Docker)
docker run -e POSTGRES_PASSWORD=password -e POSTGRES_DB=powerwatch -p 5432:5432 postgres:16

# 4. Créer les tables et les données de test
npm run setup

# 5. Démarrer
npm run dev   # lance api:4000 + web:3000 en parallèle
```
