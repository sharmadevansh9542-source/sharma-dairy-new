import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

function deriveMigrationUrl(dbUrl) {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  if (dbUrl.includes('-pooler.')) {
    const direct = dbUrl.replace('-pooler.', '.');
    return direct.includes('connect_timeout=')
      ? direct
      : `${direct}${direct.includes('?') ? '&' : '?'}connect_timeout=30`;
  }
  return dbUrl;
}

function run(cmd, extraEnv = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
}

async function main() {
  run('npx prisma generate');

  const dbUrl = process.env.DATABASE_URL || '';
  const isLocal = !dbUrl || /localhost|127\.0\.0\.1/i.test(dbUrl);

  if (dbUrl && !isLocal) {
    console.log('Cloud DATABASE_URL detected -> applying Prisma migrations...');
    const migrationUrl = deriveMigrationUrl(dbUrl);
    run('npx prisma migrate deploy', { DATABASE_URL: migrationUrl });

    const prisma = new PrismaClient();
    try {
      await prisma.milkTypeConfig.createMany({
        data: [
          { type: 'COW', label: 'Cow Milk' },
          { type: 'BUFFALO', label: 'Buffalo Milk' },
          { type: 'OTHER', label: 'Other Milk' },
        ],
        skipDuplicates: true,
      });

      const permissions = [
        ['collection.create', 'Create & view milk collections'],
        ['sale.create', 'Create & view sales'],
        ['payment.record', 'Record farmer & customer payments'],
        ['reports.view', 'View financial & operational reports'],
        ['expense.create', 'Record operating expenses'],
        ['stock.adjust', 'Adjust raw milk & product stock'],
        ['subscriptions.manage', 'Manage subscriptions & delivery routes'],
        ['products.manage', 'Manage packaged products & purchases'],
        ['accounting.view', 'View cashbook, bankbook & accounting'],
      ];
      for (const [key, description] of permissions) {
        await prisma.permission.upsert({
          where: { key },
          create: { key, description },
          update: { description },
        });
      }

      const saEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
      const saPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();
      const saName = process.env.SUPER_ADMIN_NAME?.trim() || 'Platform Super Admin';

      if (saEmail && saPassword && saPassword.length >= 14) {
        const existingSA = await prisma.user.findFirst({
          where: { OR: [{ email: saEmail }, { role: 'SUPER_ADMIN' }] },
        });
        if (!existingSA) {
          const passwordHash = await bcrypt.hash(saPassword, 12);
          await prisma.user.create({
            data: {
              fullName: saName,
              email: saEmail,
              passwordHash,
              role: 'SUPER_ADMIN',
              isActive: true,
            },
          });
          console.log(`Bootstrapped Super Admin for cloud DB: ${saEmail}`);
        }
      }
    } catch (err) {
      console.warn('Non-fatal seed check warning during vercel-build:', err.message);
    } finally {
      await prisma.$disconnect();
    }
  } else {
    console.warn(
      'Skipping prisma migrate deploy during build (DATABASE_URL is empty or points to localhost).'
    );
  }

  run('npx next build');
}

main().catch((err) => {
  console.error('vercel-build failed:', err);
  process.exit(1);
});
