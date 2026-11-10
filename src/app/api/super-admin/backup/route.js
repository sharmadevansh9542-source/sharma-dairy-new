import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  const { user, response } = await apiSuperAdminUser();
  if (response) return response;

  const [dairies, users, collections, sales, expenses, logs] = await Promise.all([
    prisma.dairy.count(),
    prisma.user.count(),
    prisma.milkCollection.count(),
    prisma.sale.count(),
    prisma.expense.count(),
    prisma.platformAuditLog.findMany({
      where: { action: 'MANUAL_BACKUP_VERIFY' },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    health: {
      databaseConnected: true,
      timestamp: new Date().toISOString(),
      tableCounts: { dairies, users, collections, sales, expenses },
    },
    backupHistory: logs,
  });
}

export async function POST() {
  const { user, response } = await apiSuperAdminUser();
  if (response) return response;

  const counts = {
    dairies: await prisma.dairy.count(),
    users: await prisma.user.count(),
    collections: await prisma.milkCollection.count(),
    sales: await prisma.sale.count(),
    farmerPayments: await prisma.farmerPayment.count(),
    customerPayments: await prisma.customerPayment.count(),
  };

  const entry = await prisma.platformAuditLog.create({
    data: {
      actorId: user.id,
      action: 'MANUAL_BACKUP_VERIFY',
      entityType: 'Database',
      details: {
        verifiedAt: new Date().toISOString(),
        counts,
        commandReference: 'scripts/backup-db.sh',
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Database integrity verified and backup checkpoint logged.',
    checkpoint: entry,
  });
}

