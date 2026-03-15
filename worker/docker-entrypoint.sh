#!/bin/sh
set -e

# ── yt-dlp update via pip ──────────────────────────────────────────────────
echo "[worker-entrypoint] Updating yt-dlp..."
pip3 install --upgrade --break-system-packages yt-dlp > /dev/null 2>&1 && \
  echo "[worker-entrypoint] yt-dlp: $(yt-dlp --version 2>/dev/null)" || \
  echo "[worker-entrypoint] WARNING: yt-dlp pip update failed"
export YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo '/usr/local/bin/yt-dlp')

# ── Verify EJS solver ─────────────────────────────────────────────────────
echo "[worker-entrypoint] yt-dlp-nce: $(yt-dlp-nce --version 2>/dev/null || echo 'checking...')"
echo "[worker-entrypoint] Node.js: $(node --version 2>/dev/null)"

# ── yt-dlp config ─────────────────────────────────────────────────────────
mkdir -p /tmp/.config/yt-dlp
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config

# ── YouTube cookies ────────────────────────────────────────────────────────
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[worker-entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  CLEAN_B64=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')
  printf '%s' "$CLEAN_B64" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN_B64" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true
  BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n')
  if [ "$BOM" = "efbbbf" ]; then
    tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-cookies-clean.txt
    mv /tmp/yt-cookies-clean.txt /tmp/yt-cookies.txt
  fi
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_FIRST=$(head -1 /tmp/yt-cookies.txt 2>/dev/null | tr -d '\r' || echo "")
  echo "[worker-entrypoint] Cookie file first line: $COOKIE_FIRST"
  echo "[worker-entrypoint] Cookie file size: ${COOKIE_SIZE} bytes"
  if [ "$COOKIE_SIZE" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    COOKIE_COUNT=$(grep -v "^#" /tmp/yt-cookies.txt | grep -v "^$" | wc -l || echo 0)
    echo "[worker-entrypoint] YouTube cookies OK — ${COOKIE_COUNT} cookies, ${COOKIE_SIZE} bytes"
  else
    echo "[worker-entrypoint] WARNING: Cookie file too small — running without cookies"
  fi
else
  echo "[worker-entrypoint] YT_COOKIES_BASE64 not set — running without cookies"
fi

echo "[worker-entrypoint] Starting worker..."
exec node dist/index.js
