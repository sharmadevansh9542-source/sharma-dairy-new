import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

const DEFAULT_SETTINGS = {
  platformName: 'Sharma Dairy SaaS ERP',
  supportEmail: 'support@sharmadairy.com',
  defaultTrialDays: 14,
  gracePeriodDays: 7,
  maintenanceMode: false,
  allowPublicDairyRegistration: true,
};

export async function GET() {
  const { response } = await apiSuperAdminUser();
  if (response) return response;

  const row = await prisma.systemSetting.findUnique({ where: { key: 'platform_config' } });
  return NextResponse.json({
    settings: row ? { ...DEFAULT_SETTINGS, ...(typeof row.value === 'object' ? row.value : {}) } : DEFAULT_SETTINGS,
  });
}

export async function PATCH(req) {
  const { user, response } = await apiSuperAdminUser();
  if (response) return response;

  try {
    const body = await req.json();
    const nextSettings = {
      platformName: String(body.platformName || DEFAULT_SETTINGS.platformName).slice(0, 120),
      supportEmail: String(body.supportEmail || DEFAULT_SETTINGS.supportEmail).slice(0, 120),
      defaultTrialDays: Math.max(1, Math.min(90, Number(body.defaultTrialDays || 14))),
      gracePeriodDays: Math.max(0, Math.min(60, Number(body.gracePeriodDays || 7))),
      maintenanceMode: Boolean(body.maintenanceMode),
      allowPublicDairyRegistration: body.allowPublicDairyRegistration !== false,
    };

    const updated = await prisma.systemSetting.upsert({
      where: { key: 'platform_config' },
      create: { key: 'platform_config', value: nextSettings, updatedById: user.id },
      update: { value: nextSettings, updatedById: user.id },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityType: 'SystemSetting',
        entityId: 'platform_config',
        details: nextSettings,
      },
    });

    return NextResponse.json({ success: true, settings: updated.value, message: 'Platform global settings updated.' });
  } catch (e) {
    console.error('System settings update error:', e);
    return NextResponse.json({ error: 'Unable to update global settings' }, { status: 500 });
  }
}

