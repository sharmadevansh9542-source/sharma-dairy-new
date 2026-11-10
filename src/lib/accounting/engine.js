import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma.js';

export const DEFAULT_ACCOUNTS = [
  { code: '1001', name: 'Cash in Hand', type: 'ASSET' },
  { code: '1002', name: 'Bank Account (UPI / NEFT)', type: 'ASSET' },
  { code: '1100', name: 'Customer Receivables', type: 'ASSET' },
  { code: '2001', name: 'Farmer Payables', type: 'LIABILITY' },
  { code: '2002', name: 'Supplier Payables', type: 'LIABILITY' },
  { code: '4001', name: 'Milk & Product Sales Revenue', type: 'INCOME' },
  { code: '5001', name: 'Milk Procurement COGS', type: 'EXPENSE' },
  { code: '5002', name: 'Operating Expenses', type: 'EXPENSE' },
];

export async function ensureDairyChartOfAccounts(dairyId, tx = prisma) {
  for (const acc of DEFAULT_ACCOUNTS) {
    await tx.account.upsert({
      where: { dairyId_code: { dairyId, code: acc.code } },
      create: { dairyId, ...acc, isSystem: true },
      update: {},
    });
  }
}

/**
 * Posts a balanced double-entry journal entry.
 * Rejects unbalanced entries where total debit != total credit.
 */
export async function postJournalEntry({
  dairyId,
  description,
  referenceType,
  referenceId,
  createdById,
  lines,
  tx = prisma,
}) {
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit <= 0) {
    throw new Error('Double-entry journal entry must be balanced (Debit must equal Credit > 0).');
  }

  await ensureDairyChartOfAccounts(dairyId, tx);
  const accounts = await tx.account.findMany({ where: { dairyId } });
  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a]));

  const resolvedLines = lines.map((l) => {
    const acc = byCode[l.accountCode];
    if (!acc) throw new Error(`Account code ${l.accountCode} not found for dairy`);
    return {
      accountId: acc.id,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      memo: l.memo || null,
    };
  });

  const entryNumber = `JE-${randomUUID().slice(0, 8).toUpperCase()}`;

  const entry = await tx.journalEntry.create({
    data: {
      dairyId,
      entryNumber,
      description,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      createdById: createdById || null,
      lines: { create: resolvedLines },
    },
    include: { lines: { include: { account: true } } },
  });

  for (const line of resolvedLines) {
    const acc = accounts.find((a) => a.id === line.accountId);
    // Normal balance rules: ASSET & EXPENSE increase on Debit; LIABILITY, EQUITY, INCOME increase on Credit
    const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
    const delta = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
    await tx.account.update({
      where: { id: acc.id },
      data: { balance: { increment: delta } },
    });
  }

  return entry;
}

