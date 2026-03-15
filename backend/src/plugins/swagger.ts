/**
 * plugins/swagger.ts
 * ──────────────────
 * Registers @fastify/swagger + @fastify/swagger-ui.
 * Docs available at GET /docs (dev only).
 */

import type { FastifyInstance } from 'fastify';
import swagger   from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title:       'MediaProc API',
        description: 'URL → platform detection → BullMQ queue → FFmpeg → S3 → download link',
        version:     '3.0.0',
      },
      servers: [
        { url: process.env.API_BASE_URL || 'http://localhost:4000', description: 'Current server' },
      ],
      tags: [
        { name: 'media',  description: 'Parse, download, and status endpoints' },
        { name: 'admin',  description: 'Admin statistics and job management'   },
        { name: 'system', description: 'Health and readiness probes'           },
      ],
    },
  });

  // Only mount the UI in non-production (or if SWAGGER_ENABLED=true)
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig:    { docExpansion: 'list', deepLinking: true },
      staticCSP:   true,
    });
  }
}
