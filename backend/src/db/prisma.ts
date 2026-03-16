/**
 * db/prisma.ts
 * ─────────────
 * PrismaClient singleton with production-safe logging.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
  ? ['warn', 'error']
  : ['query', 'warn', 'error'];

export const prisma = new PrismaClient({
  log: logLevel,
});
