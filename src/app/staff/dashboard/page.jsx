import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import StaffDashboardView from '@/components/staff-dashboard-view';

export default async function StaffDashboard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'STAFF') redirect('/dashboard');

  const profile = await prisma.staffProfile.findUnique({
    where: { userId: user.id },
  });

  const permissions = await prisma.userPermission.findMany({
    where: { userId: user.id },
    include: { permission: true },
  });

  const permissionKeys = permissions.map((p) => p.permission.key);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [collectionsToday, salesToday] = await Promise.all([
    prisma.milkCollection.aggregate({
      where: {
        collectionAt: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
      _sum: { quantityLitres: true },
    }),
    prisma.sale.aggregate({
      where: {
        saleAt: { gte: today, lt: tomorrow },
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { quantityLitres: true },
    }),
  ]);

  return (
    <StaffDashboardView
      user={{
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      }}
      profile={{
        id: profile?.id || '',
        employeeCode: profile?.employeeCode || 'STAFF',
        jobTitle: profile?.jobTitle || 'Staff Member',
        department: profile?.department || 'Operations',
      }}
      userPermissions={permissionKeys}
      todayCollectionsCount={collectionsToday._count.id || 0}
      todayCollectionsLitres={Number(collectionsToday._sum.quantityLitres || 0)}
      todaySalesCount={salesToday._count.id || 0}
      todaySalesLitres={Number(salesToday._sum.quantityLitres || 0)}
    />
  );
}
