import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const [plans, subscriptions] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        orderBy: { priceMonthly: 'asc' },
        include: {
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.subscription.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          dairy: { select: { id: true, name: true, code: true, email: true } },
          plan: { select: { name: true, code: true } },
        },
      }),
    ]);

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        trialDays: p.trialDays,
        maxFarmers: p.maxFarmers,
        maxCustomers: p.maxCustomers,
        maxStaff: p.maxStaff,
        features: p.features,
        status: p.status,
        subscriptionsCount: p._count.subscriptions,
      })),
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        dairyId: s.dairyId,
        dairyName: s.dairy.name,
        dairyCode: s.dairy.code,
        planName: s.plan.name,
        status: s.status,
        startDate: s.startDate.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        trialEndsAt: s.trialEndsAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Super Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Unable to retrieve subscription data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const body = await request.json();
    const { id, priceMonthly, priceYearly, maxFarmers, maxCustomers, maxStaff, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        priceMonthly: priceMonthly != null ? Number(priceMonthly) : undefined,
        priceYearly: priceYearly != null ? Number(priceYearly) : undefined,
        maxFarmers: maxFarmers != null ? Number(maxFarmers) : undefined,
        maxCustomers: maxCustomers != null ? Number(maxCustomers) : undefined,
        maxStaff: maxStaff != null ? Number(maxStaff) : undefined,
        description: description || undefined,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        entityType: 'SubscriptionPlan',
        entityId: id,
        details: { planCode: updated.code, priceMonthly, priceYearly },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Plan "${updated.name}" updated successfully.`,
      plan: updated,
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

