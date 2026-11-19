# API PowerWatch : Node 20 + Express + Socket.io + Prisma
# Build depuis la racine du monorepo : docker build -f apps/api/Dockerfile .
FROM node:20-alpine

WORKDIR /app
# NODE_ENV=production est mis APRÈS le build : sinon npm ci saute les
# devDependencies (typescript, prisma CLI, tsx) et le build échoue.

# OpenSSL requis par le query engine Prisma sur Alpine
RUN apk add --no-cache openssl

# Manifests d'abord pour profiter du cache Docker
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

# Sources + génération Prisma + build TypeScript
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate --schema=packages/shared/prisma/schema.prisma \
 && npm run build -w @powerwatch/api

ENV NODE_ENV=production
EXPOSE 4000

# Au démarrage : synchronise le schéma et le seed (idempotent), puis lance l'API
CMD ["sh", "-c", "npm run db:push -w @powerwatch/api && npm run db:seed -w @powerwatch/api; npm run start -w @powerwatch/api"]
