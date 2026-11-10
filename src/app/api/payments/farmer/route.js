import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { paymentSchema } from '@/lib/validation/business';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'payment.record');
  if (response) return response;

  const data = await prisma.farmerPayment.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { paidAt: 'desc' },
    include: { farmer: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'payment.record');
  if (response) return response;

  const b = await req.json();
  const v = paymentSchema.safeParse(b);
  if (!v.success || typeof b.farmerId !== 'string') {
    return Response.json({ error: v.success ? 'Farmer is required' : v.error.issues[0]?.message }, { status: 422 });
  }

  if (context.role === 'STAFF') {
    const grant = await prisma.userPermission.findFirst({
      where: { userId: context.user.id, permission: { key: 'payment.record' } },
    });
    if (!grant) return Response.json({ error: 'Permission payment.record required' }, { status: 403 });
  }

  const f = await prisma.farmerProfile.findFirst({
    where: { id: b.farmerId, dairyId: context.dairyId },
  });
  if (!f) return Response.json({ error: 'Farmer not found in your dairy' }, { status: 404 });

  // Prevent duplicate payment submission with identical reference number
  if (v.data.reference && v.data.reference.trim()) {
    const dupRef = await prisma.farmerPayment.findFirst({
      where: { dairyId: context.dairyId, farmerId: f.id, reference: v.data.reference.trim() },
    });
    if (dupRef) {
      return Response.json({ error: `Duplicate payment prevented: reference ${v.data.reference} already recorded.` }, { status: 409 });
    }
  }

  try {
    const data = await prisma.$transaction(async (tx) => {
      const p = await tx.farmerPayment.create({
        data: {
          dairyId: context.dairyId,
          paymentCode: `FP-${randomUUID().slice(0, 8).toUpperCase()}`,
          farmerId: f.id,
          amount: v.data.amount,
          method: v.data.method,
          reference: v.data.reference,
          paidAt: v.data.paidAt ? new Date(v.data.paidAt) : new Date(),
          notes: v.data.notes,
          createdById: context.user.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          dairyId: context.dairyId,
          partyType: 'FARMER',
          farmerId: f.id,
          entryType: 'PAYMENT',
          amount: v.data.amount,
          referenceType: 'FarmerPayment',
          referenceId: p.id,
          description: 'Farmer settlement payment',
          createdById: context.user.id,
        },
      });

      await tx.notification.create({
        data: {
          dairyId: context.dairyId,
          userId: f.userId,
          role: 'FARMER',
          type: 'FARMER_PAYMENT',
          title: `Payment Disbursed (${p.paymentCode})`,
          message: `₹${Number(v.data.amount).toFixed(2)} paid via ${v.data.method}${v.data.reference ? ` (Ref: ${v.data.reference})` : ''}`,
          data: { paymentId: p.id, amount: v.data.amount },
        },
      });

      return p;
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'FarmerPayment',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to record farmer payment' }, { status: 500 });
  }
}
