/**
 * queue/index.ts
 * ───────────────
 * BullMQ Queue singleton.
 *
 * FIX: BullMQ bundles its own ioredis internally. Passing an external IORedis
 * instance causes TS2322 "Type 'Redis' is not assignable to ConnectionOptions"
 * because the two ioredis copies have incompatible internal types (AbstractConnector
 * 'connecting' property conflict). The correct fix is to pass the Redis connection
 * URL string directly — BullMQ creates its own internal connection from it,
 * eliminating the dual-ioredis type conflict entirely.
 *
 * Also: 'timeout' was removed from BullMQ DefaultJobOptions in v5+. Job-level
 * timeouts are now handled by the worker's own AbortController / execa timeout,
 * not by BullMQ's queue options.
 */

import { Queue, QueueEvents } from 'bullmq';

export const QUEUE_NAME = 'media-processing';

// Connection string for BullMQ — passed as string to avoid ioredis dual-import
// type conflicts between BullMQ's bundled ioredis and our app's ioredis.
function getRedisConnection(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

let _queue: Queue | null = null;

export function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: { url: getRedisConnection() } as any,
      defaultJobOptions: {
        // Retry up to 3 times with exponential backoff (5s, 10s, 20s)
        attempts: 3,
        backoff:  { type: 'exponential', delay: 5_000 },
        // Keep last 500 completed and 200 failed jobs in Redis for Bull Board visibility
        removeOnComplete: { count: 500 },
        removeOnFail:     { count: 200 },
        // NOTE: 'timeout' was removed from DefaultJobOptions in BullMQ v5+.
        // Job timeouts are enforced by the worker's yt-dlp AbortController timeout.
      },
    });
  }
  return _queue;
}

export interface Logger {
  info(msg: string): void;
  error(msg: string): void;
}

export function attachQueueLogging(log: Logger): void {
  const events = new QueueEvents(QUEUE_NAME, {
    connection: { url: getRedisConnection() } as any,
  });

  events.on('completed', ({ jobId }) =>
    log.info(`[queue] Job ${jobId} completed`));

  events.on('failed', ({ jobId, failedReason }) =>
    log.error(`[queue] Job ${jobId} failed: ${failedReason}`));

  events.on('progress', ({ jobId, data }) =>
    log.info(`[queue] Job ${jobId} progress: ${JSON.stringify(data)}%`));

  events.on('stalled', ({ jobId }) =>
    log.error(`[queue] Job ${jobId} stalled — worker may have crashed`));

  events.on('active', ({ jobId }) =>
    log.info(`[queue] Job ${jobId} started processing`));

  events.on('delayed', ({ jobId }) =>
    log.info(`[queue] Job ${jobId} delayed (retry backoff)`));
}
