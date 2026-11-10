import { z } from 'zod';
import { apiTenantUser } from '@/lib/auth/tenant';
import { createMilkEntry, listMilkEntries } from '@/lib/services/milk-entries';

const createEntrySchema = z.object({
  entryDate: z.string().min(1, 'Date is required'),
  session: z.enum(['MORNING', 'EVENING']),
  milkType: z.enum(['COW', 'BUFFALO', 'OTHER']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').max(100000),
  fatPercent: z
    .union([z.coerce.number().min(0).max(100), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v == null ? null : Number(v))),
  snfPercent: z
    .union([z.coerce.number().min(0).max(100), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v == null ? null : Number(v))),
  remarks: z.string().trim().max(500).optional().nullable(),
  allowDuplicate: z.boolean().optional().default(false),
});

export async function GET(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF', 'FARMER', 'CUSTOMER']);
  if (response) return response;

  if (context.role === 'STAFF') {
    // Staff must have collection or sale view/create access
    const hasAccess = context.permissions?.includes('collection.create') || context.permissions?.includes('sale.create');
    // Fallback check in case apiTenantUser didn't populate permissions array
    if (context.permissions && !hasAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'ALL';
  const submitterType = searchParams.get('submitterType') || null;
  const search = searchParams.get('search') || '';

  const result = await listMilkEntries({
    context,
    tab,
    submitterType,
    search,
  });

  return Response.json(result);
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['FARMER', 'CUSTOMER']);
  if (response) return response;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed' },
      { status: 422 }
    );
  }

  try {
    const entry = await createMilkEntry({
      user: context.user,
      dairyId: context.dairyId,
      input: parsed.data,
      allowDuplicate: parsed.data.allowDuplicate,
    });
    return Response.json({ data: entry }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Unable to submit milk entry' },
      { status: err.status || 500 }
    );
  }
}

