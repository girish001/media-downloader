#!/bin/sh
set -e

# ── yt-dlp: always update to latest nightly ───────────────────────────────
echo "[worker-entrypoint] Updating yt-dlp to latest nightly..."
if wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
        -O /tmp/yt-dlp 2>/dev/null; then
  chmod a+rx /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  export YTDLP_PATH=/tmp/yt-dlp
  echo "[worker-entrypoint] yt-dlp nightly: $(/tmp/yt-dlp --version 2>/dev/null)"
else
  echo "[worker-entrypoint] WARNING: nightly download failed, using bundled version"
  export YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo '/usr/local/bin/yt-dlp')
fi

echo "[worker-entrypoint] Deno: $(deno --version 2>/dev/null | head -1 || echo 'NOT FOUND')"
echo "[worker-entrypoint] Node: $(node --version 2>/dev/null)"

mkdir -p /tmp/.config/yt-dlp /tmp/.cache
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config
export XDG_CACHE_HOME=/tmp/.cache

# ── YouTube cookies ───────────────────────────────────────────────────────
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[worker-entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  CLEAN_B64=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')
  printf '%s' "$CLEAN_B64" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN_B64" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true
  BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n' 2>/dev/null || echo "")
  if [ "$BOM" = "efbbbf" ]; then
    tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-cookies-nobom.txt
    mv /tmp/yt-cookies-nobom.txt /tmp/yt-cookies.txt
  fi
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_COUNT=$(grep -v "^#" /tmp/yt-cookies.txt 2>/dev/null | grep -vc "^$" || echo 0)
  echo "[worker-entrypoint] Cookies: ${COOKIE_COUNT} cookies, ${COOKIE_SIZE} bytes"
  if [ "$COOKIE_SIZE" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[worker-entrypoint] YouTube cookies loaded OK"
  else
    echo "[worker-entrypoint] WARNING: Cookie file too small"
  fi
else
  echo "[worker-entrypoint] YT_COOKIES_BASE64 not set"
fi

echo "[worker-entrypoint] Starting worker..."
exec node dist/index.js
