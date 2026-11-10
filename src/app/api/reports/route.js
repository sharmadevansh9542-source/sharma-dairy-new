import { prisma } from '@/lib/db/prisma';
import { apiTenantUser } from '@/lib/auth/tenant';

export async function GET(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'reports.view');
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from'))
    : new Date(new Date().setHours(0, 0, 0, 0));
  const to = searchParams.get('to')
    ? new Date(searchParams.get('to'))
    : new Date(from.getTime() + 86400000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return Response.json({ error: 'Invalid date range' }, { status: 422 });
  }

  const range = { gte: from, lt: to };
  const dairyId = context.dairyId;

  const [
    collection,
    sales,
    farmerPayments,
    customerPayments,
    expenses,
    stock,
    latestCollections,
    latestSales,
  ] = await Promise.all([
    prisma.milkCollection.aggregate({
      where: { dairyId, collectionAt: range },
      _sum: { quantityLitres: true, amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { dairyId, saleAt: range, status: { not: 'CANCELLED' } },
      _sum: { quantityLitres: true, amount: true },
      _count: true,
    }),
    prisma.farmerPayment.aggregate({
      where: { dairyId, paidAt: range },
      _sum: { amount: true },
    }),
    prisma.customerPayment.aggregate({
      where: { dairyId, paidAt: range },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { dairyId, expenseAt: range },
      _sum: { amount: true },
    }),
    prisma.stockMovement.groupBy({
      by: ['milkTypeId'],
      where: { dairyId },
      _sum: { quantityLitres: true },
    }),
    prisma.milkCollection.findMany({
      where: { dairyId, collectionAt: range },
      take: 10,
      orderBy: { collectionAt: 'desc' },
      include: {
        farmer: { include: { user: { select: { fullName: true } } } },
        milkType: true,
      },
    }),
    prisma.sale.findMany({
      where: { dairyId, saleAt: range },
      take: 10,
      orderBy: { saleAt: 'desc' },
      include: {
        customer: { include: { user: { select: { fullName: true } } } },
        milkType: true,
      },
    }),
  ]);

  return Response.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      collectionLitres: Number(collection._sum.quantityLitres || 0),
      collectionValue: Number(collection._sum.amount || 0),
      collectionCount: collection._count,
      salesLitres: Number(sales._sum.quantityLitres || 0),
      salesValue: Number(sales._sum.amount || 0),
      salesCount: sales._count,
      farmerPayments: Number(farmerPayments._sum.amount || 0),
      customerPayments: Number(customerPayments._sum.amount || 0),
      expenses: Number(expenses._sum.amount || 0),
      estimatedDifference:
        Number(sales._sum.amount || 0) -
        Number(collection._sum.amount || 0) -
        Number(expenses._sum.amount || 0),
    },
    stock,
    latestCollections,
    latestSales,
  });
}
