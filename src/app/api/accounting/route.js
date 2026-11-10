import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiTenantUser, tenantAudit } from '@/lib/auth/tenant';
import { ensureDairyChartOfAccounts, postJournalEntry } from '@/lib/accounting/engine';

export const runtime = 'nodejs';

export async function GET() {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'accounting.view');
  if (response) return response;

  try {
    const dairyId = context.dairyId;
    await ensureDairyChartOfAccounts(dairyId);

    const [
      accounts,
      journalEntries,
      collectionsAgg,
      salesAgg,
      expensesAgg,
      farmerPayAgg,
      customerPayAgg,
      cashInCustomer,
      bankInCustomer,
      cashOutFarmer,
      bankOutFarmer,
      cashOutExpense,
      bankOutExpense,
    ] = await Promise.all([
      prisma.account.findMany({ where: { dairyId }, orderBy: { code: 'asc' } }),
      prisma.journalEntry.findMany({
        where: { dairyId },
        take: 100,
        orderBy: { entryDate: 'desc' },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
      }),
      prisma.milkCollection.aggregate({ where: { dairyId }, _sum: { amount: true } }),
      prisma.sale.aggregate({ where: { dairyId, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { dairyId }, _sum: { amount: true } }),
      prisma.farmerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
      prisma.customerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
      prisma.customerPayment.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
      prisma.customerPayment.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
      prisma.farmerPayment.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
      prisma.farmerPayment.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
    ]);

    const revenue = Number(salesAgg._sum.amount || 0);
    const milkCost = Number(collectionsAgg._sum.amount || 0);
    const expenses = Number(expensesAgg._sum.amount || 0);
    const farmerPaid = Number(farmerPayAgg._sum.amount || 0);
    const customerReceived = Number(customerPayAgg._sum.amount || 0);

    const cashIn = Number(cashInCustomer._sum.amount || 0);
    const cashOut = Number(cashOutFarmer._sum.amount || 0) + Number(cashOutExpense._sum.amount || 0);
    const bankIn = Number(bankInCustomer._sum.amount || 0);
    const bankOut = Number(bankOutFarmer._sum.amount || 0) + Number(bankOutExpense._sum.amount || 0);

    return NextResponse.json({
      summary: {
        revenue,
        milkCost,
        expenses,
        netProfit: revenue - milkCost - expenses,
        farmerPayables: milkCost - farmerPaid,
        customerReceivables: revenue - customerReceived,
        cashbookBalance: cashIn - cashOut,
        bankbookBalance: bankIn - bankOut,
        cashIn,
        cashOut,
        bankIn,
        bankOut,
      },
      accounts: accounts.map((a) => ({ ...a, balance: Number(a.balance) })),
      journalEntries: journalEntries.map((j) => ({
        ...j,
        entryDate: j.entryDate.toISOString(),
        lines: j.lines.map((l) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
      })),
    });
  } catch (error) {
    console.error('Accounting GET error:', error);
    return NextResponse.json({ error: 'Unable to load financial accounting data' }, { status: 500 });
  }
}

export async function POST(req) {
  const { context, response } = await apiTenantUser(['ADMIN', 'STAFF'], 'accounting.view');
  if (response) return response;

  try {
    const body = await req.json();
    const { description, debitAccountCode, creditAccountCode, amount } = body;

    const amt = Number(amount);
    if (!description || !debitAccountCode || !creditAccountCode || !Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'Description, debit account, credit account and positive amount are required' }, { status: 422 });
    }
    if (debitAccountCode === creditAccountCode) {
      return NextResponse.json({ error: 'Debit and credit accounts must be different' }, { status: 422 });
    }

    const entry = await prisma.$transaction((tx) =>
      postJournalEntry({
        dairyId: context.dairyId,
        description,
        referenceType: 'ManualJournal',
        createdById: context.user.id,
        tx,
        lines: [
          { accountCode: debitAccountCode, debit: amt, credit: 0, memo: description },
          { accountCode: creditAccountCode, debit: 0, credit: amt, memo: description },
        ],
      })
    );

    await tenantAudit({
      actorId: context.user.id,
      dairyId: context.dairyId,
      action: 'POST_JOURNAL_ENTRY',
      entityType: 'JournalEntry',
      entityId: entry.id,
      after: { entryNumber: entry.entryNumber, amount: amt, description },
    });

    return NextResponse.json({ data: entry, message: `Journal Entry ${entry.entryNumber} posted!` }, { status: 201 });
  } catch (error) {
    console.error('Accounting POST error:', error);
    return NextResponse.json({ error: error.message || 'Unable to post journal entry' }, { status: 500 });
  }
}

