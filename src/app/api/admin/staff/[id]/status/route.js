import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser } from '@/lib/auth/tenant';
import { recordAdminEdit } from '@/lib/audit/edit-history';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    const { context, response } = await apiTenantUser(['ADMIN']);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean value.' }, { status: 400 });
    }

    const staffUser = await prisma.user.findFirst({
      where: { id, dairyId: context.dairyId, role: 'STAFF' },
      include: { staffProfile: true },
    });

    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found in your dairy.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive },
      });

      await tx.dairyMembership.updateMany({
        where: { userId: id, dairyId: context.dairyId },
        data: { isActive },
      });

      // If deactivated, delete all active sessions immediately
      if (!isActive) {
        await tx.session.deleteMany({
          where: { userId: id },
        });
      }

      await recordAdminEdit({
        tx,
        dairyId: context.dairyId,
        recordType: 'User',
        recordId: id,
        action: isActive ? 'ACTIVATE' : 'SUSPEND',
        oldValues: { isActive: staffUser.isActive },
        newValues: { isActive },
        reason: body.reason?.trim() || `Staff account ${isActive ? 'activated' : 'suspended'} by Admin`,
        performedBy: context.user,
      });
    });

    return NextResponse.json({
      success: true,
      message: `Staff member has been ${isActive ? 'activated' : 'suspended'}.`,
      isActive,
    });
  } catch (error) {
    console.error('Update staff status error:', error);
    return NextResponse.json({ error: 'Unable to update staff status.' }, { status: 500 });
  }
}
