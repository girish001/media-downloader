#!/bin/sh
set -e

# ── yt-dlp self-update ────────────────────────────────────────────────────────
# Railway caches Docker layers so the bundled yt-dlp can go stale.
# YouTube breaks old yt-dlp frequently — update on every container start.
#
# The worker runs as non-root user 'worker' who cannot write to /usr/local/bin.
# Install the updated binary to /tmp/yt-dlp and:
#   1. Prepend /tmp to PATH (for any shell-based invocations)
#   2. Export YTDLP_PATH=/tmp/yt-dlp (for Node.js process.env reads)
#
# FIX: The old entrypoint only prepended /tmp to PATH but did NOT export
# YTDLP_PATH. Node.js inherits env vars at exec() time, BEFORE the shell's
# PATH modification takes effect. So Node.js was silently using the stale
# bundled /usr/local/bin/yt-dlp instead of the freshly updated /tmp/yt-dlp.
# Exporting YTDLP_PATH explicitly fixes this.
echo "[worker-entrypoint] Updating yt-dlp to latest release..."
if wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -O /tmp/yt-dlp 2>/dev/null; then
  chmod a+rx /tmp/yt-dlp
  export PATH="/tmp:$PATH"
  export YTDLP_PATH=/tmp/yt-dlp
  echo "[worker-entrypoint] yt-dlp updated: $(/tmp/yt-dlp --version 2>/dev/null || echo 'version check failed')"
else
  echo "[worker-entrypoint] WARNING: yt-dlp update failed (no network?), using bundled version"
  export YTDLP_PATH=/usr/local/bin/yt-dlp
  /usr/local/bin/yt-dlp --version 2>/dev/null || true
fi

# ── YouTube cookies: decode base64 env var → temp file ───────────────────────
# Railway env vars have a ~4 KB limit, so the raw Netscape cookies file is
# stored as a base64-encoded string in YT_COOKIES_BASE64.
# We decode it here at startup to /tmp/yt-cookies.txt and set
# YT_COOKIES_FILE so the worker picks it up automatically via process.env.
if [ -n "$YT_COOKIES_BASE64" ]; then
  echo "[worker-entrypoint] Decoding YT_COOKIES_BASE64 → /tmp/yt-cookies.txt"
  echo "$YT_COOKIES_BASE64" | base64 -d > /tmp/yt-cookies.txt
  export YT_COOKIES_FILE=/tmp/yt-cookies.txt
  echo "[worker-entrypoint] YouTube cookies file written ($(wc -c < /tmp/yt-cookies.txt) bytes)"
else
  echo "[worker-entrypoint] YT_COOKIES_BASE64 not set — running without YouTube cookies"
fi

echo "[worker-entrypoint] Starting worker..."
exec node dist/index.js
