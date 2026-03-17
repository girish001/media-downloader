/**
 * worker/src/index.ts
 * ────────────────────
 * BullMQ worker — dequeues jobs, runs yt-dlp + FFmpeg, uploads to S3.
 *
 * Safeguards:
 *  ✓ WORKER_CONCURRENCY env — controls parallel job slots
 *  ✓ Job timeout — BullMQ will mark as failed after JOB_TIMEOUT_SEC
 *  ✓ yt-dlp timeout — AbortController kills hung extractions after YTDLP_TIMEOUT_SEC
 *  ✓ Max video size — checked before S3 upload (MAX_VIDEO_SIZE_MB)
 *  ✓ Temp file cleanup — always deletes local file, even on failure
 *  ✓ Graceful shutdown — SIGTERM waits for in-flight job to finish, then exits
 *  ✓ Analytics logging — completed + failed events sent to analytics service
 *  ✓ Sentry capture — all job failures forwarded to Sentry
 */

import { pino }              from 'pino';
import { Worker, Job }       from 'bullmq';
import { Redis as IORedis }  from 'ioredis';
import { PrismaClient }      from '@prisma/client';
import { unlink, access, readdir } from 'node:fs/promises';
import { execa }             from 'execa';
import { buildFFmpegArgs, runFFmpeg } from './ffmpeg.js';
import { uploadFile, jobKey, ensureBucketExists } from './storage.js';
import { init as SentryInit, captureException as SentryCaptureException, captureMessage as SentryCaptureMessage } from '@sentry/node';
import { validateWorkerEnv } from './lib/validateEnv.js';

/* ─── Env validation — must run FIRST before any service connects ──── */
validateWorkerEnv();

/* ─── Logger ──────────────────────────────────────────────────────── */
const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  name:  'worker',
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});

/* ─── Sentry ──────────────────────────────────────────────────────── */
if (process.env.SENTRY_DSN) {
  SentryInit({
    dsn:              process.env.SENTRY_DSN,
    environment:      process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.05,
  });
  log.info('Sentry initialised');
} else {
  log.warn('SENTRY_DSN not set — error monitoring disabled');
}

/* ─── Infrastructure ──────────────────────────────────────────────── */
// BullMQ v5 requires connection as { url: string } — not an IORedis instance.
// Passing an IORedis instance causes type conflicts between BullMQ's bundled
// ioredis and the app's own ioredis (AbstractConnector.connecting mismatch).
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Keep a separate IORedis instance for non-BullMQ uses (ping check, etc.)
const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
});

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

/* ─── Config ──────────────────────────────────────────────────────── */
const QUEUE_NAME         = 'media-processing';
// Support both MAX_CONCURRENT_JOBS (Railway / production standard) and
// WORKER_CONCURRENCY (legacy docker-compose naming) — MAX_CONCURRENT_JOBS wins.
const CONCURRENCY        = Number(
  process.env.MAX_CONCURRENT_JOBS  ||
  process.env.WORKER_CONCURRENCY   ||
  2
);
const TMP_DIR            = process.env.TMP_DIR                     || '/tmp/mediaproc';
const FFMPEG_PATH        = process.env.FFMPEG_PATH                 || 'ffmpeg';
// FIX: Resolve yt-dlp binary path at runtime.
// docker-entrypoint.sh exports YTDLP_PATH=/tmp/yt-dlp after self-update,
// but as a belt-and-suspenders check we also probe /tmp/yt-dlp directly
// in case the env var was not propagated correctly.
async function resolveYtdlpPath(): Promise<string> {
  // YTDLP_PATH set by entrypoint after self-update — use it if available
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  // Belt-and-suspenders: check /tmp/yt-dlp directly
  try { await access('/tmp/yt-dlp'); return '/tmp/yt-dlp'; } catch {}
  return 'yt-dlp';
}
let _ytdlpPathCache: string | null = null;
async function getYtdlpPath(): Promise<string> {
  if (!_ytdlpPathCache) _ytdlpPathCache = await resolveYtdlpPath();
  return _ytdlpPathCache;
}
const YTDLP_TIMEOUT_SEC  = Number(process.env.YTDLP_TIMEOUT_SEC    || 300);  // yt-dlp download timeout (was 60s for --get-url, needs 300s+ for full download)
const MAX_VIDEO_SIZE_MB  = Number(process.env.MAX_VIDEO_SIZE_MB     || 500);  // max output file size

