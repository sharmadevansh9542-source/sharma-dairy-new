import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { recordAdminEdit } from '@/lib/audit/edit-history';
import { calculateOutstanding } from '@/lib/calculations/milk';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const { id } = await params;
  const farmer = await prisma.farmerProfile.findFirst({
    where: { id, dairyId: context.dairyId },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
    },
  });

  if (!farmer) return NextResponse.json({ error: 'Farmer not found in your dairy' }, { status: 404 });

  const [collections, payments, ledgerEntries] = await Promise.all([
    prisma.milkCollection.findMany({
      where: { farmerId: farmer.id, dairyId: context.dairyId },
      take: 100,
      orderBy: { collectionAt: 'desc' },
      include: { milkType: true },
    }),
    prisma.farmerPayment.findMany({
      where: { farmerId: farmer.id, dairyId: context.dairyId },
      take: 100,
      orderBy: { paidAt: 'desc' },
    }),
    prisma.ledgerEntry.findMany({
      where: { farmerId: farmer.id, dairyId: context.dairyId },
      take: 200,
      orderBy: { entryAt: 'desc' },
    }),
  ]);

  const totalCredits = ledgerEntries
    .filter((l) => ['MILK_COLLECTION', 'OPENING_BALANCE', 'CREDIT', 'ADJUSTMENT'].includes(l.entryType) && Number(l.amount) > 0)
    .reduce((acc, l) => acc + Number(l.amount), 0);

  const totalDebits = ledgerEntries
    .filter((l) => ['PAYMENT', 'ADVANCE', 'DEDUCTION'].includes(l.entryType) || Number(l.amount) < 0)
    .reduce((acc, l) => acc + Math.abs(Number(l.amount)), 0);

  const closingBalance = calculateOutstanding({
    openingBalance: Number(farmer.openingBalance || 0),
    charges: totalCredits,
    payments: totalDebits,
    credits: 0,
  });

  return NextResponse.json({
    farmer,
    summary: {
      openingBalance: Number(farmer.openingBalance || 0),
      totalCredits,
      totalDebits,
      closingBalance,
    },
    collections,
    payments,
    ledgerEntries,
  });
}

export async function PATCH(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { fullName, village, address, animalType, isActive } = body;

    const existing = await prisma.farmerProfile.findFirst({
      where: { id, dairyId: context.dairyId },
      include: { user: true },
    });
    if (!existing) return NextResponse.json({ error: 'Farmer not found in your dairy' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (fullName || typeof isActive === 'boolean') {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            fullName: fullName || undefined,
            isActive: typeof isActive === 'boolean' ? isActive : undefined,
          },
        });
        if (typeof isActive === 'boolean') {
          await tx.dairyMembership.updateMany({
            where: { userId: existing.userId, dairyId: context.dairyId },
            data: { isActive },
          });
          if (!isActive) {
            await tx.session.deleteMany({ where: { userId: existing.userId } });
          }
        }
      }

      const saved = await tx.farmerProfile.update({
        where: { id: existing.id },
        data: {
          village: village !== undefined ? village : undefined,
          address: address !== undefined ? address : undefined,
          animalType: animalType !== undefined ? animalType : undefined,
          isActive: typeof isActive === 'boolean' ? isActive : undefined,
        },
        include: { user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } } },
      });

      await recordAdminEdit({
        tx,
        dairyId: context.dairyId,
        recordType: 'FarmerProfile',
        recordId: existing.id,
        action: 'EDIT',
        oldValues: {
          fullName: existing.user?.fullName,
          village: existing.village,
          address: existing.address,
          animalType: existing.animalType,
          isActive: existing.isActive,
        },
        newValues: {
          fullName: saved.user?.fullName,
          village: saved.village,
          address: saved.address,
          animalType: saved.animalType,
          isActive: saved.isActive,
        },
        reason: body.reason?.trim() || 'Farmer profile updated by Admin',
        performedBy: context.user,
      });

      return saved;
    });

    return NextResponse.json({ data: updated, message: 'Farmer profile updated.' });
  } catch (e) {
    console.error('Update farmer error:', e);
    return NextResponse.json({ error: 'Unable to update farmer' }, { status: 500 });
  }
}

/**
 * Post auditable Advance, Deduction, or Adjustment ledger transactions.
 */
export async function POST(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { entryType, amount, description } = body;

    if (!['ADVANCE', 'DEDUCTION', 'ADJUSTMENT'].includes(entryType)) {
      return NextResponse.json({ error: 'entryType must be ADVANCE, DEDUCTION, or ADJUSTMENT' }, { status: 422 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt === 0) {
      return NextResponse.json({ error: 'Non-zero adjustment amount is required' }, { status: 422 });
    }

    const farmer = await prisma.farmerProfile.findFirst({
      where: { id, dairyId: context.dairyId },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found in your dairy' }, { status: 404 });

    const entry = await prisma.ledgerEntry.create({
      data: {
        dairyId: context.dairyId,
        partyType: 'FARMER',
        farmerId: farmer.id,
        entryType,
        amount: amt,
        description: description || `${entryType} recorded`,
        referenceType: 'ManualLedgerAdjustment',
        createdById: context.user.id,
      },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: `FARMER_LEDGER_${entryType}`,
      entityType: 'LedgerEntry',
      entityId: entry.id,
      after: entry,
    });

    return NextResponse.json({ data: entry, message: `${entryType} recorded on farmer ledger.` }, { status: 201 });
  } catch (e) {
    console.error('Farmer ledger adjustment error:', e);
    return NextResponse.json({ error: 'Unable to record ledger entry' }, { status: 500 });
  }
}

