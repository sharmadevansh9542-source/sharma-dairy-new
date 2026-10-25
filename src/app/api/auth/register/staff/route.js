import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { staffRegisterSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reg_staff:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = staffRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please check your staff registration fields.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const tokenHash = createHash('sha256').update(data.token.trim()).digest('hex');

    // Verify token
    const invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token.' }, { status: 400 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 410 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    if (invitation.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Email does not match the invitation record.' },
        { status: 400 }
      );
    }

    const normalizedPhone = data.phone.trim().replace(/[^0-9]/g, '');

    // Check duplicate
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      },
    });

    if (existing) {
      if (existing.email === normalizedEmail) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      if (existing.phone === normalizedPhone) {
        return NextResponse.json({ error: 'A user with this mobile number already exists.' }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const employeeCode = `S-${randomUUID().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create user with STAFF role
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      });

      // Create staff profile
      const profile = await tx.staffProfile.create({
        data: {
          employeeCode,
          userId: user.id,
          jobTitle: data.jobTitle || 'Staff Member',
          department: data.department || null,
        },
      });

      // Mark invitation as used
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });

      // Assign default basic operational permissions
      const basePermissions = ['collection.create', 'sale.create', 'reports.view'];
      for (const key of basePermissions) {
        const perm = await tx.permission.findUnique({ where: { key } });
        if (perm) {
          await tx.userPermission.create({
            data: {
              userId: user.id,
              permissionId: perm.id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REGISTER_STAFF',
          entityType: 'StaffProfile',
          entityId: profile.id,
          ipAddress: ip,
        },
      });

      return { user, profile };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Staff account registered successfully! You may now sign in using your email and password.',
        employeeCode: result.profile.employeeCode,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email, mobile, or employee code already exists.' }, { status: 409 });
    }
    console.error('Staff registration error:', error);
    return NextResponse.json({ error: 'Unable to complete staff registration. Please try again.' }, { status: 500 });
  }
}
