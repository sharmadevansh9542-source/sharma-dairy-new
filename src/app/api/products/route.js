import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const productSchema = z.object({
  sku: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(120),
  category: z.enum(['MILK', 'CURD', 'PANEER', 'GHEE', 'BUTTER', 'SWEETS', 'FEED', 'GENERAL']).default('GENERAL'),
  unit: z.enum(['KG', 'LITRE', 'PACK', 'PIECE', 'BOX']).default('KG'),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  currentStock: z.number().nonnegative().default(0),
  minStockAlert: z.number().nonnegative().default(5),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const products = await prisma.product.findMany({
    where: { dairyId: context.dairyId },
    orderBy: { name: 'asc' },
    take: 200,
  });

  return NextResponse.json({ data: products });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid product data' }, { status: 422 });
    }

    const p = parsed.data;
    const product = await prisma.product.create({
      data: {
        dairyId: context.dairyId,
        sku: p.sku.toUpperCase(),
        name: p.name,
        category: p.category,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        minStockAlert: p.minStockAlert,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      after: product,
    });

    return NextResponse.json({ data: product, message: 'Product added to inventory!' }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'A product with this SKU already exists in your dairy' }, { status: 409 });
    }
    console.error('Create product error:', e);
    return NextResponse.json({ error: 'Unable to create product' }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const { id, currentStock, sellingPrice, purchasePrice, isActive } = body;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const existing = await prisma.product.findFirst({ where: { id, dairyId: context.dairyId } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        currentStock: currentStock != null ? Number(currentStock) : undefined,
        sellingPrice: sellingPrice != null ? Number(sellingPrice) : undefined,
        purchasePrice: purchasePrice != null ? Number(purchasePrice) : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ data: updated, message: 'Product updated.' });
  } catch (e) {
    console.error('Update product error:', e);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

