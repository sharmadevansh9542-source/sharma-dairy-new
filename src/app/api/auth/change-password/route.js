import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { destroySession, getSessionUser } from '@/lib/auth/session';
import { changePasswordSchema } from '@/lib/validation/auth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please check your password inputs.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    // A new password invalidates every existing session, including this one.
    // This prevents an already-stolen session token from remaining usable.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CHANGE_PASSWORD',
          entityType: 'User',
          entityId: user.id,
        },
      }),
    ]);
    await destroySession();

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. Please sign in again.',
      requireReauthentication: true,
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Unable to update password.' }, { status: 500 });
  }
}
