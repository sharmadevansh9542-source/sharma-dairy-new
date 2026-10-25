import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { farmerRegisterSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reg_farmer:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = farmerRegisterSchema.safeParse(body);
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
    const farmerCode = `F-${randomUUID().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          phone: normalizedPhone,
          email: normalizedEmail,
          passwordHash,
          role: 'FARMER',
          isActive: true,
        },
      });

      const profile = await tx.farmerProfile.create({
        data: {
          farmerCode,
          userId: user.id,
          village: data.village,
          address: data.address || null,
          fatherName: data.fatherName || null,
          alternatePhone: data.alternatePhone || null,
          animalType: data.animalType || null,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REGISTER_FARMER',
          entityType: 'FarmerProfile',
          entityId: profile.id,
          ipAddress: ip,
        },
      });

      return { user, profile };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Farmer account registered successfully! You may now sign in using your mobile number and password.',
        farmerCode: result.profile.farmerCode,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Mobile number, email, or farmer code already exists.' }, { status: 409 });
    }
    console.error('Farmer registration error:', error);
    return NextResponse.json({ error: 'Unable to complete farmer registration. Please try again.' }, { status: 500 });
  }
}
