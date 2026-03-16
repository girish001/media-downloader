# ══════════════════════════════════════════════════════════════════
#  worker/Dockerfile
#  Cache order: system deps → npm deps → TS build → runtime
#
#  WHY ffmpeg IS INSTALLED IN THE RUNTIME STAGE (not copied from a
#  build stage):
#
#  A previous version used a dedicated `system-tools` stage that
#  installed ffmpeg there and then copied only the binary:
#    COPY --from=system-tools /usr/bin/ffmpeg  /usr/bin/ffmpeg
#
#  This caused:
#    "Error relocating /usr/bin/ffmpeg: av_buffersink_get_color_range:
#     symbol not found"  (exit code 127)
#
#  because ffmpeg is dynamically linked against ~15 shared libraries
#  (libavcodec, libavformat, libavutil, libswscale, libswresample,
#  libavfilter, libavdevice, libx264, libopus, libvorbis, etc.).
#  Copying only the ELF binary without its .so files means the dynamic
#  linker cannot resolve symbols at runtime.
#
#  `apk add ffmpeg` installs the binary AND all transitive .so
#  dependencies atomically. Layer caching still works correctly because
#  this RUN line appears before any COPY of source code — Docker only
#  invalidates this layer when the RUN command itself changes.
# ══════════════════════════════════════════════════════════════════

# ── Stage 1: prod dependencies (cached until package.json changes)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl python3 py3-pip make g++
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --prefer-offline && \
    npx prisma generate

# ── Stage 2: TypeScript build (cached until src/ changes)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl python3 py3-pip make g++
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install --prefer-offline
COPY src ./src/
RUN npx prisma generate && \
    npx tsc --project tsconfig.json --skipLibCheck && ls -la dist/index.js

# ── Stage 3: Runtime
#   ffmpeg is installed here via apk so that all shared libraries are
#   present. yt-dlp is downloaded from GitHub releases to avoid pip
#   layer-caching serving a stale binary.
#   Both layers are cached independently from npm deps and source code.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# ── ffmpeg: install with apk so binary + all shared libs are present.
#   Kept in its own RUN layer so it is cached independently from yt-dlp
#   and from npm packages — only invalidated if this line changes.
RUN apk add --no-cache \
      openssl \
      ca-certificates \
      python3 \
      ffmpeg && \
    ffmpeg -version 2>&1 | head -1

# ── yt-dlp: download from GitHub releases.
RUN apk add --no-cache wget git python3 py3-pip && \
    wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --version

# ── bgutil PO token provider: auto-generates YouTube PO tokens so yt-dlp
#   bypasses "Sign in to confirm you're not a bot" from datacenter IPs.
#   Installs the Node.js script variant — no separate service needed.
#   The entrypoint starts it as a background HTTP server on port 4416.
#   Plugin installed via pip so yt-dlp discovers it automatically.
# Install canvas native build deps (required by bgutil server's canvas dependency)
# ── bgutil PO token provider for yt-dlp (prebuilt version)
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages bgutil-ytdlp-pot-provider && \
    echo "bgutil POT provider installed"

# ── Runtime user + temp directory
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S worker -u 1001 && \
    mkdir -p /tmp/mediaproc && \
    chown -R worker:nodejs /tmp/mediaproc && \
    chown -R worker:nodejs /tmp

COPY --from=deps    --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/dist         ./dist
COPY --chown=worker:nodejs package.json ./

# ── Worker entrypoint: decodes YT_COOKIES_BASE64 before starting ──────────
# Railway env vars have a ~4 KB limit so the Netscape cookies file is stored
# as base64. This script decodes it to /tmp/yt-cookies.txt at container start.
COPY --chown=worker:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
