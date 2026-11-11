import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validation/auth';
import { createSession } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database is not configured. Set DATABASE_URL in .env and apply the Prisma migrations.' },
        { status: 503 }
      );
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please enter a valid email or 10-digit mobile number and password.' },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier.trim();
    const isEmail = identifier.includes('@');
    const digitsOnly = identifier.replace(/[^0-9]/g, '');
    const phoneCandidates = Array.from(
      new Set(
        [digitsOnly, digitsOnly.length > 10 ? digitsOnly.slice(-10) : ''].filter(Boolean)
      )
    );

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { phone: { in: phoneCandidates } },
      include: {
        dairy: true,
        memberships: {
          include: { dairy: true },
        },
      },
    });

    // Check password
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email/mobile number or password.' }, { status: 401 });
    }

    // Check account status
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account is deactivated or suspended. Please contact the administrator.' },
        { status: 403 }
      );
    }

    // Check dairy status if not super admin
    const activeDairy = user.memberships?.[0]?.dairy || user.dairy;
    if (user.role !== 'SUPER_ADMIN' && activeDairy && activeDairy.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: `The dairy business account (${activeDairy.name}) is currently suspended. Please contact platform support.` },
        { status: 403 }
      );
    }

    // Determine dashboard URL strictly based on database role
    let redirectUrl = '/dashboard';
    switch (user.role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/super-admin/dashboard';
        break;
      case 'ADMIN':
        redirectUrl = '/admin/dashboard';
        break;
      case 'FARMER':
        redirectUrl = '/farmer/dashboard';
        break;
      case 'CUSTOMER':
        redirectUrl = '/customer/dashboard';
        break;
      case 'STAFF':
        redirectUrl = '/staff/dashboard';
        break;
    }

    const sessionDays = body?.rememberMe ? 30 : 7;
    await createSession(user.id, sessionDays);

    try {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          dairyId: activeDairy?.id || undefined,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ip,
        },
      });
    } catch (logErr) {
      console.warn('Non-fatal login metadata update failed:', logErr?.message);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        dairyId: activeDairy?.id || null,
        dairyName: activeDairy?.name || null,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error('Login error:', error);
    const code = error?.code || '';
    const msg = String(error?.message || '');

    if (code === 'P2021' || code === 'P2022' || /does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'Database schema is not initialized on this server. Apply Prisma migrations (prisma migrate deploy) on your cloud PostgreSQL database.',
        },
        { status: 503 }
      );
    }
    if (
      code === 'P1000' ||
      code === 'P1001' ||
      code === 'P1002' ||
      /Can't reach database server|Authentication failed|ECONNREFUSED|localhost:5433/i.test(msg)
    ) {
      return NextResponse.json(
        {
          error:
            'Cannot connect to PostgreSQL database. Verify Vercel DATABASE_URL environment variable uses a live cloud PostgreSQL connection string (not localhost).',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Unable to sign in right now. Please try again.' },
      { status: 500 }
    );
  }
}