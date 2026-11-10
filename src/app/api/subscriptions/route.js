import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const createSubSchema = z.object({
  customerId: z.string().min(1),
  milkType: z.enum(['COW', 'BUFFALO', 'OTHER']).default('COW'),
  dailyQuantity: z.number().positive().max(1000),
  ratePerLitre: z.number().positive().max(10000),
  deliveryShift: z.enum(['MORNING', 'EVENING']).default('MORNING'),
  startDate: z.string().optional(),
  notes: z.string().max(300).optional(),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'CUSTOMER']);
  if (response) return response;

  try {
    let where = { dairyId: context.dairyId };
    if (context.role === 'CUSTOMER') {
      const cust = await prisma.customerProfile.findUnique({ where: { userId: context.user.id } });
      if (!cust) return NextResponse.json({ data: [] });
      where.customerId = cust.id;
    }

    const subs = await prisma.milkSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
      },
      take: 200,
    });

    return NextResponse.json({ data: subs });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json({ error: 'Unable to load subscriptions' }, { status: 500 });
  }
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = createSubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid subscription input' }, { status: 422 });
    }

    const p = parsed.data;
    const customer = await prisma.customerProfile.findFirst({
      where: { id: p.customerId, dairyId: context.dairyId, isActive: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found in your dairy' }, { status: 404 });
    }

    const sub = await prisma.milkSubscription.create({
      data: {
        dairyId: context.dairyId,
        customerId: customer.id,
        milkType: p.milkType,
        dailyQuantity: p.dailyQuantity,
        ratePerLitre: p.ratePerLitre,
        deliveryShift: p.deliveryShift,
        startDate: p.startDate ? new Date(p.startDate) : new Date(),
        status: 'ACTIVE',
        notes: p.notes || null,
      },
      include: {
        customer: { include: { user: { select: { fullName: true } } } },
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_MILK_SUBSCRIPTION',
      entityType: 'MilkSubscription',
      entityId: sub.id,
      after: sub,
    });

    return NextResponse.json({ data: sub, message: 'Milk subscription activated!' }, { status: 201 });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'CUSTOMER']);
  if (response) return response;

  try {
    const body = await req.json();
    const { id, status, dailyQuantity } = body;
    if (!id) return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });

    const existing = await prisma.milkSubscription.findFirst({
      where: { id, dairyId: context.dairyId },
      include: { customer: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (context.role === 'CUSTOMER' && existing.customer.userId !== context.user.id) {
      return NextResponse.json({ error: 'You can only update your own subscriptions' }, { status: 403 });
    }

    const updateData = {};
    if (status && ['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      updateData.status = status;
      if (status === 'CANCELLED') updateData.endDate = new Date();
    }
    if (dailyQuantity != null && Number(dailyQuantity) > 0) {
      updateData.dailyQuantity = Number(dailyQuantity);
    }

    const updated = await prisma.milkSubscription.update({
      where: { id: existing.id },
      data: updateData,
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'UPDATE_MILK_SUBSCRIPTION',
      entityType: 'MilkSubscription',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ data: updated, message: 'Subscription updated.' });
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

