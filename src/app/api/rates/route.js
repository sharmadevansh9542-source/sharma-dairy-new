import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const rateSchema = z.object({
  milkType: z.enum(['COW', 'BUFFALO', 'OTHER']),
  pricingMethod: z.enum(['FIXED', 'FAT_BASED', 'FAT_SNF_BASED']),
  fixedRate: z.number().nonnegative().max(10000).optional().nullable(),
  fatRate: z.number().nonnegative().max(10000).optional().nullable(),
  snfRate: z.number().nonnegative().max(10000).optional().nullable(),
  baseRate: z.number().nonnegative().max(10000).optional().nullable(),
  effectiveFrom: z.string().optional(),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER']);
  if (response) return response;

  const rates = await prisma.milkRate.findMany({
    where: { dairyId: context.dairyId },
    take: 100,
    orderBy: { effectiveFrom: 'desc' },
    include: { milkType: true },
  });

  return NextResponse.json({ data: rates });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = rateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid rate input' }, { status: 422 });
    }

    const data = parsed.data;
    if (data.pricingMethod === 'FIXED' && (data.fixedRate == null || data.fixedRate <= 0)) {
      return NextResponse.json({ error: 'Fixed rate must be positive for FIXED pricing method' }, { status: 422 });
    }
    if (data.pricingMethod === 'FAT_BASED' && (data.fatRate == null || data.fatRate <= 0)) {
      return NextResponse.json({ error: 'Fat rate coefficient must be positive for FAT_BASED pricing' }, { status: 422 });
    }
    if (data.pricingMethod === 'FAT_SNF_BASED' && (!data.fatRate || !data.snfRate)) {
      return NextResponse.json({ error: 'Both Fat and SNF coefficients are required for FAT_SNF_BASED pricing' }, { status: 422 });
    }

    const mt = await prisma.milkTypeConfig.findUnique({ where: { type: data.milkType } });
    if (!mt) {
      return NextResponse.json({ error: 'Milk type not configured' }, { status: 422 });
    }

    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();

    const rate = await prisma.$transaction(async (tx) => {
      // Close out previous open rates for this dairy & milk type
      await tx.milkRate.updateMany({
        where: {
          dairyId: context.dairyId,
          milkTypeId: mt.id,
          effectiveTo: null,
        },
        data: {
          effectiveTo: effectiveFrom,
        },
      });

      return tx.milkRate.create({
        data: {
          dairyId: context.dairyId,
          milkTypeId: mt.id,
          pricingMethod: data.pricingMethod,
          fixedRate: data.fixedRate ?? null,
          fatRate: data.fatRate ?? null,
          snfRate: data.snfRate ?? null,
          baseRate: data.baseRate ?? 0,
          effectiveFrom,
          createdById: context.user.id,
        },
        include: { milkType: true },
      });
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_MILK_RATE',
      entityType: 'MilkRate',
      entityId: rate.id,
      after: rate,
    });

    return NextResponse.json({ data: rate, message: 'Milk rate policy updated successfully.' }, { status: 201 });
  } catch (e) {
    console.error('Milk rate error:', e);
    return NextResponse.json({ error: 'Unable to save milk rate policy' }, { status: 500 });
  }
}

