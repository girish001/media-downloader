#!/bin/sh
set -e

# ── yt-dlp update via pip ──────────────────────────────────────────────────
echo "[entrypoint] Updating yt-dlp..."
pip3 install --upgrade --break-system-packages yt-dlp > /dev/null 2>&1 && \
  echo "[entrypoint] yt-dlp: $(yt-dlp --version 2>/dev/null)" || \
  echo "[entrypoint] WARNING: yt-dlp pip update failed"
export YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo '/usr/local/bin/yt-dlp')

# ── Verify EJS solver (yt-dlp-nce) ────────────────────────────────────────
NCE_PATH=$(which yt-dlp-nce 2>/dev/null || npm root -g 2>/dev/null | head -1)
echo "[entrypoint] yt-dlp-nce: $(yt-dlp-nce --version 2>/dev/null || echo 'checking...')"
echo "[entrypoint] Node.js: $(node --version 2>/dev/null)"

# ── yt-dlp config (home dir for config files) ─────────────────────────────
mkdir -p /tmp/.config/yt-dlp
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config

# ── YouTube cookies ────────────────────────────────────────────────────────
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  CLEAN_B64=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')
  printf '%s' "$CLEAN_B64" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN_B64" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true
  # Strip UTF-8 BOM if present
  BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n')
  if [ "$BOM" = "efbbbf" ]; then
    tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-cookies-clean.txt
    mv /tmp/yt-cookies-clean.txt /tmp/yt-cookies.txt
  fi
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_FIRST=$(head -1 /tmp/yt-cookies.txt 2>/dev/null | tr -d '\r' || echo "")
  echo "[entrypoint] Cookie file first line: $COOKIE_FIRST"
  echo "[entrypoint] Cookie file size: ${COOKIE_SIZE} bytes"
  if [ "$COOKIE_SIZE" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    COOKIE_COUNT=$(grep -v "^#" /tmp/yt-cookies.txt | grep -v "^$" | wc -l || echo 0)
    echo "[entrypoint] YouTube cookies loaded OK — ${COOKIE_COUNT} cookies, ${COOKIE_SIZE} bytes"
  else
    echo "[entrypoint] WARNING: Cookie file too small — running without cookies"
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
