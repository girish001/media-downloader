/**
 * services/analytics.ts
 * ──────────────────────
 * Lightweight analytics logging service.
 *
 * Every significant event is:
 *   1. Logged as a structured pino JSON line (picked up by log aggregators)
 *   2. Written to the DownloadAnalytics DB table for dashboard queries
 *
 * Events:
 *   download_queued          — user submitted a valid download request
 *   download_url_served      — status endpoint returned a completed download URL
 *   download_blocked_captcha — captcha check failed
 *   download_completed       — worker finished processing successfully
 *   download_failed          — worker job failed (with error context)
 *   parse_requested          — user called /api/parse
 *   parse_failed             — /api/parse returned an error
 *
 * To add a new event: call logAnalyticsEvent('your_event', { ...meta }) from any route.
 */

import { pino } from 'pino';
import { prisma } from '../db/prisma.js';

const log = pino({ name: 'analytics', level: process.env.LOG_LEVEL || 'info' });

export type AnalyticsEvent =
  | 'download_queued'
  | 'download_url_served'
  | 'download_blocked_captcha'
  | 'download_blocked_daily_limit'
  | 'download_completed'
  | 'download_failed'
  | 'parse_requested'
  | 'parse_failed';

export interface AnalyticsMeta {
  jobId?:    string;
  url?:      string;
  platform?: string;
  format?:   string;
  ip?:       string;
  ua?:       string;
  error?:    string;
  durationMs?: number;
  fileSizeBytes?: number;
  [key: string]: unknown;
}

/**
 * Log an analytics event.
 * Non-throwing — analytics failures never break request handling.
 */
export async function logAnalyticsEvent(
  event: AnalyticsEvent,
  meta: AnalyticsMeta = {},
): Promise<void> {
  // Always emit a structured log line
  log.info({ event, ...meta }, `analytics:${event}`);

  // Persist to DB (best-effort — don't await in hot paths if performance is critical)
  try {
    await prisma.downloadAnalytics.create({
      data: {
        event,
        jobId:         meta.jobId    ?? null,
        platform:      meta.platform ?? null,
        format:        meta.format   ?? null,
        clientIp:      meta.ip       ?? null,
        userAgent:     meta.ua       ?? null,
        errorMessage:  meta.error    ?? null,
        durationMs:    meta.durationMs    ? Math.round(meta.durationMs)    : null,
        fileSizeBytes: meta.fileSizeBytes ? BigInt(meta.fileSizeBytes)     : null,
        meta:          JSON.stringify(meta),
      },
    });
  } catch (err: any) {
    // Analytics DB write failures are non-fatal — log and continue
    log.warn({ err: err.message, event }, 'Analytics DB write failed (non-fatal)');
  }
}

/**
 * Convenience: log a download completion with timing.
 */
export async function logDownloadCompleted(opts: {
  jobId:         string;
  platform:      string;
  format:        string;
  durationMs:    number;
  fileSizeBytes: number;
}): Promise<void> {
  return logAnalyticsEvent('download_completed', opts);
}

/**
 * Convenience: log a download failure.
 */
export async function logDownloadFailed(opts: {
  jobId:    string;
  platform: string;
  format:   string;
  error:    string;
  durationMs: number;
}): Promise<void> {
  return logAnalyticsEvent('download_failed', opts);
}
