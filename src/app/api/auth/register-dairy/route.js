import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { dairyRegistrationSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reg_dairy:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = dairyRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please verify all required business registration fields.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedBusinessEmail = data.businessEmail.trim().toLowerCase();
    const normalizedAdminEmail = data.adminEmail.trim().toLowerCase();
    const normalizedBusinessPhone = data.phone.trim().replace(/[^0-9]/g, '');
    const normalizedAdminPhone = data.adminPhone
      ? data.adminPhone.trim().replace(/[^0-9]/g, '')
      : normalizedBusinessPhone;

    // Check duplicate dairy existence
    const existingDairy = await prisma.dairy.findFirst({
      where: {
        OR: [
          { name: { equals: data.dairyName.trim(), mode: 'insensitive' } },
          { email: normalizedBusinessEmail },
          { phone: normalizedBusinessPhone },
        ],
      },
    });

    if (existingDairy) {
      return NextResponse.json(
        { error: 'A dairy business with this name, email, or contact number is already registered on the platform.' },
        { status: 409 }
      );
    }

    // Check existing pending request
    const existingPending = await prisma.dairyRegistrationRequest.findFirst({
      where: {
        OR: [
          { businessEmail: normalizedBusinessEmail },
          { adminEmail: normalizedAdminEmail },
        ],
        status: 'PENDING_APPROVAL',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'A registration request with this email is already awaiting Super Admin review.' },
        { status: 409 }
      );
    }

    // Check existing admin user credentials
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedAdminEmail },
          { phone: normalizedAdminPhone },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'The administrator email or mobile number is already in use by another account.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const regRequest = await tx.dairyRegistrationRequest.create({
        data: {
          dairyName: data.dairyName.trim(),
          ownerName: data.ownerName.trim(),
          businessEmail: normalizedBusinessEmail,
          phone: normalizedBusinessPhone,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          logoUrl: data.logoUrl || null,
          businessType: data.businessType || 'PRIVATE_DAIRY',
          description: data.description || null,
          adminFullName: data.adminFullName.trim(),
          adminEmail: normalizedAdminEmail,
          adminPhone: normalizedAdminPhone,
          passwordHash,
          status: 'PENDING_APPROVAL',
        },
      });

      // Super Admin platform notification
      await tx.platformNotification.create({
        data: {
          type: 'NEW_DAIRY_REGISTRATION',
          title: `New Dairy Request: ${data.dairyName}`,
          message: `${data.ownerName} submitted a registration request for "${data.dairyName}". Review required.`,
          data: {
            requestId: regRequest.id,
            dairyName: data.dairyName,
            ownerName: data.ownerName,
            businessEmail: normalizedBusinessEmail,
          },
        },
      });

      // Platform audit log
      await tx.platformAuditLog.create({
        data: {
          action: 'SUBMIT_DAIRY_REGISTRATION',
          entityType: 'DairyRegistrationRequest',
          entityId: regRequest.id,
          details: {
            dairyName: data.dairyName,
            ownerName: data.ownerName,
            email: normalizedBusinessEmail,
          },
          ipAddress: ip,
        },
      });

      return regRequest;
    });

    return NextResponse.json(
      {
        success: true,
        status: 'PENDING_APPROVAL',
        requestId: result.id,
        message:
          'Your dairy registration application has been received and is pending Super Admin approval. You will receive access upon review.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Dairy registration error:', error);
    return NextResponse.json({ error: 'Unable to submit dairy registration. Please try again.' }, { status: 500 });
  }
}

