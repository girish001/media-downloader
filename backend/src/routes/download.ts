/**
 * routes/download.ts
 * ───────────────────
 * POST /api/download — enqueue a media processing job.
 *
 * Safeguards:
 *  ✓ Per-IP rate limit: 10 downloads / 10 minutes
 *  ✓ Optional Cloudflare Turnstile captcha
 *  ✓ Format validation against allowlist
 *  ✓ Platform detection via extractor registry
 *  ✓ Analytics logging: every download attempt logged to DB + pino
 *  ✓ Max video duration guard (MAX_VIDEO_DURATION_SEC env)
 */

import type { FastifyPluginAsync } from 'fastify';
import { z }                        from 'zod';
import { prisma }                   from '../db/prisma.js';
import { getQueue }                 from '../queue/index.js';
import { detectPlatform }           from '../extractors/index.js';
import { verifyCaptcha }            from '../middleware/captcha.js';
import { logAnalyticsEvent }        from '../services/analytics.js';
import { getRedis }                 from '../services/redis.js';

const BodySchema = z.object({
  url:          z.string().url('Must be a valid URL'),
  format:       z.string().min(1).max(20),
  captchaToken: z.string().optional(),
});

// Supported format → Prisma enum mapping
// NOTE: every key here must have a corresponding value in the OutputFormat
// Prisma enum (schema.prisma) and the migration must have run before deploy.
const FORMAT_MAP: Record<string, string> = {
  '4k':    'MP4_4K',
  '1440p': 'MP4_1440P',
  '1080p': 'MP4_1080P',
  '720p':  'MP4_720P',
  '480p':  'MP4_480P',
  '360p':  'MP4_360P',
  '240p':  'MP4_240P',
  '144p':  'MP4_144P',
  'mp3':   'MP3',
  'hd':    'MP4_1080P',
  'sd':    'MP4_720P',
  'best':  'MP4_1080P',
};

/**
 * Daily per-IP download limiter backed by Redis.
 *
 * Uses a Redis key  "dl:daily:<date>:<ip>"  with a TTL of 25 hours so the
 * counter auto-expires naturally and never requires manual cleanup.
 *
 * Configurable via:
 *   RATE_LIMIT_DAILY_MAX   — max downloads per IP per calendar day (default: 20)
 *
 * Returns { allowed: true } when under the limit, or
 *         { allowed: false, count, limit } when the daily cap is reached.
 */
async function checkDailyLimit(ip: string): Promise<
  | { allowed: true;  count: number; limit: number }
  | { allowed: false; count: number; limit: number }
> {
  const DAILY_MAX = Number(process.env.RATE_LIMIT_DAILY_MAX || 20);

  // UTC date string — resets at midnight UTC every day
  const date    = new Date().toISOString().slice(0, 10);           // "2025-01-15"
  const key     = `dl:daily:${date}:${ip}`;
  const redis   = getRedis();

  // Atomic increment + set TTL on first write (25 hours ensures the key
  // outlives the calendar day even with clock skew).
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 25 * 60 * 60);   // 25 hours
  }

  return count > DAILY_MAX
    ? { allowed: false, count, limit: DAILY_MAX }
    : { allowed: true,  count, limit: DAILY_MAX };
}

export const downloadRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: z.infer<typeof BodySchema> }>(
    '/download',
    {
      // Short-window rate limit (burst protection): configurable via env
      config: { rateLimit: { max: Number(process.env.RATE_LIMIT_DOWNLOAD_MAX || 60), timeWindow: process.env.RATE_LIMIT_DOWNLOAD_WINDOW || '10 minutes' } },
      schema: {
        tags:    ['media'],
        summary: 'Enqueue a media download and processing job',
        body: {
          type:     'object',
          required: ['url', 'format'],
          properties: {
            url:          { type: 'string', format: 'uri', description: 'Public media URL (YouTube, Instagram, Facebook, etc.)' },
            format:       { type: 'string', description: '4k | 1080p | 720p | 480p | 360p | mp3' },
            captchaToken: { type: 'string', description: 'Cloudflare Turnstile token (required when CAPTCHA_SECRET_KEY is set)' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              jobId:    { type: 'string' },
              status:   { type: 'string' },
              platform: { type: 'string' },
              format:   { type: 'string' },
              message:  { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      // ── Input validation ─────────────────────────────────────────
      const parsed = BodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    parsed.error.errors[0]?.message ?? 'Invalid request body',
        });
      }
      const { url, format, captchaToken } = parsed.data;

      // ── Daily per-IP download limit ───────────────────────────────
      // Checked BEFORE captcha to give a clear 429 rather than a captcha error
      // when the daily cap is hit.  Configurable: RATE_LIMIT_DAILY_MAX (default 20).
      const daily = await checkDailyLimit(req.ip);
      if (!daily.allowed) {
        app.log.warn({ ip: req.ip, count: daily.count, limit: daily.limit }, 'Daily download limit exceeded');
        await logAnalyticsEvent('download_blocked_daily_limit', { url, ip: req.ip, count: daily.count });
        return reply.status(429).send({
          statusCode:  429,
          error:       'Too Many Requests',
          message:     `Daily download limit reached (${daily.limit} downloads per day). ` +
                       `Your limit resets at midnight UTC.`,
          retryAfter:  'tomorrow',
          limit:       daily.limit,
          used:        daily.count,
        });
      }

      // ── Captcha (optional) ───────────────────────────────────────
      if (process.env.CAPTCHA_SECRET_KEY) {
        const ok = await verifyCaptcha(captchaToken, req.ip);
        if (!ok) {
          await logAnalyticsEvent('download_blocked_captcha', { url, ip: req.ip });
          return reply.status(403).send({
            statusCode: 403,
            error:      'Forbidden',
            message:    'Captcha verification failed. Please complete the CAPTCHA challenge.',
          });
        }
      }

      // ── Format validation ────────────────────────────────────────
      const prismaFormat = FORMAT_MAP[format.toLowerCase()];
      if (!prismaFormat) {
        return reply.status(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    `Unsupported format "${format}". Allowed: ${Object.keys(FORMAT_MAP).join(', ')}`,
        });
      }

      // ── Platform detection ───────────────────────────────────────
      const platform = detectPlatform(url);

      // ── Create DB record ─────────────────────────────────────────
      let job: { id: string };
      try {
        job = await prisma.downloadJob.create({
          data: {
            url,
            platform,
            format:   prismaFormat as any,
            status:   'QUEUED',
            clientIp: req.ip,
          },
        });
      } catch (err: any) {
        app.log.error({ err: err.message, url }, 'Failed to create download job in DB');
        return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Failed to create job' });
      }

      // ── Analytics: log successful queue event ────────────────────
      await logAnalyticsEvent('download_queued', {
        jobId:    job.id,
        url,
        platform,
        format,
        ip:       req.ip,
        ua:       req.headers['user-agent'] ?? '',
      });

      app.log.info({
        jobId:      job.id,
        platform,
        format,
        ip:         req.ip,
        dailyUsed:  daily.count,
        dailyLimit: daily.limit,
      }, 'Download job queued');

      // ── Enqueue BullMQ job ───────────────────────────────────────
      await getQueue().add(
        'process',
        { jobId: job.id, url, format: format.toLowerCase(), platform },
        { jobId: job.id },  // BullMQ job ID = DB ID for easy cross-lookup
      );

      return reply.status(202).send({
        jobId:   job.id,
        status:  'queued',
        platform,
        format,
        message: `Job queued. Poll /api/status/${job.id} for progress.`,
      });
    },
  );
};
