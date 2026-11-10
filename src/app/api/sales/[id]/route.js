import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { recordAdminEdit } from '@/lib/audit/edit-history';

export const runtime = 'nodejs';

export async function PATCH(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'sale.create');
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body;

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Only action=CANCEL is supported' }, { status: 400 });
    }

    const sale = await prisma.sale.findFirst({
      where: { id, dairyId: context.dairyId },
      include: { milkType: true, product: true },
    });

    if (!sale) return NextResponse.json({ error: 'Sale not found in your dairy' }, { status: 404 });
    if (sale.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This sale is already cancelled' }, { status: 400 });
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${sale.notes ? sale.notes + ' | ' : ''}Cancelled: ${reason}` : sale.notes,
        },
      });

      // Reverse raw milk stock or product stock
      if (sale.productId) {
        await tx.product.update({
          where: { id: sale.productId },
          data: { currentStock: { increment: sale.quantityLitres } },
        });
      } else if (sale.milkTypeId) {
        await tx.stockMovement.create({
          data: {
            dairyId: context.dairyId,
            movementType: 'REVERSAL',
            milkTypeId: sale.milkTypeId,
            quantityLitres: sale.quantityLitres,
            referenceType: 'SaleReversal',
            referenceId: sale.id,
            saleId: sale.id,
            notes: `Reversal for cancelled sale ${sale.saleCode}`,
            createdById: context.user.id,
          },
        });
      }

      // Reverse customer ledger charge via auditable CREDIT entry
      if (sale.customerId) {
        await tx.ledgerEntry.create({
          data: {
            dairyId: context.dairyId,
            partyType: 'CUSTOMER',
            customerId: sale.customerId,
            entryType: 'CREDIT',
            amount: sale.amount,
            referenceType: 'SaleReversal',
            referenceId: sale.id,
            description: `Reversal for cancelled sale ${sale.saleCode}`,
            createdById: context.user.id,
          },
        });
      }

      if (context.role === 'ADMIN') {
        await recordAdminEdit({
          tx,
          dairyId: context.dairyId,
          recordType: 'Sale',
          recordId: sale.id,
          action: 'CANCEL',
          oldValues: { status: sale.status, amount: Number(sale.amount) },
          newValues: { status: 'CANCELLED', reason: reason || 'Cancelled by Admin' },
          reason: reason?.trim() || 'Sale cancelled and reversed by Admin',
          performedBy: context.user,
        });
      }

      return updated;
    });

    if (context.role !== 'ADMIN') {
      await tenantAudit({
        actorId: context.user.id,
        dairyId: context.dairyId,
        action: 'CANCEL_SALE',
        entityType: 'Sale',
        entityId: sale.id,
        before: { status: sale.status },
        after: { status: 'CANCELLED', reason },
      });
    }

    return NextResponse.json({ data: cancelled, message: `Sale ${sale.saleCode} cancelled and stock/ledger reversed.` });
  } catch (e) {
    console.error('Cancel sale error:', e);
    return NextResponse.json({ error: 'Unable to cancel sale' }, { status: 500 });
  }
}

