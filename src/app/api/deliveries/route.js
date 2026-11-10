import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { calculateFixedMilkAmount } from '@/lib/calculations/milk';

export const runtime = 'nodejs';

export async function GET(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'CUSTOMER']);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    let where = { dairyId: context.dairyId };
    if (context.role === 'CUSTOMER') {
      const cust = await prisma.customerProfile.findUnique({ where: { userId: context.user.id } });
      if (!cust) return NextResponse.json({ data: [] });
      where.customerId = cust.id;
    }

    if (dateParam) {
      const d = new Date(dateParam);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.deliveryDate = { gte: d, lt: next };
    }

    const deliveries = await prisma.dailyDelivery.findMany({
      where,
      take: 200,
      orderBy: { deliveryDate: 'desc' },
      include: {
        customer: { include: { user: { select: { fullName: true, phone: true } } } },
        subscription: { select: { milkType: true, ratePerLitre: true } },
      },
    });

    return NextResponse.json({ data: deliveries });
  } catch (error) {
    console.error('Get deliveries error:', error);
    return NextResponse.json({ error: 'Unable to load deliveries' }, { status: 500 });
  }
}

/**
 * Generates or fulfills deliveries for all active subscriptions on a given date and shift.
 */
export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  try {
    const body = await req.json();
    const { action, deliveryId, status, date, shift = 'MORNING' } = body;

    // Action 1: Generate daily delivery manifest for active subscriptions
    if (action === 'GENERATE') {
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const activeSubs = await prisma.milkSubscription.findMany({
        where: {
          dairyId: context.dairyId,
          status: 'ACTIVE',
          deliveryShift: shift,
          startDate: { lte: nextDay },
          OR: [{ endDate: null }, { endDate: { gte: targetDate } }],
        },
      });

      let createdCount = 0;
      for (const sub of activeSubs) {
        const existing = await prisma.dailyDelivery.findFirst({
          where: {
            dairyId: context.dairyId,
            subscriptionId: sub.id,
            deliveryDate: { gte: targetDate, lt: nextDay },
          },
        });
        if (!existing) {
          await prisma.dailyDelivery.create({
            data: {
              dairyId: context.dairyId,
              subscriptionId: sub.id,
              customerId: sub.customerId,
              deliveryDate: targetDate,
              shift,
              quantityLitres: sub.dailyQuantity,
              status: 'PENDING',
              createdById: context.user.id,
            },
          });
          createdCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${createdCount} pending delivery tasks for ${shift} shift.`,
        createdCount,
      });
    }

    // Action 2: Fulfill / Mark a pending delivery as DELIVERED or CANCELLED
    if (deliveryId && ['DELIVERED', 'CANCELLED'].includes(status)) {
      const delivery = await prisma.dailyDelivery.findFirst({
        where: { id: deliveryId, dairyId: context.dairyId },
        include: { subscription: true },
      });

      if (!delivery) {
        return NextResponse.json({ error: 'Delivery record not found' }, { status: 404 });
      }
      if (delivery.status !== 'PENDING') {
        return NextResponse.json({ error: `Delivery is already ${delivery.status}` }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.dailyDelivery.update({
          where: { id: delivery.id },
          data: {
            status,
            deliveredAt: status === 'DELIVERED' ? new Date() : null,
          },
        });

        if (status === 'DELIVERED' && delivery.subscription) {
          const mt = await tx.milkTypeConfig.findUnique({
            where: { type: delivery.subscription.milkType },
          });
          const rate = Number(delivery.subscription.ratePerLitre);
          const qty = Number(delivery.quantityLitres);
          const amount = calculateFixedMilkAmount(qty, rate).amount;

          if (mt) {
            const s = await tx.sale.create({
              data: {
                dairyId: context.dairyId,
                saleCode: `SUB-${randomUUID().slice(0, 8).toUpperCase()}`,
                customerId: delivery.customerId,
                milkTypeId: mt.id,
                saleAt: new Date(),
                quantityLitres: qty,
                ratePerLitre: rate,
                amount,
                status: 'DELIVERED',
                notes: `Subscription delivery (${delivery.shift})`,
                createdById: context.user.id,
              },
            });

            await tx.stockMovement.create({
              data: {
                dairyId: context.dairyId,
                movementType: 'SALE',
                milkTypeId: mt.id,
                quantityLitres: -qty,
                referenceType: 'Sale',
                referenceId: s.id,
                saleId: s.id,
                notes: s.saleCode,
                createdById: context.user.id,
              },
            });

            await tx.ledgerEntry.create({
              data: {
                dairyId: context.dairyId,
                partyType: 'CUSTOMER',
                customerId: delivery.customerId,
                entryType: 'SALE_CHARGE',
                amount,
                referenceType: 'Sale',
                referenceId: s.id,
                description: `Subscription delivery ${qty} L (${delivery.shift})`,
                createdById: context.user.id,
              },
            });
          }
        }

        return updated;
      });

      await tenantAudit({
        actorId: context.user.id,
        dairyId: context.dairyId,
        action: `DELIVERY_${status}`,
        entityType: 'DailyDelivery',
        entityId: delivery.id,
        after: result,
      });

      return NextResponse.json({
        success: true,
        message: `Delivery marked as ${status}.`,
        data: result,
      });
    }

    return NextResponse.json({ error: 'Invalid delivery action or parameters' }, { status: 400 });
  } catch (error) {
    console.error('Delivery operation error:', error);
    return NextResponse.json({ error: 'Failed to process delivery operation' }, { status: 500 });
  }
}

