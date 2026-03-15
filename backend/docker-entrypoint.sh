#!/bin/sh
set -e

# ── yt-dlp self-update ────────────────────────────────────────────────────────
# Railway caches Docker layers so the bundled yt-dlp can go stale.
# Update to latest on every container start.
#
# FIX: Export YTDLP_PATH so Node.js uses the updated binary.
# The old entrypoint only prepended /tmp to PATH but Node.js inherits env
# at exec() time (before the PATH change takes effect). YTDLP_PATH is the
# reliable way to communicate the binary path to Node.js.
echo "[entrypoint] Updating yt-dlp to latest release..."
if wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -O /tmp/yt-dlp 2>/dev/null; then
  chmod a+rx /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  export YTDLP_PATH=/tmp/yt-dlp
  echo "[entrypoint] yt-dlp updated: $(/tmp/yt-dlp --version 2>/dev/null || echo 'version check failed')"
else
  echo "[entrypoint] WARNING: yt-dlp update failed (no network?), using bundled version"
  export YTDLP_PATH=/usr/local/bin/yt-dlp
fi

# ── YouTube cookies: decode base64 env var → temp file ───────────────────────
# Railway env vars have a ~4 KB limit, so the raw Netscape cookies file is
# stored as a base64-encoded string in YT_COOKIES_BASE64.
# We decode it here at startup to /tmp/yt-cookies.txt and set
# YT_COOKIES_FILE so the extractor picks it up automatically.
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  echo "$YT_COOKIES_BASE64" | base64 -d > /tmp/yt-cookies.txt
  export YT_COOKIES_FILE=/tmp/yt-cookies.txt
  echo "[entrypoint] YouTube cookies file written ($(wc -c < /tmp/yt-cookies.txt) bytes)"
else
  echo "[entrypoint] YT_COOKIES_BASE64 not set — running without YouTube cookies"
fi

echo "[entrypoint] Applying database migrations..."

MIGRATE_OUT=$(npx prisma migrate deploy 2>&1) && MIGRATE_EXIT=0 || MIGRATE_EXIT=$?

echo "$MIGRATE_OUT"

if [ "$MIGRATE_EXIT" != "0" ]; then
  if echo "$MIGRATE_OUT" | grep -q "P3005"; then
    echo "[entrypoint] P3005 detected — schema exists without migration history."
    echo "[entrypoint] Baselining migration: 20260101000000_add_144p_240p_formats"
    npx prisma migrate resolve --applied "20260101000000_add_144p_240p_formats"
    echo "[entrypoint] Retrying migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[entrypoint] Migration failed with unexpected error. Aborting." >&2
    exit 1
  fi
fi

echo "[entrypoint] Migrations complete. Starting server..."
exec node dist/server.js
