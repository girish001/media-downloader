/**
 * backend/src/server.ts
 * ─────────────────────
 * Production Fastify server.
 *
 * Safeguards added / confirmed:
 *  ✓ Global error handler — catches every unhandled route/plugin error
 *  ✓ CORS — reads CORS_ORIGIN from env, supports comma-separated list
 *  ✓ Body size limit — MAX_BODY_SIZE_MB (default 2 MB) via Fastify bodyLimit
 *  ✓ Graceful shutdown — SIGTERM + SIGINT drain in-flight requests then exit
 *  ✓ Pino structured logging in production, pino-pretty in dev
 *  ✓ Sentry error capture on every 5xx
 *  ✓ /health (liveness) + /ready (readiness) probes
 */

import Fastify              from 'fastify';
import cors                 from '@fastify/cors';
import rateLimit            from '@fastify/rate-limit';
import { parseRoute }       from './routes/parse.js';
import { downloadRoute }    from './routes/download.js';
import { statusRoute }      from './routes/status.js';
import { previewRoute }     from './routes/preview.js';
import { downloadFileRoute } from './routes/download-file.js';
import { adminRoutes }      from './routes/admin.js';
import { getRedis }         from './services/redis.js';
import { prisma }           from './db/prisma.js';
import { startCleanupScheduler }  from './services/cleanup.js';
import { attachQueueLogging }     from './queue/index.js';
import { registerSwagger }        from './plugins/swagger.js';
import { registerBullBoard }      from './plugins/bullboard.js';
import { initSentry, captureException } from './plugins/sentry.js';
import { validateEnv }            from './lib/validateEnv.js';

/* ─── Env validation — must run FIRST before any service connects ──── */
// Exits with a clear error listing ALL missing variables rather than
// crashing deep inside AWS SDK / Prisma with a cryptic null-reference.
validateEnv('backend');

/* ─── Sentry (must init before app creation) ──────────────────────── */
initSentry();

const isProd        = process.env.NODE_ENV === 'production';
const MAX_BODY_MB   = Number(process.env.MAX_BODY_SIZE_MB || 2);

/* ─── Fastify instance ─────────────────────────────────────────────── */
const app = Fastify({
  // Body size limit — prevents oversized JSON payloads (separate from media file size)
  bodyLimit: MAX_BODY_MB * 1024 * 1024,

  // Trust X-Forwarded-For from nginx reverse proxy
  trustProxy: true,

  logger: {
    level: process.env.LOG_LEVEL || 'info',
    ...(isProd
      ? {
          // Structured JSON for log aggregation (Datadog, Loki, CloudWatch)
          serializers: {
            req(req: any): Record<string, unknown> {
              return {
                method:        req?.method,
                url:           req?.url,
                remoteAddress: req?.ip ?? req?.socket?.remoteAddress,
                userAgent:     req?.headers?.['user-agent'],
              };
            },
            res(res: any): Record<string, unknown> {
              return { statusCode: res.statusCode };
            },
          },
        }
      : {
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }),
  },
});

/* ─── CORS ─────────────────────────────────────────────────────────── */
// CORS_ORIGIN can be a comma-separated list of allowed origins:
//   CORS_ORIGIN=https://example.com,https://www.example.com
// In development, defaults to localhost:3000
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

