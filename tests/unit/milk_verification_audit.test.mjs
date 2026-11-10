import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/lib/db/prisma.js';
import {
  createMilkEntry,
  listMilkEntries,
  getMilkEntryDetail,
  verifyOrEditMilkEntry,
} from '../../src/lib/services/milk-entries.js';
import { recordAdminEdit } from '../../src/lib/audit/edit-history.js';

test('MilkEntry service enforces single-owner, duplicate check, Admin edit audit trail, approval ledger posting & tenant isolation', async () => {
  const tag = randomUUID().slice(0, 6).toUpperCase();
  let dairyA, dairyB, adminA, adminB, farmerUser, customerUser, farmerProfile, customerProfile;

  try {
    // Ensure Cow & Buffalo milk types exist
    await prisma.milkTypeConfig.upsert({
      where: { type: 'COW' },
      create: { type: 'COW', label: 'Cow Milk' },
      update: {},
    });
    await prisma.milkTypeConfig.upsert({
      where: { type: 'BUFFALO' },
      create: { type: 'BUFFALO', label: 'Buffalo Milk' },
      update: {},
    });

    dairyA = await prisma.dairy.create({
      data: {
        name: `Test Dairy A ${tag}`,
        code: `TDA-${tag}`,
        slug: `test-dairy-a-${tag.toLowerCase()}`,
        ownerName: 'Owner A',
        status: 'APPROVED',
      },
    });
    dairyB = await prisma.dairy.create({
      data: {
        name: `Test Dairy B ${tag}`,
        code: `TDB-${tag}`,
        slug: `test-dairy-b-${tag.toLowerCase()}`,
        ownerName: 'Owner B',
        status: 'APPROVED',
      },
    });

    adminA = await prisma.user.create({
      data: {
        dairyId: dairyA.id,
        fullName: 'Dairy A Admin',
        email: `adminA-${tag}@test.local`,
        passwordHash: 'hash',
        role: 'ADMIN',
      },
    });
    adminB = await prisma.user.create({
      data: {
        dairyId: dairyB.id,
        fullName: 'Dairy B Admin',
        email: `adminB-${tag}@test.local`,
        passwordHash: 'hash',
        role: 'ADMIN',
      },
    });

    farmerUser = await prisma.user.create({
      data: {
        dairyId: dairyA.id,
        fullName: `Farmer ${tag}`,
        phone: `9111${Math.floor(100000 + Math.random() * 899999)}`,
        passwordHash: 'hash',
        role: 'FARMER',
      },
    });
    farmerProfile = await prisma.farmerProfile.create({
      data: {
        dairyId: dairyA.id,
        farmerCode: `TF-${tag}`,
        userId: farmerUser.id,
      },
    });

    customerUser = await prisma.user.create({
      data: {
        dairyId: dairyA.id,
        fullName: `Customer ${tag}`,
        phone: `9222${Math.floor(100000 + Math.random() * 899999)}`,
        passwordHash: 'hash',
        role: 'CUSTOMER',
      },
    });
    customerProfile = await prisma.customerProfile.create({
      data: {
        dairyId: dairyA.id,
        customerCode: `TC-${tag}`,
        userId: customerUser.id,
        defaultRate: 65,
      },
    });

    // 1. Farmer submits 15 L Cow milk
    const fEntry = await createMilkEntry({
      user: farmerUser,
      dairyId: dairyA.id,
      input: {
        entryDate: '2026-11-10',
        session: 'MORNING',
        milkType: 'COW',
        quantity: 15,
        fatPercent: 4.5,
        snfPercent: 8.5,
        remarks: 'Morning pouring',
      },
    });
    assert.equal(fEntry.status, 'PENDING_VERIFICATION');
    assert.equal(fEntry.submitterType, 'FARMER');
    assert.equal(fEntry.submittedQuantity, 15);
    assert.equal(fEntry.currentQuantity, 15);
    assert.equal(fEntry.customerId, null);

    // 2. Duplicate check prevents re-submitting identical date+session+milkType
    await assert.rejects(
      () =>
        createMilkEntry({
          user: farmerUser,
          dairyId: dairyA.id,
          input: {
            entryDate: '2026-11-10',
            session: 'MORNING',
            milkType: 'COW',
            quantity: 15,
          },
        }),
      /Duplicate milk entry detected/
    );

    // 3. Customer submits 5 L Buffalo milk
    const cEntry = await createMilkEntry({
      user: customerUser,
      dairyId: dairyA.id,
      input: {
        entryDate: '2026-11-10',
        session: 'EVENING',
        milkType: 'BUFFALO',
        quantity: 5,
      },
    });
    assert.equal(cEntry.status, 'PENDING_VERIFICATION');
    assert.equal(cEntry.submitterType, 'CUSTOMER');
    assert.equal(cEntry.farmerId, null);

    // 4. Customer cannot view Farmer entry; Farmer sees only Farmer entries; Dairy B Admin sees nothing
    await assert.rejects(
      () =>
        getMilkEntryDetail({
          context: { user: customerUser, dairyId: dairyA.id, role: 'CUSTOMER' },
          id: fEntry.id,
        }),
      /Forbidden/
    );
    await assert.rejects(
      () =>
        getMilkEntryDetail({
          context: { user: adminB, dairyId: dairyB.id, role: 'ADMIN' },
          id: fEntry.id,
        }),
      /Milk entry not found/
    );

    const farmerList = await listMilkEntries({
      context: { user: farmerUser, dairyId: dairyA.id, role: 'FARMER' },
    });
    assert.equal(farmerList.entries.length, 1);
    assert.equal(farmerList.entries[0].id, fEntry.id);

    // 5. Admin edit without mandatory reason throws
    await assert.rejects(
      () =>
        verifyOrEditMilkEntry({
          context: { user: adminA, dairyId: dairyA.id, role: 'ADMIN' },
          id: fEntry.id,
          payload: { action: 'EDIT', currentQuantity: 12, reason: '   ' },
        }),
      /Mandatory edit reason/
    );

    // 6. Admin edits Farmer 15 L -> 12 L with mandatory reason
    const edited = await verifyOrEditMilkEntry({
      context: { user: adminA, dairyId: dairyA.id, role: 'ADMIN' },
      id: fEntry.id,
      payload: {
        action: 'EDIT',
        currentQuantity: 12,
        reason: 'Incorrect quantity entered by farmer.',
      },
    });
    assert.equal(edited.submittedQuantity, 15);
    assert.equal(edited.currentQuantity, 12);
    assert.equal(edited.isEditedByAdmin, true);
    assert.equal(edited.latestEdit.reason, 'Incorrect quantity entered by farmer.');
    assert.equal(edited.latestEdit.oldValues.quantity, 15);
    assert.equal(edited.latestEdit.newValues.quantity, 12);

    // 7. Admin approves Farmer entry (posts MilkCollection, StockMovement, LedgerEntry)
    const approved = await verifyOrEditMilkEntry({
      context: { user: adminA, dairyId: dairyA.id, role: 'ADMIN' },
      id: fEntry.id,
      payload: { action: 'APPROVE' },
    });
    assert.equal(approved.status, 'APPROVED');
    assert.ok(approved.createdCollectionId);

    const col = await prisma.milkCollection.findUnique({
      where: { id: approved.createdCollectionId },
    });
    assert.equal(Number(col.quantityLitres), 12);

    // 8. Admin edits ALREADY APPROVED entry (12 L -> 10 L): posts auditable ADJUSTMENT delta (-2 L)
    const editedApproved = await verifyOrEditMilkEntry({
      context: { user: adminA, dairyId: dairyA.id, role: 'ADMIN' },
      id: fEntry.id,
      payload: {
        action: 'EDIT',
        currentQuantity: 10,
        reason: 'Post-approval scale recalibration',
      },
    });
    assert.equal(editedApproved.currentQuantity, 10);
    const adjStock = await prisma.stockMovement.findFirst({
      where: {
        dairyId: dairyA.id,
        referenceType: 'MilkEntry',
        referenceId: fEntry.id,
        movementType: 'ADJUSTMENT',
      },
    });
    assert.equal(Number(adjStock.quantityLitres), -2);

    // 9. Admin rejects Customer entry (5 L Buffalo) with mandatory reason
    const rejected = await verifyOrEditMilkEntry({
      context: { user: adminA, dairyId: dairyA.id, role: 'ADMIN' },
      id: cEntry.id,
      payload: { action: 'REJECT', reason: 'Customer cancelled evening order' },
    });
    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.rejectionReason, 'Customer cancelled evening order');

    // 10. Non-Admin edit attempt is rejected with 403
    await assert.rejects(
      () =>
        verifyOrEditMilkEntry({
          context: { user: farmerUser, dairyId: dairyA.id, role: 'FARMER' },
          id: fEntry.id,
          payload: { action: 'APPROVE' },
        }),
      /Only Dairy Admin/
    );

    // 11. recordAdminEdit validation check
    await assert.rejects(
      () =>
        recordAdminEdit({
          dairyId: dairyA.id,
          recordType: 'FarmerProfile',
          recordId: farmerProfile.id,
          reason: '',
          performedBy: adminA,
        }),
      /Mandatory edit reason/
    );
  } finally {
    if (dairyA) {
      await prisma.milkEntry.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.adminEditHistory.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.stockMovement.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.ledgerEntry.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.milkCollection.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.sale.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.auditLog.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.notification.deleteMany({ where: { dairyId: dairyA.id } });
      if (farmerProfile) await prisma.farmerProfile.deleteMany({ where: { id: farmerProfile.id } });
      if (customerProfile) await prisma.customerProfile.deleteMany({ where: { id: customerProfile.id } });
      await prisma.user.deleteMany({ where: { dairyId: dairyA.id } });
      await prisma.dairy.deleteMany({ where: { id: dairyA.id } });
    }
    if (dairyB) {
      await prisma.user.deleteMany({ where: { dairyId: dairyB.id } });
      await prisma.dairy.deleteMany({ where: { id: dairyB.id } });
    }
  }
});

