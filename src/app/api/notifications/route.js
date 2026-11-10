import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER', 'CUSTOMER']);
  if (response) return response;

  try {
    const where = {
      dairyId: context.dairyId,
      ...(context.role === 'ADMIN'
        ? {}
        : {
            OR: [{ userId: context.user.id }, { userId: null, role: context.role }],
          }),
    };

    const notifications = await prisma.notification.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ data: notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Unable to load notifications' }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER', 'CUSTOMER']);
  if (response) return response;

  try {
    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          dairyId: context.dairyId,
          ...(context.role === 'ADMIN' ? {} : { userId: context.user.id }),
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (id) {
      await prisma.notification.updateMany({
        where: {
          id,
          dairyId: context.dairyId,
          ...(context.role === 'ADMIN' ? {} : { userId: context.user.id }),
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Specify id or markAllRead' }, { status: 400 });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Unable to update notification' }, { status: 500 });
  }
}

