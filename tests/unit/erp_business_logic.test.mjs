import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFatBasedRate,
  calculateFatSnfRate,
  resolveMilkRate,
} from '../../src/lib/calculations/milk.js';
import { formatCollectionReceiptMessage } from '../../src/lib/notifications/dispatcher.js';
import { postJournalEntry } from '../../src/lib/accounting/engine.js';
import { prisma } from '../../src/lib/db/prisma.js';

test('Fat-based milk rate calculation computes accurately', () => {
  const rate = calculateFatBasedRate(6.5, 7.5, 2.0); // 2 + (6.5 * 7.5) = 50.75
  assert.equal(rate, 50.75);
});

test('Combined Fat + SNF milk rate calculation computes accurately', () => {
  const rate = calculateFatSnfRate(6.5, 8.5, 5.0, 2.5, 0); // 6.5*5 + 8.5*2.5 = 32.5 + 21.25 = 53.75
  assert.equal(rate, 53.75);
});

test('resolveMilkRate handles FIXED, FAT_BASED, and FAT_SNF_BASED policies', () => {
  assert.equal(resolveMilkRate({ pricingMethod: 'FIXED', fixedRate: 60 }), 60);
  assert.equal(
    resolveMilkRate({ pricingMethod: 'FAT_BASED', fatRate: 8, baseRate: 0 }, { fatPercent: 6.0 }),
    48
  );
  assert.equal(
    resolveMilkRate(
      { pricingMethod: 'FAT_SNF_BASED', fatRate: 5, snfRate: 2, baseRate: 5 },
      { fatPercent: 6.0, snfPercent: 8.5 }
    ),
    52
  );
});

test('resolveMilkRate throws on missing Fat or SNF when required by policy', () => {
  assert.throws(
    () => resolveMilkRate({ pricingMethod: 'FAT_BASED', fatRate: 8 }, {}),
    /Fat % is required/
  );
  assert.throws(
    () => resolveMilkRate({ pricingMethod: 'FAT_SNF_BASED', fatRate: 5, snfRate: 2 }, { fatPercent: 6 }),
    /Both Fat % and SNF % are required/
  );
});

test('formatCollectionReceiptMessage generates clean tenant-branded receipt text', () => {
  const msg = formatCollectionReceiptMessage({
    farmerName: 'Ramesh',
    date: '10 Nov 2026',
    milkType: 'Buffalo Milk',
    quantityLitres: 12,
    fatPercent: 6.5,
    amount: 600,
    dairyName: 'Verma Dairy',
  });
  assert.match(msg, /Dear Ramesh Ji/);
  assert.match(msg, /Verma Dairy/);
  assert.match(msg, /12 Litres/);
  assert.match(msg, /₹600\.00/);
});

test('Double-entry journal engine rejects unbalanced entries', async () => {
  await assert.rejects(
    async () => {
      await postJournalEntry({
        dairyId: 'nonexistent',
        description: 'Unbalanced entry',
        lines: [
          { accountCode: '1001', debit: 500, credit: 0 },
          { accountCode: '1002', debit: 0, credit: 400 },
        ],
      });
    },
    /must be balanced/
  );
});

test('Double-entry journal engine posts balanced debit/credit and updates tenant accounts', async () => {
  const dairy = await prisma.dairy.findFirst({ where: { code: 'SHARMA' } });
  assert.ok(dairy, 'Initial Sharma Dairy tenant must exist');

  const entry = await prisma.$transaction((tx) =>
    postJournalEntry({
      dairyId: dairy.id,
      description: 'Unit test balanced cash-bank transfer',
      referenceType: 'UnitTest',
      tx,
      lines: [
        { accountCode: '1002', debit: 250, credit: 0 },
        { accountCode: '1001', debit: 0, credit: 250 },
      ],
    })
  );

  assert.equal(entry.lines.length, 2);
  const sumDr = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
  const sumCr = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
  assert.equal(sumDr, 250);
  assert.equal(sumCr, 250);

  // Revert account balances & delete test entry
  await prisma.journalLine.deleteMany({ where: { journalEntryId: entry.id } });
  await prisma.journalEntry.delete({ where: { id: entry.id } });
  await prisma.account.updateMany({
    where: { dairyId: dairy.id, code: '1002' },
    data: { balance: { decrement: 250 } },
  });
  await prisma.account.updateMany({
    where: { dairyId: dairy.id, code: '1001' },
    data: { balance: { increment: 250 } },
  });
});

