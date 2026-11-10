import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { id } = await params;
    const reqData = await prisma.dairyRegistrationRequest.findUnique({
      where: { id },
    });

    if (!reqData) {
      return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
    }

    if (reqData.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `This request is already ${reqData.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Generate code and slug
    const cleanName = reqData.dairyName.trim();
    const baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.dairy.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const code = `D-${randomUUID().slice(0, 6).toUpperCase()}`;

    // Execute atomic approval transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Dairy Tenant
      const dairy = await tx.dairy.create({
        data: {
          name: cleanName,
          code,
          slug,
          ownerName: reqData.ownerName,
          email: reqData.businessEmail,
          phone: reqData.phone,
          address: reqData.address,
          city: reqData.city,
          state: reqData.state,
          pincode: reqData.pincode,
          logoUrl: reqData.logoUrl,
          businessType: reqData.businessType,
          description: reqData.description,
          status: 'APPROVED',
          settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            autoInvoicing: true,
          },
        },
      });

      // 2. Create Dairy Admin User
      const adminUser = await tx.user.create({
        data: {
          dairyId: dairy.id,
          fullName: reqData.adminFullName,
          email: reqData.adminEmail,
          phone: reqData.adminPhone || null,
          passwordHash: reqData.passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      // 3. Create Dairy Membership
      await tx.dairyMembership.create({
        data: {
          dairyId: dairy.id,
          userId: adminUser.id,
          role: 'ADMIN',
          isDefault: true,
          isActive: true,
        },
      });

      // 4. Enroll in Free Trial Subscription
      const trialPlan = await tx.subscriptionPlan.findFirst({
        where: { code: 'FREE_TRIAL' },
      });

      if (trialPlan) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + (trialPlan.trialDays || 14));

        await tx.subscription.create({
          data: {
            dairyId: dairy.id,
            planId: trialPlan.id,
            status: 'TRIAL',
            startDate: new Date(),
            currentPeriodEnd: trialEnd,
            trialEndsAt: trialEnd,
          },
        });
      }

      // 5. Update Registration Request
      await tx.dairyRegistrationRequest.update({
        where: { id: reqData.id },
        data: {
          status: 'APPROVED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          createdDairyId: dairy.id,
        },
      });

      // 6. Platform Audit Log
      await tx.platformAuditLog.create({
        data: {
          actorId: user.id,
          dairyId: dairy.id,
          action: 'APPROVE_DAIRY_REGISTRATION',
          entityType: 'DairyRegistrationRequest',
          entityId: reqData.id,
          details: {
            dairyId: dairy.id,
            dairyName: dairy.name,
            dairyCode: dairy.code,
            adminEmail: adminUser.email,
          },
        },
      });

      return { dairy, adminUser };
    });

    return NextResponse.json({
      success: true,
      message: `Dairy "${result.dairy.name}" (${result.dairy.code}) approved successfully! Admin account created for ${result.adminUser.email}.`,
      dairy: {
        id: result.dairy.id,
        name: result.dairy.name,
        code: result.dairy.code,
        slug: result.dairy.slug,
      },
    });
  } catch (error) {
    console.error('Approve dairy error:', error);
    return NextResponse.json({ error: 'Failed to approve registration request' }, { status: 500 });
  }
}

