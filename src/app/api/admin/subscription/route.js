import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  const [plans, currentSub, payments] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priceMonthly: 'asc' },
    }),
    prisma.subscription.findFirst({
      where: { dairyId: context.dairyId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { dairyId: context.dairyId },
      orderBy: { paidAt: 'desc' },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    plans: plans.map((p) => ({
      ...p,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
    })),
    currentSubscription: currentSub,
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const { planId, billingCycle = 'MONTHLY', transactionRef } = body;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Selected SaaS plan is unavailable' }, { status: 404 });
    }

    const amount = billingCycle === 'YEARLY' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
    // Do not mark paid plans active without a verified payment gateway or reference
    if (amount > 0 && (!transactionRef || String(transactionRef).trim().length < 4)) {
      return NextResponse.json(
        { error: 'A valid payment transaction reference is required to activate a paid plan.' },
        { status: 422 }
      );
    }

    const startDate = new Date();
    const periodEnd = new Date(startDate);
    if (billingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const result = await prisma.$transaction(async (tx) => {
      // Cancel/close prior subscriptions
      await tx.subscription.updateMany({
        where: { dairyId: context.dairyId, status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
      });

      const sub = await tx.subscription.create({
        data: {
          dairyId: context.dairyId,
          planId: plan.id,
          status: amount === 0 ? 'TRIAL' : 'ACTIVE',
          startDate,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      let payment = null;
      if (amount > 0) {
        payment = await tx.subscriptionPayment.create({
          data: {
            subscriptionId: sub.id,
            dairyId: context.dairyId,
            amount,
            method: 'UPI',
            status: 'PENDING_VERIFICATION',
            transactionRef: transactionRef.trim(),
            invoiceNumber: `SAAS-${randomUUID().slice(0, 8).toUpperCase()}`,
          },
        });
      }

      await tx.platformNotification.create({
        data: {
          type: 'SUBSCRIPTION_CHANGE',
          title: `Subscription Updated: ${context.dairy.name}`,
          message: `${context.dairy.name} switched to ${plan.name} (${billingCycle}).`,
          data: { dairyId: context.dairyId, planCode: plan.code, amount },
        },
      });

      return { sub, payment };
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CHANGE_SUBSCRIPTION_PLAN',
      entityType: 'Subscription',
      entityId: result.sub.id,
      after: { planName: plan.name, billingCycle, amount },
    });

    return NextResponse.json({
      success: true,
      message: `Switched to ${plan.name} (${billingCycle}).`,
      data: result,
    });
  } catch (error) {
    console.error('Subscription change error:', error);
    return NextResponse.json({ error: 'Unable to process subscription update' }, { status: 500 });
  }
}

