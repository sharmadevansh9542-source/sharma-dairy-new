import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { calculateOutstanding } from '@/lib/calculations/milk';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF']);
  if (response) return response;

  const { id } = await params;
  const customer = await prisma.customerProfile.findFirst({
    where: { id, dairyId: context.dairyId },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
    },
  });

  if (!customer) return NextResponse.json({ error: 'Customer not found in your dairy' }, { status: 404 });

  const [sales, payments, ledgerEntries, invoices] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: customer.id, dairyId: context.dairyId },
      take: 100,
      orderBy: { saleAt: 'desc' },
      include: { milkType: true, product: true },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: customer.id, dairyId: context.dairyId },
      take: 100,
      orderBy: { paidAt: 'desc' },
    }),
    prisma.ledgerEntry.findMany({
      where: { customerId: customer.id, dairyId: context.dairyId },
      take: 200,
      orderBy: { entryAt: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { customerId: customer.id, dairyId: context.dairyId },
      orderBy: { issuedAt: 'desc' },
      include: { items: true },
    }),
  ]);

  const totalCharges = sales
    .filter((s) => s.status !== 'CANCELLED')
    .reduce((acc, s) => acc + Number(s.amount), 0);
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const outstandingBalance = calculateOutstanding({
    openingBalance: Number(customer.openingBalance || 0),
    charges: totalCharges,
    payments: totalPaid,
    credits: 0,
  });

  return NextResponse.json({
    customer,
    summary: {
      openingBalance: Number(customer.openingBalance || 0),
      totalCharges,
      totalPaid,
      outstandingBalance,
    },
    sales,
    payments,
    ledgerEntries,
    invoices,
  });
}

export async function PATCH(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN']);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { fullName, address, category, defaultRate, dailyRequirement, isActive } = body;

    const existing = await prisma.customerProfile.findFirst({
      where: { id, dairyId: context.dairyId },
      include: { user: true },
    });
    if (!existing) return NextResponse.json({ error: 'Customer not found in your dairy' }, { status: 404 });

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

      return tx.customerProfile.update({
        where: { id: existing.id },
        data: {
          address: address !== undefined ? address : undefined,
          category: category || undefined,
          defaultRate: defaultRate != null ? Number(defaultRate) : undefined,
          dailyRequirement: dailyRequirement != null ? Number(dailyRequirement) : undefined,
          isActive: typeof isActive === 'boolean' ? isActive : undefined,
        },
        include: { user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } } },
      });
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'UPDATE_CUSTOMER',
      entityType: 'CustomerProfile',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ data: updated, message: 'Customer profile updated.' });
  } catch (e) {
    console.error('Update customer error:', e);
    return NextResponse.json({ error: 'Unable to update customer' }, { status: 500 });
  }
}

/**
 * Generate an invoice for a customer's unbilled/period sales.
 */
export async function POST(req, { params }) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'sale.create');
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const { periodStart, periodEnd } = body;

    const customer = await prisma.customerProfile.findFirst({
      where: { id, dairyId: context.dairyId },
    });
    if (!customer) return NextResponse.json({ error: 'Customer not found in your dairy' }, { status: 404 });

    const start = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const sales = await prisma.sale.findMany({
      where: {
        dairyId: context.dairyId,
        customerId: customer.id,
        status: { not: 'CANCELLED' },
        saleAt: { gte: start, lte: end },
      },
      include: { milkType: true, product: true },
    });

    if (sales.length === 0) {
      return NextResponse.json({ error: 'No non-cancelled sales found in the selected period to invoice.' }, { status: 400 });
    }

    const subtotal = sales.reduce((acc, s) => acc + Number(s.amount), 0);
    const invoiceNumber = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        dairyId: context.dairyId,
        invoiceNumber,
        customerId: customer.id,
        periodStart: start,
        periodEnd: end,
        subtotal,
        status: 'ISSUED',
        items: {
          create: sales.map((s) => ({
            saleId: s.id,
            description: s.product ? s.product.name : `${s.milkType?.label || 'Milk'} Delivery (${s.saleCode})`,
            quantity: s.quantityLitres,
            rate: s.ratePerLitre,
            amount: s.amount,
          })),
        },
      },
      include: { items: true },
    });

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'CREATE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      after: { invoiceNumber, subtotal, customerId: customer.id },
    });

    return NextResponse.json({ data: invoice, message: `Invoice ${invoiceNumber} issued!` }, { status: 201 });
  } catch (e) {
    console.error('Invoice generation error:', e);
    return NextResponse.json({ error: 'Unable to generate invoice' }, { status: 500 });
  }
}

