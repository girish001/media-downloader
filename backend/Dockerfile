# ══════════════════════════════════════════════════════════════════
#  backend/Dockerfile
#  CACHE_BUST: 20260315
# ══════════════════════════════════════════════════════════════════

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --prefer-offline && \
    npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install --prefer-offline
COPY src ./src/
RUN npx prisma generate && \
    npm run build && \
    ls -la dist/server.js

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# ── System tools + ffmpeg ─────────────────────────────────────────
RUN apk add --no-cache \
      openssl wget curl ca-certificates \
      python3 py3-pip \
      ffmpeg && \
    ffmpeg -version 2>&1 | head -1

# ── yt-dlp NIGHTLY binary ─────────────────────────────────────────
# The stable release (2026.03.13) has a broken n-challenge solver.
# The nightly build contains fixes that haven't landed in stable yet.
# We download from the nightly-builds repo, not the main releases.
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
         -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    echo "yt-dlp nightly: $(yt-dlp --version)"

# ── App user ──────────────────────────────────────────────────────
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S fastify -u 1001

COPY --from=deps    --chown=fastify:nodejs /app/node_modules    ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/dist            ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=fastify:nodejs /app/package.json    ./package.json
COPY --chown=fastify:nodejs docker-entrypoint.sh                ./docker-entrypoint.sh

USER fastify
EXPOSE 4000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
