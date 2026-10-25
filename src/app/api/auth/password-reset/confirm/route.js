import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const { email, otp, password } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return NextResponse.json({ error: 'Enter your registered email address.' }, { status: 400 });
    if (!/^\d{6}$/.test(String(otp || ''))) return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return NextResponse.json({ error: 'Password must be 8–128 characters.' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, isActive: true }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'The code or email is invalid.' }, { status: 400 });
    const token = await prisma.passwordResetToken.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!token) return NextResponse.json({ error: 'The code is invalid or expired. Request a new one.' }, { status: 400 });
    if (!(await bcrypt.compare(String(otp), token.tokenHash))) {
      await prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
      return NextResponse.json({ error: 'The code is invalid or expired. Request a new one.' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.auditLog.create({ data: { actorId: user.id, action: 'PASSWORD_RESET', entityType: 'User', entityId: user.id } }),
    ]);
    return NextResponse.json({ message: 'Password reset. Please sign in with your new password.' });
  } catch { return NextResponse.json({ error: 'Unable to reset password right now.' }, { status: 500 }); }
}
