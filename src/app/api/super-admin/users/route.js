import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const role = searchParams.get('role')?.trim();

    const where = {};
    if (role && ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'FARMER', 'CUSTOMER'].includes(role)) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        dairy: { select: { id: true, name: true, code: true } },
      },
    });

    const data = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      dairyId: u.dairyId,
      dairyName: u.dairy?.name || 'Platform (Super Admin)',
      dairyCode: u.dairy?.code || 'PLATFORM',
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Super Admin users error:', error);
    return NextResponse.json({ error: 'Unable to retrieve users' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const body = await request.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Valid userId and isActive boolean required' }, { status: 400 });
    }

    // Protect self-deactivation
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot deactivate your own Super Admin account' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { isActive },
      });

      await tx.platformAuditLog.create({
        data: {
          actorId: user.id,
          action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          entityType: 'User',
          entityId: userId,
          dairyId: targetUser.dairyId || undefined,
          details: { email: targetUser.email, role: targetUser.role },
        },
      });

      return u;
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.fullName} has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: { id: updated.id, isActive: updated.isActive },
    });
  } catch (error) {
    console.error('Super Admin user update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

