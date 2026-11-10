import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();

    const where = {};
    if (status && ['APPROVED', 'SUSPENDED', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const dairies = await prisma.dairy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: {
            memberships: true,
            farmerProfiles: true,
            customerProfiles: true,
            staffProfiles: true,
            milkCollections: true,
          },
        },
      },
    });

    const data = dairies.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      slug: d.slug,
      ownerName: d.ownerName,
      email: d.email,
      phone: d.phone,
      city: d.city,
      state: d.state,
      businessType: d.businessType,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      stats: {
        totalMembers: d._count.memberships,
        totalFarmers: d._count.farmerProfiles,
        totalCustomers: d._count.customerProfiles,
        totalStaff: d._count.staffProfiles,
        totalCollections: d._count.milkCollections,
      },
      currentSubscription: d.subscriptions[0]
        ? {
            planName: d.subscriptions[0].plan.name,
            planCode: d.subscriptions[0].plan.code,
            status: d.subscriptions[0].status,
            currentPeriodEnd: d.subscriptions[0].currentPeriodEnd.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Super Admin dairies error:', error);
    return NextResponse.json({ error: 'Unable to retrieve dairy businesses' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const body = await request.json();
    const { dairyId, status, reason } = body;

    if (!dairyId || !['APPROVED', 'SUSPENDED'].includes(status)) {
      return NextResponse.json({ error: 'Valid dairyId and status (APPROVED or SUSPENDED) required' }, { status: 400 });
    }

    const dairy = await prisma.dairy.findUnique({ where: { id: dairyId } });
    if (!dairy) {
      return NextResponse.json({ error: 'Dairy not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.dairy.update({
        where: { id: dairyId },
        data: { status },
      });

      await tx.platformAuditLog.create({
        data: {
          actorId: user.id,
          action: status === 'SUSPENDED' ? 'SUSPEND_DAIRY' : 'ACTIVATE_DAIRY',
          entityType: 'Dairy',
          entityId: dairyId,
          dairyId,
          details: {
            previousStatus: dairy.status,
            newStatus: status,
            reason: reason || null,
          },
        },
      });

      return d;
    });

    return NextResponse.json({
      success: true,
      message: `Dairy "${updated.name}" has been ${status === 'SUSPENDED' ? 'suspended' : 'activated'} successfully.`,
      dairy: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    console.error('Super Admin dairy status update error:', error);
    return NextResponse.json({ error: 'Failed to update dairy status' }, { status: 500 });
  }
}

