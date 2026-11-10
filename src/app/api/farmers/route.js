import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { personSchema } from '@/lib/validation/business';
import { hash } from 'bcryptjs';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const data = await prisma.farmerProfile.findMany({
    where: { dairyId: context.dairyId },
    take: 200,
    orderBy: { registrationDate: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
    },
  });

  return Response.json({ data });
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const body = await req.json();
  const parsed = personSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 });
  }

  if (context.role === 'STAFF') {
    return Response.json({ error: 'Staff account creation is not permitted from this endpoint' }, { status: 403 });
  }

  const p = parsed.data;
  const tempPassword = body.password;
  if (typeof tempPassword !== 'string' || tempPassword.length < 12) {
    return Response.json(
      { error: 'Set an initial password of at least 12 characters for farmer portal access' },
      { status: 422 }
    );
  }

  try {
    const data = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          dairyId: context.dairyId,
          fullName: p.fullName,
          phone: p.phone,
          email: p.email || null,
          passwordHash: await hash(tempPassword, 12),
          role: 'FARMER',
        },
      });

      const f = await tx.farmerProfile.create({
        data: {
          dairyId: context.dairyId,
          farmerCode: `F-${randomUUID().slice(0, 8).toUpperCase()}`,
          userId: u.id,
          address: p.address,
          village: p.village,
          animalType: p.animalType,
        },
      });

      await tx.dairyMembership.create({
        data: {
          dairyId: context.dairyId,
          userId: u.id,
          role: 'FARMER',
          isDefault: true,
          isActive: true,
        },
      });

      return { ...f, user: { id: u.id, fullName: u.fullName, phone: u.phone, email: u.email } };
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE',
      entityType: 'FarmerProfile',
      entityId: data.id,
      after: data,
    });

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return Response.json({ error: 'Phone, email, or farmer code already exists' }, { status: 409 });
    console.error(e);
    return Response.json({ error: 'Unable to create farmer' }, { status: 500 });
  }
}
