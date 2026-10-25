import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiUser, audit } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await apiUser(['ADMIN']);
    if (response) return response;

    const { id } = await params;
    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Cannot revoke an invitation that has already been used.' }, { status: 400 });
    }

    await prisma.staffInvitation.delete({ where: { id } });

    await audit({
      actorId: user.id,
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