await app.register(cors, {
  origin(origin, cb) {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // In dev, allow any localhost port
    if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin "${origin}" not allowed`), false);
  },
  methods:     ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge:      86400,   // preflight cache 24h
});

/* ─── Global rate limiting (Redis-backed per-IP) ───────────────────── */
await app.register(rateLimit, {
  global:     true,
  max:        Number(process.env.RATE_LIMIT_GLOBAL_MAX        || 300),
  timeWindow: process.env.RATE_LIMIT_GLOBAL_WINDOW            || '1 minute',
  redis:      getRedis(),
  keyGenerator: req => req.ip,
  errorResponseBuilder: (_req, ctx) => ({
    statusCode: 429,
    error:      'Too Many Requests',
    message:    `Rate limit exceeded. Retry in ${ctx.after}.`,
    retryAfter: ctx.after,
  }),
});

/* ─── Plugins ──────────────────────────────────────────────────────── */
await registerSwagger(app);
await registerBullBoard(app);

/* ─── Routes ───────────────────────────────────────────────────────── */
app.register(parseRoute,    { prefix: '/api' });
app.register(downloadRoute, { prefix: '/api' });
app.register(statusRoute,      { prefix: '/api' });
app.register(downloadFileRoute, { prefix: '/api' });
app.register(previewRoute,  { prefix: '/api' });
app.register(adminRoutes,   { prefix: '/api/admin' });

/* ─── Health probes ────────────────────────────────────────────────── */

/** GET /health — liveness probe. Always 200 if process is running. */
app.get('/health', { logLevel: 'silent', config: { rateLimit: false } }, async () => ({
  status:    'ok',
  uptime:    Math.floor(process.uptime()),
  timestamp: new Date().toISOString(),
  pid:       process.pid,
  version:   process.env.npm_package_version ?? '1.0.0',
}));

/** GET /ready — readiness probe. Returns 503 when DB or Redis are unreachable. */
app.get('/ready', { logLevel: 'silent', config: { rateLimit: false } }, async (_req, reply) => {
  const [redisResult, dbResult] = await Promise.allSettled([
    getRedis().ping(),
    prisma.$queryRaw`SELECT 1`,
  ]);
  const redisOk = redisResult.status === 'fulfilled' &&
                  (redisResult.value as string) === 'PONG';
  const dbOk    = dbResult.status === 'fulfilled';

  if (!redisOk || !dbOk) {
    return reply.status(503).send({
      status:    'not_ready',
      timestamp: new Date().toISOString(),
      checks:    { redis: redisOk, database: dbOk },
    });
  }
  return {
    status:    'ready',
    timestamp: new Date().toISOString(),
    checks:    { redis: true, database: true },
  };
});

/* ─── Global error handler ─────────────────────────────────────────── */
// Catches ALL unhandled errors from routes, plugins, and hooks.
// Ensures consistent JSON error shape, proper status codes, and Sentry capture.
app.setErrorHandler(async (error, req, reply) => {
  const statusCode = error.statusCode ?? 500;

  // Log at appropriate level
  if (statusCode >= 500) {
    app.log.error(
      { err: { message: error.message, stack: error.stack }, reqMethod: req.method, reqUrl: req.url, reqIp: req.ip },
      'Internal server error',
    );
    // Forward to Sentry for 5xx errors
    captureException(error);
  } else if (statusCode === 429) {
    app.log.warn({ ip: req.ip, url: req.url }, 'Rate limit hit');
  } else {
    app.log.warn({ statusCode, message: error.message, url: req.url }, 'Request error');
  }

  // Validation errors from Fastify schema or Zod
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error:      'Validation Error',
      message:    error.message,
      details:    error.validation,
    });
  }

  // CORS errors — return 403 not 500
  if (error.message?.startsWith('CORS:')) {
    return reply.status(403).send({
      statusCode: 403,
      error:      'Forbidden',
      message:    'Cross-origin request blocked.',
    });
  }

  // Hide internal details in production for 5xx
  const message = (isProd && statusCode >= 500)
    ? 'An internal error occurred. Our team has been notified.'
    : error.message;

  return reply.status(statusCode).send({
    statusCode,
    error:   error.name || 'Error',
    message,
  });
});

/* ─── 404 handler ──────────────────────────────────────────────────── */
app.setNotFoundHandler((req, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error:      'Not Found',
    message:    `Route ${req.method} ${req.url} not found`,
  });
});

/* ─── Graceful shutdown ─────────────────────────────────────────────── */
// SIGTERM: sent by Docker/Kubernetes on container stop — drain in-flight requests
// SIGINT:  Ctrl+C during development
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  app.log.info(`${signal} received — graceful shutdown started`);

  try {
    // Stop accepting new connections and wait for in-flight requests to complete
    // Fastify close() respects keep-alive connections and open requests
    await app.close();
    app.log.info('HTTP server closed');
  } catch (err) {
    app.log.error({ err }, 'Error closing HTTP server');
  }

  try {
    await prisma.$disconnect();
    app.log.info('PostgreSQL disconnected');
  } catch (err) {
    app.log.error({ err }, 'Error disconnecting Prisma');
  }

  app.log.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch any unhandled promise rejections that escape route handlers
process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'Unhandled promise rejection');
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

/* ─── Bootstrap ────────────────────────────────────────────────────── */
async function start(): Promise<void> {
  // Verify infrastructure connectivity before binding port
  await prisma.$connect();
  app.log.info('PostgreSQL connected');

  await getRedis().ping();
  app.log.info('Redis connected');

  attachQueueLogging({
    info:  msg => app.log.info(msg),
    error: msg => app.log.error(msg),
  });

  startCleanupScheduler();

  const port = Number(process.env.PORT || 4000);
  await app.listen({ port, host: '0.0.0.0' });

  app.log.info({
    port,
    env:          process.env.NODE_ENV,
    corsOrigins:  allowedOrigins,
    bodyLimitMB:  MAX_BODY_MB,
    logLevel:     process.env.LOG_LEVEL || 'info',
  }, 'MediaProc API ready');

  if (!isProd) {
    app.log.info(`Swagger:    http://localhost:${port}/docs`);
    app.log.info(`Bull Board: http://localhost:${port}/admin/queues`);
  }
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
