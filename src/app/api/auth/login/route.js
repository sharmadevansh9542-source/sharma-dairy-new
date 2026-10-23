import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validation/auth';
import { createSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export async function POST(request) {
    try {
        if (!process.env.DATABASE_URL) {
            return NextResponse.json({ error: 'Database is not configured. Set DATABASE_URL in .env and apply the Prisma migrations.' }, { status: 503 });
        }
        const body = await request.json();
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email/phone and password.' }, { status: 400 });
        const identifier = parsed.data.identifier;
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }], isActive: true },
        });
        // Keep the response generic to avoid revealing whether an account exists.
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
            return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
        }
        await createSession(user.id);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await prisma.auditLog.create({ data: { actorId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id } });
        return NextResponse.json({ user: { id: user.id, fullName: user.fullName, role: user.role } });
    } catch {
        return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
    }
}