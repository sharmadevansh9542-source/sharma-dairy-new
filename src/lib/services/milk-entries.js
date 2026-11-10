import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { calculateFixedMilkAmount, resolveMilkRate } from '../calculations/milk.js';
import { getEditedSummaryForRecords, getRecordEditHistory, recordAdminEdit } from '../audit/edit-history.js';

function toNum(v) {
  return v == null ? null : Number(v);
}

function defaultFallbackRate(milkType, submitterType) {
  if (submitterType === 'CUSTOMER') {
    return milkType === 'BUFFALO' ? 70 : milkType === 'COW' ? 58 : 60;
  }
  return milkType === 'BUFFALO' ? 62 : milkType === 'COW' ? 48 : 50;
}

async function resolveRateForEntry(tx, { dairyId, milkTypeCode, fatPercent, snfPercent, submitterType, customerDefaultRate }) {
  const mt = await tx.milkTypeConfig.findUnique({ where: { type: milkTypeCode } });
  if (submitterType === 'CUSTOMER' && customerDefaultRate != null && Number(customerDefaultRate) > 0) {
    return {
      mt,
      rate: Number(customerDefaultRate),
      method: 'CUSTOMER_DEFAULT',
    };
  }
  if (mt) {
    const activeRate = await tx.milkRate.findFirst({
      where: {
        dairyId,
        milkTypeId: mt.id,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (activeRate) {
      try {
        const resolved = resolveMilkRate(activeRate, {
          fatPercent: fatPercent != null ? Number(fatPercent) : null,
          snfPercent: snfPercent != null ? Number(snfPercent) : null,
        });
        if (resolved != null) {
          return { mt, rate: Number(resolved), method: activeRate.pricingMethod };
        }
      } catch {
        // Fall through to base rate / default if fat/snf missing on submission
        if (activeRate.baseRate != null) {
          return { mt, rate: Number(activeRate.baseRate), method: 'BASE_RATE_FALLBACK' };
        }
      }
    }
  }
  return {
    mt,
    rate: defaultFallbackRate(milkTypeCode, submitterType),
    method: 'SYSTEM_DEFAULT_FALLBACK',
  };
}

export function serializeMilkEntry(row, editMeta = null) {
  if (!row) return null;
  const submitterName =
    row.submitterType === 'FARMER'
      ? row.farmer?.user?.fullName || row.farmer?.farmerCode || 'Farmer'
      : row.customer?.user?.fullName || row.customer?.customerCode || 'Customer';
  const submitterCode =
    row.submitterType === 'FARMER' ? row.farmer?.farmerCode : row.customer?.customerCode;

  return {
    id: row.id,
    entryCode: row.entryCode,
    dairyId: row.dairyId,
    farmerId: row.farmerId,
    customerId: row.customerId,
    submitterType: row.submitterType,
    submitterName,
    submitterCode,
    entryDate: row.entryDate,
    session: row.session,
    milkType: row.milkType,
    submittedQuantity: Number(row.submittedQuantity),
    currentQuantity: Number(row.currentQuantity),
    fatPercent: toNum(row.fatPercent),
    snfPercent: toNum(row.snfPercent),
    remarks: row.remarks,
    status: row.status,
    isEditedByAdmin: Boolean(row.isEditedByAdmin),
    submittedAt: row.submittedAt,
    verifiedById: row.verifiedById,
    verifiedByName: row.verifiedBy?.fullName || null,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    createdCollectionId: row.createdCollectionId,
    createdSaleId: row.createdSaleId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestEdit: editMeta?.latest || null,
    editHistory: editMeta?.history || [],
  };
}

export async function createMilkEntry({ user, dairyId, input, allowDuplicate = false }) {
  if (!dairyId) {
    throw Object.assign(new Error('Dairy tenant context is required'), { status: 400 });
  }
  if (!['FARMER', 'CUSTOMER'].includes(user.role)) {
    throw Object.assign(new Error('Only Farmers and Customers can submit milk entries here'), { status: 403 });
  }

  let farmer = null;
  let customer = null;
  if (user.role === 'FARMER') {
    farmer = await prisma.farmerProfile.findFirst({
      where: { userId: user.id, dairyId, isActive: true },
      include: { user: { select: { fullName: true } } },
    });
    if (!farmer) {
      throw Object.assign(new Error('Active farmer profile not found for this dairy'), { status: 404 });
    }
  } else {
    customer = await prisma.customerProfile.findFirst({
      where: { userId: user.id, dairyId, isActive: true },
      include: { user: { select: { fullName: true } } },
    });
    if (!customer) {
      throw Object.assign(new Error('Active customer profile not found for this dairy'), { status: 404 });
    }
  }

  // Strictly enforce exact-one owner
  if ((farmer && customer) || (!farmer && !customer)) {
    throw Object.assign(new Error('Invalid submitter ownership'), { status: 400 });
  }

  const entryDate = input.entryDate ? new Date(input.entryDate) : new Date();
  if (Number.isNaN(entryDate.getTime())) {
    throw Object.assign(new Error('Invalid entry date'), { status: 422 });
  }

  if (!allowDuplicate) {
    const dayStart = new Date(entryDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await prisma.milkEntry.findFirst({
      where: {
        dairyId,
        ...(farmer ? { farmerId: farmer.id } : { customerId: customer.id }),
        session: input.session,
        milkType: input.milkType,
        entryDate: { gte: dayStart, lt: dayEnd },
        status: { not: 'REJECTED' },
      },
    });
    if (existing) {
      throw Object.assign(
        new Error(
          `Duplicate milk entry detected: a ${input.session.toLowerCase()} ${input.milkType.toLowerCase()} entry (${existing.entryCode}) already exists for this date.`
        ),
        { status: 409 }
      );
    }
  }

  const submitterType = farmer ? 'FARMER' : 'CUSTOMER';
  const submitterName = farmer ? farmer.user.fullName : customer.user.fullName;

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.milkEntry.create({
      data: {
        entryCode: `ME-${randomUUID().slice(0, 8).toUpperCase()}`,
        dairyId,
        farmerId: farmer ? farmer.id : null,
        customerId: customer ? customer.id : null,
        submitterType,
        entryDate,
        session: input.session,
        milkType: input.milkType,
        submittedQuantity: input.quantity,
        currentQuantity: input.quantity,
        fatPercent: input.fatPercent ?? null,
        snfPercent: input.snfPercent ?? null,
        remarks: input.remarks ? input.remarks.trim() : null,
        status: 'PENDING_VERIFICATION',
        isEditedByAdmin: false,
      },
      include: {
        farmer: { include: { user: { select: { fullName: true } } } },
        customer: { include: { user: { select: { fullName: true } } } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });

    await tx.notification.create({
      data: {
        dairyId,
        role: 'ADMIN',
        type: 'MILK_ENTRY_SUBMITTED',
        title: `New Milk Entry (${entry.entryCode})`,
        message: `${submitterType === 'FARMER' ? 'Farmer' : 'Customer'} ${submitterName} submitted ${input.quantity} L ${input.milkType} (${input.session}) for verification.`,
        data: { milkEntryId: entry.id, submitterType },
      },
    });

    return entry;
  });

  return serializeMilkEntry(created);
}

export async function listMilkEntries({
  context,
  tab = 'ALL',
  submitterType = null,
  search = '',
}) {
  const baseWhere = { dairyId: context.dairyId };

  if (context.role === 'FARMER') {
    const farmer = await prisma.farmerProfile.findFirst({
      where: { userId: context.user.id, dairyId: context.dairyId },
      select: { id: true },
    });
    if (!farmer) return { entries: [], summary: { all: 0, pending: 0, approved: 0, rejected: 0, edited: 0 } };
    baseWhere.farmerId = farmer.id;
    baseWhere.customerId = null;
    baseWhere.submitterType = 'FARMER';
  } else if (context.role === 'CUSTOMER') {
    const customer = await prisma.customerProfile.findFirst({
      where: { userId: context.user.id, dairyId: context.dairyId },
      select: { id: true },
    });
    if (!customer) return { entries: [], summary: { all: 0, pending: 0, approved: 0, rejected: 0, edited: 0 } };
    baseWhere.customerId = customer.id;
    baseWhere.farmerId = null;
    baseWhere.submitterType = 'CUSTOMER';
  } else if (submitterType === 'FARMER' || submitterType === 'CUSTOMER') {
    baseWhere.submitterType = submitterType;
  }

  const filterWhere = { ...baseWhere };
  if (tab === 'PENDING_VERIFICATION') filterWhere.status = 'PENDING_VERIFICATION';
  else if (tab === 'APPROVED') filterWhere.status = 'APPROVED';
  else if (tab === 'REJECTED') filterWhere.status = 'REJECTED';
  else if (tab === 'EDITED') filterWhere.isEditedByAdmin = true;

  if (search && search.trim()) {
    const q = search.trim();
    filterWhere.OR = [
      { entryCode: { contains: q, mode: 'insensitive' } },
      { farmer: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
      { customer: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const [rows, allCount, pendingCount, approvedCount, rejectedCount, editedCount] = await Promise.all([
    prisma.milkEntry.findMany({
      where: filterWhere,
      orderBy: [{ submittedAt: 'desc' }],
      take: 250,
      include: {
        farmer: { include: { user: { select: { fullName: true } } } },
        customer: { include: { user: { select: { fullName: true } } } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.milkEntry.count({ where: baseWhere }),
    prisma.milkEntry.count({ where: { ...baseWhere, status: 'PENDING_VERIFICATION' } }),
    prisma.milkEntry.count({ where: { ...baseWhere, status: 'APPROVED' } }),
    prisma.milkEntry.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    prisma.milkEntry.count({ where: { ...baseWhere, isEditedByAdmin: true } }),
  ]);

  const editMap = await getEditedSummaryForRecords({
    dairyId: context.dairyId,
    recordType: 'MilkEntry',
    recordIds: rows.map((r) => r.id),
  });

  return {
    entries: rows.map((r) => serializeMilkEntry(r, editMap.get(r.id))),
    summary: {
      all: allCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      edited: editedCount,
    },
  };
}

export async function getMilkEntryDetail({ context, id }) {
  const entry = await prisma.milkEntry.findFirst({
    where: { id, dairyId: context.dairyId },
    include: {
      farmer: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      customer: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      verifiedBy: { select: { id: true, fullName: true } },
    },
  });

  if (!entry) {
    throw Object.assign(new Error('Milk entry not found'), { status: 404 });
  }

  if (context.role === 'FARMER' && entry.farmer?.userId !== context.user.id) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  if (context.role === 'CUSTOMER' && entry.customer?.userId !== context.user.id) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  const history = await getRecordEditHistory({
    dairyId: context.dairyId,
    recordType: 'MilkEntry',
    recordId: entry.id,
  });

  return serializeMilkEntry(entry, {
    latest: history[0] || null,
    history,
  });
}

export async function verifyOrEditMilkEntry({ context, id, payload, ipAddress = null }) {
  if (context.role !== 'ADMIN') {
    throw Object.assign(new Error('Only Dairy Admin can verify, reject, or edit submitted milk entries'), { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.milkEntry.findFirst({
      where: { id, dairyId: context.dairyId },
      include: {
        farmer: { include: { user: { select: { id: true, fullName: true } } } },
        customer: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });
    if (!entry) {
      throw Object.assign(new Error('Milk entry not found in your dairy'), { status: 404 });
    }

    const action = payload.action;

    if (action === 'APPROVE') {
      if (entry.status !== 'PENDING_VERIFICATION') {
        throw Object.assign(new Error(`Only pending entries can be approved (current status: ${entry.status})`), {
          status: 409,
        });
      }

      const qty = Number(entry.currentQuantity);
      const { mt, rate, method } = await resolveRateForEntry(tx, {
        dairyId: context.dairyId,
        milkTypeCode: entry.milkType,
        fatPercent: entry.fatPercent,
        snfPercent: entry.snfPercent,
        submitterType: entry.submitterType,
        customerDefaultRate: entry.customer?.defaultRate,
      });

      const amount = calculateFixedMilkAmount(qty, rate).amount;
      let createdCollectionId = null;
      let createdSaleId = null;

      if (entry.submitterType === 'FARMER' && entry.farmerId) {
        if (!mt) {
          throw Object.assign(new Error(`Milk type ${entry.milkType} is not configured`), { status: 422 });
        }
        const collection = await tx.milkCollection.create({
          data: {
            dairyId: context.dairyId,
            collectionCode: `MC-${randomUUID().slice(0, 8).toUpperCase()}`,
            farmerId: entry.farmerId,
            milkTypeId: mt.id,
            collectionAt: entry.entryDate,
            shift: entry.session,
            quantityLitres: qty,
            fatPercent: entry.fatPercent,
            snfPercent: entry.snfPercent,
            ratePerLitre: rate,
            amount,
            rateSnapshot: {
              method,
              ratePerLitre: rate,
              sourceMilkEntryCode: entry.entryCode,
            },
            notes: `Verified from milk entry ${entry.entryCode}${entry.remarks ? ` - ${entry.remarks}` : ''}`,
            createdById: context.user.id,
          },
        });
        createdCollectionId = collection.id;

        await tx.stockMovement.create({
          data: {
            dairyId: context.dairyId,
            movementType: 'COLLECTION',
            milkTypeId: mt.id,
            quantityLitres: qty,
            referenceType: 'MilkCollection',
            referenceId: collection.id,
            notes: `Approved ${entry.entryCode} -> ${collection.collectionCode}`,
            createdById: context.user.id,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            dairyId: context.dairyId,
            partyType: 'FARMER',
            farmerId: entry.farmerId,
            entryType: 'MILK_COLLECTION',
            amount,
            referenceType: 'MilkCollection',
            referenceId: collection.id,
            description: `Verified ${qty} L ${entry.session.toLowerCase()} ${entry.milkType} (${entry.entryCode})`,
            createdById: context.user.id,
          },
        });
      } else if (entry.submitterType === 'CUSTOMER' && entry.customerId) {
        const sale = await tx.sale.create({
          data: {
            dairyId: context.dairyId,
            saleCode: `S-${randomUUID().slice(0, 8).toUpperCase()}`,
            customerId: entry.customerId,
            milkTypeId: mt ? mt.id : null,
            saleAt: entry.entryDate,
            quantityLitres: qty,
            ratePerLitre: rate,
            discount: 0,
            taxAmount: 0,
            amount,
            paymentMethod: 'OTHER',
            paymentStatus: 'PENDING',
            status: 'DELIVERED',
            notes: `Verified customer entry ${entry.entryCode} (${entry.session})${entry.remarks ? ` - ${entry.remarks}` : ''}`,
            createdById: context.user.id,
          },
        });
        createdSaleId = sale.id;

        if (mt) {
          await tx.stockMovement.create({
            data: {
              dairyId: context.dairyId,
              movementType: 'SALE',
              milkTypeId: mt.id,
              quantityLitres: -qty,
              referenceType: 'Sale',
              referenceId: sale.id,
              saleId: sale.id,
              notes: `Approved ${entry.entryCode} -> ${sale.saleCode}`,
              createdById: context.user.id,
            },
          });
        }

        await tx.ledgerEntry.create({
          data: {
            dairyId: context.dairyId,
            partyType: 'CUSTOMER',
            customerId: entry.customerId,
            entryType: 'SALE_CHARGE',
            amount,
            referenceType: 'Sale',
            referenceId: sale.id,
            description: `Verified ${qty} L ${entry.session.toLowerCase()} ${entry.milkType} (${entry.entryCode})`,
            createdById: context.user.id,
          },
        });
      }

      const updated = await tx.milkEntry.update({
        where: { id: entry.id },
        data: {
          status: 'APPROVED',
          verifiedById: context.user.id,
          verifiedAt: new Date(),
          rejectionReason: null,
          createdCollectionId,
          createdSaleId,
        },
        include: {
          farmer: { include: { user: { select: { id: true, fullName: true } } } },
          customer: { include: { user: { select: { id: true, fullName: true } } } },
          verifiedBy: { select: { id: true, fullName: true } },
        },
      });

      await recordAdminEdit({
        tx,
        dairyId: context.dairyId,
        recordType: 'MilkEntry',
        recordId: entry.id,
        action: 'APPROVE',
        oldValues: { status: entry.status, currentQuantity: Number(entry.currentQuantity) },
        newValues: { status: 'APPROVED', currentQuantity: qty, ratePerLitre: rate, amount },
        reason: payload.reason?.trim() || 'Verified and approved by Dairy Admin',
        performedBy: context.user,
        ipAddress,
      });

      const recipientUserId = entry.farmer?.userId || entry.customer?.userId;
      if (recipientUserId) {
        await tx.notification.create({
          data: {
            dairyId: context.dairyId,
            userId: recipientUserId,
            role: entry.submitterType,
            type: 'MILK_ENTRY_APPROVED',
            title: `Milk Entry Approved (${entry.entryCode})`,
            message: `Your milk entry (${qty} L ${entry.milkType}, ${entry.session}) was approved by Dairy Admin.`,
            data: { milkEntryId: entry.id, currentQuantity: qty, amount },
          },
        });
      }

      return updated;
    }

    if (action === 'REJECT') {
      const reason = String(payload.reason || payload.rejectionReason || '').trim();
      if (!reason) {
        throw Object.assign(new Error('Rejection reason is mandatory'), { status: 422 });
      }
      if (entry.status !== 'PENDING_VERIFICATION') {
        throw Object.assign(new Error(`Only pending entries can be rejected (current status: ${entry.status})`), {
          status: 409,
        });
      }

      const updated = await tx.milkEntry.update({
        where: { id: entry.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          verifiedById: context.user.id,
          verifiedAt: new Date(),
        },
        include: {
          farmer: { include: { user: { select: { id: true, fullName: true } } } },
          customer: { include: { user: { select: { id: true, fullName: true } } } },
          verifiedBy: { select: { id: true, fullName: true } },
        },
      });

      await recordAdminEdit({
        tx,
        dairyId: context.dairyId,
        recordType: 'MilkEntry',
        recordId: entry.id,
        action: 'REJECT',
        oldValues: { status: entry.status },
        newValues: { status: 'REJECTED', rejectionReason: reason },
        reason,
        performedBy: context.user,
        ipAddress,
      });

      const recipientUserId = entry.farmer?.userId || entry.customer?.userId;
      if (recipientUserId) {
        await tx.notification.create({
          data: {
            dairyId: context.dairyId,
            userId: recipientUserId,
            role: entry.submitterType,
            type: 'MILK_ENTRY_REJECTED',
            title: `Milk Entry Rejected (${entry.entryCode})`,
            message: `Entry rejected by Dairy Admin. Reason: ${reason}`,
            data: { milkEntryId: entry.id, rejectionReason: reason },
          },
        });
      }

      return updated;
    }

    if (action === 'EDIT') {
      const reason = String(payload.reason || '').trim();
      if (!reason) {
        throw Object.assign(new Error('Mandatory edit reason is required when Admin edits a milk entry'), {
          status: 422,
        });
      }

      const nextQty = payload.currentQuantity != null ? Number(payload.currentQuantity) : Number(entry.currentQuantity);
      if (!Number.isFinite(nextQty) || nextQty <= 0 || nextQty > 100000) {
        throw Object.assign(new Error('Quantity must be a positive number'), { status: 422 });
      }
      const nextMilkType = payload.milkType || entry.milkType;
      const nextSession = payload.session || entry.session;
      const nextFat = payload.fatPercent === '' || payload.fatPercent === undefined ? toNum(entry.fatPercent) : payload.fatPercent == null ? null : Number(payload.fatPercent);
      const nextSnf = payload.snfPercent === '' || payload.snfPercent === undefined ? toNum(entry.snfPercent) : payload.snfPercent == null ? null : Number(payload.snfPercent);
      const nextRemarks = payload.remarks !== undefined ? (payload.remarks ? String(payload.remarks).trim() : null) : entry.remarks;

      const oldValues = {
        quantity: Number(entry.currentQuantity),
        milkType: entry.milkType,
        session: entry.session,
        fatPercent: toNum(entry.fatPercent),
        snfPercent: toNum(entry.snfPercent),
        remarks: entry.remarks,
      };
      const newValues = {
        quantity: nextQty,
        milkType: nextMilkType,
        session: nextSession,
        fatPercent: nextFat,
        snfPercent: nextSnf,
        remarks: nextRemarks,
      };

      const oldQty = Number(entry.currentQuantity);
      const qtyDelta = Number((nextQty - oldQty).toFixed(3));

      // If already APPROVED, post auditable deltas to stock, ledger, and linked collection/sale
      if (entry.status === 'APPROVED') {
        const mtNext = await tx.milkTypeConfig.findUnique({ where: { type: nextMilkType } });
        if (entry.createdCollectionId) {
          const existingCol = await tx.milkCollection.findUnique({ where: { id: entry.createdCollectionId } });
          if (existingCol) {
            const rate = Number(existingCol.ratePerLitre);
            const newAmount = calculateFixedMilkAmount(nextQty, rate).amount;
            const amountDelta = Number((newAmount - Number(existingCol.amount)).toFixed(2));
            if (qtyDelta !== 0 && mtNext) {
              await tx.stockMovement.create({
                data: {
                  dairyId: context.dairyId,
                  movementType: 'ADJUSTMENT',
                  milkTypeId: mtNext.id,
                  quantityLitres: qtyDelta,
                  referenceType: 'MilkEntry',
                  referenceId: entry.id,
                  notes: `Admin edit adjustment (${entry.entryCode}): ${reason}`,
                  createdById: context.user.id,
                },
              });
            }
            if (amountDelta !== 0) {
              await tx.ledgerEntry.create({
                data: {
                  dairyId: context.dairyId,
                  partyType: 'FARMER',
                  farmerId: entry.farmerId,
                  entryType: 'ADJUSTMENT',
                  amount: amountDelta,
                  referenceType: 'MilkEntry',
                  referenceId: entry.id,
                  description: `Admin edit adjustment (${entry.entryCode}): ${reason}`,
                  createdById: context.user.id,
                },
              });
            }
            await tx.milkCollection.update({
              where: { id: existingCol.id },
              data: {
                quantityLitres: nextQty,
                amount: newAmount,
                fatPercent: nextFat,
                snfPercent: nextSnf,
                shift: nextSession,
                ...(mtNext ? { milkTypeId: mtNext.id } : {}),
              },
            });
          }
        } else if (entry.createdSaleId) {
          const existingSale = await tx.sale.findUnique({ where: { id: entry.createdSaleId } });
          if (existingSale) {
            const rate = Number(existingSale.ratePerLitre);
            const newAmount = calculateFixedMilkAmount(nextQty, rate).amount;
            const amountDelta = Number((newAmount - Number(existingSale.amount)).toFixed(2));
            if (qtyDelta !== 0 && mtNext) {
              await tx.stockMovement.create({
                data: {
                  dairyId: context.dairyId,
                  movementType: 'ADJUSTMENT',
                  milkTypeId: mtNext.id,
                  quantityLitres: -qtyDelta,
                  referenceType: 'MilkEntry',
                  referenceId: entry.id,
                  notes: `Admin edit sale adjustment (${entry.entryCode}): ${reason}`,
                  createdById: context.user.id,
                },
              });
            }
            if (amountDelta !== 0 && entry.customerId) {
              await tx.ledgerEntry.create({
                data: {
                  dairyId: context.dairyId,
                  partyType: 'CUSTOMER',
                  customerId: entry.customerId,
                  entryType: 'ADJUSTMENT',
                  amount: amountDelta,
                  referenceType: 'MilkEntry',
                  referenceId: entry.id,
                  description: `Admin edit sale adjustment (${entry.entryCode}): ${reason}`,
                  createdById: context.user.id,
                },
              });
            }
            await tx.sale.update({
              where: { id: existingSale.id },
              data: {
                quantityLitres: nextQty,
                amount: newAmount,
                ...(mtNext ? { milkTypeId: mtNext.id } : {}),
              },
            });
          }
        }
      }

      const updated = await tx.milkEntry.update({
        where: { id: entry.id },
        data: {
          currentQuantity: nextQty,
          milkType: nextMilkType,
          session: nextSession,
          fatPercent: nextFat,
          snfPercent: nextSnf,
          remarks: nextRemarks,
          isEditedByAdmin: true,
        },
        include: {
          farmer: { include: { user: { select: { id: true, fullName: true } } } },
          customer: { include: { user: { select: { id: true, fullName: true } } } },
          verifiedBy: { select: { id: true, fullName: true } },
        },
      });

      await recordAdminEdit({
        tx,
        dairyId: context.dairyId,
        recordType: 'MilkEntry',
        recordId: entry.id,
        action: 'EDIT',
        oldValues,
        newValues,
        reason,
        performedBy: context.user,
        ipAddress,
      });

      const recipientUserId = entry.farmer?.userId || entry.customer?.userId;
      if (recipientUserId) {
        await tx.notification.create({
          data: {
            dairyId: context.dairyId,
            userId: recipientUserId,
            role: entry.submitterType,
            type: 'MILK_ENTRY_EDITED',
            title: `Milk Entry Edited by Admin (${entry.entryCode})`,
            message: `Admin updated quantity from ${oldQty} L to ${nextQty} L. Reason: ${reason}`,
            data: { milkEntryId: entry.id, oldValues, newValues, reason },
          },
        });
      }

      return updated;
    }

    throw Object.assign(new Error('Unsupported action'), { status: 400 });
  });

  const history = await getRecordEditHistory({
    dairyId: context.dairyId,
    recordType: 'MilkEntry',
    recordId: result.id,
  });

  return serializeMilkEntry(result, {
    latest: history[0] || null,
    history,
  });
}

