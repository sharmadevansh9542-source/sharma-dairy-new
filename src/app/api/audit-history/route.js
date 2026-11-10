import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser, apiTenantUser } from '@/lib/auth/tenant';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const recordType = searchParams.get('recordType');
  const recordId = searchParams.get('recordId');
  const action = searchParams.get('action');
  const requestedDairyId = searchParams.get('dairyId');

  // Allow Super Admin across dairies OR Tenant roles strictly inside their own dairy
  const superCheck = await apiSuperAdminUser();
  if (!superCheck.response) {
    const where = {
      ...(requestedDairyId ? { dairyId: requestedDairyId } : {}),
      ...(recordType ? { recordType } : {}),
      ...(recordId ? { recordId } : {}),
      ...(action ? { action } : {}),
    };
    const data = await prisma.adminEditHistory.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      take: 200,
      include: { dairy: { select: { name: true, code: true } } },
    });
    return Response.json({ data });
  }

  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER', 'CUSTOMER']);
  if (response) return response;

  // Farmers & Customers may only view edit history of their own MilkEntry (or own profile)
  if (context.role === 'FARMER' || context.role === 'CUSTOMER') {
    if (!recordType || !recordId) {
      return Response.json({ error: 'recordType and recordId are required' }, { status: 400 });
    }
    if (recordType === 'MilkEntry') {
      const entry = await prisma.milkEntry.findFirst({
        where: { id: recordId, dairyId: context.dairyId },
        include: {
          farmer: { select: { userId: true } },
          customer: { select: { userId: true } },
        },
      });
      if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });
      const ownerUserId = entry.farmer?.userId || entry.customer?.userId;
      if (ownerUserId !== context.user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const where = {
    dairyId: context.dairyId,
    ...(recordType ? { recordType } : {}),
    ...(recordId ? { recordId } : {}),
    ...(action ? { action } : {}),
  };

  const data = await prisma.adminEditHistory.findMany({
    where,
    orderBy: { performedAt: 'desc' },
    take: 200,
  });

  return Response.json({ data });
}

