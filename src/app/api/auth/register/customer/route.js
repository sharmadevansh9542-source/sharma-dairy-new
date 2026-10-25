import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { customerRegisterSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reg_customer:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = customerRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please verify all required registration fields.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPhone = data.phone.trim().replace(/[^0-9]/g, '');
    const normalizedEmail = data.email && data.email.trim() ? data.email.trim().toLowerCase() : null;

    // Check duplicate phone or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.phone === normalizedPhone) {
        return NextResponse.json({ error: 'This mobile number is already registered.' }, { status: 409 });
      }
      if (normalizedEmail && existing.email === normalizedEmail) {
        return NextResponse.json({ error: 'This email address is already registered.' }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const customerCode = `C-${randomUUID().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          phone: normalizedPhone,
          email: normalizedEmail,
          passwordHash,
          role: 'CUSTOMER',
          isActive: true,
        },
      });

      const profile = await tx.customerProfile.create({
        data: {
          customerCode,
          userId: user.id,
          address: data.address,
          alternatePhone: data.alternatePhone || null,
          category: data.category || 'HOUSEHOLD',
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REGISTER_CUSTOMER',
          entityType: 'CustomerProfile',
          entityId: profile.id,
          ipAddress: ip,
        },
      });

      return { user, profile };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Customer account registered successfully! You may now sign in using your mobile number or email.',
        customerCode: result.profile.customerCode,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Mobile number, email, or customer code already exists.' }, { status: 409 });
    }
    console.error('Customer registration error:', error);
    return NextResponse.json({ error: 'Unable to complete customer registration. Please try again.' }, { status: 500 });
  }
}
