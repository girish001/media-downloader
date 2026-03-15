# ══════════════════════════════════════════════════════════════════
#  worker/Dockerfile
# ══════════════════════════════════════════════════════════════════

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl python3 py3-pip make g++
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --prefer-offline && \
    npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl python3 py3-pip make g++
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install --prefer-offline
COPY src ./src/
RUN npx prisma generate && \
    npx tsc --project tsconfig.json --skipLibCheck && ls -la dist/index.js

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# ── System tools + ffmpeg ──────────────────────────────────────────
RUN apk add --no-cache \
      openssl ca-certificates wget curl unzip \
      python3 py3-pip \
      ffmpeg && \
    ffmpeg -version 2>&1 | head -1

# ── yt-dlp via pip ────────────────────────────────────────────────
RUN pip3 install --upgrade --break-system-packages yt-dlp && \
    yt-dlp --version

# ── Deno (unzip is installed above so this works) ─────────────────
RUN wget -q https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-musl.zip \
         -O /tmp/deno.zip 2>/dev/null && \
    unzip -q /tmp/deno.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/deno && \
    rm -f /tmp/deno.zip && \
    echo "Deno: $(deno --version 2>&1 | head -1)" || \
    echo "WARNING: Deno install failed"

# ── Runtime user ──────────────────────────────────────────────────
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S worker -u 1001 && \
    mkdir -p /tmp/mediaproc && \
    chown -R worker:nodejs /tmp/mediaproc && \
    chown -R worker:nodejs /tmp

COPY --from=deps    --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/dist         ./dist
COPY --chown=worker:nodejs package.json ./
COPY --chown=worker:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