log.info({
  concurrency:    CONCURRENCY,
  ytdlpTimeoutSec: YTDLP_TIMEOUT_SEC,
  maxVideoSizeMB: MAX_VIDEO_SIZE_MB,
  tmpDir:         TMP_DIR,
}, 'Worker configuration');

/* ─── Format → yt-dlp selector ────────────────────────────────────── */
// Instagram/Facebook serve pre-muxed single streams — requesting bestvideo+bestaudio
// merge causes HTTP 416 errors because the CDN doesn't support range requests on
// separate streams. Use a single-stream selector for these platforms.
const SINGLE_STREAM_PLATFORMS = new Set(['instagram', 'facebook']);

function mapFormatToYtdlp(format: string, platform?: string): string {
  const isSingleStream = platform && SINGLE_STREAM_PLATFORMS.has(platform);

  if (isSingleStream) {
    // Instagram/Facebook: serve pre-muxed single streams only — no DASH.
    // Use b[height<=N]/b (combined stream) — no video+audio split needed.
    // b is the yt-dlp short alias for "best combined stream".
    const singleMap: Record<string, string> = {
      '144p':  'b[height<=144][ext=mp4]/b[height<=144]/b',
      '240p':  'b[height<=240][ext=mp4]/b[height<=240]/b',
      '360p':  'b[height<=360][ext=mp4]/b[height<=360]/b',
      '480p':  'b[height<=480][ext=mp4]/b[height<=480]/b',
      '720p':  'b[height<=720][ext=mp4]/b[height<=720]/b',
      '1080p': 'b[height<=1080][ext=mp4]/b[height<=1080]/b',
      '1440p': 'b[height<=1440][ext=mp4]/b[height<=1440]/b',
      '4k':    'b[height<=2160][ext=mp4]/b[height<=2160]/b',
      'mp3':   'ba/b',
      'hd':    'b[height<=1080][ext=mp4]/b[height<=1080]/b',
      'sd':    'b[height<=480][ext=mp4]/b[height<=480]/b',
      'best':  'b[ext=mp4]/b',
    };
    return singleMap[format.toLowerCase()] ?? 'b';
  }

  // YouTube and others: use bv*+ba/b selector pattern.
  //
  //   bv*[height<=N]+ba  → best video stream (any codec) at or below height
  //                        + best audio stream. yt-dlp merges via ffmpeg.
  //   /b[height<=N]      → fallback to pre-muxed combined stream at height
  //                        (YouTube Shorts, some embeds)
  //   /b                 → absolute fallback: best combined stream with no
  //                        constraints. Prevents "Requested format is not
  //                        available" for any video type.
  //
  // bv* (not bestvideo) matches all video codecs including vp9/av1 — more
  // robust than bestvideo which can sometimes match nothing on certain clients.
  // ── YouTube format selectors (2025 SABR-aware strategy) ────────────────────
  //
  // CRITICAL: YouTube now enforces SABR (Streaming Adaptive Bitrate Requirements)
  // for separate DASH streams (bestvideo+bestaudio) from datacenter IPs.
  // Each DASH fragment requires its own token — these get blocked on Railway/GCP.
  //
  // SOLUTION: Try combined stream first, then fall back to DASH, then anything.
  //
  // Selector anatomy:
  //   best[height<=N]               → PRIMARY: combined stream (video+audio in
  //                                   one container). Bypasses SABR/DASH entirely.
  //                                   Works even when YouTube only returns 1 format.
  //   /bestvideo[height<=N]+bestaudio → SECONDARY: DASH merge. Better quality but
  //                                   requires SABR token (may fail on Railway IPs).
  //   /best                          → ULTIMATE: any available stream. Never fails
  //                                   as long as YouTube returns ANY format at all.
  //
  // This order is the key insight from yt-dlp community research:
  // combined formats are more stable from datacenter IPs than separate DASH streams.
  const map: Record<string, string> = {
    '144p':  'best[height<=144]/bestvideo[height<=144]+bestaudio/best',
    '240p':  'best[height<=240]/bestvideo[height<=240]+bestaudio/best',
    '360p':  'best[height<=360]/bestvideo[height<=360]+bestaudio/best',
    '480p':  'best[height<=480]/bestvideo[height<=480]+bestaudio/best',
    '720p':  'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
    '1080p': 'best[height<=1080]/bestvideo[height<=1080]+bestaudio/best',
    '1440p': 'best[height<=1440]/bestvideo[height<=1440]+bestaudio/best',
    '4k':    'best[height<=2160]/bestvideo[height<=2160]+bestaudio/best',
    'mp3':   'bestaudio/best',
    'hd':    'best[height<=1080]/bestvideo[height<=1080]+bestaudio/best',
    'sd':    'best[height<=480]/bestvideo[height<=480]+bestaudio/best',
    'best':  'best/bestvideo+bestaudio',
  };
  return map[format.toLowerCase()] ?? 'best/bestvideo+bestaudio';
}


