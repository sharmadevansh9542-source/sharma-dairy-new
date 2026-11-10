import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { staffInviteSchema } from '@/lib/validation/auth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { context, response } = await apiTenantUser(['ADMIN']);
    if (response) return response;

    const body = await request.json();
    const parsed = staffInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please provide a valid staff email.' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const hours = parsed.data.expiresInHours || 48;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: `A user with email ${email} already exists in the system.` },
        { status: 409 }
      );
    }

    // Check if an active, unused invitation already exists for this email within this dairy
    const existingInvite = await prisma.staffInvitation.findFirst({
      where: {
        dairyId: context.dairyId,
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      await prisma.staffInvitation.delete({ where: { id: existingInvite.id } });
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const invitation = await prisma.staffInvitation.create({
      data: {
        dairyId: context.dairyId,
        email,
        tokenHash,
        expiresAt,
        invitedById: context.user.id,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_STAFF_INVITATION',
      entityType: 'StaffInvitation',
      entityId: invitation.id,
      after: { email, expiresAt },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff invitation created successfully.',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        token: rawToken,
        inviteUrl: `/register/staff?token=${rawToken}`,
      },
    });
  } catch (error) {
    console.error('Staff invitation error:', error);
    return NextResponse.json({ error: 'Unable to create staff invitation.' }, { status: 500 });
  }
}
