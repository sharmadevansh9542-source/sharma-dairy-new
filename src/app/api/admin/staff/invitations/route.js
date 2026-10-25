import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiUser } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { response } = await apiUser(['ADMIN']);
    if (response) return response;

    const invitations = await prisma.staffInvitation.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { fullName: true, email: true },
        },
      },
    });

    const now = new Date();
    const formatted = invitations.map((inv) => {
      let status = 'ACTIVE';
      if (inv.usedAt) {
        status = 'USED';
      } else if (inv.expiresAt < now) {
        status = 'EXPIRED';
      }

      return {
        id: inv.id,
        email: inv.email,
        expiresAt: inv.expiresAt,
        usedAt: inv.usedAt,
        createdAt: inv.createdAt,
        status,
        invitedBy: inv.invitedBy?.fullName || 'Admin',
      };
    });

    return NextResponse.json({ invitations: formatted });
  } catch (error) {
    console.error('List invitations error:', error);
    return NextResponse.json({ error: 'Unable to load invitations.' }, { status: 500 });
  }
}