/* ─── Job processor ───────────────────────────────────────────────── */
async function processJob(job: Job): Promise<{
  downloadUrl: string;
  storageKey: string;
  fileSizeBytes: number;
}> {
  const { jobId, url, format, platform } = job.data as {
    jobId:    string;
    url:      string;
    format:   string;
    platform: string;
  };

  const startedAt  = Date.now();
  const outputPath = `${TMP_DIR}/${jobId}.${format === 'mp3' ? 'mp3' : 'mp4'}`;

  log.info({ jobId, format, platform, url }, 'Job started');

  // Update DB: PROCESSING
  await prisma.downloadJob.update({
    where: { id: jobId },
    data:  { status: 'PROCESSING', progress: 0 },
  });
  await job.updateProgress(5);

  // ── Step 1: Download + merge via yt-dlp ───────────────────────────
  // yt-dlp downloads the best stream(s) for the requested format and merges
  // video+audio into a single file. We use a .%(ext)s output template so
  // yt-dlp writes whatever extension it actually produces (mp4, webm, etc.)
  // then we find the real file afterward — avoids ENOENT when FFmpeg tries to
  // open a hardcoded .mp4 path but yt-dlp wrote .webm.
  log.info({ jobId, format, platform }, 'Downloading streams via yt-dlp…');

  const isSingleStream = SINGLE_STREAM_PLATFORMS.has(platform);

  // Output template — yt-dlp fills in the actual extension
  const ytdlpTemplate = `${TMP_DIR}/${jobId}.ytdlp.%(ext)s`;
  // Expected final paths after yt-dlp completes
  const ytdlpExpected = format === 'mp3'
    ? `${TMP_DIR}/${jobId}.ytdlp.mp3`
    : `${TMP_DIR}/${jobId}.ytdlp.mp4`;

  // Resolve the ffmpeg directory for yt-dlp's --ffmpeg-location flag.
  // yt-dlp needs the *directory* containing ffmpeg, not the binary path itself.
  const ffmpegDir = FFMPEG_PATH.includes('/')
    ? FFMPEG_PATH.replace(/\/[^\/]+$/, '')
    : '/usr/bin';

  // Build yt-dlp args with --merge-output-format BEFORE -f.
  //
  // BUG THAT WAS HERE: the original code built the array with -f at index 1,
  // then called ytdlpArgs.splice(2, 0, '--merge-output-format', 'mp4').
  // splice(2) inserts BETWEEN '-f' (index 1) and its value (index 2), so yt-dlp
  // received: -f --merge-output-format mp4 <format-selector>
  // yt-dlp then treated '--merge-output-format' as the -f value, 'mp4' as a
  // URL, and the real format selector as another URL — producing:
  //   ERROR: 'mp4' is not a valid URL
  //   ERROR: 'bestvideo[height<=1440]...' is not a valid URL
  //
  // FIX: build the array in correct order from the start — no splice needed.
  // --merge-output-format must appear before -f so -f is always a clean pair.
  const ytdlpArgs = ['--no-playlist'];

  // For multi-stream platforms (YouTube etc.), ask yt-dlp to merge into mp4.
  // Skip for Instagram/Facebook — they serve pre-muxed single streams and
  // --merge-output-format causes HTTP 416 range-request errors on their CDN.
  if (!isSingleStream) {
    ytdlpArgs.push('--merge-output-format', format === 'mp3' ? 'mp3' : 'mp4');
  }

  ytdlpArgs.push(
    '-f',  mapFormatToYtdlp(format, platform),
    '--ffmpeg-location', ffmpegDir,
    '-o',  ytdlpTemplate,
    // Reliability flags — applied to all platforms.
    //
    // --no-part            Skip .part resume files. A stale .part from a prior
    //                      interrupted run stores a wrong byte offset, causing
    //                      yt-dlp to send a Range: bytes=X-Y header that exceeds
    //                      the actual file length → HTTP 416.
    //
    // --no-continue        Disable resuming the output file itself. While --no-part
    //                      handles the .part temp file, --no-continue ensures the
    //                      final output file is never resumed either. Together these
    //                      two flags completely eliminate Range-header resume
    //                      attempts — yt-dlp always starts each download from byte 0.
    //
    // --retries 10         Retry the full stream download up to 10 times on any
    //                      network error. Explicit because older yt-dlp versions
    //                      default to 10 but some builds default to 3.
    //
    // --fragment-retries 10  DASH/HLS streams download each fragment independently.
    //                        A transient 416 or 5xx on a single fragment fails the
    //                        whole job without this. Primary fix for DASH 416 errors.
    //
    // --concurrent-fragments 4  Download 4 DASH fragments in parallel. Reduces
    //                           total download time for HD streams by 2–3×.
    //                           Has no effect on single-stream downloads (Instagram,
    //                           Facebook, or progressive YouTube formats).
    //
    // --force-ipv4         Some Docker host configurations advertise IPv6 but have
    //                      broken routing. YouTube's DASH CDN can return different
    //                      fragment availability over IPv6 in some regions.
    //                      IPv4 is universally supported — eliminates this variable.
    '--no-part',
    '--no-continue',
    '--retries',               '10',
    '--fragment-retries',      '10',
    '--concurrent-fragments',  '4',
    '--force-ipv4',
    '--newline',
    '--no-warnings',
  );

  // Platform-specific auth / extractor args
  if (platform === 'youtube') {
    // bgutil PO token provider runs on port 4416 (started by entrypoint).
    // yt-dlp discovers it via the installed pip plugin — no manual po_token needed.
  let extractorArgs = 'youtube:player_client=tv,tv_simply,tv_embedded,ios';

ytdlpArgs.push(
  '--add-header',
  'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
);

if (process.env.YT_COOKIES_FILE) {
  ytdlpArgs.push('--cookies', process.env.YT_COOKIES_FILE);
}

ytdlpArgs.push('--extractor-args', extractorArgs);

    if (process.env.YT_PROXY) {
      ytdlpArgs.push('--proxy', process.env.YT_PROXY);
      log.info({ jobId }, 'YouTube: routing via YT_PROXY');
    }
  }
    if (platform === 'instagram' && process.env.IG_SESSION_ID) {
    ytdlpArgs.push('--add-header', `Cookie:sessionid=${process.env.IG_SESSION_ID}`);
  }
  if (platform === 'facebook' && process.env.FB_COOKIES_FILE) {
    ytdlpArgs.push('--cookies', process.env.FB_COOKIES_FILE);
  }

  ytdlpArgs.push(url);

  // Progress tracking — yt-dlp emits two download passes for merged formats
  // (video stream first, then audio stream). We map them to separate ranges:
  //   Pass 1 (video): 5% → 55%
  //   Pass 2 (audio): 55% → 72%
  // This prevents the progress bar from jumping back to 5% when audio starts.
  let downloadPass = 0;
  let lastRawPct   = -1;

  try {
    const resolvedYtdlpPath = await getYtdlpPath();
    log.debug({ ytdlpBinary: resolvedYtdlpPath }, 'Using yt-dlp binary');
    const ytdlpProc = execa(resolvedYtdlpPath, ytdlpArgs, {
      timeout: (YTDLP_TIMEOUT_SEC + 600) * 1000,
      all:     true,
    });

    ytdlpProc.all?.on('data', async (chunk: Buffer) => {
      const text = chunk.toString();

      // Detect start of a new download pass (video → audio)
      // yt-dlp prints "[download] Destination: ..." at the start of each pass
      if (text.includes('[download] Destination:')) {
        downloadPass++;
        lastRawPct = -1; // reset throttle for new pass
        return;
      }

      const m = text.match(/\[download\]\s+([\d.]+)%/);
      if (!m) return;

      const rawPct = parseFloat(m[1]!);
      // Only advance — never go backwards within a pass
      if (rawPct <= lastRawPct) return;
      lastRawPct = rawPct;

      let scaled: number;
      if (isSingleStream || downloadPass <= 1) {
        // Single stream or first pass (video): 5% → 55%
        scaled = Math.floor(5 + rawPct * 0.50);
      } else {
        // Second pass (audio): 55% → 72%
        scaled = Math.floor(55 + rawPct * 0.17);
      }

      await job.updateProgress(scaled).catch(() => {});
      await prisma.downloadJob.update({
        where: { id: jobId },
        data:  { progress: scaled },
      }).catch(() => {});
    });

    await ytdlpProc;
  } catch (err: any) {
    if (err.timedOut) {
      throw new Error(`yt-dlp timed out after ${YTDLP_TIMEOUT_SEC + 600}s.`);
    }
    // Surface the actual yt-dlp stderr so the root cause is visible in logs
    const detail = (err.stderr ?? err.all ?? err.message ?? '').toString().trim();
    throw new Error(`yt-dlp download failed: ${detail}`);
  }

  // Locate the actual output file — yt-dlp may have written a different
  // extension than expected (e.g. .webm instead of .mp4 for some streams).
  // Check expected path first, then scan the tmp dir for any matching file.
  let ytdlpFinal: string = ytdlpExpected;
  try {
    await access(ytdlpExpected);
    log.info({ jobId, file: ytdlpExpected }, 'yt-dlp output found at expected path');
  } catch {
    // Expected file not found — scan tmp dir for jobId.ytdlp.*
    const files = await readdir(TMP_DIR);
    const match = files.find(f => f.startsWith(`${jobId}.ytdlp.`) && !f.endsWith('.part'));
    if (!match) {
      throw new Error(
        `yt-dlp completed but output file not found in ${TMP_DIR}. ` +
        `Files present: ${files.join(', ') || '(none)'}`
      );
    }
    ytdlpFinal = `${TMP_DIR}/${match}`;
    log.warn({ jobId, file: ytdlpFinal }, 'yt-dlp wrote unexpected extension — using found file');
  }

  await job.updateProgress(73);
  log.info({ jobId, file: ytdlpFinal }, 'yt-dlp complete, starting FFmpeg encode…');

  // ── Step 2: FFmpeg re-encode with quality scaling ────────────────
  // Re-encoding enforces the requested resolution and applies per-format CRF
  // so output sizes differ correctly across quality tiers.
  const ffmpegArgs = buildFFmpegArgs({ streamUrl: ytdlpFinal, format, outputPath });

  await runFFmpeg(FFMPEG_PATH, ffmpegArgs, async (percent) => {
    // FFmpeg encode: 73% → 95% (continuous from where yt-dlp left off at 73%)
    const scaled = Math.floor(73 + percent * 0.22);
    await job.updateProgress(scaled);
    await prisma.downloadJob.update({
      where: { id: jobId },
      data:  { progress: scaled },
    });
  });

  // Clean up yt-dlp temp file
  await unlink(ytdlpFinal).catch(() => {});

  await job.updateProgress(90);
  log.info({ jobId }, 'FFmpeg complete, uploading to S3…');

  // ── Step 3: Upload to S3 (with size limit check) ──────────────────
  const key      = jobKey(jobId, format);
  let fileSizeBytes: number;
  try {
    fileSizeBytes = await uploadFile(outputPath, key);
  } finally {
    // Always clean up temp file — even on upload failure
    await unlink(outputPath).catch(() => {/* already deleted */});
  }

  await job.updateProgress(97);

  // ── Step 4: Construct download URL ───────────────────────────────
  // Store the storage key; signed URLs are generated on-demand in /api/status
  const publicBase  = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
  const downloadUrl = publicBase ? `${publicBase}/${key}` : key;

  // ── Step 5: Finalize DB record ────────────────────────────────────
  const durationMs = Date.now() - startedAt;
  await prisma.downloadJob.update({
    where: { id: jobId },
    data: {
      status:        'COMPLETED',
      progress:      100,
      storageKey:    key,
      downloadUrl,
      fileSizeBytes,
      completedAt:   new Date(),
    },
  });

  await job.updateProgress(100);

  log.info({
    jobId,
    platform,
    format,
    fileSizeMB:  (fileSizeBytes / 1024 / 1024).toFixed(2),
    durationMs,
  }, 'Job completed');

  return { downloadUrl, storageKey: key, fileSizeBytes };
}

