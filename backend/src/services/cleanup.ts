/**
 * services/cleanup.ts
 * ────────────────────
 * Two cleanup jobs:
 *
 *  1. S3 file expiry  — deletes S3 objects for jobs older than FILE_TTL_HOURS (default 24h).
 *                       Runs every hour.
 *
 *  2. Temp file purge — deletes local /tmp/mediaproc files older than 30 minutes.
 *                       Runs every 15 minutes.
 *                       Prevents disk exhaustion from failed/stalled FFmpeg jobs.
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import path                      from 'node:path';
import { prisma }                from '../db/prisma.js';
import { deleteFile }            from './storage.js';

const TTL_HOURS   = Number(process.env.FILE_TTL_HOURS  || 24);
const TMP_DIR     = process.env.TMP_DIR                || '/tmp/mediaproc';
const TMP_MAX_AGE = Number(process.env.TMP_MAX_AGE_MIN || 30) * 60 * 1000; // ms

/* ─── Start both schedulers ──────────────────────────────────────── */
export function startCleanupScheduler(): void {
  // S3 cleanup — every hour
  setInterval(runS3Cleanup, 60 * 60 * 1000);
  setTimeout(runS3Cleanup, 60_000);         // first run 60s after startup

  // Temp file cleanup — every 15 minutes
  setInterval(runTmpCleanup, 15 * 60 * 1000);
  setTimeout(runTmpCleanup, 30_000);         // first run 30s after startup

  console.info(
    `[cleanup] Schedulers started. S3 TTL=${TTL_HOURS}h (hourly). Tmp TTL=${TMP_MAX_AGE / 60000}min (every 15min).`,
  );
}

/* ─── S3 file expiry ─────────────────────────────────────────────── */
async function runS3Cleanup(): Promise<void> {
  const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000);

  let expired: Array<{ id: string; storageKey: string | null }>;
  try {
    expired = await prisma.downloadJob.findMany({
      where: {
        completedAt: { lt: cutoff },
        storageKey:  { not: null },
        status:      'COMPLETED',
      },
      select: { id: true, storageKey: true },
    });
  } catch (err: any) {
    console.error('[cleanup:s3] DB query failed:', err.message);
    return;
  }

  if (expired.length === 0) return;

  console.info(`[cleanup:s3] Purging ${expired.length} expired S3 file(s)…`);

  for (const job of expired) {
    try {
      if (job.storageKey) {
        await deleteFile(job.storageKey);
      }
      await prisma.downloadJob.update({
        where: { id: job.id },
        data:  { storageKey: null, downloadUrl: null },
      });
    } catch (err: any) {
      console.error(`[cleanup:s3] Failed for job ${job.id}: ${err.message}`);
    }
  }

  console.info(`[cleanup:s3] Done. Purged ${expired.length} file(s).`);
}

/* ─── Temp file purge ────────────────────────────────────────────── */
async function runTmpCleanup(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(TMP_DIR);
  } catch {
    // Directory doesn't exist yet — nothing to clean
    return;
  }

  const now     = Date.now();
  let   deleted = 0;

  for (const file of files) {
    const filePath = path.join(TMP_DIR, file);
    try {
      const info = await stat(filePath);
      const ageMs = now - info.mtimeMs;

      if (ageMs > TMP_MAX_AGE) {
        await unlink(filePath);
        deleted++;
        console.info(`[cleanup:tmp] Deleted stale temp file: ${file} (age: ${Math.round(ageMs / 60000)}min)`);
      }
    } catch (err: any) {
      // File may have been deleted by worker between readdir and stat
      if (err.code !== 'ENOENT') {
        console.warn(`[cleanup:tmp] Could not process ${file}: ${err.message}`);
      }
    }
  }

  if (deleted > 0) {
    console.info(`[cleanup:tmp] Deleted ${deleted} stale temp file(s) from ${TMP_DIR}.`);
  }
}
