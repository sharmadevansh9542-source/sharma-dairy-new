import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  try {
    const { context, response } = await apiTenantUser(['ADMIN']);
    if (response) return response;

    const { id } = await params;
    const invitation = await prisma.staffInvitation.findFirst({
      where: { id, dairyId: context.dairyId },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found in your dairy.' }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Cannot revoke an invitation that has already been used.' }, { status: 400 });
    }

    await prisma.staffInvitation.delete({ where: { id } });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'REVOKE_STAFF_INVITATION',
      entityType: 'StaffInvitation',
      entityId: id,
      before: { email: invitation.email },
    });

    return NextResponse.json({ success: true, message: 'Invitation revoked successfully.' });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    return NextResponse.json({ error: 'Unable to revoke invitation.' }, { status: 500 });
  }
}
