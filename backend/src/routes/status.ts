/**
 * routes/status.ts
 * ─────────────────
 * GET /api/status/:jobId — live job progress + expiring signed download URL.
 *
 * When a job is COMPLETED, a pre-signed S3 URL is generated on the fly
 * (default expiry: 1 hour) instead of returning a bare public URL.
 * This ensures downloads are always accessible for the configured TTL
 * even if the S3 bucket is private.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z }              from 'zod';
import { getQueue }       from '../queue/index.js';
import { prisma }         from '../db/prisma.js';
import { signedUrl }      from '../services/storage.js';
import { logAnalyticsEvent } from '../services/analytics.js';

const UUIDSchema = z.string().uuid('jobId must be a valid UUID');

// Signed URL TTL in seconds — configurable via env
const SIGNED_URL_TTL = Number(process.env.SIGNED_URL_TTL_SEC || 3600); // default 1 hour

interface StatusResult {
  jobId:        string;
  status:       string;
  progress:     number;
  platform?:    string;
  format?:      string;
  downloadUrl?: string;
  expiresAt?:   string;   // ISO timestamp when the download URL expires
  fileSizeBytes?: number;
  error?:       string;
}

async function resolveJobStatus(jobId: string): Promise<StatusResult | null> {
  // 1. Try BullMQ first — has real-time progress for active jobs
  try {
    const bullJob = await getQueue().getJob(jobId);
    if (bullJob) {
      const state    = await bullJob.getState();
      const progress = typeof bullJob.progress === 'number' ? bullJob.progress : 0;

      if (state === 'failed') {
        return { jobId, status: 'failed', progress: 0, error: bullJob.failedReason ?? 'Job failed' };
      }

      if (state === 'completed' && bullJob.returnvalue?.storageKey) {
        const url       = await signedUrl(bullJob.returnvalue.storageKey, SIGNED_URL_TTL);
        const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
        return {
          jobId,
          status:       'completed',
          progress:     100,
          downloadUrl:  url,
          expiresAt,
          fileSizeBytes: bullJob.returnvalue.fileSizeBytes,
        };
      }

      return {
        jobId,
        status:   state === 'active' ? 'processing' : 'queued',
        progress,
      };
    }
  } catch {
    // BullMQ miss — job may have been removed from queue (past removeOnComplete count)
  }

  // 2. Fall back to Prisma DB — works for archived/old jobs
  const job = await prisma.downloadJob.findUnique({
    where:  { id: jobId },
    select: {
      id:           true,
      status:       true,
      progress:     true,
      storageKey:   true,
      fileSizeBytes: true,
      errorMessage: true,
      platform:     true,
      format:       true,
    },
  });

  if (!job) return null;

  if (job.status === 'COMPLETED' && job.storageKey) {
    // Generate a fresh signed URL — the stored downloadUrl may have expired
    let url: string;
    let expiresAt: string;
    try {
      url       = await signedUrl(job.storageKey, SIGNED_URL_TTL);
      expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
    } catch {
      // S3 object may have been cleaned up — file expired
      return {
        jobId,
        status:   'expired',
        progress: 100,
        error:    'Download file has expired. Please re-submit the URL.',
      };
    }

    return {
      jobId,
      status:       'completed',
      progress:     100,
      platform:     job.platform ?? undefined,
      format:       job.format   ?? undefined,
      downloadUrl:  url,
      expiresAt,
      fileSizeBytes: job.fileSizeBytes != null ? Number(job.fileSizeBytes) : undefined,
    };
  }

  return {
    jobId,
    status:   job.status.toLowerCase(),
    progress: job.progress,
    platform: job.platform ?? undefined,
    format:   job.format   ?? undefined,
    error:    job.errorMessage ?? undefined,
  };
}

export const statusRoute: FastifyPluginAsync = async (app) => {

  // GET /api/status/:jobId  — primary endpoint
  app.get<{ Params: { jobId: string } }>(
    '/status/:jobId',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      schema: {
        tags:    ['media'],
        summary: 'Poll job status, progress, and expiring download URL',
        params: {
          type:       'object',
          properties: { jobId: { type: 'string', format: 'uuid' } },
          required:   ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId:         { type: 'string' },
              status:        { type: 'string', enum: ['queued', 'processing', 'completed', 'failed', 'expired'] },
              progress:      { type: 'number' },
              downloadUrl:   { type: 'string' },
              expiresAt:     { type: 'string', format: 'date-time' },
              fileSizeBytes: { type: 'number' },
              error:         { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const v = UUIDSchema.safeParse(req.params.jobId);
      if (!v.success) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: v.error.errors[0]!.message });
      }

      const result = await resolveJobStatus(v.data);
      if (!result) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', jobId: v.data, message: 'Job not found' });
      }

      // Analytics: log when a completed job is downloaded
      if (result.status === 'completed' && result.downloadUrl) {
        await logAnalyticsEvent('download_url_served', {
          jobId:    v.data,
          platform: result.platform ?? 'unknown',
          format:   result.format   ?? 'unknown',
          ip:       req.ip,
        });
      }

      return result;
    },
  );

  // GET /api/status?jobId=  — legacy / backwards-compat
  app.get<{ Querystring: { jobId?: string } }>(
    '/status',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { jobId } = req.query;
      if (!jobId) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Provide jobId: /api/status/:jobId' });
      }
      const v = UUIDSchema.safeParse(jobId);
      if (!v.success) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: v.error.errors[0]!.message });
      }
      const result = await resolveJobStatus(v.data);
      return result ?? reply.status(404).send({ statusCode: 404, error: 'Not Found', jobId: v.data });
    },
  );
};
