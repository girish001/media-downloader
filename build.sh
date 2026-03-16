#!/bin/sh
# ════════════════════════════════════════════════════════════════
#  build.sh — Fast parallel Docker build with layer caching
#
#  First build:  ~3-5 min  (downloads ffmpeg, yt-dlp, npm packages)
#  Subsequent:   ~20-60s   (only rebuilds changed layers)
#
#  Usage:
#    ./build.sh          # build + start
#    ./build.sh --clean  # force full rebuild (clears cache)
#    ./build.sh --down   # stop and remove containers
# ════════════════════════════════════════════════════════════════
set -e

if [ "$1" = "--down" ]; then
  docker compose down
  exit 0
fi

if [ "$1" = "--clean" ]; then
  echo "🧹 Clearing build cache..."
  rm -rf /tmp/buildcache
  docker compose down --rmi local 2>/dev/null || true
fi

echo "🔨 Building images in parallel..."
# COMPOSE_PARALLEL_LIMIT controls how many builds run simultaneously
export COMPOSE_PARALLEL_LIMIT=3
export DOCKER_BUILDKIT=1

docker compose build --parallel

echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "✅ All services started:"
echo "   App:        http://localhost"
echo "   API:        http://localhost:4000"
echo "   Swagger:    http://localhost:4000/docs"
echo "   Bull Board: http://localhost:4000/admin/queues"
echo "   MinIO UI:   http://localhost:9001"
echo ""
echo "📋 Logs: docker compose logs -f"
