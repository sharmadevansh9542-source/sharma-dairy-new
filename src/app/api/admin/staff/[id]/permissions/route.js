import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const AVAILABLE_PERMISSIONS = [
  ['collection.create', 'Create & view milk collections'],
  ['sale.create', 'Create & view sales'],
  ['payment.record', 'Record farmer & customer payments'],
  ['reports.view', 'View reports & analytics'],
  ['expense.create', 'Record operating expenses'],
  ['stock.adjust', 'Adjust milk & product stock'],
  ['subscriptions.manage', 'Manage subscriptions & deliveries'],
  ['products.manage', 'Manage packaged products & purchases'],
  ['accounting.view', 'View cashbook, bankbook & accounting'],
];

export async function PUT(request, { params }) {
  try {
    const { context, response } = await apiTenantUser(['ADMIN']);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { managerRole = 'STAFF', permissionKeys = [], jobTitle, department } = body;

    if (!Array.isArray(permissionKeys)) {
      return NextResponse.json({ error: 'permissionKeys must be an array' }, { status: 400 });
    }

    const staffUser = await prisma.user.findFirst({
      where: { id, dairyId: context.dairyId, role: 'STAFF' },
      include: { staffProfile: true, permissions: { include: { permission: true } } },
    });

    if (!staffUser) {
      return NextResponse.json({ error: 'Staff member not found in your dairy' }, { status: 404 });
    }

    // Ensure all defined permissions exist in DB
    for (const [key, description] of AVAILABLE_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        create: { key, description },
        update: { description },
      });
    }

    const validKeys = new Set(AVAILABLE_PERMISSIONS.map(([k]) => k));
    const filteredKeys = permissionKeys.filter((k) => validKeys.has(k));

    const permRows = await prisma.permission.findMany({
      where: { key: { in: filteredKeys } },
    });

    await prisma.$transaction(async (tx) => {
      if (staffUser.staffProfile) {
        await tx.staffProfile.update({
          where: { id: staffUser.staffProfile.id },
          data: {
            managerRole: String(managerRole || 'STAFF'),
            jobTitle: jobTitle !== undefined ? jobTitle : undefined,
            department: department !== undefined ? department : undefined,
          },
        });
      }

      await tx.userPermission.deleteMany({
        where: { userId: staffUser.id },
      });

      if (permRows.length > 0) {
        await tx.userPermission.createMany({
          data: permRows.map((p) => ({
            userId: staffUser.id,
            permissionId: p.id,
          })),
        });
      }
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'UPDATE_STAFF_PERMISSIONS',
      entityType: 'User',
      entityId: staffUser.id,
      before: {
        managerRole: staffUser.staffProfile?.managerRole,
        permissions: staffUser.permissions.map((p) => p.permission.key),
      },
      after: { managerRole, permissions: filteredKeys },
    });

    return NextResponse.json({
      success: true,
      message: 'Manager role and module permissions updated.',
      managerRole,
      permissionKeys: filteredKeys,
    });
  } catch (error) {
    console.error('Update staff permissions error:', error);
    return NextResponse.json({ error: 'Unable to update staff permissions' }, { status: 500 });
  }
}

