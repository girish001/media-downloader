#!/bin/sh
set -e

# ── yt-dlp self-update ─────────────────────────────────────────────────────
echo "[entrypoint] Updating yt-dlp to latest release..."
if wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -O /tmp/yt-dlp 2>/dev/null; then
  chmod a+rx /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  export YTDLP_PATH=/tmp/yt-dlp
  echo "[entrypoint] yt-dlp updated: $(/tmp/yt-dlp --version 2>/dev/null || echo 'check failed')"
else
  echo "[entrypoint] WARNING: yt-dlp update failed, using bundled version"
  export YTDLP_PATH=/usr/local/bin/yt-dlp
fi

# ── YouTube cookies ────────────────────────────────────────────────────────
# FIX: Use printf (not echo) to avoid adding a trailing newline before decode.
# Use tr -d to strip any \r \n or spaces Railway may inject into the env var.
# This fixes: "'utf-8' codec can't decode byte 0x88" errors from corrupt cookies.
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n ' | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n ' | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_HEAD=$(head -c 30 /tmp/yt-cookies.txt 2>/dev/null || echo "")
  if echo "$COOKIE_HEAD" | grep -q "Netscape\|youtube\|#"; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[entrypoint] Cookies OK (${COOKIE_SIZE} bytes)"
  else
    echo "[entrypoint] WARNING: Cookies file invalid — first 30 bytes: $COOKIE_HEAD"
    echo "[entrypoint] Re-export your cookies: base64 -w 0 cookies.txt"
    echo "[entrypoint] Running without cookies"
  fi
else
  echo "[entrypoint] YT_COOKIES_BASE64 not set — running without cookies"
fi

# ── Database migrations ────────────────────────────────────────────────────
echo "[entrypoint] Applying database migrations..."
MIGRATE_OUT=$(npx prisma migrate deploy 2>&1) && MIGRATE_EXIT=0 || MIGRATE_EXIT=$?
echo "$MIGRATE_OUT"
if [ "$MIGRATE_EXIT" != "0" ]; then
  if echo "$MIGRATE_OUT" | grep -q "P3005"; then
    echo "[entrypoint] P3005 — baselining migration..."
    npx prisma migrate resolve --applied "20260101000000_add_144p_240p_formats"
    npx prisma migrate deploy
  else
    echo "[entrypoint] Migration failed. Aborting." >&2
    exit 1
  fi
fi

echo "[entrypoint] Migrations complete. Starting server..."
exec node dist/server.js
