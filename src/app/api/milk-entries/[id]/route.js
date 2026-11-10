import { z } from 'zod';
import { apiTenantUser } from '@/lib/auth/tenant';
import { getMilkEntryDetail, verifyOrEditMilkEntry } from '@/lib/services/milk-entries';

const patchEntrySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('APPROVE'),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('REJECT'),
    reason: z.string().trim().min(3, 'Rejection reason is mandatory').max(500),
  }),
  z.object({
    action: z.literal('EDIT'),
    reason: z.string().trim().min(3, 'Edit reason is mandatory').max(500),
    currentQuantity: z.coerce.number().positive('Quantity must be greater than 0').max(100000).optional(),
    milkType: z.enum(['COW', 'BUFFALO', 'OTHER']).optional(),
    session: z.enum(['MORNING', 'EVENING']).optional(),
    fatPercent: z
      .union([z.coerce.number().min(0).max(100), z.literal(''), z.null()])
      .optional(),
    snfPercent: z
      .union([z.coerce.number().min(0).max(100), z.literal(''), z.null()])
      .optional(),
    remarks: z.string().trim().max(500).optional().nullable(),
  }),
]);

export async function GET(_req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER', 'CUSTOMER']);
  if (response) return response;

  const { id } = await params;
  try {
    const entry = await getMilkEntryDetail({ context, id });
    return Response.json({ data: entry });
  } catch (err) {
    return Response.json({ error: err.message || 'Not found' }, { status: err.status || 500 });
  }
}

export async function PATCH(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = patchEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed' },
      { status: 422 }
    );
  }

  try {
    const ipAddress = req.headers.get('x-forwarded-for') || null;
    const updated = await verifyOrEditMilkEntry({
      context,
      id,
      payload: parsed.data,
      ipAddress,
    });
    return Response.json({ data: updated });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Unable to update milk entry' },
      { status: err.status || 500 }
    );
  }
}

