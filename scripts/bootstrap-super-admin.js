import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Super Admin';
  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@sharmadairy.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecret@Sharma2026!';

  if (!password || password.length < 14) {
    throw new Error('Super Admin password must be at least 14 characters long.');
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { role: 'SUPER_ADMIN' }],
    },
  });

  if (existing) {
    if (existing.role === 'SUPER_ADMIN') {
      console.log(`Super Admin already exists with email: ${existing.email}. Skipping bootstrap.`);
      process.exit(0);
    } else {
      throw new Error(`A user with email ${email} already exists under role ${existing.role}. Choose a unique email.`);
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.create({
    data: {
      fullName: name,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.platformAuditLog.create({
    data: {
      actorId: superAdmin.id,
      action: 'BOOTSTRAP_SUPER_ADMIN',
      entityType: 'User',
      entityId: superAdmin.id,
      details: { email: superAdmin.email, fullName: superAdmin.fullName },
    },
  });

  console.log(`✅ Platform Super Admin bootstrapped successfully: ${superAdmin.email}`);
  console.log('Public registration for Super Admin is strictly disabled.');
} catch (error) {
  console.error('Super Admin bootstrap error:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

