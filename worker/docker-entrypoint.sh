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
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[worker-entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"

  CLEAN_B64=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')
  printf '%s' "$CLEAN_B64" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN_B64" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true

  # Strip UTF-8 BOM if present (Windows exports)
  if [ -f /tmp/yt-cookies.txt ]; then
    BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n')
    if [ "$BOM" = "efbbbf" ]; then
      echo "[worker-entrypoint] Stripping UTF-8 BOM from cookies file"
      tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-cookies-clean.txt
      mv /tmp/yt-cookies-clean.txt /tmp/yt-cookies.txt
    fi
  fi

  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_FIRST=$(head -1 /tmp/yt-cookies.txt 2>/dev/null | tr -d '\r' || echo "")
  echo "[worker-entrypoint] Cookie file first line: $COOKIE_FIRST"
  echo "[worker-entrypoint] Cookie file size: ${COOKIE_SIZE} bytes"

  if [ "$COOKIE_SIZE" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[worker-entrypoint] YouTube cookies loaded OK"
  else
    echo "[worker-entrypoint] WARNING: Cookie file too small — likely corrupt"
    echo "[worker-entrypoint] Running without cookies"
  fi
else
  echo "[worker-entrypoint] YT_COOKIES_BASE64 not set — running without cookies"
fi

echo "[worker-entrypoint] Starting worker..."
exec node dist/index.js
