#!/bin/sh
set -e

# DO NOT download standalone yt-dlp binary at startup.
# The pip-installed yt-dlp has bundled EJS scripts that work with Deno.
# The standalone binary loses the EJS script bundle.
export YTDLP_PATH=$(which yt-dlp)

echo "[entrypoint] yt-dlp: $(yt-dlp --version 2>/dev/null) at $YTDLP_PATH"
echo "[entrypoint] Deno:   $(deno --version 2>/dev/null | head -1 || echo 'NOT FOUND - n-challenge WILL FAIL')"
echo "[entrypoint] Node:   $(node --version)"

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

  echo "[entrypoint] Cookies: ${CN} cookies, ${SZ} bytes"

  if [ "$SZ" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[entrypoint] Cookies OK"
  else
    echo "[entrypoint] WARNING: Cookies too small"
  fi
else
  echo "[entrypoint] No YT_COOKIES_BASE64"
fi

echo "[entrypoint] Running migrations..."

# run migrations if available
npx prisma migrate deploy || echo "[entrypoint] migrate deploy skipped"

# ensure database schema always matches prisma schema
echo "[entrypoint] Syncing schema..."

# Force reset DB schema so enum values update
npx prisma db push --force-reset --accept-data-loss || true

echo "[entrypoint] Regenerating Prisma client..."
npx prisma generate || true

echo "[entrypoint] Migrations OK"

echo "[entrypoint] Starting server..."
exec node dist/server.js
