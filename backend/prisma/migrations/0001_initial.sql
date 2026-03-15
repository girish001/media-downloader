-- ════════════════════════════════════════════════════════════════
--  MediaProc — Initial Database Schema
--  Column types aligned with Prisma schema to prevent db push conflicts.
-- ════════════════════════════════════════════════════════════════

-- Enums
CREATE TYPE "JobStatus"    AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "OutputFormat" AS ENUM ('MP4_4K','MP4_1440P','MP4_1080P','MP4_720P','MP4_480P','MP4_360P','MP3');

-- ── DownloadJob ──────────────────────────────────────────────────
-- Types match Prisma schema exactly: TEXT id, TIMESTAMP(3) for dates
CREATE TABLE "DownloadJob" (
  "id"            TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "url"           TEXT            NOT NULL,
  "platform"      TEXT            NOT NULL,
  "format"        "OutputFormat"  NOT NULL,
  "status"        "JobStatus"     NOT NULL DEFAULT 'QUEUED',
  "progress"      INTEGER         NOT NULL DEFAULT 0,
  "storageKey"    TEXT,
  "downloadUrl"   TEXT,
  "errorMessage"  TEXT,
  "clientIp"      TEXT,
  "fileSizeBytes" BIGINT,
  "durationSecs"  INTEGER,
  "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT now(),
  "completedAt"   TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3)    NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_job_status    ON "DownloadJob"("status");
CREATE INDEX idx_download_job_created   ON "DownloadJob"("createdAt" DESC);
CREATE INDEX idx_download_job_client_ip ON "DownloadJob"("clientIp");

-- ── ParseEvent ───────────────────────────────────────────────────
CREATE TABLE "ParseEvent" (
  "id"        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "url"       TEXT        NOT NULL,
  "platform"  TEXT        NOT NULL,
  "clientIp"  TEXT,
  "success"   BOOLEAN     NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX idx_parse_event_created ON "ParseEvent"("createdAt" DESC);

-- ── ApiKey ───────────────────────────────────────────────────────
CREATE TABLE "ApiKey" (
  "id"          TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT         NOT NULL,
  "keyHash"     TEXT         NOT NULL UNIQUE,
  "permissions" TEXT[]       NOT NULL DEFAULT '{read}',
  "lastUsedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "expiresAt"   TIMESTAMP(3),
  "revoked"     BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ── DownloadAnalytics ─────────────────────────────────────────────
CREATE TABLE "DownloadAnalytics" (
  "id"            TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "event"         TEXT         NOT NULL,
  "jobId"         TEXT,
  "platform"      TEXT,
  "format"        TEXT,
  "clientIp"      TEXT,
  "userAgent"     TEXT,
  "errorMessage"  TEXT,
  "durationMs"    INTEGER,
  "fileSizeBytes" BIGINT,
  "meta"          TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event     ON "DownloadAnalytics"("event");
CREATE INDEX idx_analytics_created   ON "DownloadAnalytics"("createdAt" DESC);
CREATE INDEX idx_analytics_platform  ON "DownloadAnalytics"("platform");
CREATE INDEX idx_analytics_job_id    ON "DownloadAnalytics"("jobId");

-- ── Materialized views ───────────────────────────────────────────
CREATE MATERIALIZED VIEW daily_stats AS
SELECT
  date_trunc('day', "createdAt")::date                   AS day,
  count(*)                                               AS total,
  count(*) FILTER (WHERE "status" = 'COMPLETED')         AS completed,
  count(*) FILTER (WHERE "status" = 'FAILED')            AS failed,
  count(DISTINCT "clientIp")                             AS unique_ips,
  avg(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) AS avg_secs
FROM "DownloadJob"
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON daily_stats(day);

CREATE MATERIALIZED VIEW format_stats AS
SELECT
  "format"::text,
  count(*)                                       AS total,
  count(*) FILTER (WHERE "status" = 'COMPLETED') AS completed
FROM "DownloadJob"
GROUP BY 1;

CREATE UNIQUE INDEX ON format_stats(format);

-- ── Auto-update updatedAt ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW."updatedAt" = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_download_job_updated_at
BEFORE UPDATE ON "DownloadJob"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
