import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const [
      totalDairies,
      activeDairies,
      pendingRequests,
      suspendedDairies,
      totalUsers,
      totalFarmers,
      totalCustomers,
      totalStaff,
      activeSubscriptions,
      expiredSubscriptions,
      plans,
      recentDairies,
      recentRequests,
      recentPayments,
    ] = await Promise.all([
      prisma.dairy.count(),
      prisma.dairy.count({ where: { status: 'APPROVED' } }),
      prisma.dairyRegistrationRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.dairy.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.farmerProfile.count(),
      prisma.customerProfile.count(),
      prisma.staffProfile.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: { in: ['EXPIRED', 'PAST_DUE'] } } }),
      prisma.subscriptionPlan.findMany({
        include: {
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.dairy.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { memberships: true, milkCollections: true } },
        },
      }),
      prisma.dairyRegistrationRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscriptionPayment.findMany({
        take: 10,
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    // Calculate MRR from active plans and actual monthly subscriptions
    const subAgg = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const mrr = subAgg.reduce((acc, sub) => acc + Number(sub.plan.priceMonthly || 0), 0);

    return NextResponse.json({
      metrics: {
        totalDairies,
        activeDairies,
        pendingRequests,
        suspendedDairies,
        totalUsers,
        totalFarmers,
        totalCustomers,
        totalStaff,
        activeSubscriptions,
        expiredSubscriptions,
        mrr,
      },
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        subCount: p._count.subscriptions,
      })),
      recentDairies: recentDairies.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        ownerName: d.ownerName,
        email: d.email,
        phone: d.phone,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        membersCount: d._count.memberships,
      })),
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        dairyName: r.dairyName,
        ownerName: r.ownerName,
        businessEmail: r.businessEmail,
        phone: r.phone,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Super Admin analytics error:', error);
    return NextResponse.json({ error: 'Unable to load platform analytics' }, { status: 500 });
  }
}

