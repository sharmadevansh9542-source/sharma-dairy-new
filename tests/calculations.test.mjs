import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFixedMilkAmount, calculateClosingStock, calculateOutstanding } from '../src/lib/calculations/milk.js';

test('fixed milk rate computes amount in paise-safe rounding', () => {
    assert.deepEqual(calculateFixedMilkAmount(10, 70), { amountPaise: 70000, amount: '700.00' });
});
test('fixed milk rate rejects zero quantity', () => {
    assert.throws(() => calculateFixedMilkAmount(0, 70), /positive/);
});
test('stock closing follows the specified ledger formula', () => {
    assert.equal(calculateClosingStock({ opening: 20, received: 100, sold: 75, losses: 2, otherOutflows: 3 }), 40);
});
test('customer balance supports partial payments and credits', () => {
    assert.equal(calculateOutstanding({ openingBalance: 100, charges: 500, payments: 250, credits: 25 }), 325);
});
test('fixed milk amount rounds to paise at calculation boundary', () => {
    assert.deepEqual(calculateFixedMilkAmount(1.333, 67.89), { amountPaise: 9050, amount: '90.50' });
});
test('stock calculation can expose a negative discrepancy instead of hiding it', () => {
    assert.equal(calculateClosingStock({ opening: 2, received: 1, sold: 4 }), -1);
});
test('outstanding balance includes opening amount, charges and payments', () => {
    assert.equal(calculateOutstanding({ openingBalance: 150, charges: 700, payments: 300, credits: 50 }), 500);
});