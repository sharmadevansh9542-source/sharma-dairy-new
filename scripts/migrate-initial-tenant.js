import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Multi-Tenant Initial Migration ---');

  // 1. Ensure Sharma Dairy initial tenant exists
  let sharma = await prisma.dairy.findUnique({
    where: { code: 'SHARMA' },
  });

  if (!sharma) {
    sharma = await prisma.dairy.create({
      data: {
        name: 'Sharma Dairy',
        code: 'SHARMA',
        slug: 'sharma-dairy',
        ownerName: 'Dairy Administrator',
        email: 'sharma@dairy.com',
        phone: '9876543210',
        businessType: 'COOPERATIVE',
        status: 'APPROVED',
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          milkRatePolicy: 'HYBRID',
          autoInvoicing: true,
        },
      },
    });
    console.log(`Created initial tenant: ${sharma.name} (${sharma.id})`);
  } else {
    console.log(`Existing initial tenant found: ${sharma.name} (${sharma.id})`);
  }

  // 2. Seed Default SaaS Subscription Plans
  const plans = [
    {
      code: 'FREE_TRIAL',
      name: 'Free Trial',
      description: '14-day full access trial for new dairy operations',
      priceMonthly: 0,
      priceYearly: 0,
      trialDays: 14,
      maxFarmers: 25,
      maxCustomers: 50,
      maxStaff: 3,
      features: { reports: true, sms: false, whatsapp: false, exports: true },
    },
    {
      code: 'BASIC',
      name: 'Basic Dairy Plan',
      description: 'Ideal for small local milk collection centers',
      priceMonthly: 499,
      priceYearly: 4999,
      trialDays: 0,
      maxFarmers: 100,
      maxCustomers: 200,
      maxStaff: 5,
      features: { reports: true, sms: true, whatsapp: false, exports: true },
    },
    {
      code: 'STANDARD',
      name: 'Standard Commercial Plan',
      description: 'For growing dairy enterprises and processing units',
      priceMonthly: 999,
      priceYearly: 9999,
      trialDays: 0,
      maxFarmers: 300,
      maxCustomers: 600,
      maxStaff: 15,
      features: { reports: true, sms: true, whatsapp: true, exports: true, prioritySupport: true },
    },
    {
      code: 'PREMIUM',
      name: 'Enterprise SaaS Plan',
      description: 'Unlimited scalability for high-volume dairy networks',
      priceMonthly: 1999,
      priceYearly: 19999,
      trialDays: 0,
      maxFarmers: 2000,
      maxCustomers: 5000,
      maxStaff: 50,
      features: { reports: true, sms: true, whatsapp: true, exports: true, pwa: true, customBranding: true },
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxFarmers: plan.maxFarmers,
        maxCustomers: plan.maxCustomers,
        maxStaff: plan.maxStaff,
        features: plan.features,
      },
    });
  }
  console.log('Default SaaS subscription plans upserted.');

  // 3. Ensure Sharma Dairy has an active SaaS Subscription
  const premiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'PREMIUM' },
  });

  const existingSub = await prisma.subscription.findFirst({
    where: { dairyId: sharma.id },
  });

  if (!existingSub && premiumPlan) {
    const end = new Date();
    end.setFullYear(end.getFullYear() + 10); // 10 years active for bootstrap tenant
    await prisma.subscription.create({
      data: {
        dairyId: sharma.id,
        planId: premiumPlan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        currentPeriodEnd: end,
      },
    });
    console.log('Sharma Dairy enrolled in Active Enterprise SaaS subscription.');
  }

  // 4. Associate all existing records with Sharma Dairy
  const usersUpdated = await prisma.user.updateMany({
    where: { dairyId: null, role: { not: 'SUPER_ADMIN' } },
    data: { dairyId: sharma.id },
  });
  console.log(`Updated ${usersUpdated.count} existing users with Sharma Dairy tenant ID.`);

  // Create DairyMemberships for all existing users linked to Sharma Dairy
  const allDairyUsers = await prisma.user.findMany({
    where: { dairyId: sharma.id },
  });

  for (const u of allDairyUsers) {
    await prisma.dairyMembership.upsert({
      where: {
        dairyId_userId: {
          dairyId: sharma.id,
          userId: u.id,
        },
      },
      create: {
        dairyId: sharma.id,
        userId: u.id,
        role: u.role,
        isDefault: true,
        isActive: u.isActive,
      },
      update: {
        role: u.role,
        isActive: u.isActive,
      },
    });
  }
  console.log(`Ensured DairyMembership for ${allDairyUsers.length} users.`);

  // Link profiles & operational records
  await prisma.farmerProfile.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.customerProfile.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.staffProfile.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.staffInvitation.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.milkRate.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.milkCollection.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.sale.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.farmerPayment.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.customerPayment.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.ledgerEntry.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.stockMovement.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.expense.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.invoice.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.dailyClosing.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  await prisma.auditLog.updateMany({
    where: { dairyId: null },
    data: { dairyId: sharma.id },
  });

  console.log('--- Multi-Tenant Migration Finished Successfully ---');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

