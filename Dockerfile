FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm prune --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY src/lib ./src/lib

ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_PATH=/data/zineverse.sqlite

EXPOSE 8787

CMD ["npx", "tsx", "server/index.ts"]