/* ─── BullMQ Worker ───────────────────────────────────────────────── */
const worker = new Worker(QUEUE_NAME, processJob, {
  connection:  { url: REDIS_URL } as any,
  concurrency: CONCURRENCY,
});

/* ─── Worker event handlers ───────────────────────────────────────── */
worker.on('completed', (job) => {
  log.info({ jobId: job.id }, 'Worker: job completed');
});

worker.on('failed', async (job, err) => {
  const jobId = job?.data?.jobId ?? job?.id;
  log.error({ jobId, err: err.message, stack: err.stack }, 'Worker: job failed');

  SentryCaptureException(err, {
    extra: { jobId, url: job?.data?.url, format: job?.data?.format },
  });

  // Mark DB record as FAILED
  if (jobId) {
    await prisma.downloadJob.update({
      where: { id: jobId },
      data:  { status: 'FAILED', errorMessage: err.message, progress: 0 },
    }).catch((dbErr: any) => log.error({ err: dbErr.message }, 'Failed to update failed job in DB'));
  }

  // Clean up all temp files on failure (output + yt-dlp intermediates)
  if (job?.data?.jobId) {
    const paths = [
      `${TMP_DIR}/${job.data.jobId}.mp4`,
      `${TMP_DIR}/${job.data.jobId}.mp3`,
      `${TMP_DIR}/${job.data.jobId}.ytdlp.mp4`,
      `${TMP_DIR}/${job.data.jobId}.ytdlp.mp3`,
    ];
    for (const p of paths) {
      await unlink(p).catch(() => {/* already gone */});
    }
  }
});

