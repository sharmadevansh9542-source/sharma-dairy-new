import { prisma } from '../db/prisma.js';

function sanitizeJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { raw: String(value) };
  }
}

/**
 * Record an immutable Admin modification in AdminEditHistory and AuditLog.
 * Runs inside caller transaction `tx` when provided.
 */
export async function recordAdminEdit({
  tx = null,
  dairyId,
  recordType,
  recordId,
  action = 'EDIT',
  oldValues = null,
  newValues = null,
  reason,
  performedBy,
  ipAddress = null,
}) {
  if (!dairyId) throw new Error('dairyId is required for AdminEditHistory');
  if (!recordType) throw new Error('recordType is required for AdminEditHistory');
  if (!recordId) throw new Error('recordId is required for AdminEditHistory');
  if (!performedBy?.id) throw new Error('performedBy user is required for AdminEditHistory');

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw new Error('Mandatory edit reason is required');
  }

  const db = tx || prisma;
  const oldJson = sanitizeJson(oldValues);
  const newJson = sanitizeJson(newValues);

  const entry = await db.adminEditHistory.create({
    data: {
      dairyId,
      recordType,
      recordId,
      action,
      oldValues: oldJson,
      newValues: newJson,
      reason: trimmedReason,
      performedById: performedBy.id,
      performedByName: performedBy.fullName || performedBy.email || 'Dairy Admin',
    },
  });

  await db.auditLog.create({
    data: {
      actorId: performedBy.id,
      dairyId,
      action: `ADMIN_${action}`,
      entityType: recordType,
      entityId: recordId,
      before: oldJson,
      after: sanitizeJson({
        ...(newJson && typeof newJson === 'object' ? newJson : { value: newJson }),
        reason: trimmedReason,
      }),
      ipAddress,
    },
  });

  return entry;
}

/**
 * Fetch immutable AdminEditHistory entries for a specific record within a tenant.
 */
export async function getRecordEditHistory({ dairyId, recordType, recordId }) {
  if (!dairyId || !recordType || !recordId) return [];
  return prisma.adminEditHistory.findMany({
    where: { dairyId, recordType, recordId },
    orderBy: { performedAt: 'desc' },
    take: 50,
  });
}

/**
 * Fetch the latest edit metadata and edited record IDs for a list of records.
 */
export async function getEditedSummaryForRecords({ dairyId, recordType, recordIds }) {
  if (!dairyId || !recordType || !Array.isArray(recordIds) || recordIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.adminEditHistory.findMany({
    where: {
      dairyId,
      recordType,
      recordId: { in: recordIds },
    },
    orderBy: { performedAt: 'desc' },
  });
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.recordId)) {
      map.set(row.recordId, {
        isEditedByAdmin: row.action === 'EDIT' || row.action === 'UPDATE' || row.action === 'ADJUST',
        latest: row,
        count: 1,
        history: [row],
      });
    } else {
      const existing = map.get(row.recordId);
      existing.count += 1;
      existing.history.push(row);
      if (row.action === 'EDIT' || row.action === 'UPDATE' || row.action === 'ADJUST') {
        existing.isEditedByAdmin = true;
      }
    }
  }
  return map;
}

