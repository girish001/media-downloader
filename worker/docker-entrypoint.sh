#!/bin/sh
set -e

export YTDLP_PATH=$(which yt-dlp)
echo "[worker] yt-dlp: $(yt-dlp --version 2>/dev/null) at $YTDLP_PATH"
echo "[worker] Deno:   $(deno --version 2>/dev/null | head -1 || echo 'NOT FOUND - n-challenge WILL FAIL')"
echo "[worker] Node:   $(node --version)"

mkdir -p /tmp/.config/yt-dlp /tmp/.cache /tmp/.local/share
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config
export XDG_CACHE_HOME=/tmp/.cache
export XDG_DATA_HOME=/tmp/.local/share

if [ -n "$YT_COOKIES_BASE64" ]; then
  CLEAN=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')
  printf '%s' "$CLEAN" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null || true
  BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n' 2>/dev/null || echo "")
  [ "$BOM" = "efbbbf" ] && tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-c2.txt && mv /tmp/yt-c2.txt /tmp/yt-cookies.txt
  SZ=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  CN=$(grep -vc "^#\|^$" /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  echo "[worker] Cookies: ${CN} cookies, ${SZ} bytes"
  [ "$SZ" -gt 100 ] && export YT_COOKIES_FILE=/tmp/yt-cookies.txt \
    && echo "[worker] Cookies OK" || echo "[worker] WARNING: Cookies invalid"
fi

echo "[worker] Starting..."
exec node dist/index.js
