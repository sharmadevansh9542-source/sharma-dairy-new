import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { personSchema } from '@/lib/validation/business';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const data = await prisma.customerProfile.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
    },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  const b = await req.json();
  const v = personSchema.safeParse(b);
  if (!v.success) return Response.json({ error: v.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  if (typeof b.password !== 'string' || b.password.length < 12) {
    return Response.json({ error: 'Initial password must be at least 12 characters' }, { status: 422 });
  }

  try {
    const p = v.data;
    const data = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          dairyId: context.dairyId,
          fullName: p.fullName,
          phone: p.phone,
          email: p.email || null,
          passwordHash: await hash(b.password, 12),
          role: 'CUSTOMER',
        },
      });

      const c = await tx.customerProfile.create({
        data: {
          dairyId: context.dairyId,
          customerCode: `C-${randomUUID().slice(0, 8).toUpperCase()}`,
          userId: u.id,
          address: p.address,
          category: p.category || 'HOUSEHOLD',
          defaultRate: p.defaultRate,
          dailyRequirement: p.dailyRequirement,
        },
      });

      await tx.dairyMembership.create({
        data: {
          dairyId: context.dairyId,
          userId: u.id,
          role: 'CUSTOMER',
          isDefault: true,
          isActive: true,
        },
      });

      return { ...c, user: { id: u.id, fullName: u.fullName, phone: u.phone, email: u.email } };
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'CustomerProfile',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return Response.json({ error: 'Phone, email, or customer code already exists' }, { status: 409 });
    console.error(e);
    return Response.json({ error: 'Unable to create customer' }, { status: 500 });
  }
}
