import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || 'Did not meet platform verification criteria';

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

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.dairyRegistrationRequest.update({
        where: { id: reqData.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      await tx.platformAuditLog.create({
        data: {
          actorId: user.id,
          action: 'REJECT_DAIRY_REGISTRATION',
          entityType: 'DairyRegistrationRequest',
          entityId: reqData.id,
          details: {
            dairyName: reqData.dairyName,
            businessEmail: reqData.businessEmail,
            reason,
          },
        },
      });

      return r;
    });

    return NextResponse.json({
      success: true,
      message: `Registration request for "${updated.dairyName}" has been rejected.`,
      request: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    console.error('Reject dairy error:', error);
    return NextResponse.json({ error: 'Failed to reject registration request' }, { status: 500 });
  }
}

