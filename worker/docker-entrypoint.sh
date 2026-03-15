#!/bin/sh
set -e

# ── yt-dlp self-update ─────────────────────────────────────────────────────
echo "[worker-entrypoint] Updating yt-dlp to latest release..."
if wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -O /tmp/yt-dlp 2>/dev/null; then
  chmod a+rx /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  export YTDLP_PATH=/tmp/yt-dlp
  echo "[worker-entrypoint] yt-dlp updated: $(/tmp/yt-dlp --version 2>/dev/null || echo 'check failed')"
else
  echo "[worker-entrypoint] WARNING: yt-dlp update failed, using bundled version"
  export YTDLP_PATH=/usr/local/bin/yt-dlp
fi

# ── YouTube cookies ────────────────────────────────────────────────────────
# FIX: printf + tr -d strips whitespace/newlines Railway injects into env vars.
# This fixes: "'utf-8' codec can't decode byte 0x88" errors.
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[worker-entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n ' | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n ' | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_HEAD=$(head -c 30 /tmp/yt-cookies.txt 2>/dev/null || echo "")
  if echo "$COOKIE_HEAD" | grep -q "Netscape\|youtube\|#"; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[worker-entrypoint] Cookies OK (${COOKIE_SIZE} bytes)"
  else
    echo "[worker-entrypoint] WARNING: Cookies invalid — first 30 bytes: $COOKIE_HEAD"
    echo "[worker-entrypoint] Re-export: base64 -w 0 cookies.txt"
    echo "[worker-entrypoint] Running without cookies"
  fi
else
  echo "[worker-entrypoint] YT_COOKIES_BASE64 not set — running without cookies"
fi

echo "[worker-entrypoint] Starting worker..."
exec node dist/index.js
