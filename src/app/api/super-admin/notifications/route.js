import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await apiSuperAdminUser();
  if (response) return response;

  const notifications = await prisma.platformNotification.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    data: notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  });
}

export async function PATCH(req) {
  const { response } = await apiSuperAdminUser();
  if (response) return response;

  const body = await req.json();
  if (body.markAllRead) {
    await prisma.platformNotification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  }
  if (body.id) {
    await prisma.platformNotification.update({ where: { id: body.id }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Specify id or markAllRead' }, { status: 400 });
}

