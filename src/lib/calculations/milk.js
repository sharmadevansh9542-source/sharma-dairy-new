/**
 * Decimal-safe dairy calculation helpers.
 * Monetary values are represented as integer paise at calculation boundaries.
 */
export function calculateFixedMilkAmount(quantityLitres, ratePerLitre) {
  if (!Number.isFinite(quantityLitres) || quantityLitres <= 0) {
    throw new Error('Quantity must be a positive number.');
  }
  if (!Number.isFinite(ratePerLitre) || ratePerLitre < 0) {
    throw new Error('Rate must be a non-negative number.');
  }
  const amountPaise = Math.round(quantityLitres * ratePerLitre * 100);
  return { amountPaise, amount: (amountPaise / 100).toFixed(2) };
}

export function calculateFatBasedRate(fatPercent, fatRate, baseRate = 0) {
  if (!Number.isFinite(fatPercent) || fatPercent < 0) {
    throw new Error('Fat percentage must be a non-negative number.');
  }
  if (!Number.isFinite(fatRate) || fatRate < 0) {
    throw new Error('Fat rate coefficient must be non-negative.');
  }
  const rate = Number(baseRate || 0) + fatPercent * fatRate;
  return Number(rate.toFixed(2));
}

export function calculateFatSnfRate(fatPercent, snfPercent, fatRate, snfRate, baseRate = 0) {
  if (!Number.isFinite(fatPercent) || fatPercent < 0) {
    throw new Error('Fat percentage must be a non-negative number.');
  }
  if (!Number.isFinite(snfPercent) || snfPercent < 0) {
    throw new Error('SNF percentage must be a non-negative number.');
  }
  const rate = Number(baseRate || 0) + fatPercent * Number(fatRate || 0) + snfPercent * Number(snfRate || 0);
  return Number(rate.toFixed(2));
}

export function resolveMilkRate(rateConfig, { fatPercent, snfPercent } = {}) {
  if (!rateConfig) return null;
  const method = rateConfig.pricingMethod || 'FIXED';

  if (method === 'FIXED') {
    return Number(rateConfig.fixedRate || 0);
  }
  if (method === 'FAT_BASED') {
    if (fatPercent == null) throw new Error('Fat % is required for FAT_BASED pricing.');
    return calculateFatBasedRate(Number(fatPercent), Number(rateConfig.fatRate || 0), Number(rateConfig.baseRate || 0));
  }
  if (method === 'FAT_SNF_BASED') {
    if (fatPercent == null || snfPercent == null) {
      throw new Error('Both Fat % and SNF % are required for FAT_SNF_BASED pricing.');
    }
    return calculateFatSnfRate(
      Number(fatPercent),
      Number(snfPercent),
      Number(rateConfig.fatRate || 0),
      Number(rateConfig.snfRate || 0),
      Number(rateConfig.baseRate || 0)
    );
  }
  return Number(rateConfig.fixedRate || 0);
}

export function calculateClosingStock({ opening, received, sold, losses = 0, otherOutflows = 0 }) {
  const values = [opening, received, sold, losses, otherOutflows];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Stock values must be finite and non-negative.');
  }
  return Number((opening + received - sold - losses - otherOutflows).toFixed(3));
}

export function calculateOutstanding({ openingBalance = 0, charges = 0, payments = 0, credits = 0 }) {
  const values = [openingBalance, charges, payments, credits];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Ledger values must be finite numbers.');
  }
  return Number((openingBalance + charges - payments - credits).toFixed(2));
}
