import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { z } from 'zod';

export async function GET() {
  const { context, response } = await apiTenantUser();
  if (response) return response;

  const [types, movements] = await Promise.all([
    prisma.milkTypeConfig.findMany({
      include: {
        _count: {
          select: {
            collections: { where: { dairyId: context.dairyId } },
            sales: { where: { dairyId: context.dairyId } },
          },
        },
      },
    }),
    prisma.stockMovement.findMany({
      where: { dairyId: context.dairyId },
      take: 200,
      orderBy: { movementAt: 'desc' },
      include: { milkType: true },
    }),
  ]);

  const totals = await prisma.stockMovement.groupBy({
    by: ['milkTypeId'],
    where: { dairyId: context.dairyId },
    _sum: { quantityLitres: true },
  });

  return Response.json({
    data: types.map((t) => ({
      ...t,
      stockLitres: Number(totals.find((x) => x.milkTypeId === t.id)?._sum.quantityLitres || 0),
    })),
    movements,
  });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  const v = z
    .object({
      milkType: z.enum(['COW', 'BUFFALO', 'OTHER']),
      quantityLitres: z.number().positive().max(100000),
      movementType: z.enum(['OPENING_STOCK', 'LOSS', 'INTERNAL_CONSUMPTION', 'ADJUSTMENT']),
      notes: z.string().max(500).optional(),
    })
    .safeParse(await req.json());

  if (!v.success) return Response.json({ error: v.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  const p = v.data;

  const mt = await prisma.milkTypeConfig.findUnique({ where: { type: p.milkType } });
  if (!mt) return Response.json({ error: 'Milk type is not configured' }, { status: 422 });

  const quantity =
    p.movementType === 'OPENING_STOCK' || p.movementType === 'ADJUSTMENT'
      ? p.quantityLitres
      : -p.quantityLitres;

  try {
    const data = await prisma.$transaction(async (tx) => {
      const current = await tx.stockMovement.aggregate({
        where: { dairyId: context.dairyId, milkTypeId: mt.id },
        _sum: { quantityLitres: true },
      });
      if (Number(current._sum.quantityLitres || 0) + quantity < 0) return null;

      return tx.stockMovement.create({
        data: {
          dairyId: context.dairyId,
          movementType: p.movementType,
          milkTypeId: mt.id,
          quantityLitres: quantity,
          notes: p.notes,
          referenceType: 'ManualAdjustment',
          createdById: context.user.id,
        },
      });
    });

    if (!data) return Response.json({ error: 'Adjustment would make stock negative in your dairy' }, { status: 409 });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'StockMovement',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to adjust stock' }, { status: 500 });
  }
}
