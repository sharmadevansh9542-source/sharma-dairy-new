import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { collectionSchema } from '@/lib/validation/business';
import { calculateFixedMilkAmount, resolveMilkRate } from '@/lib/calculations/milk';
import { dispatchWhatsAppMessage, formatCollectionReceiptMessage } from '@/lib/notifications/dispatcher';

export async function GET(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'collection.create');
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where = {
    dairyId: context.dairyId,
    ...(from || to
      ? {
          collectionAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lt: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const data = await prisma.milkCollection.findMany({
    where,
    take: 200,
    orderBy: { collectionAt: 'desc' },
    include: {
      farmer: { include: { user: { select: { fullName: true } } } },
      milkType: true,
    },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'collection.create');
  if (response) return response;

  const b = await req.json();
  const mt = b.milkType ? await prisma.milkTypeConfig.findUnique({ where: { type: b.milkType } }) : null;

  // Allow auto-resolving active rate if ratePerLitre is omitted
  let resolvedRate = b.ratePerLitre != null && b.ratePerLitre !== '' ? Number(b.ratePerLitre) : null;
  let rateMethod = 'MANUAL_ENTRY';

  if (resolvedRate == null && mt) {
    const activeRate = await prisma.milkRate.findFirst({
      where: {
        dairyId: context.dairyId,
        milkTypeId: mt.id,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (activeRate) {
      try {
        resolvedRate = resolveMilkRate(activeRate, {
          fatPercent: b.fatPercent != null && b.fatPercent !== '' ? Number(b.fatPercent) : null,
          snfPercent: b.snfPercent != null && b.snfPercent !== '' ? Number(b.snfPercent) : null,
        });
        rateMethod = activeRate.pricingMethod;
      } catch (err) {
        return Response.json({ error: err.message }, { status: 422 });
      }
    }
  }

  const v = collectionSchema.safeParse({ ...b, ratePerLitre: resolvedRate });
  if (!v.success) return Response.json({ error: v.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  const p = v.data;

  try {
    if (p.idempotencyKey) {
      const old = await prisma.milkCollection.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
      if (old) return Response.json({ data: old, duplicate: true });
    }

    const farmer = await prisma.farmerProfile.findFirst({
      where: { id: p.farmerId, dairyId: context.dairyId, isActive: true },
      include: { user: true },
    });
    if (!farmer) return Response.json({ error: 'Active farmer profile not found in your dairy' }, { status: 404 });

    if (!mt) {
      return Response.json(
        { error: 'Milk type is not configured. Ask administrator to configure milk types.' },
        { status: 422 }
      );
    }

    const colDate = p.collectionAt ? new Date(p.collectionAt) : new Date();
    if (!b.allowDuplicate) {
      const dayStart = new Date(colDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dup = await prisma.milkCollection.findFirst({
        where: {
          dairyId: context.dairyId,
          farmerId: farmer.id,
          milkTypeId: mt.id,
          shift: p.shift,
          collectionAt: { gte: dayStart, lt: dayEnd },
        },
      });
      if (dup) {
        return Response.json(
          { error: `Duplicate prevented: ${farmer.user.fullName} already has a ${p.shift} ${mt.label} entry for this date.` },
          { status: 409 }
        );
      }
    }

    const rate = Number(p.ratePerLitre);
    const amount = calculateFixedMilkAmount(p.quantityLitres, rate).amount;

    const data = await prisma.$transaction(async (tx) => {
      const c = await tx.milkCollection.create({
        data: {
          dairyId: context.dairyId,
          collectionCode: `MC-${randomUUID().slice(0, 8).toUpperCase()}`,
          farmerId: p.farmerId,
          milkTypeId: mt.id,
          collectionAt: colDate,
          shift: p.shift,
          quantityLitres: p.quantityLitres,
          fatPercent: p.fatPercent,
          snfPercent: p.snfPercent,
          ratePerLitre: rate,
          amount,
          rateSnapshot: {
            method: rateMethod,
            ratePerLitre: rate,
            fatPercent: p.fatPercent ?? null,
            snfPercent: p.snfPercent ?? null,
            policyNote: 'Rate captured at transaction time',
          },
          notes: p.notes,
          idempotencyKey: p.idempotencyKey,
          createdById: context.user.id,
        },
      });

      await tx.stockMovement.create({
        data: {
          dairyId: context.dairyId,
          movementType: 'COLLECTION',
          milkTypeId: mt.id,
          quantityLitres: p.quantityLitres,
          referenceType: 'MilkCollection',
          referenceId: c.id,
          notes: c.collectionCode,
          createdById: context.user.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          dairyId: context.dairyId,
          partyType: 'FARMER',
          farmerId: farmer.id,
          entryType: 'MILK_COLLECTION',
          amount,
          referenceType: 'MilkCollection',
          referenceId: c.id,
          description: `${p.quantityLitres} L ${p.shift.toLowerCase()} collection`,
          createdById: context.user.id,
        },
      });

      await tx.notification.create({
        data: {
          dairyId: context.dairyId,
          userId: farmer.userId,
          role: 'FARMER',
          type: 'MILK_COLLECTION',
          title: `Milk Collection Recorded (${c.collectionCode})`,
          message: `${p.quantityLitres} L ${mt.label} (${p.shift}) @ ₹${rate}/L = ₹${amount}`,
          data: { collectionId: c.id, amount, quantityLitres: p.quantityLitres },
        },
      });

      return c;
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'MilkCollection',
      entityId: data.id,
      after: data,
    });

    // External WhatsApp automation (non-blocking)
    try {
      const dairySettings = context.dairy?.settings;
      if (dairySettings?.whatsappEnabled && farmer.user?.phone) {
        const msgText = formatCollectionReceiptMessage({
          farmerName: farmer.user.fullName,
          date: colDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          milkType: mt.label,
          quantityLitres: p.quantityLitres,
          fatPercent: p.fatPercent,
          amount,
          dairyName: context.dairy.name,
        });
        const waRes = await dispatchWhatsAppMessage({ toPhone: farmer.user.phone, text: msgText });
        await prisma.notificationDeliveryLog.create({
          data: {
            dairyId: context.dairyId,
            channel: 'WHATSAPP',
            recipient: farmer.user.phone,
            template: 'FARMER_COLLECTION_RECEIPT',
            status: waRes.status,
            referenceType: 'MilkCollection',
            referenceId: data.id,
            errorMessage: waRes.error || waRes.reason || null,
          },
        });
      }
    } catch (notifErr) {
      console.error('Non-blocking notification error:', notifErr?.message);
    }

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return Response.json({ error: 'Duplicate submission detected' }, { status: 409 });
    console.error(e);
    return Response.json({ error: 'Unable to save collection' }, { status: 500 });
  }
}
