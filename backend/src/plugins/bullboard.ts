/**
 * plugins/bullboard.ts
 * ─────────────────────
 * Mounts Bull Board UI at GET /admin/queues
 * Shows all BullMQ queues: media-processing, cleanup
 */

import type { FastifyInstance } from 'fastify';
import { createBullBoard }      from '@bull-board/api';
import { BullMQAdapter }        from '@bull-board/api/bullMQAdapter.js';
import { FastifyAdapter }       from '@bull-board/fastify';
import { getQueue }             from '../queue/index.js';

export async function registerBullBoard(app: FastifyInstance): Promise<void> {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [
      // Cast to any to avoid BullMQAdapter ↔ BaseAdapter type mismatch
      // caused by mismatched peer dependency versions of bullmq/@bull-board
      new BullMQAdapter(getQueue()) as any,
    ],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle:    'MediaProc Queue Dashboard',
        favIcon: {
          default: 'static/images/logo.ico',
          alternative: 'static/favicon-32x32.png',
        },
      },
    },
  });

  serverAdapter.setBasePath('/admin/queues');

  await app.register(serverAdapter.registerPlugin(), {
    prefix:   '/admin/queues',
    basePath: '/admin/queues',
  });

  app.log.info('Bull Board mounted at /admin/queues');
}
