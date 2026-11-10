import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  gstin: z.string().trim().max(30).optional(),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const suppliers = await prisma.supplier.findMany({
    where: { dairyId: context.dairyId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchases: true } } },
    take: 200,
  });

  return NextResponse.json({ data: suppliers });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid supplier info' }, { status: 422 });
    }

    const p = parsed.data;
    const supplier = await prisma.supplier.create({
      data: {
        dairyId: context.dairyId,
        name: p.name,
        contactPerson: p.contactPerson || null,
        phone: p.phone || null,
        email: p.email || null,
        address: p.address || null,
        city: p.city || null,
        gstin: p.gstin || null,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      after: supplier,
    });

    return NextResponse.json({ data: supplier, message: 'Supplier registered successfully!' }, { status: 201 });
  } catch (e) {
    console.error('Create supplier error:', e);
    return NextResponse.json({ error: 'Unable to create supplier' }, { status: 500 });
  }
}

