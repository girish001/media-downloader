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

# ── System tools ──────────────────────────────────────────────────
RUN apk add --no-cache \
      openssl wget curl ca-certificates unzip \
      python3 py3-pip \
      ffmpeg && \
    ffmpeg -version 2>&1 | head -1

# ── yt-dlp via pip (full Python package with EJS support) ─────────
RUN pip3 install --upgrade --break-system-packages yt-dlp && \
    yt-dlp --version

# ── Deno — yt-dlp's preferred EJS/n-challenge solver ─────────────
# unzip is now installed above so this will succeed
RUN wget -q https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-musl.zip \
         -O /tmp/deno.zip 2>/dev/null && \
    unzip -q /tmp/deno.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/deno && \
    rm -f /tmp/deno.zip && \
    echo "Deno: $(deno --version 2>&1 | head -1)" || \
    echo "WARNING: Deno install failed (non-fatal, Node.js fallback will be used)"

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
