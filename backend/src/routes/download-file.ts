/**
 * backend/src/routes/download-file.ts
 * ──────────────────────────────────────
 * GET /api/download-file/:jobId
 *
 * Streams the completed file through the backend to the browser,
 * setting Content-Disposition: attachment so it always downloads to
 * the user's Downloads folder — even on mobile and cross-origin.
 *
 * WHY THIS ROUTE:
 *   Pre-signed S3 URLs returned by /api/status can fail in the browser:
 *   • Cross-origin <a download> is ignored by Firefox/Safari
 *   • MinIO CORS may not include the frontend origin
 *   • Mobile browsers open the URL in-tab instead of downloading
 *
 *   This endpoint fetches the file server-side (no CORS) and streams it
 *   back with the correct headers. The browser sees a same-origin response.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z }           from 'zod';
import { prisma }      from '../db/prisma.js';
import { signedUrl }   from '../services/storage.js';

const UUIDSchema = z.string().uuid();

export const downloadFileRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { jobId: string } }>(
    '/download-file/:jobId',
    {
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
      schema: {
        tags:    ['media'],
        summary: 'CORS-safe streaming download proxy for completed jobs',
        params: {
          type:       'object',
          properties: { jobId: { type: 'string', format: 'uuid' } },
          required:   ['jobId'],
        },
      },
    },
    async (req, reply) => {
      const v = UUIDSchema.safeParse(req.params.jobId);
      if (!v.success) {
        return reply.status(400).send({ error: 'Invalid jobId' });
      }

      const job = await prisma.downloadJob.findUnique({
        where:  { id: v.data },
        select: { status: true, storageKey: true, format: true },
      });

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      if (job.status !== 'COMPLETED' || !job.storageKey) {
        return reply.status(409).send({
          error:  'Job not completed yet',
          status: job.status.toLowerCase(),
        });
      }

      // Build a friendly filename
      const ext      = job.format === 'MP3' ? 'mp3' : 'mp4';
      const safeName = job.storageKey.split('/').pop() ?? `download-${v.data}.${ext}`;

      try {
        // Get a short-lived signed URL (2 min — only used for this single server-side fetch)
        const s3Url = await signedUrl(job.storageKey, 120);

        // Fetch from S3/MinIO server-side — no CORS issues, same Railway network
        const upstream = await fetch(s3Url);
        if (!upstream.ok) {
          throw new Error(`S3 returned HTTP ${upstream.status}`);
        }

        // Forward content-type and length
        const contentType   = upstream.headers.get('content-type')   ?? 'application/octet-stream';
        const contentLength = upstream.headers.get('content-length');

        reply.header('Content-Disposition', `attachment; filename="${safeName}"`);
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'private, no-store');
        if (contentLength) reply.header('Content-Length', contentLength);

        // Stream the body directly to the browser — no buffering in memory
        return reply.send(upstream.body);

      } catch (err: any) {
        app.log.error({ err: err.message, jobId: v.data }, 'download-file stream error');

        // Last resort: redirect to a fresh 5-minute signed URL
        try {
          const fallbackUrl = await signedUrl(job.storageKey, 300);
          return reply.redirect(302, fallbackUrl);
        } catch {
          return reply.status(500).send({ error: 'File unavailable or expired' });
        }
      }
    }
  );
};
