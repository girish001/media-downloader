#!/bin/sh
set -e

# ── yt-dlp self-update ─────────────────────────────────────────────────────
echo "[entrypoint] Updating yt-dlp to latest release..."
# Use pip3 to update yt-dlp — pip package includes the EJS/n-challenge solver
# that the standalone binary does NOT have.
if pip3 install --upgrade --break-system-packages yt-dlp > /dev/null 2>&1; then
  export YTDLP_PATH=$(which yt-dlp)
  echo "[entrypoint] yt-dlp updated via pip: $($YTDLP_PATH --version 2>/dev/null)"
else
  echo "[entrypoint] WARNING: pip3 update failed, using installed version"
  export YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo '/usr/local/bin/yt-dlp')
fi
echo "[entrypoint] Deno: $(deno --version 2>/dev/null | head -1 || echo 'not available')"
echo "[entrypoint] Node.js: $(node --version 2>/dev/null || echo 'not available')"
export DENO_PATH=$(which deno 2>/dev/null || echo '')

# ── yt-dlp JavaScript runtime config ──────────────────────────────────────
# yt-dlp needs Node.js to solve YouTube's n-challenge (stream URL decryption)
# Without this, formats are found but stream URLs return 403 Forbidden
# Create yt-dlp config to explicitly set the Node.js path
mkdir -p /tmp/.config/yt-dlp
cat > /tmp/.config/yt-dlp/config << 'YTDLP_CONFIG'
# yt-dlp config for Railway/Alpine container
# Node.js path for n-challenge solver
YTDLP_CONFIG
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config
echo "[entrypoint] yt-dlp config written (Node.js runtime: $(which node 2>/dev/null || echo 'not found'))"

# ── YouTube cookies ────────────────────────────────────────────────────────
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"

  # Step 1: Strip ALL whitespace (Railway injects \r\n into long env vars)
  # Use printf not echo — echo adds a trailing newline that corrupts base64 decode
  CLEAN_B64=$(printf '%s' "$YT_COOKIES_BASE64" | tr -d '\r\n\t ')

  # Step 2: Decode
  printf '%s' "$CLEAN_B64" | base64 -d > /tmp/yt-cookies.txt 2>/dev/null \
    || printf '%s' "$CLEAN_B64" | base64 --decode > /tmp/yt-cookies.txt 2>/dev/null \
    || true

  # Step 3: Strip UTF-8 BOM if present (0xEF 0xBB 0xBF)
  # Windows tools often prepend BOM to text files — this breaks yt-dlp's Python parser
  if [ -f /tmp/yt-cookies.txt ]; then
    BOM=$(head -c 3 /tmp/yt-cookies.txt | od -An -tx1 | tr -d ' \n')
    if [ "$BOM" = "efbbbf" ]; then
      echo "[entrypoint] Stripping UTF-8 BOM from cookies file"
      tail -c +4 /tmp/yt-cookies.txt > /tmp/yt-cookies-clean.txt
      mv /tmp/yt-cookies-clean.txt /tmp/yt-cookies.txt
    fi
  fi

  # Step 4: Validate
  COOKIE_SIZE=$(wc -c < /tmp/yt-cookies.txt 2>/dev/null || echo 0)
  COOKIE_FIRST=$(head -1 /tmp/yt-cookies.txt 2>/dev/null | tr -d '\r' || echo "")
  echo "[entrypoint] Cookie file first line: $COOKIE_FIRST"
  echo "[entrypoint] Cookie file size: ${COOKIE_SIZE} bytes"

  if [ "$COOKIE_SIZE" -gt 100 ]; then
    export YT_COOKIES_FILE=/tmp/yt-cookies.txt
    # Count actual cookies (non-comment, non-empty lines)
    COOKIE_COUNT=$(grep -v "^#" /tmp/yt-cookies.txt | grep -v "^$" | wc -l || echo 0)
    echo "[entrypoint] YouTube cookies loaded OK — ${COOKIE_COUNT} cookies, ${COOKIE_SIZE} bytes"
    if [ "$COOKIE_COUNT" -lt 10 ]; then
      echo "[entrypoint] WARNING: Only ${COOKIE_COUNT} cookies found. YouTube auth needs 20+ cookies."
      echo "[entrypoint] Ensure you exported while LOGGED INTO YouTube and used 'Get cookies.txt LOCALLY' extension"
    fi
  else
    echo "[entrypoint] WARNING: Cookie file too small (${COOKIE_SIZE} bytes) — likely corrupt"
    echo "[entrypoint] Re-export using: base64 -w 0 cookies.txt (Linux/Mac)"
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
