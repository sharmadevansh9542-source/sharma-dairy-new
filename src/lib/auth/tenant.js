import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

/**
 * Resolves the authenticated tenant context strictly on the server.
 * Never trusts client headers, query params, or body parameters for tenant identification.
 */
export async function getTenantContext() {
  const user = await getSessionUser();
  if (!user) return { user: null, dairy: null, error: 'UNAUTHENTICATED' };

  if (user.role === 'SUPER_ADMIN') {
    return {
      user,
      isSuperAdmin: true,
      dairy: null,
      membership: null,
      dairyId: null,
      error: null,
    };
  }

  // Look up user's active membership
  const membership = await prisma.dairyMembership.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      dairy: true,
    },
    orderBy: {
      isDefault: 'desc',
    },
  });

  if (!membership || !membership.dairy) {
    // Check if user has a direct dairyId on user model
    if (user.dairyId) {
      const dairy = await prisma.dairy.findUnique({ where: { id: user.dairyId } });
      if (dairy) {
        if (dairy.status === 'SUSPENDED') {
          return { user, dairy, error: 'DAIRY_SUSPENDED' };
        }
        return {
          user,
          dairy,
          dairyId: dairy.id,
          role: user.role,
          membership: null,
          isSuperAdmin: false,
          error: null,
        };
      }
    }
    return { user, dairy: null, error: 'NO_DAIRY_MEMBERSHIP' };
  }

  if (membership.dairy.status === 'SUSPENDED') {
    return { user, dairy: membership.dairy, error: 'DAIRY_SUSPENDED' };
  }

  return {
    user,
    dairy: membership.dairy,
    dairyId: membership.dairy.id,
    role: membership.role,
    membership,
    isSuperAdmin: false,
    error: null,
  };
}

/**
 * Guard utility for tenant-isolated API routes.
 */
export async function apiTenantUser(allowedRoles = ['ADMIN', 'STAFF'], permission = null) {
  const context = await getTenantContext();

  if (context.error === 'UNAUTHENTICATED' || !context.user) {
    return {
      context: null,
      response: Response.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  if (context.error === 'DAIRY_SUSPENDED') {
    return {
      context: null,
      response: Response.json(
        { error: 'Your dairy account is currently suspended. Please contact platform support.' },
        { status: 403 }
      ),
    };
  }

  if (context.isSuperAdmin) {
    return { context, response: null };
  }

  if (!context.dairyId) {
    return {
      context: null,
      response: Response.json({ error: 'No active dairy business associated with this account' }, { status: 403 }),
    };
  }

  const effectiveRole = context.role || context.user.role;
  if (!allowedRoles.includes(effectiveRole)) {
    return {
      context: null,
      response: Response.json({ error: 'Insufficient permissions for this operation' }, { status: 403 }),
    };
  }

  if (effectiveRole === 'STAFF' && permission) {
    const grant = await prisma.userPermission.findFirst({
      where: {
        userId: context.user.id,
        permission: { key: permission },
      },
    });
    if (!grant) {
      return {
        context: null,
        response: Response.json({ error: 'Permission not granted for this staff account' }, { status: 403 }),
      };
    }
  }

  return { context, response: null };
}

/**
 * Guard utility for Super Admin only operations.
 */
export async function apiSuperAdminUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: Response.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  if (user.role !== 'SUPER_ADMIN') {
    return {
      user: null,
      response: Response.json({ error: 'Super Admin privileges required' }, { status: 403 }),
    };
  }

  return { user, response: null };
}

/**
 * Tenant-scoped audit logger.
 */
export async function tenantAudit({
  actorId,
  dairyId,
  action,
  entityType,
  entityId,
  before,
  after,
  ipAddress,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        dairyId: dairyId || undefined,
        actorId: actorId || undefined,
        action,
        entityType,
        entityId,
        before: before ?? undefined,
        after: after ?? undefined,
        ipAddress: ipAddress || undefined,
      },
    });
  } catch (e) {
    console.error('Tenant audit log write failed:', e?.message);
  }
}

