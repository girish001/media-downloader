/**
 * routes/download.ts
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { getQueue } from '../queue/index.js';
import { detectPlatform } from '../extractors/index.js';
import { verifyCaptcha } from '../middleware/captcha.js';
import { logAnalyticsEvent } from '../services/analytics.js';
import { getRedis } from '../services/redis.js';

const BodySchema = z.object({
  url: z.string().url('Must be a valid URL'),
  format: z.string().min(1).max(20),
  captchaToken: z.string().optional(),
});

const FORMAT_MAP: Record<string, string> = {
  '4k': 'MP4_4K',
  '1440p': 'MP4_1440P',
  '1080p': 'MP4_1080P',
  '720p': 'MP4_720P',
  '480p': 'MP4_480P',
  '360p': 'MP4_360P',
  '240p': 'MP4_240P',
  '144p': 'MP4_144P',
  'mp3': 'MP3',
  'hd': 'MP4_1080P',
  'sd': 'MP4_720P',
  'best': 'MP4_1080P',
};

async function checkDailyLimit(ip: string) {
  const DAILY_MAX = Number(process.env.RATE_LIMIT_DAILY_MAX || 20);

  const date = new Date().toISOString().slice(0, 10);
  const key = `dl:daily:${date}:${ip}`;

  const redis = getRedis();

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 25 * 60 * 60);
  }

  return count > DAILY_MAX
    ? { allowed: false, count, limit: DAILY_MAX }
    : { allowed: true, count, limit: DAILY_MAX };
}

export const downloadRoute: FastifyPluginAsync = async (app) => {

  app.post('/download', {

    config: {
      rateLimit: {
        max: Number(process.env.RATE_LIMIT_DOWNLOAD_MAX || 60),
        timeWindow: process.env.RATE_LIMIT_DOWNLOAD_WINDOW || '10 minutes'
      }
    }

  }, async (req, reply) => {

    const parsed = BodySchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid request body'
      });
    }

    const { url, format, captchaToken } = parsed.data;

    const daily = await checkDailyLimit(req.ip);

    if (!daily.allowed) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: `Daily download limit reached (${daily.limit})`
      });
    }

    if (process.env.CAPTCHA_SECRET_KEY) {

      const ok = await verifyCaptcha(captchaToken, req.ip);

      if (!ok) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Captcha verification failed'
        });
      }
    }

    let prismaFormat = FORMAT_MAP[format.toLowerCase()];

    // Allow yt-dlp numeric format IDs like 137, 398, 248 etc
    if (!prismaFormat) {

      if (/^\d+$/.test(format)) {
        prismaFormat = 'MP4_1080P';
      } else {

        return reply.status(400).send({
          error: 'Bad Request',
          message: `Unsupported format "${format}". Allowed: ${Object.keys(FORMAT_MAP).join(', ')}`
        });

      }

    }

    const platform = detectPlatform(url);

    const job = await prisma.downloadJob.create({
      data: {
        url,
        platform,
        format: prismaFormat as any,
        status: 'QUEUED',
        clientIp: req.ip
      }
    });

    await logAnalyticsEvent('download_queued', {
      jobId: job.id,
      url,
      platform,
      format,
      ip: req.ip
    });

    app.log.info({
      jobId: job.id,
      platform,
      format,
      ip: req.ip
    }, 'Download job queued');

    await getQueue().add(
      'process',
      {
        jobId: job.id,
        url,
        format,
        platform
      },
      { jobId: job.id }
    );

    return reply.status(202).send({
      jobId: job.id,
      status: 'queued',
      platform,
      format
    });

  });

};
