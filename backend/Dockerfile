# ══════════════════════════════════════════════════════════════════
#  backend/Dockerfile
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

# ── yt-dlp via pip (Python package) ──────────────────────────────
RUN pip3 install --upgrade --break-system-packages yt-dlp && \
    yt-dlp --version

# ── yt-dlp EJS solver for Node.js (n-challenge solver) ───────────
# Node.js 20 is already available in this image.
# yt-dlp needs the "yt-dlp-nce" npm package to use Node.js as its
# JavaScript runtime for solving YouTube's n-challenge parameter.
# Without this, yt-dlp cannot decrypt stream URLs → HTTP 403.
RUN npm install -g yt-dlp-nce && \
    echo "yt-dlp-nce installed: $(yt-dlp-nce --version 2>/dev/null || echo 'ok')"

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
