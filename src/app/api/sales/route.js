import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { calculateFixedMilkAmount } from '@/lib/calculations/milk';
import { z } from 'zod';

const enhancedSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  walkInName: z.string().trim().max(120).optional().nullable(),
  milkType: z.enum(['COW', 'BUFFALO', 'OTHER']).optional().nullable(),
  productId: z.string().optional().nullable(),
  quantityLitres: z.coerce.number().positive().max(100000),
  ratePerLitre: z.coerce.number().nonnegative().max(100000),
  discount: z.coerce.number().nonnegative().max(1000000).default(0),
  taxAmount: z.coerce.number().nonnegative().max(1000000).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  paymentStatus: z.enum(['PAID', 'PENDING', 'PARTIAL']).default('PAID'),
  saleAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().max(120).optional(),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'sale.create');
  if (response) return response;

  const data = await prisma.sale.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { saleAt: 'desc' },
    include: {
      customer: { include: { user: { select: { fullName: true } } } },
      milkType: true,
      product: { select: { name: true, sku: true, unit: true } },
    },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'sale.create');
  if (response) return response;

  const b = await req.json();
  const v = enhancedSaleSchema.safeParse(b);
  if (!v.success) return Response.json({ error: v.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  const p = v.data;

  if (!p.customerId && !p.walkInName) {
    return Response.json({ error: 'Select a customer or provide a walk-in buyer name' }, { status: 422 });
  }
  if (!p.milkType && !p.productId) {
    return Response.json({ error: 'Specify either a milk type or a packaged product' }, { status: 422 });
  }

  try {
    if (p.idempotencyKey) {
      const old = await prisma.sale.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
      if (old) return Response.json({ data: old, duplicate: true });
    }

    let customer = null;
    if (p.customerId) {
      customer = await prisma.customerProfile.findFirst({
        where: { id: p.customerId, dairyId: context.dairyId, isActive: true },
        include: { user: true },
      });
      if (!customer) return Response.json({ error: 'Active customer profile not found in your dairy' }, { status: 404 });
    }

    let mt = null;
    if (p.milkType && !p.productId) {
      mt = await prisma.milkTypeConfig.findUnique({ where: { type: p.milkType } });
      if (!mt) return Response.json({ error: 'Milk type is not configured' }, { status: 422 });
    }

    let product = null;
    if (p.productId) {
      product = await prisma.product.findFirst({
        where: { id: p.productId, dairyId: context.dairyId, isActive: true },
      });
      if (!product) return Response.json({ error: 'Product not found in your dairy' }, { status: 404 });
    }

    const baseAmount = Number(calculateFixedMilkAmount(p.quantityLitres, p.ratePerLitre).amount);
    const finalAmount = Math.max(0, Number((baseAmount - p.discount + p.taxAmount).toFixed(2)));

    const data = await prisma.$transaction(async (tx) => {
      if (product) {
        if (Number(product.currentStock) < p.quantityLitres) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 409 });
        }
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: p.quantityLitres } },
        });
      } else if (mt) {
        const stock = await tx.stockMovement.aggregate({
          where: { dairyId: context.dairyId, milkTypeId: mt.id },
          _sum: { quantityLitres: true },
        });
        if (Number(stock._sum.quantityLitres || 0) < p.quantityLitres) {
          throw Object.assign(new Error('Insufficient stock for this milk type in your dairy'), { status: 409 });
        }
      }

      const s = await tx.sale.create({
        data: {
          dairyId: context.dairyId,
          saleCode: `S-${randomUUID().slice(0, 8).toUpperCase()}`,
          customerId: customer ? customer.id : null,
          walkInName: !customer ? p.walkInName : null,
          milkTypeId: mt ? mt.id : null,
          productId: product ? product.id : null,
          saleAt: p.saleAt ? new Date(p.saleAt) : new Date(),
          quantityLitres: p.quantityLitres,
          ratePerLitre: p.ratePerLitre,
          discount: p.discount,
          taxAmount: p.taxAmount,
          amount: finalAmount,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          status: 'DELIVERED',
          idempotencyKey: p.idempotencyKey,
          notes: p.notes,
          createdById: context.user.id,
        },
      });

      if (mt) {
        await tx.stockMovement.create({
          data: {
            dairyId: context.dairyId,
            movementType: 'SALE',
            milkTypeId: mt.id,
            quantityLitres: -p.quantityLitres,
            referenceType: 'Sale',
            referenceId: s.id,
            saleId: s.id,
            notes: s.saleCode,
            createdById: context.user.id,
          },
        });
      }

      if (customer) {
        await tx.ledgerEntry.create({
          data: {
            dairyId: context.dairyId,
            partyType: 'CUSTOMER',
            customerId: customer.id,
            entryType: 'SALE_CHARGE',
            amount: finalAmount,
            referenceType: 'Sale',
            referenceId: s.id,
            description: product ? `${p.quantityLitres} ${product.unit} ${product.name}` : `${p.quantityLitres} L milk sale`,
            createdById: context.user.id,
          },
        });
      }

      return s;
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'Sale',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return Response.json({ error: 'Duplicate submission detected' }, { status: 409 });
    console.error(e);
    return Response.json({ error: e.status === 409 ? e.message : 'Unable to save sale' }, { status: e.status || 500 });
  }
}
