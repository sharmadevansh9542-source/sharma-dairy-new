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
    const normalizedIdentifier = isEmail ? identifier.toLowerCase() : identifier.replace(/[^0-9]/g, '');

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier }
        : { phone: normalizedIdentifier },
    });

    // Check password
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email/mobile number or password.' }, { status: 401 });
    }

    // Check account status
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account is deactivated or suspended. Please contact the Sharma Dairy administrator.' },
        { status: 403 }
      );
    }

    // Determine dashboard URL based on database role
    let redirectUrl = '/dashboard';
    switch (user.role) {
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

    await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unable to sign in right now. Please try again.' }, { status: 500 });
  }
}