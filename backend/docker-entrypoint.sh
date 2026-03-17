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
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt)
  echo "[entrypoint] Cookies decoded: ${COOKIE_SIZE} bytes, $(grep -c '^[^#]' /tmp/yt-cookies.txt 2>/dev/null || echo '?') entries"

  # Strip expired ST- session tokens (exported during active video playback).
  # These tokens expire within minutes and YouTube rotates them immediately.
  # They add noise and can confuse yt-dlp. The long-lived auth cookies
  # (__Secure-1PSID, SID, SAPISID etc.) are what actually matter.
  BEFORE=$(grep -c '^[^#]' /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  grep -v $'\tST-' /tmp/yt-cookies.txt > /tmp/yt-cookies-clean.txt 2>/dev/null || cp /tmp/yt-cookies.txt /tmp/yt-cookies-clean.txt
  AFTER=$(grep -c '^[^#]' /tmp/yt-cookies-clean.txt 2>/dev/null || echo 0)
  STRIPPED=$((BEFORE - AFTER))
  if [ "$STRIPPED" -gt 0 ]; then
    echo "[entrypoint] Stripped ${STRIPPED} short-lived ST- session tokens (expired, not needed)"
    mv /tmp/yt-cookies-clean.txt /tmp/yt-cookies.txt
  else
    rm -f /tmp/yt-cookies-clean.txt
  fi

  # Check that critical auth cookies are present
  FINAL_SIZE=$(wc -c < /tmp/yt-cookies.txt)
  HAS_SID=$(grep -c '__Secure-1PSID' /tmp/yt-cookies.txt 2>/dev/null || echo 0)

  if [ "$HAS_SID" -gt 0 ]; then
    echo "[entrypoint] ✓ Critical auth cookie __Secure-1PSID found — cookies look valid"
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    echo "[entrypoint] YT_COOKIES_FILE set (${FINAL_SIZE} bytes after cleanup)"
  elif [ "$FINAL_SIZE" -lt 2000 ]; then
    echo "[entrypoint] WARNING: cookies file only ${FINAL_SIZE} bytes and missing __Secure-1PSID — likely wrong format or expired"
    echo "[entrypoint] WARNING: skipping cookies (unauthenticated mode). Re-export using Netscape format from incognito window."
  else
    echo "[entrypoint] WARNING: __Secure-1PSID not found but file is ${FINAL_SIZE} bytes — attempting to use anyway"
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
  fi
else
  echo "[entrypoint] YT_COOKIES_BASE64 not set — running without cookies"
fi


# ── bgutil PO token provider server ─────────────────────────────────────────
# Starts the bgutil HTTP server on port 4416 in the background.
# yt-dlp discovers it automatically via the installed pip plugin and uses it
# to generate PO tokens for every YouTube request — bypasses "Sign in to
# confirm you're not a bot" errors from Railway/GCP datacenter IPs.
# The server generates fresh tokens on demand and caches them for 6 hours.
if [ -d "/opt/bgutil-ytdlp-pot-provider/server" ]; then
  echo "[entrypoint] Starting bgutil PO token provider server on port 4416..."
  cd /opt/bgutil-ytdlp-pot-provider/server && \
    node dist/index.js --port 4416 &
  BGUTIL_PID=$!
  sleep 2
  if kill -0 $BGUTIL_PID 2>/dev/null; then
    echo "[entrypoint] ✓ bgutil POT server running (pid $BGUTIL_PID, port 4416)"
  else
    echo "[entrypoint] WARNING: bgutil POT server failed to start — YouTube may still work via tv client"
  fi
  cd /app
else
  echo "[entrypoint] WARNING: bgutil not found at /opt/bgutil-ytdlp-pot-provider — PO tokens disabled"
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
