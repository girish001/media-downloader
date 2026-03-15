/**
 * routes/admin.ts
 * ────────────────
 * Admin API routes. Mounted at /api/admin.
 * Note: Bull Board UI is at /admin/queues (separate plugin).
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma }   from '../db/prisma.js';
import { getQueue } from '../queue/index.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {

  /**
   * GET /api/admin/stats
   * Unified stats: daily, formats, summary — used by admin dashboard.
   */
  app.get('/stats', async () => {
    const [dailyRows, formatRows] = await Promise.all([
      prisma.$queryRaw<
        { day: Date; total: bigint; completed: bigint; failed: bigint; unique_ips: bigint; avg_secs: number | null }[]
      >`SELECT day, total, completed, failed, unique_ips, avg_secs FROM daily_stats ORDER BY day DESC LIMIT 30`,
      prisma.$queryRaw<
        { format: string; total: bigint; completed: bigint }[]
      >`SELECT format::text, total, completed FROM format_stats`,
    ]);

    const daily = dailyRows.map(r => ({
      day:       r.day.toISOString().slice(0, 10),
      total:     Number(r.total),
      completed: Number(r.completed),
      failed:    Number(r.failed),
      uniqueIps: Number(r.unique_ips),
      avgSecs:   r.avg_secs ? Math.round(r.avg_secs) : null,
    }));

    const formats = formatRows.map(r => ({
      format:    r.format,
      total:     Number(r.total),
      completed: Number(r.completed),
    }));

    const total30     = daily.reduce((a, d) => a + d.total,     0);
    const completed30 = daily.reduce((a, d) => a + d.completed, 0);
    const failed30    = daily.reduce((a, d) => a + d.failed,    0);
    const successRate = total30 > 0 ? Number(((completed30 / total30) * 100).toFixed(1)) : 0;

    return { daily, formats, summary: { total30, completed30, failed30, successRate } };
  });

  /* GET /api/admin/stats/daily — backwards compat */
  app.get('/stats/daily', async () => {
    const rows = await prisma.$queryRaw<
      { day: Date; total: bigint; completed: bigint; failed: bigint; unique_ips: bigint; avg_secs: number | null }[]
    >`SELECT * FROM daily_stats ORDER BY day DESC LIMIT 30`;
    return rows.map(r => ({
      day:       r.day.toISOString().slice(0, 10),
      total:     Number(r.total),
      completed: Number(r.completed),
      failed:    Number(r.failed),
      uniqueIps: Number(r.unique_ips),
      avgSecs:   r.avg_secs ? Math.round(r.avg_secs) : null,
    }));
  });

  /* GET /api/admin/stats/formats */
  app.get('/stats/formats', async () => {
    const rows = await prisma.$queryRaw<
      { format: string; total: bigint; completed: bigint }[]
    >`SELECT format::text, total, completed FROM format_stats`;
    return rows.map(r => ({ format: r.format, total: Number(r.total), completed: Number(r.completed) }));
  });

  /* GET /api/admin/jobs/recent */
  app.get('/jobs/recent', async () => {
    const jobs = await prisma.downloadJob.findMany({
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  { id: true, url: true, format: true, status: true, progress: true, createdAt: true, completedAt: true },
    });
    return jobs.map(j => ({
      ...j,
      format:      j.format.toLowerCase(),
      status:      j.status.toLowerCase(),
      createdAt:   j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    }));
  });

  /* GET /api/admin/queues/stats — BullMQ queue counts */
  app.get('/queues/stats', async () => {
    const queue  = getQueue();
    const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed');
    return { queue: queue.name, counts, timestamp: new Date().toISOString() };
  });

  /* POST /api/admin/stats/refresh */
  app.post('/stats/refresh', async () => {
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats`;
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY format_stats`;
    return { refreshed: true, timestamp: new Date().toISOString() };
  });

  /* DELETE /api/admin/queues/failed — drain failed jobs */
  app.delete('/queues/failed', async () => {
    const queue = getQueue();
    await queue.clean(0, 1000, 'failed');
    return { drained: true, timestamp: new Date().toISOString() };
  });
};
