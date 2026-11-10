import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { expenseSchema } from '@/lib/validation/business';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const data = await prisma.expense.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { expenseAt: 'desc' },
    include: { createdBy: { select: { fullName: true } } },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'expense.create');
  if (response) return response;

  if (context.role === 'STAFF') {
    return Response.json({ error: 'Only administrators can record expenses' }, { status: 403 });
  }

  const v = expenseSchema.safeParse(await req.json());
  if (!v.success) return Response.json({ error: v.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  const p = v.data;

  try {
    const data = await prisma.expense.create({
      data: {
        dairyId: context.dairyId,
        expenseCode: `EXP-${randomUUID().slice(0, 8).toUpperCase()}`,
        category: p.category,
        amount: p.amount,
        method: p.method,
        expenseAt: p.expenseAt ? new Date(p.expenseAt) : new Date(),
        description: p.description,
        createdById: context.user.id,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'Expense',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to save expense' }, { status: 500 });
  }
}
