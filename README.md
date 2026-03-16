# MediaProc — Development Setup

A media downloader platform with a Fastify backend, BullMQ worker (FFmpeg + yt-dlp), PostgreSQL, Redis, Next.js frontend, and Nginx. Everything runs locally with a single Docker Compose command.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     localhost:80 (nginx)                 │
│   /          → frontend :3000                           │
│   /api/*     → backend  :4000                           │
│   /docs      → Swagger  :4000/docs                      │
│   /admin/queues → Bull Board :4000/admin/queues         │
└─────────────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐          ┌────▼────┐
    │ frontend│          │ backend │──── postgres :5432
    │ Next.js │          │ Fastify │──── redis    :6379
    │ :3000   │          │ :4000   │──── minio    :9000
    └─────────┘          └────┬────┘
                              │ BullMQ queue
                         ┌────▼────┐
                         │ worker  │──── minio :9000
                         │FFmpeg + │
                         │ yt-dlp  │
                         └─────────┘
```

## Services

| Service    | Port(s)        | Description                              |
|------------|---------------|------------------------------------------|
| nginx      | **80**        | Reverse proxy — main entry point         |
| frontend   | 3000          | Next.js 14 UI                            |
| backend    | **4000**      | Fastify REST API + Swagger + Bull Board  |
| worker     | —             | BullMQ consumer, FFmpeg encoder, yt-dlp  |
| postgres   | 5432          | PostgreSQL 16 database                   |
| redis      | 6379          | Redis 7 queue + rate-limit store         |
| minio      | 9000 / **9001** | Local S3-compatible storage + UI       |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / Mac / Linux)
- Docker Compose v2 (bundled with Docker Desktop)

### 1. Clone / unzip the project

```bash
cd mediaproc-dev
```

### 2. Start everything

```bash
docker compose up --build
```

> First build takes ~5–10 minutes (downloads FFmpeg, yt-dlp, npm packages).  
> Subsequent starts are fast (layers are cached).

### 3. Open the app

| URL                              | What it is                  |
|----------------------------------|-----------------------------|
| http://localhost                 | Main app (via nginx)        |
| http://localhost:4000/docs       | Swagger API docs            |
| http://localhost:4000/admin/queues | Bull Board queue monitor  |
| http://localhost:9001            | MinIO console (S3 UI)       |

MinIO login: **minioadmin** / **minioadmin**

---

## What Was Fixed

This is a refactored version of the original project. The following issues were resolved:

### 1. `npm ci` → `npm install` (all Dockerfiles)
All three Dockerfiles (`backend`, `worker`, `frontend`) used `npm ci`, which requires a `package-lock.json`. Since no lock files existed, every build failed. Fixed by switching to `npm install`.

### 2. Missing `execa` dependency in worker
`worker/src/ffmpeg.ts` and `worker/src/index.ts` import `execa` but it was not listed in `worker/package.json`. Added `"execa": "^9.3.0"` to worker dependencies.

### 3. Frontend Dockerfile fixed
The original Dockerfile copied `.next/standalone` output (a Node.js server bundle). The new Dockerfile uses the standard `next start` approach: it copies the full `.next` build directory and `node_modules`, then runs `npm run start`. This is simpler and works without any special Next.js config.

`output: 'standalone'` has been **removed** from `next.config.js` to avoid confusion. It can be re-added for production.

### 4. Missing frontend files
The original project was missing required Next.js App Router files:
- `src/app/layout.tsx` — root layout (required by App Router)
- `src/app/page.tsx` — home/landing page
- `src/app/globals.css` — global styles with Tailwind directives
- `tailwind.config.ts` — Tailwind configuration
- `postcss.config.js` — PostCSS configuration

All have been added.

### 5. Docker Compose simplified for development
Removed production-only services:
- ~~`certbot-init`~~ — Let's Encrypt (not needed locally)
- ~~`certbot-renew`~~ — SSL renewal daemon
- ~~`postgres-backup`~~ — daily pg_dump
- ~~`admin-dashboard`~~ — incomplete React/Vite admin SPA

Removed Docker file-based secrets (replaced with plain env vars).  
Removed `deploy.replicas` (not supported by plain `docker compose`).  
Removed internal/external network split (single `internal` bridge network).

### 6. Added MinIO for local S3
The worker requires S3-compatible storage. Instead of requiring real AWS credentials, **MinIO** is included as a local S3 service. A `minio-init` one-shot container creates the `mediaproc` bucket automatically on first run.

### 7. Nginx simplified
Replaced the production nginx config (which referenced `admin-dashboard`, TLS certs, Let's Encrypt webroot, and OCSP stapling) with a clean development config that proxies `/api/*` to the backend and everything else to the frontend.

---

## Useful Commands

```bash
# Start all services (build on first run)
docker compose up --build

# Start in background
docker compose up -d --build

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f worker

# Stop all services
docker compose down

# Stop and remove all data volumes (full reset)
docker compose down -v

# Rebuild a single service
docker compose build backend
docker compose up -d backend

# Scale workers (run 3 parallel worker instances)
docker compose up -d --scale worker=3

# Open a shell in the backend container
docker compose exec backend sh

# Run Prisma Studio (database GUI)
docker compose exec backend npx prisma studio

# Update yt-dlp inside a running worker
docker compose exec worker pip3 install --break-system-packages --upgrade yt-dlp
```

---

## Prisma / Database

Migrations run automatically on backend startup via `npx prisma migrate deploy`.

The initial schema is created from `backend/prisma/migrations/0001_initial.sql`, which PostgreSQL runs as an init script on first container start.

To reset the database completely:

```bash
docker compose down -v          # removes postgres_data volume
docker compose up -d postgres   # re-initialises with fresh schema
```

---

## Environment Variables

All variables are pre-set in `docker-compose.yml` for local development. Copy `.env.example` to `.env` if you need to override anything.

For a real deployment, replace:
- `devpassword123` with a strong database password
- `devredis123` with a strong Redis password
- `minioadmin` with real AWS/S3 credentials
- Add `SENTRY_DSN` for error tracking
- Add `IG_SESSION_ID` for Instagram private content

---

## Project Structure

```
mediaproc-dev/
├── docker-compose.yml          ← Dev compose (start here)
├── .env.example                ← Environment variable reference
├── nginx/
│   └── nginx.dev.conf          ← Dev reverse proxy config
├── backend/
│   ├── Dockerfile              ← Fixed (npm install)
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── server.ts           ← Fastify entry point
│       ├── routes/             ← parse, download, status, preview, admin
│       ├── services/           ← redis, storage, analytics, cleanup
│       ├── queue/              ← BullMQ queue singleton
│       ├── plugins/            ← swagger, bullboard, sentry
│       ├── extractors/         ← YouTube, Instagram, Facebook, generic
│       └── db/prisma.ts
├── worker/
│   ├── Dockerfile              ← Fixed (npm install + execa dep)
│   ├── package.json            ← Fixed (added execa)
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            ← BullMQ worker entry point
│       ├── ffmpeg.ts           ← FFmpeg arg builder + runner
│       └── storage.ts          ← S3 upload helper
└── frontend/
    ├── Dockerfile              ← Fixed (npm install, next start)
    ├── package.json
    ├── next.config.js          ← Fixed (standalone removed)
    ├── tailwind.config.ts      ← Added
    ├── postcss.config.js       ← Added
    └── src/
        ├── app/
        │   ├── layout.tsx      ← Added (was missing)
        │   ├── page.tsx        ← Added (home page, was missing)
        │   ├── globals.css     ← Added (Tailwind directives)
        │   ├── youtube-video-download/page.tsx
        │   ├── instagram-reels-download/page.tsx
        │   └── facebook-video-download/page.tsx
        └── components/
            └── DownloaderWidget.tsx
```
