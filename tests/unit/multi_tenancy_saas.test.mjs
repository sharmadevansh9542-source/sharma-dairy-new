import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/lib/db/prisma.js';
import { dairyRegistrationSchema } from '../../src/lib/validation/auth.js';

test('dairyRegistrationSchema validates business information and detects mismatches', () => {
  const validData = {
    dairyName: 'Test Verma Dairy',
    ownerName: 'Verma Ji',
    businessEmail: 'verma@dairy.com',
    phone: '9876543210',
    businessType: 'PRIVATE_DAIRY',
    address: 'Near Highway, Meerut',
    city: 'Meerut',
    state: 'Uttar Pradesh',
    pincode: '250001',
    adminFullName: 'Verma Administrator',
    adminEmail: 'admin@vermadairy.com',
    adminPhone: '9876543210',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    terms: true,
  };

  const parsed = dairyRegistrationSchema.safeParse(validData);
  assert.equal(parsed.success, true);

  // Mismatched passwords
  const mismatch = dairyRegistrationSchema.safeParse({
    ...validData,
    confirmPassword: 'DifferentPassword',
  });
  assert.equal(mismatch.success, false);

  // Invalid 5-digit PIN
  const badPin = dairyRegistrationSchema.safeParse({
    ...validData,
    pincode: '12345',
  });
  assert.equal(badPin.success, false);

  // Missing terms
  const noTerms = dairyRegistrationSchema.safeParse({
    ...validData,
    terms: false,
  });
  assert.equal(noTerms.success, false);
});

test('Multi-Tenant Data Isolation: Tenant A cannot see or cross-reference Tenant B data', async () => {
  const codeA = `T-A-${randomUUID().slice(0, 6).toUpperCase()}`;
  const codeB = `T-B-${randomUUID().slice(0, 6).toUpperCase()}`;

  // 1. Create Tenant A and Tenant B
  const dairyA = await prisma.dairy.create({
    data: {
      name: `Dairy A ${codeA}`,
      code: codeA,
      slug: `dairy-a-${codeA.toLowerCase()}`,
      ownerName: 'Owner A',
      status: 'APPROVED',
    },
  });

  const dairyB = await prisma.dairy.create({
    data: {
      name: `Dairy B ${codeB}`,
      code: codeB,
      slug: `dairy-b-${codeB.toLowerCase()}`,
      ownerName: 'Owner B',
      status: 'APPROVED',
    },
  });

  // 2. Create Farmer in Dairy A
  const farmerUserA = await prisma.user.create({
    data: {
      dairyId: dairyA.id,
      fullName: 'Farmer Alpha',
      phone: `91${Date.now().toString().slice(-8)}`,
      passwordHash: 'hash',
      role: 'FARMER',
    },
  });
  const farmerProfileA = await prisma.farmerProfile.create({
    data: {
      dairyId: dairyA.id,
      farmerCode: `FA-${randomUUID().slice(0, 6)}`,
      userId: farmerUserA.id,
    },
  });

  // 3. Create Farmer in Dairy B
  const farmerUserB = await prisma.user.create({
    data: {
      dairyId: dairyB.id,
      fullName: 'Farmer Beta',
      phone: `92${Date.now().toString().slice(-8)}`,
      passwordHash: 'hash',
      role: 'FARMER',
    },
  });
  const farmerProfileB = await prisma.farmerProfile.create({
    data: {
      dairyId: dairyB.id,
      farmerCode: `FB-${randomUUID().slice(0, 6)}`,
      userId: farmerUserB.id,
    },
  });

  // 4. Verify Tenant Queries are strictly isolated
  const dairyAFarmers = await prisma.farmerProfile.findMany({
    where: { dairyId: dairyA.id },
  });
  assert.equal(dairyAFarmers.length, 1);
  assert.equal(dairyAFarmers[0].id, farmerProfileA.id);

  const dairyBFarmers = await prisma.farmerProfile.findMany({
    where: { dairyId: dairyB.id },
  });
  assert.equal(dairyBFarmers.length, 1);
  assert.equal(dairyBFarmers[0].id, farmerProfileB.id);

  // 5. Cross-tenant verification: A lookup for Farmer B with Tenant A's dairyId must return null
  const crossLookup = await prisma.farmerProfile.findFirst({
    where: { id: farmerProfileB.id, dairyId: dairyA.id },
  });
  assert.equal(crossLookup, null);

  // Cleanup test fixtures
  await prisma.farmerProfile.deleteMany({ where: { id: { in: [farmerProfileA.id, farmerProfileB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [farmerUserA.id, farmerUserB.id] } } });
  await prisma.dairy.deleteMany({ where: { id: { in: [dairyA.id, dairyB.id] } } });
});

test('Super Admin Registration Workflow: Request creation, approval, and tenant provisioning', async () => {
  const reqEmail = `owner_${randomUUID().slice(0, 6)}@testdairy.com`;
  const adminEmail = `admin_${randomUUID().slice(0, 6)}@testdairy.com`;
  const rawPassword = 'SecureTenantPassword123!';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  // 1. Submit Registration Request
  const regReq = await prisma.dairyRegistrationRequest.create({
    data: {
      dairyName: 'Test Enterprise Dairy',
      ownerName: 'Enterprise Owner',
      businessEmail: reqEmail,
      phone: '9812345678',
      adminFullName: 'Enterprise Admin',
      adminEmail: adminEmail,
      passwordHash,
      status: 'PENDING_APPROVAL',
    },
  });

  assert.equal(regReq.status, 'PENDING_APPROVAL');

  // 2. Simulate Super Admin Approval
  const cleanName = regReq.dairyName;
  const slug = `test-ent-${randomUUID().slice(0, 6).toLowerCase()}`;
  const code = `D-${randomUUID().slice(0, 6).toUpperCase()}`;

  const approvedDairy = await prisma.$transaction(async (tx) => {
    const dairy = await tx.dairy.create({
      data: {
        name: cleanName,
        code,
        slug,
        ownerName: regReq.ownerName,
        email: regReq.businessEmail,
        phone: regReq.phone,
        status: 'APPROVED',
      },
    });

    const adminUser = await tx.user.create({
      data: {
        dairyId: dairy.id,
        fullName: regReq.adminFullName,
        email: regReq.adminEmail,
        passwordHash: regReq.passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    await tx.dairyMembership.create({
      data: {
        dairyId: dairy.id,
        userId: adminUser.id,
        role: 'ADMIN',
        isDefault: true,
        isActive: true,
      },
    });

    await tx.dairyRegistrationRequest.update({
      where: { id: regReq.id },
      data: { status: 'APPROVED', createdDairyId: dairy.id },
    });

    return { dairy, adminUser };
  });

  assert.equal(approvedDairy.dairy.status, 'APPROVED');
  assert.equal(approvedDairy.adminUser.role, 'ADMIN');

  // 3. Verify Admin Password works
  const passwordValid = await bcrypt.compare(rawPassword, approvedDairy.adminUser.passwordHash);
  assert.equal(passwordValid, true);

  // Cleanup
  await prisma.dairyMembership.deleteMany({ where: { dairyId: approvedDairy.dairy.id } });
  await prisma.user.delete({ where: { id: approvedDairy.adminUser.id } });
  await prisma.dairy.delete({ where: { id: approvedDairy.dairy.id } });
  await prisma.dairyRegistrationRequest.delete({ where: { id: regReq.id } });
});

