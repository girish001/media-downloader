# MediaProc — Railway Deployment Guide
## Complete setup for Frontend + Backend + Worker

---

## Architecture Overview

```
Browser
  │
  ▼
Frontend (Next.js) ──/api/*──► Backend (Fastify) ──► Redis (BullMQ queue)
  │                                │                        │
  │                           PostgreSQL              Worker (yt-dlp + ffmpeg)
  │                                                         │
  └────────────────────────────────────────────────► S3/MinIO (file storage)
```

**Service flow:**
1. Frontend proxies all `/api/*` requests to Backend via `BACKEND_URL`
2. Backend enqueues jobs into Redis/BullMQ
3. Worker picks up jobs, runs yt-dlp + ffmpeg, uploads to S3/MinIO
4. Frontend polls `/api/status/:jobId` until complete
5. Backend's `/api/download-file/:jobId` streams the file to the browser

---

## Step 1 — Railway Project Setup

1. Create a new Railway project at [railway.app](https://railway.app)
2. Add these plugins from the Railway dashboard:
   - **PostgreSQL** (click + → Database → PostgreSQL)
   - **Redis** (click + → Database → Redis)
   - **MinIO** (click + → Database → MinIO) *or use external S3*

---

## Step 2 — Deploy Services

For each of the 3 services (Frontend, Backend, Worker):

1. Click **+ New** → **GitHub Repo** → select your repo
2. Go to **Settings → General → Root Directory** and set:

| Service  | Root Directory |
|----------|---------------|
| Frontend | `/frontend`   |
| Backend  | `/backend`    |
| Worker   | `/worker`     |

3. Railway auto-detects the `Dockerfile` in each folder.

---

## Step 3 — Environment Variables

### 🌐 Frontend Service

| Variable       | Value                                            | Required |
|----------------|--------------------------------------------------|----------|
| `BACKEND_URL`  | `https://<your-backend-service>.up.railway.app`  | ✅ YES   |
| `NODE_ENV`     | `production`                                     | auto     |
| `PORT`         | `3000`                                           | auto     |

> **Note:** `BACKEND_URL` is the only variable you must set manually in the
> Frontend service. Everything else is set in `frontend/railway.toml`.

---

### ⚙️ Backend Service

These are set automatically by `backend/railway.toml` — only the sensitive
ones need to be added manually in the Railway dashboard:

| Variable              | Value                                         | Required |
|-----------------------|-----------------------------------------------|----------|
| `DATABASE_URL`        | *(auto-injected by Railway Postgres plugin)*  | ✅ auto  |
| `REDIS_URL`           | *(auto-injected by Railway Redis plugin)*     | ✅ auto  |
| `S3_ACCESS_KEY`       | MinIO access key (from MinIO plugin)          | ✅ YES   |
| `S3_SECRET_KEY`       | MinIO secret key (from MinIO plugin)          | ✅ YES   |
| `S3_BUCKET`           | `mediaproc` (or your chosen bucket name)      | ✅ YES   |
| `S3_REGION`           | `auto` (MinIO) or `us-east-1` (AWS)           | ✅ YES   |
| `S3_ENDPOINT`         | `https://<minio-service>.up.railway.app`      | ✅ YES   |
| `S3_PATH_STYLE`       | `true` (MinIO) / `false` (AWS S3)             | ✅ YES   |
| `CORS_ORIGIN`         | `https://<your-frontend>.up.railway.app`      | ✅ YES   |
| `YT_COOKIES_BASE64`   | *(see Section 5 — optional but recommended)*  | ⚡ Opt  |

Set automatically by `railway.toml` (no need to add manually):

| Variable                  | Default Value  |
|---------------------------|----------------|
| `NODE_ENV`                | `production`   |
| `PORT`                    | `4000`         |
| `FILE_TTL_HOURS`          | `24`           |
| `MAX_VIDEO_SIZE_MB`       | `500`          |
| `SIGNED_URL_TTL_SEC`      | `3600`         |
| `RATE_LIMIT_DAILY_MAX`    | `20`           |
| `JOB_TIMEOUT_SEC`         | `600`          |
| `LOG_LEVEL`               | `info`         |

---

### 🔧 Worker Service

| Variable              | Value                                         | Required |
|-----------------------|-----------------------------------------------|----------|
| `DATABASE_URL`        | *(auto-injected by Railway Postgres plugin)*  | ✅ auto  |
| `REDIS_URL`           | *(auto-injected by Railway Redis plugin)*     | ✅ auto  |
| `S3_ACCESS_KEY`       | Same as Backend                               | ✅ YES   |
| `S3_SECRET_KEY`       | Same as Backend                               | ✅ YES   |
| `S3_BUCKET`           | Same as Backend                               | ✅ YES   |
| `S3_REGION`           | Same as Backend                               | ✅ YES   |
| `S3_ENDPOINT`         | Same as Backend                               | ✅ YES   |
| `S3_PATH_STYLE`       | Same as Backend                               | ✅ YES   |
| `YT_COOKIES_BASE64`   | Same as Backend (optional)                    | ⚡ Opt  |

Set automatically by `railway.toml`:

| Variable                  | Default Value  |
|---------------------------|----------------|
| `NODE_ENV`                | `production`   |
| `MAX_CONCURRENT_JOBS`     | `2`            |
| `YTDLP_TIMEOUT_SEC`       | `300`          |
| `MAX_VIDEO_DURATION_SEC`  | `7200`         |
| `TMP_DIR`                 | `/tmp/mediaproc` |

---

## Step 4 — MinIO Setup

After Railway creates the MinIO plugin:

1. Open **MinIO plugin → Connect** → copy the credentials
2. Open the MinIO web console URL
3. Create a bucket named `mediaproc` (or whatever you set in `S3_BUCKET`)
4. Set bucket policy to **public** for the `outputs/` prefix (for signed URL access)
5. Note the **S3_ENDPOINT** — it's the MinIO service URL, e.g.:
   ```
   https://minio-production-xyz.up.railway.app
   ```

### MinIO CORS Configuration (required)

In the MinIO console → **Buckets → mediaproc → Anonymous Access**,
or via `mc` CLI:

```sh
mc alias set railway https://your-minio.up.railway.app ACCESSKEY SECRETKEY
mc anonymous set download railway/mediaproc/outputs
```

Or add a CORS policy via the MinIO console:
```json
[
  {
    "AllowedOrigins": ["https://your-frontend.up.railway.app"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

> **Note:** Even without CORS configured, downloads work because the backend's
> `/api/download-file/:jobId` proxy endpoint fetches from S3 server-side
> and streams to the browser with `Content-Disposition: attachment`.

---

## Step 5 — YouTube Cookies (Recommended)

Without cookies, YouTube may block some videos from Railway's datacenter IPs.

### Generate cookies:
1. Install the [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie) browser extension
2. Log in to YouTube in Chrome
3. Go to `youtube.com`, click the EditThisCookie icon → **Export**
4. Save as `cookies.txt` (Netscape format)

### Encode and add to Railway:
```bash
base64 -w 0 cookies.txt
# Copy the output
```

Add `YT_COOKIES_BASE64` to both **Backend** and **Worker** services in Railway.

### What the entrypoint does:
At container startup, `docker-entrypoint.sh` automatically:
1. Updates yt-dlp to the latest version (`/tmp/yt-dlp`)
2. Decodes `YT_COOKIES_BASE64` → `/tmp/yt-cookies.txt`
3. Sets `YT_COOKIES_FILE=/tmp/yt-cookies.txt` for the extractor

---

## Step 6 — Verify Deployment

After all 3 services are deployed:

### Health checks:
```bash
# Backend health
curl https://<backend>.up.railway.app/health
# Expected: {"status":"ok","uptime":...}

# Backend readiness (checks DB + Redis)
curl https://<backend>.up.railway.app/ready
# Expected: {"status":"ready","db":"ok","redis":"ok"}
```

### Test parse endpoint:
```bash
curl -X POST https://<backend>.up.railway.app/api/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=jENngGhSCHU"}'
# Expected: {"title":"...","formats":[...]}
```

### Test full flow:
1. Open your frontend URL
2. Paste: `https://www.youtube.com/shorts/jENngGhSCHU`
3. Click **Fetch** — should show video title and format options
4. Select **720p** → Click **Download**
5. Ad overlay appears for 10 seconds
6. Click **Skip Ad** → job queued
7. Progress bar advances 0% → 100%
8. File downloads automatically to your Downloads folder ✅

---

## Step 7 — Service Inter-Communication

Railway services communicate over the **private Railway network** (not public internet).

| Connection              | URL Pattern                                   |
|-------------------------|-----------------------------------------------|
| Frontend → Backend      | `BACKEND_URL = https://<backend>.up.railway.app` |
| Backend → Redis         | `REDIS_URL` (auto-injected)                   |
| Worker → Redis          | `REDIS_URL` (auto-injected)                   |
| Backend/Worker → MinIO  | `S3_ENDPOINT = https://<minio>.up.railway.app` |
| Backend/Worker → Postgres | `DATABASE_URL` (auto-injected)              |

---

## Troubleshooting

### "Could not reach the backend service" (502)
- Check `BACKEND_URL` is set in Frontend service variables
- Verify the Backend service is running (check Railway logs)
- Make sure `BACKEND_URL` does NOT have a trailing slash

### "Requested format is not available"
- This is a YouTube bot-detection issue on Railway's IPs
- Add `YT_COOKIES_BASE64` to both Backend and Worker services
- The yt-dlp extractor chain (`web_creator,default,tv_embedded,...`) handles this

### Progress bar stuck / resets
- This was fixed: `lastProgressRef` ensures only forward progress
- Check Worker service logs for the job ID

### Download doesn't start automatically
- This was fixed: 4-strategy download system
- Strategy 1 uses `/api/download-file/:jobId` (backend proxy, no CORS)
- If Strategy 1 fails, the "Click here if download didn't start" button appears

### Worker not picking up jobs
- Verify `REDIS_URL` is identical in Backend and Worker
- Check Worker logs: `[worker-entrypoint] yt-dlp updated: 202X.XX.XX`
- Verify `MAX_CONCURRENT_JOBS` is set (default: 2)

### S3 upload failures
- Verify `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` match MinIO
- `S3_PATH_STYLE=true` is required for MinIO
- Check the bucket exists in MinIO console

---

## Environment Variable Summary by Screenshot

Based on your Railway dashboard screenshots:

### ✅ Frontend (correct)
```
BACKEND_URL     = https://your-backend.up.railway.app  ← SET THIS
HOSTNAME        = 0.0.0.0                               ← auto
NODE_ENV        = production                            ← auto
PORT            = 3000                                  ← auto
NEXT_TELEMETRY_DISABLED = 1                             ← auto
```

### ✅ Backend (correct — add S3_ENDPOINT if missing)
```
CORS_ORIGIN     = https://your-frontend.up.railway.app  ← SET THIS
DATABASE_URL    = postgresql://...                       ← auto (Postgres plugin)
FILE_TTL_HOURS  = 24                                    ← auto
MAX_VIDEO_SIZE_MB = 500                                 ← auto
REDIS_URL       = redis://...                           ← auto (Redis plugin)
S3_ACCESS_KEY   = ...                                   ← SET THIS
S3_BUCKET       = mediaproc                             ← SET THIS
S3_ENDPOINT     = https://minio.up.railway.app          ← ⚠️ ADD IF MISSING
S3_PATH_STYLE   = true                                  ← SET THIS
S3_REGION       = auto                                  ← SET THIS
S3_SECRET_KEY   = ...                                   ← SET THIS
YT_COOKIES_BASE64 = ...                                 ← OPTIONAL but recommended
```

### ✅ Worker (correct — add S3_ENDPOINT if missing)
```
DATABASE_URL        = postgresql://...    ← auto (Postgres plugin)
MAX_CONCURRENT_JOBS = 2                  ← auto
REDIS_URL           = redis://...        ← auto (Redis plugin)
S3_ACCESS_KEY       = ...               ← SET THIS (same as Backend)
S3_BUCKET           = mediaproc         ← SET THIS
S3_ENDPOINT         = ...               ← ⚠️ ADD IF MISSING
S3_PATH_STYLE       = true              ← SET THIS
S3_REGION           = auto              ← SET THIS
S3_SECRET_KEY       = ...               ← SET THIS
YT_COOKIES_BASE64   = ...               ← OPTIONAL but recommended
```

---

## What Was Fixed (Summary)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | 🔴 Critical | Next.js 15 async params crash in proxy route | `await Promise.resolve(params)` |
| 2 | 🔴 Critical | Progress bar reset loop (90%→5%→90%) | `lastProgressRef` forward-progress guard |
| 3 | 🔴 Critical | Stale closure: wrong url/format after ad | `pendingDownloadRef` captures at click time |
| 4 | 🔴 Critical | autoDownload fired twice or not at all | Ref only reset in `reset()`, not on status change |
| 5 | 🔴 Critical | Proxy body consumed before forwarding | `req.arrayBuffer()` buffers before fetch |
| 6 | 🟠 High | Railway.toml env vars silently ignored | `[[deploy.environmentVariables]]` → `[variables]` |
| 7 | 🟠 High | CORS fails on S3 signed URLs (Firefox/mobile) | New `/api/download-file/:jobId` proxy endpoint |
| 8 | 🟠 High | Auto-download doubled bandwidth through Next.js | Direct `<a>` trigger → blob fallback strategy |
| 9 | 🟠 High | Worker used stale bundled yt-dlp binary | `export YTDLP_PATH` in entrypoints + resolver in Node |
| 10 | 🟠 High | yt-dlp CDN probe triggers bot detection | `--skip-download` + `--no-check-formats` in fetchInfo |
| 11 | 🟡 Medium | `--get-url` deprecated, drops audio URL | Replaced with `--print urls` |
| 12 | 🟡 Medium | 60s yt-dlp timeout too tight for Railway | Increased to 90s |
| 13 | 🟡 Medium | Duplicate `--no-playlist` flags | Removed from instagram/facebook extraArgs |
| 14 | 🟡 Medium | No polling backoff for long jobs | Backoff 2s→5s after 10 polls |
