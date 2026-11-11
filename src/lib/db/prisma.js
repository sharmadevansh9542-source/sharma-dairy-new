import { PrismaClient } from '@prisma/client';

/**
 * Normalize PostgreSQL connection strings for Neon & Vercel serverless reliability:
 * - Deletes `channel_binding` (breaks Prisma 6 query engine over PgBouncer).
 * - Sets `pgbouncer=true` on `-pooler` endpoints.
 * - Sets `connect_timeout=30`, `pool_timeout=30`, and `connection_limit=5`
 *   so Neon scale-to-zero cold starts never trip Prisma's default 10s pool timeout.
 */
export function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.protocol.startsWith('postgres')) return rawUrl;

    parsed.searchParams.delete('channel_binding');

    if (parsed.hostname.includes('-pooler.') && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    if (parsed.hostname.includes('neon.tech') || parsed.hostname.includes('-pooler.')) {
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '30');
      }
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '30');
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '5');
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl
      .replace(/([?&])channel_binding=require(&|$)/g, (_, sep, end) => (end === '&' ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

const normalizedUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (normalizedUrl && normalizedUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizedUrl;
}

const globalForPrisma = globalThis;
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(normalizedUrl ? { datasources: { db: { url: normalizedUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
