# ⚡ PowerWatch Cameroun

> Suivi en temps réel des coupures d'électricité au Cameroun — crowdsourcé, offline-first, mobile-first.

## Lancer le projet

### Prérequis
- Node.js 20+
- PostgreSQL 14+ (ou Docker)
- npm 10+

### 1. Cloner et installer

```bash
git clone <url>
cd powerwatch-cameroun
npm install
```

### 2. Variables d'environnement

```bash
# API
cp .env.example apps/api/.env
# Éditez DATABASE_URL, JWT_SECRET

# Web
cp .env.example apps/web/.env.local
# Éditez NEXT_PUBLIC_API_URL si besoin
```

### 3. Base de données

```bash
# Option Docker (rapide)
docker run -d \
  --name powerwatch-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=powerwatch \
  -p 5432:5432 \
  postgres:16

# Migrations
npm run db:migrate

# Seed (villes + quartiers + admin par défaut)
cd apps/api
npx tsx prisma/seed.ts
cd ../..
```

### 4. Démarrer

```bash
npm run dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
```

### Compte admin par défaut
```
Email    : admin@powerwatch.cm
Password : PowerWatch2025!
URL      : http://localhost:3000/admin
```
⚠️ **Changez le mot de passe en production.**

---

## Structure des pages

| URL | Description |
|---|---|
| `/` | Carte interactive (Leaflet) avec heatmap |
| `/stats` | Classement des quartiers par stabilité |
| `/spots` | Lieux pour charger son téléphone |
| `/admin` | Dashboard modération (JWT) |
| `/offline` | Page de fallback hors-ligne |

## API REST

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/zones?city=douala` | Zones + snapshot actuel |
| GET | `/api/zones/:id/history?days=7` | Historique snapshots |
| GET | `/api/zones/cities` | Liste des villes |
| POST | `/api/reports` | Soumettre un signalement |
| GET | `/api/alerts` | Alertes officielles actives |
| GET | `/api/spots` | Lieux de charge |
| POST | `/api/spots` | Ajouter un lieu |
| POST | `/api/admin/login` | Authentification admin |
| GET | `/api/admin/stats` | Stats globales (JWT) |
| GET | `/api/admin/reports` | Signalements actifs (JWT) |
| POST | `/api/admin/reports/:id/flag` | Flaguer spam (JWT) |
| POST | `/api/admin/alerts` | Publier alerte ENEO (JWT) |

## Déploiement production

### VPS Cameroun (recommandé : Camtel Cloud ou DigitalOcean Dakar)

```bash
# Sur le serveur
npm run build
# API avec PM2
pm2 start apps/api/dist/index.js --name powerwatch-api
# Web avec Next.js standalone
pm2 start apps/web/.next/standalone/server.js --name powerwatch-web
```

### Nginx (reverse proxy)
```nginx
server {
    listen 80;
    server_name powerwatch.cm;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

## Évolutions suggérées

1. **Polygones précis** — Remplacer les carrés du seed par de vrais polygones OSM des quartiers
2. **SMS fallback** — Intégration Orange/MTN API pour signaler par SMS (utilisateurs sans data)
3. **USSD** — `*123#` pour signaler depuis un téléphone basique
4. **Prédiction** — ML simple sur l'historique pour prédire les heures de coupure par quartier
5. **Partenariats ENEO** — Accès à l'API officielle pour confirmer les maintenances planifiées
