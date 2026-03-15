/**
 * services/redis.ts
 * ──────────────────
 * IORedis singleton with production-safe options.
 */

import { Redis as IORedis } from 'ioredis';

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (url) {
      _redis = new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck:     false,
        lazyConnect:          false,
      });
    } else {
      _redis = new IORedis({
        host:     process.env.REDIS_HOST     || 'localhost',
        port:     Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck:     false,
      });
    }

    _redis.on('error', (err: any) => console.error('[redis] Connection error:', err.message));
    _redis.on('connect', ()       => console.info('[redis] Connected.'));
  }
  return _redis;
}
