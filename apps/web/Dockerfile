# Web PowerWatch : Next.js 14 PWA
# Build depuis la racine du monorepo :
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.mondomaine.cm .
FROM node:20-alpine

WORKDIR /app
# NODE_ENV=production est mis APRÈS le build (voir apps/api/Dockerfile)
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* est figé au moment du build : passé en build-arg
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @powerwatch/web

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@powerwatch/web"]
