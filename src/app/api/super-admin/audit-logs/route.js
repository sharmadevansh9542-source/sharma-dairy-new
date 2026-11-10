import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType')?.trim();

    const where = {};
    if (entityType) {
      where.entityType = entityType;
    }

    const logs = await prisma.platformAuditLog.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const data = logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      dairyId: l.dairyId,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Super Admin audit logs error:', error);
    return NextResponse.json({ error: 'Unable to retrieve platform audit logs' }, { status: 500 });
  }
}

