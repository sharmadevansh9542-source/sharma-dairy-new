import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  pincode: z.string().trim().max(10).optional().or(z.literal('')),
  logoUrl: z.string().trim().optional().or(z.literal('')),
  invoiceHeader: z.string().trim().max(250).optional().or(z.literal('')),
  invoiceFooter: z.string().trim().max(250).optional().or(z.literal('')),
  whatsappEnabled: z.boolean().optional(),
  autoInvoicing: z.boolean().optional(),
});

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  const dairy = await prisma.dairy.findUnique({
    where: { id: context.dairyId },
  });

  if (!dairy) return NextResponse.json({ error: 'Dairy not found' }, { status: 404 });

  const sub = await prisma.subscription.findFirst({
    where: { dairyId: dairy.id },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  return NextResponse.json({ dairy, subscription: sub });
}

export async function PATCH(req) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid settings data' }, { status: 422 });
    }

    const d = parsed.data;
    const current = await prisma.dairy.findUnique({ where: { id: context.dairyId } });
    const currentSettings = (current?.settings && typeof current.settings === 'object') ? current.settings : {};

    const updated = await prisma.dairy.update({
      where: { id: context.dairyId },
      data: {
        name: d.name,
        ownerName: d.ownerName,
        email: d.email || null,
        phone: d.phone || null,
        address: d.address || null,
        city: d.city || null,
        state: d.state || null,
        pincode: d.pincode || null,
        logoUrl: d.logoUrl || null,
        settings: {
          ...currentSettings,
          invoiceHeader: d.invoiceHeader || '',
          invoiceFooter: d.invoiceFooter || '',
          whatsappEnabled: Boolean(d.whatsappEnabled),
          autoInvoicing: Boolean(d.autoInvoicing),
        },
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'UPDATE_DAIRY_SETTINGS',
      entityType: 'Dairy',
      entityId: updated.id,
      before: current,
      after: updated,
    });

    return NextResponse.json({ data: updated, message: 'Dairy business branding & settings saved!' });
  } catch (e) {
    console.error('Update dairy settings error:', e);
    return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 });
  }
}

