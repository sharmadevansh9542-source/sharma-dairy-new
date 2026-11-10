import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await apiSuperAdminUser();
  if (response) return response;

  const payments = await prisma.subscriptionPayment.findMany({
    take: 100,
    orderBy: { paidAt: 'desc' },
    include: {
      subscription: {
        include: {
          dairy: { select: { name: true, code: true } },
          plan: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    data: payments.map((p) => ({
      id: p.id,
      dairyId: p.dairyId,
      dairyName: p.subscription?.dairy?.name || 'Dairy',
      dairyCode: p.subscription?.dairy?.code || '—',
      planName: p.subscription?.plan?.name || '—',
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      transactionRef: p.transactionRef,
      invoiceNumber: p.invoiceNumber,
      paidAt: p.paidAt.toISOString(),
    })),
  });
}

export async function PATCH(req) {
  const { user, response } = await apiSuperAdminUser();
  if (response) return response;

  try {
    const body = await req.json();
    const { paymentId, status } = body;
    if (!paymentId || !['COMPLETED', 'FAILED', 'REFUNDED'].includes(status)) {
      return NextResponse.json({ error: 'Valid paymentId and status required' }, { status: 400 });
    }

    const updated = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorId: user.id,
        dairyId: updated.dairyId,
        action: `SAAS_PAYMENT_${status}`,
        entityType: 'SubscriptionPayment',
        entityId: updated.id,
        details: { status, amount: Number(updated.amount), transactionRef: updated.transactionRef },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error('Update SaaS payment error:', e);
    return NextResponse.json({ error: 'Unable to update payment status' }, { status: 500 });
  }
}

