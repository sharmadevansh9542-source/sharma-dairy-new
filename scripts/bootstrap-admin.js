import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 14 || password === 'change-this-to-a-long-unique-password') {
    throw new Error('Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL and a unique BOOTSTRAP_ADMIN_PASSWORD of at least 14 characters in .env before running this command.');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('A user with this email already exists. Bootstrap does not reset or overwrite accounts.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { fullName: name, email, passwordHash, role: 'ADMIN' } });
  await prisma.milkTypeConfig.createMany({ data: [{ type: 'COW', label: 'Cow milk' }, { type: 'BUFFALO', label: 'Buffalo milk' }, { type: 'OTHER', label: 'Other milk' }], skipDuplicates: true });
  const permissions = [ ['collection.create','Create milk collection'], ['sale.create','Create milk sales'], ['payment.record','Record payments'], ['reports.view','View reports'], ['expense.create','Create expenses'], ['stock.adjust','Adjust stock'] ];
  for (const [key, description] of permissions) await prisma.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  console.log(`Created initial administrator: ${user.email}. Milk types and base permissions are seeded. Store credentials securely and remove bootstrap secrets from your environment when finished.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
