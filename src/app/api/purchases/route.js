import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  paidAmount: z.number().nonnegative().default(0),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'PENDING']).default('PAID'),
  notes: z.string().max(300).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const purchases = await prisma.purchase.findMany({
    where: { dairyId: context.dairyId },
    orderBy: { purchaseDate: 'desc' },
    include: {
      supplier: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
    },
    take: 100,
  });

  return NextResponse.json({ data: purchases });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid purchase payload' }, { status: 422 });
    }

    const p = parsed.data;
    const supplier = await prisma.supplier.findFirst({
      where: { id: p.supplierId, dairyId: context.dairyId },
    });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found in your dairy' }, { status: 404 });
    }

    let totalAmount = 0;
    const enrichedItems = [];

    for (const item of p.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, dairyId: context.dairyId },
      });
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found in your dairy` }, { status: 404 });
      }
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      totalAmount += lineTotal;
      enrichedItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: lineTotal,
      });
    }

    const purchaseCode = `PO-${randomUUID().slice(0, 8).toUpperCase()}`;

    const purchase = await prisma.$transaction(async (tx) => {
      const po = await tx.purchase.create({
        data: {
          dairyId: context.dairyId,
          purchaseCode,
          supplierId: supplier.id,
          totalAmount,
          paidAmount: p.paidAmount,
          paymentStatus: p.paymentStatus,
          notes: p.notes || null,
          createdById: context.user.id,
          items: {
            create: enrichedItems,
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      // Atomically increment inventory stock for purchased items
      for (const item of enrichedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            purchasePrice: item.unitPrice,
          },
        });
      }

      return po;
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_PURCHASE',
      entityType: 'Purchase',
      entityId: purchase.id,
      after: purchase,
    });

    return NextResponse.json({ data: purchase, message: `Purchase ${purchaseCode} recorded and stock updated!` }, { status: 201 });
  } catch (e) {
    console.error('Purchase error:', e);
    return NextResponse.json({ error: 'Unable to save purchase order' }, { status: 500 });
  }
}

