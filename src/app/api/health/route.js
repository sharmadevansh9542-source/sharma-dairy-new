import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  const databaseConfigured = Boolean(dbUrl);
  const isLocalhostUrl = /localhost|127\.0\.0\.1/i.test(dbUrl);
  const runningOnVercel = Boolean(process.env.VERCEL);

  const result = {
    ok: false,
    environment: runningOnVercel ? 'vercel' : process.env.NODE_ENV || 'development',
    databaseConfigured,
    isLocalhostUrl,
    dbConnected: false,
    migrationsApplied: false,
    hasUsers: false,
    hasSuperAdmin: false,
    hint: '',
  };

  if (!databaseConfigured) {
    result.hint = 'DATABASE_URL environment variable is not set.';
    return NextResponse.json(result, { status: 503 });
  }

  if (runningOnVercel && isLocalhostUrl) {
    result.hint =
      'Vercel DATABASE_URL is set to localhost/127.0.0.1. Set a cloud PostgreSQL URL (Neon, Supabase, or Vercel Postgres) in Vercel Environment Variables.';
    return NextResponse.json(result, { status: 503 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.dbConnected = true;

    const [userCount, superAdminCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.dairy.count(),
      prisma.dairyMembership.count(),
      prisma.milkEntry.count(),
    ]);

    result.migrationsApplied = true;
    result.hasUsers = userCount > 0;
    result.hasSuperAdmin = superAdminCount > 0;
    result.ok = userCount > 0;

    if (userCount === 0) {
      result.hint =
        'Database tables exist, but no user accounts exist yet. Run scripts/bootstrap-super-admin.js against your cloud DATABASE_URL or register a dairy via /register-dairy.';
    } else {
      result.hint = 'Database connected, schema up to date, and user accounts present.';
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const code = err?.code || '';
    const msg = String(err?.message || '');
    if (code === 'P2021' || code === 'P2022' || /does not exist/i.test(msg)) {
      result.dbConnected = true;
      result.hint =
        'Database connected, but schema migrations are missing. Run "npx prisma migrate deploy" against your cloud DATABASE_URL.';
    } else if (/Authentication failed/i.test(msg)) {
      result.hint = 'PostgreSQL authentication failed. Check DATABASE_URL username and password.';
    } else {
      result.hint = `Database error (${code || 'CONNECTION'}): check DATABASE_URL and SSL settings.`;
    }
    return NextResponse.json(result, { status: 503 });
  }
}

