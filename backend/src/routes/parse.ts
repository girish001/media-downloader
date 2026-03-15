/**
 * routes/parse.ts
 * ────────────────
 * POST /api/parse  — detect platform and return available formats.
 *
 * Error handling: yt-dlp errors are already translated to friendly messages
 * by base.ts translateYtdlpError(). This route surfaces them clearly.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z }              from 'zod';
import { getExtractor }   from '../extractors/index.js';

const BodySchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export const parseRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { url: string } }>(
    '/parse',
    {
      config: { rateLimit: { max: Number(process.env.RATE_LIMIT_PARSE_MAX || 120), timeWindow: process.env.RATE_LIMIT_PARSE_WINDOW || '1 minute' } },
      schema: {
        tags: ['media'],
        summary: 'Detect platform and fetch available formats',
        body: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string', format: 'uri' } },
        },
      },
    },
    async (req, reply) => {
      const parsed = BodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
      }

      const { url } = parsed.data;

      try {
        const extractor = getExtractor(url);
        const meta      = await extractor.getMetadata(url);
        return meta;
      } catch (err: any) {
        // err.message is already translated to a user-friendly string by base.ts
        app.log.error({ url, err: err.message }, 'Parse failed');
        return reply.status(422).send({
          error:   'Could not extract media info',
          message: err.message,   // friendly message shown in frontend
          url,
        });
      }
    },
  );
};
