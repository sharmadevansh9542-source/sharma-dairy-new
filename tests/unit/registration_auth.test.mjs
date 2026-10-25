import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  farmerRegisterSchema,
  customerRegisterSchema,
  staffRegisterSchema,
  staffInviteSchema,
  changePasswordSchema,
  loginSchema,
} from '../../src/lib/validation/auth.js';
import { checkRateLimit } from '../../src/lib/auth/rate-limit.js';
import { prisma } from '../../src/lib/db/prisma.js';

test('loginSchema validates identifier and password', () => {
  const valid = loginSchema.safeParse({ identifier: '9876543210', password: 'password123' });
  assert.equal(valid.success, true);

  const missing = loginSchema.safeParse({ identifier: '', password: '' });
  assert.equal(missing.success, false);
});

test('farmerRegisterSchema validates correct input and detects mismatch', () => {
  const validData = {
    fullName: 'Test Farmer',
    phone: '9876543210',
    email: 'farmer@test.com',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    village: 'Rampur',
    address: 'Near Well',
    terms: true,
  };
  const valid = farmerRegisterSchema.safeParse(validData);
  assert.equal(valid.success, true);

  // Mismatched passwords
  const mismatch = farmerRegisterSchema.safeParse({
    ...validData,
    confirmPassword: 'differentPassword',
  });
  assert.equal(mismatch.success, false);

  // Missing terms consent
  const noTerms = farmerRegisterSchema.safeParse({
    ...validData,
    terms: false,
  });
  assert.equal(noTerms.success, false);

  // Invalid phone (not 10 digits)
  const badPhone = farmerRegisterSchema.safeParse({
    ...validData,
    phone: '12345',
  });
  assert.equal(badPhone.success, false);
});

test('customerRegisterSchema validates customer details', () => {
  const validData = {
    fullName: 'Test Customer',
    phone: '9123456789',
    email: 'customer@test.com',
    password: 'customerPassword123',
    confirmPassword: 'customerPassword123',
    address: 'House 123, Civil Lines',
    category: 'HOUSEHOLD',
  };
  const valid = customerRegisterSchema.safeParse(validData);
  assert.equal(valid.success, true);

  // Missing address
  const missingAddress = customerRegisterSchema.safeParse({
    ...validData,
    address: '  ',
  });
  assert.equal(missingAddress.success, false);
});

test('staffInviteSchema and staffRegisterSchema validation', () => {
  const invite = staffInviteSchema.safeParse({ email: 'staff@dairy.com', expiresInHours: 48 });
  assert.equal(invite.success, true);

  const badInvite = staffInviteSchema.safeParse({ email: 'not-an-email' });
  assert.equal(badInvite.success, false);

  const validStaff = staffRegisterSchema.safeParse({
    token: 'random-secure-invitation-token-1234567890',
    fullName: 'Staff Person',
    phone: '9988776655',
    email: 'staff@dairy.com',
    password: 'staffPassword123',
    confirmPassword: 'staffPassword123',
  });
  assert.equal(validStaff.success, true);

  // Missing token
  const noToken = staffRegisterSchema.safeParse({
    token: '',
    fullName: 'Staff Person',
    phone: '9988776655',
    email: 'staff@dairy.com',
    password: 'staffPassword123',
    confirmPassword: 'staffPassword123',
  });
  assert.equal(noToken.success, false);
});

test('rate limiter blocks attempts exceeding threshold', () => {
  const testId = `test_limit_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testId, 5, 60);
    assert.equal(res.allowed, true);
  }
  const blocked = checkRateLimit(testId, 5, 60);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});

test('database workflow: Farmer registration, uniqueness and password hashing', async () => {
  const testPhone = `99${Date.now().toString().slice(-8)}`;
  const testEmail = `farmer_${randomUUID().slice(0, 6)}@test.com`;
  const rawPassword = 'StrongFarmerPassword123!';

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const farmerCode = `F-${randomUUID().slice(0, 8).toUpperCase()}`;

  // 1. Create Farmer
  const user = await prisma.user.create({
    data: {
      fullName: 'Integration Test Farmer',
      phone: testPhone,
      email: testEmail,
      passwordHash,
      role: 'FARMER',
      isActive: true,
      farmerProfile: {
        create: {
          farmerCode,
          village: 'Test Village',
          address: 'Main Chowk',
        },
      },
    },
    include: { farmerProfile: true },
  });

  assert.equal(user.role, 'FARMER');
  assert.equal(user.farmerProfile.farmerCode, farmerCode);

  // 2. Password verification
  const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
  assert.equal(isMatch, true);

  // 3. Prevent duplicate mobile
  await assert.rejects(
    async () => {
      await prisma.user.create({
        data: {
          fullName: 'Duplicate Farmer',
          phone: testPhone,
          email: `other_${Date.now()}@test.com`,
          passwordHash,
          role: 'FARMER',
        },
      });
    },
    /Unique constraint failed/
  );

  // Cleanup
  await prisma.farmerProfile.delete({ where: { id: user.farmerProfile.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test('database workflow: Staff Invitation, single-use verification, and registration', async () => {
  // Find or create an admin to act as inviter
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        fullName: 'Admin Inviter',
        email: `admin_${Date.now()}@dairy.com`,
        passwordHash: 'hash',
        role: 'ADMIN',
      },
    });
  }

  const staffEmail = `staff_${randomUUID().slice(0, 6)}@testdairy.com`;
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // 1. Admin creates invitation
  const invite = await prisma.staffInvitation.create({
    data: {
      email: staffEmail,
      tokenHash,
      expiresAt,
      invitedById: admin.id,
    },
  });

  assert.equal(invite.email, staffEmail);
  assert.equal(invite.usedAt, null);

  // 2. Staff registers with token
  const staffPhone = `88${Date.now().toString().slice(-8)}`;
  const staffPassword = 'StaffSecretPassword123!';
  const employeeCode = `S-${randomUUID().slice(0, 8).toUpperCase()}`;

  const staffUser = await prisma.user.create({
    data: {
      fullName: 'Test Staff Member',
      email: staffEmail,
      phone: staffPhone,
      passwordHash: await bcrypt.hash(staffPassword, 12),
      role: 'STAFF',
      isActive: true,
      staffProfile: {
        create: {
          employeeCode,
          jobTitle: 'Intake Inspector',
        },
      },
    },
    include: { staffProfile: true },
  });

  // Mark invitation used
  await prisma.staffInvitation.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });

  assert.equal(staffUser.role, 'STAFF');
  assert.equal(staffUser.staffProfile.employeeCode, employeeCode);

  // 3. Verify invitation cannot be reused
  const updatedInvite = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
  });
  assert.ok(updatedInvite.usedAt !== null);

  // Cleanup
  await prisma.staffProfile.delete({ where: { id: staffUser.staffProfile.id } });
  await prisma.user.delete({ where: { id: staffUser.id } });
  await prisma.staffInvitation.delete({ where: { id: invite.id } });
});
