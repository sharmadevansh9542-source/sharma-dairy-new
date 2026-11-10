import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { paymentSchema } from '@/lib/validation/business';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'payment.record');
  if (response) return response;

  const data = await prisma.customerPayment.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { paidAt: 'desc' },
    include: { customer: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'payment.record');
  if (response) return response;

  const b = await req.json();
  const v = paymentSchema.safeParse(b);
  if (!v.success || typeof b.customerId !== 'string') {
    return Response.json({ error: v.success ? 'Customer is required' : v.error.issues[0]?.message }, { status: 422 });
  }

  const c = await prisma.customerProfile.findFirst({
    where: { id: b.customerId, dairyId: context.dairyId },
  });
  if (!c) return Response.json({ error: 'Customer not found in your dairy' }, { status: 404 });

  try {
    const data = await prisma.$transaction(async (tx) => {
      const p = await tx.customerPayment.create({
        data: {
          dairyId: context.dairyId,
          paymentCode: `CP-${randomUUID().slice(0, 8).toUpperCase()}`,
          customerId: c.id,
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
          partyType: 'CUSTOMER',
          customerId: c.id,
          entryType: 'PAYMENT',
          amount: v.data.amount,
          referenceType: 'CustomerPayment',
          referenceId: p.id,
          description: 'Customer payment received',
          createdById: context.user.id,
        },
      });

      return p;
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'CustomerPayment',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to record customer payment' }, { status: 500 });
  }
}
