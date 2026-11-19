# PowerWatch Cameroun

Suivi en temps réel des coupures d'électricité au Cameroun. Application crowdsourcée, offline-first, mobile-first.

## Démarrage rapide

### Prérequis

- Node.js 20+
- PostgreSQL 14+ (ou Docker)
- npm 10+

### 1. Installation et base de données

```bash
git clone <url>
cd powerwatch-cameroun
npm install

# Démarre PostgreSQL avec Docker (optionnel si déjà installé)
docker run -d --name powerwatch-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=powerwatch \
  -p 5432:5432 \
  postgres:16

# Crée les tables et insère les données de test (villes, quartiers, admin)
npm run setup
```

`npm run setup` copie les fichiers `.env` s'ils n'existent pas, génère le client Prisma, synchronise le schéma et lance le seed. Si tu préfères faire chaque étape à la main :

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
npm run db:push
npm run db:seed
```

### 2. Lancer l'application

```bash
npm run dev
```

- API : http://localhost:4000
- Web : http://localhost:3000

### Compte admin par défaut

```
Email    : admin@powerwatch.cm
Password : PowerWatch2025!
URL      : http://localhost:3000/admin
```

Change ce mot de passe en production.

## Pages

| URL | Description |
|---|---|
| `/` | Carte interactive (Leaflet) avec heatmap |
| `/stats` | Classement des quartiers par stabilité |
| `/spots` | Lieux pour charger son téléphone |
| `/admin` | Dashboard de modération (JWT) |
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

La méthode recommandée est Docker Compose : PostgreSQL, API, web et proxy HTTPS sont lancés ensemble, le certificat SSL est automatique.

### Où déployer

N'importe quel VPS fait l'affaire. Pour le Cameroun, les options simples :

- **Hetzner** (CX22, ~4 EUR/mois) : le meilleur rapport qualité/prix, très fiable
- **OVH / Scaleway** : VPS European, correct
- **Contabo** : le moins cher, suffisant pour démarrer
- **Camtel Cloud / opérateurs locaux** : possible mais plus cher et moins documenté

Il faut juste : un VPS avec Docker installé, 1 Go de RAM minimum, et 2 sous-domaines qui pointent vers son IP (ex: `app.mondomaine.cm` et `api.mondomaine.cm`).

### Mise en ligne avec Docker (recommandé)

Sur le serveur, après avoir cloné le repo :

```bash
cp deploy/.env.example deploy/.env
# Éditer deploy/.env : domaines, mots de passe, JWT_SECRET, clés VAPID

docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

C'est tout. Au premier démarrage, l'API synchronise le schéma Prisma et insère les données de test (villes, quartiers, compte admin) automatiquement. Caddy obtient le certificat HTTPS Let's Encrypt tout seul dès que les DNS sont propagés.

Fichiers concernés : `deploy/docker-compose.yml`, `deploy/Caddyfile`, `apps/api/Dockerfile`, `apps/web/Dockerfile`.

### Alternative sans Docker

```bash
npm ci
npm run build
npm run db:push
npm run db:seed
```

Puis lancer l'API (`npm run start -w @powerwatch/api`) et le web (`npm run start -w @powerwatch/web`) avec PM2 ou systemd, derrière Nginx/Caddy avec deux sous-domaines : l'un pour l'app, l'autre pour l'API (le WebSocket Socket.io nécessite un accès direct à l'API, pas de proxy par chemin `/api`).

### Variables à configurer en production

| Variable | Où | Rôle |
|---|---|---|
| `APP_DOMAIN` / `API_DOMAIN` | `deploy/.env` | Domaines publics |
| `DB_PASSWORD` | `deploy/.env` | Mot de passe PostgreSQL |
| `JWT_SECRET` | `deploy/.env` | Secret admin (openssl rand -base64 32) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `deploy/.env` | Notifications push (npx web-push generate-vapid-keys) |
| `NEXT_PUBLIC_API_URL` | build arg web | URL publique de l'API, figée au build |
| `FRONTEND_URL` | api | Origine autorisée par le CORS |

Note : le build de l'API produit `dist/apps/api/src/index.js` à cause du `rootDir` partagé avec `packages/shared`.

## Pistes d'évolution

1. Polygones précis : remplacer les points du seed par de vrais contours OSM des quartiers
2. SMS fallback : intégration Orange/MTN API pour signaler par SMS (utilisateurs sans data)
3. USSD : `*123#` pour signaler depuis un téléphone basique
4. Partenariats ENEO : accès à l'API officielle pour confirmer les maintenances planifiées
