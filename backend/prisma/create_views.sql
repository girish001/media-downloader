CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
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

CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_day_idx ON daily_stats(day);

CREATE MATERIALIZED VIEW IF NOT EXISTS format_stats AS
SELECT
  "format"::text,
  count(*)                                               AS total,
  count(*) FILTER (WHERE "status" = 'COMPLETED')         AS completed
FROM "DownloadJob"
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS format_stats_format_idx ON format_stats(format);
