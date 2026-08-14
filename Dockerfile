FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY src ./src
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./

ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_PATH=/data/zineverse.sqlite

EXPOSE 8787

CMD ["npx", "tsx", "server/index.ts"]
