# ══════════════════════════════════════════════════════════════════
#  backend/Dockerfile  — optimised for layer caching
#  Cache order: system deps → npm deps → prisma → TS build → runtime
# ══════════════════════════════════════════════════════════════════

# ── Stage 1: prod dependencies only (cached until package.json changes)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
COPY prisma ./prisma/
# Install prod deps + generate prisma client in one cached layer
RUN npm install --omit=dev --prefer-offline && \
    npx prisma generate

# ── Stage 2: TypeScript build (reuses deps layer, cached until src changes)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
# Copy package files first — npm install layer is cached until these change
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install --prefer-offline
# Copy source AFTER install so source changes don't bust the npm cache
COPY src ./src/
RUN npx prisma generate && \
    npm run build && \
    ls -la dist/server.js

# ── Stage 3: Lean runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install yt-dlp as a standalone binary directly from GitHub releases.
# Avoids pip layer-caching which causes Docker to serve stale versions;
# YouTube breaks old yt-dlp frequently. The binary is self-updating via -U.
#
# ffmpeg is installed here (not copied from a build stage) so that apk
# installs the binary AND all shared libraries it depends on (libavcodec,
# libavformat, libavutil, libswscale, libswresample, libavfilter, etc.).
# Copying only the ffmpeg binary without its .so files causes:
#   "Error relocating /usr/bin/ffmpeg: symbol not found" (exit code 127)
RUN apk add --no-cache openssl wget python3 py3-pip ca-certificates ffmpeg git && \
    wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --version && \
    ffmpeg -version 2>&1 | head -1 && \
    addgroup -g 1001 -S nodejs && \
    adduser  -S fastify -u 1001

# ── bgutil PO token provider for yt-dlp (prebuilt version)
# ── bgutil PO token provider (server required for PO tokens)
# bgutil PO token provider
# bgutil PO token provider
RUN apk add --no-cache \
python3 \
py3-pip \
git \
npm \
pkgconfig \
pixman-dev \
cairo-dev \
pango-dev \
jpeg-dev \
giflib-dev \
build-base && \
pip3 install --break-system-packages bgutil-ytdlp-pot-provider && \
git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-ytdlp-pot-provider && \
cd /opt/bgutil-ytdlp-pot-provider/server && \
npm install

COPY --from=deps    --chown=fastify:nodejs /app/node_modules    ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/dist            ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=fastify:nodejs /app/package.json    ./package.json
COPY --chown=fastify:nodejs docker-entrypoint.sh                ./docker-entrypoint.sh

USER fastify
EXPOSE 4000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
