/**
 * routes/preview.ts
 * ──────────────────
 * GET /api/preview?url=  — lightweight title + thumbnail, no format list.
 * Used by the frontend to show a preview before the user selects a format.
 */

import type { FastifyPluginAsync } from 'fastify';
import { getExtractor } from '../extractors/index.js';

export const previewRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { url?: string } }>(
    '/preview',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        tags: ['media'],
        summary: 'Get lightweight preview (title + thumbnail)',
        querystring: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string', format: 'uri' } },
        },
      },
    },
    async (req, reply) => {
      const { url } = req.query;
      if (!url) return reply.status(400).send({ error: 'url query parameter is required' });

      try {
        new URL(url); // validate
      } catch {
        return reply.status(400).send({ error: 'Invalid URL format' });
      }

      try {
        const extractor = getExtractor(url);
        const preview   = await extractor.getPreview(url);
        return preview;
      } catch (err: any) {
        app.log.warn({ url, err: err.message }, 'Preview failed');
        return reply.status(422).send({ error: 'Could not fetch preview', message: err.message });
      }
    },
  );
};
