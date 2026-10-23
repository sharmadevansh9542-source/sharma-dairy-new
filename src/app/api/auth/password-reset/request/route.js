import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { sendPasswordResetOtp } from '@/lib/email/password-reset';

export const runtime = 'nodejs';
const generic = { message: 'If this email belongs to an account, a reset code has been sent.' };

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    const { email } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254) return NextResponse.json({ error: 'Enter a valid registered email address.' }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, isActive: true }, select: { id: true, email: true } });
    if (!user) return NextResponse.json(generic);

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    const [recent, hourly] = await Promise.all([
      prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: minuteAgo } } }),
      prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: hourAgo } } }),
    ]);
    if (recent || hourly >= 5) return NextResponse.json(generic);

    const otp = String(randomInt(100000, 1000000));
    const token = await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: await bcrypt.hash(otp, 12), expiresAt: new Date(now.getTime() + 10 * 60 * 1000) } });
    try { await sendPasswordResetOtp({ to: user.email, otp }); }
    catch (error) {
      await prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
      console.error('Password reset email failed:', error instanceof Error ? error.message : error);
      return NextResponse.json({ error: 'Unable to send a reset code right now. Please try again later.' }, { status: 503 });
    }
    return NextResponse.json(generic);
  } catch { return NextResponse.json({ error: 'Unable to process the reset request.' }, { status: 500 }); }
}
