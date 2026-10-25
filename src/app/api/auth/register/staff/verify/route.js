import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return NextResponse.json({ valid: false, error: 'A valid staff invitation token is required.' }, { status: 400 });
    }

    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    const invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: {
        invitedBy: {
          select: { fullName: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: 'Invitation link not found or invalid. Please check your link or contact your administrator.' },
        { status: 404 }
      );
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been used. Please sign in or request a new invitation.' },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has expired. Please ask your administrator to send a new invitation.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      invitedBy: invitation.invitedBy?.fullName || 'Sharma Dairy Admin',
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error('Staff verify token error:', error);
    return NextResponse.json({ valid: false, error: 'Unable to verify invitation.' }, { status: 500 });
  }
}