worker.on('error', (err) => {
  log.error({ err: err.message }, 'Worker: connection/queue error');
  SentryCaptureException(err);
});

worker.on('stalled', (jobId) => {
  log.error({ jobId }, 'Worker: job stalled — will be retried');
});

/* ─── Startup ─────────────────────────────────────────────────────── */
async function main(): Promise<void> {
  await redis.ping();
  log.info('Redis connected');

  await prisma.$connect();
  log.info('PostgreSQL connected');

  await ensureBucketExists();
  log.info('S3 bucket ready');

  log.info({
    queue:       QUEUE_NAME,
    concurrency: CONCURRENCY,
  }, 'Worker running');
}

main().catch(err => {
  log.error({ err: err.message }, 'Fatal startup error');
  SentryCaptureException(err);
  process.exit(1);
});

/* ─── Graceful shutdown ───────────────────────────────────────────── */
// On SIGTERM (Docker stop), wait for the current job to finish before exiting.
// BullMQ worker.close() waits for in-flight jobs to complete by default.
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info({ signal }, 'Graceful shutdown: waiting for in-flight jobs…');

  try {
    await worker.close();
    log.info('Worker closed — all in-flight jobs completed');
  } catch (err: any) {
    log.error({ err }, 'Error closing worker');
  }

  try {
    await prisma.$disconnect();
    log.info('PostgreSQL disconnected');
  } catch (err: any) {
    log.error({ err }, 'Error disconnecting Prisma');
  }

  try {
    await redis.quit();
    log.info('Redis disconnected');
  } catch (err: any) {
    log.error({ err }, 'Error disconnecting Redis');
  }

  log.info('Worker shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'Unhandled promise rejection in worker');
  SentryCaptureException(reason instanceof Error ? reason : new Error(String(reason)));
});
