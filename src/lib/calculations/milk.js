/**
 * Decimal-safe starter calculation helpers.
 * Monetary values are represented as integer paise at calculation boundaries.
 * Dairy policy must explicitly configure any fat/SNF formula before use.
 */
export function calculateFixedMilkAmount(quantityLitres, ratePerLitre) {
  if (!Number.isFinite(quantityLitres) || quantityLitres <= 0) throw new Error('Quantity must be a positive number.');
  if (!Number.isFinite(ratePerLitre) || ratePerLitre < 0) throw new Error('Rate must be a non-negative number.');
  const amountPaise = Math.round(quantityLitres * ratePerLitre * 100);
  return { amountPaise, amount: (amountPaise / 100).toFixed(2) };
}

export function calculateClosingStock({ opening, received, sold, losses = 0, otherOutflows = 0 }) {
  const values = [opening, received, sold, losses, otherOutflows];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Stock values must be finite and non-negative.');
  return Number((opening + received - sold - losses - otherOutflows).toFixed(3));
}

export function calculateOutstanding({ openingBalance = 0, charges = 0, payments = 0, credits = 0 }) {
  const values = [openingBalance, charges, payments, credits];
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Ledger values must be finite numbers.');
  return Number((openingBalance + charges - payments - credits).toFixed(2));
}
