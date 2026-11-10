import { redirect, notFound } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { AdminLayout } from '@/components/admin-shell';
import ModuleWorkspace from '@/components/module-workspace';
import { prisma } from '@/lib/db/prisma';
import AdminStaffManager from '@/components/admin-staff-manager';
import AdminRateManager from '@/components/admin-rate-manager';
import AdminSubscriptionsManager from '@/components/admin-subscriptions-manager';
import AdminProductsManager from '@/components/admin-products-manager';
import AdminSettingsManager from '@/components/admin-settings-manager';
import AdminReportsView from '@/components/admin-reports-view';
import AdminStockManager from '@/components/admin-stock-manager';
import AdminAccountingView from '@/components/admin-accounting-view';
import { ensureDairyChartOfAccounts } from '@/lib/accounting/engine';

const allowed = [
  'farmers',
  'customers',
  'collections',
  'sales',
  'expenses',
  'farmer-payments',
  'customer-payments',
];

export default async function ModulePage({ params }) {
  const { module } = await params;
  const context = await getTenantContext();
  if (!context.user) redirect('/login');

  if (context.isSuperAdmin) {
    redirect('/super-admin/dashboard');
  }

  const { user, dairyId, role } = context;

  if (role === 'STAFF') {
    const perms = {
      collections: 'collection.create',
      sales: 'sale.create',
      'farmer-payments': 'payment.record',
      'customer-payments': 'payment.record',
      expenses: 'expense.create',
      stock: 'stock.adjust',
      subscriptions: 'subscriptions.manage',
      products: 'products.manage',
      accounting: 'accounting.view',
      reports: 'reports.view',
    };
    const needed = perms[module];
    if (!needed) redirect('/staff/dashboard');
    const grant = await prisma.userPermission.findFirst({
      where: { userId: user.id, permission: { key: needed } },
    });
    if (!grant) redirect('/staff/dashboard');
  } else if (role !== 'ADMIN') {
    redirect('/dashboard');
  }

  if (module === 'dashboard') redirect('/admin/dashboard');
  if (module === 'rates') return <AdminLayout active={module}><RateManagement dairyId={dairyId} /></AdminLayout>;
  if (module === 'subscriptions') return <AdminLayout active={module}><SubscriptionsPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'products') return <AdminLayout active={module}><ProductsPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'settings') return <AdminLayout active={module}><SettingsPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'stock') return <AdminLayout active={module}><StockPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'accounting') return <AdminLayout active={module}><AccountingPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'reports') return <AdminLayout active={module}><ReportsPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'staff') return <AdminLayout active={module}><StaffPanel dairyId={dairyId} /></AdminLayout>;
  if (module === 'audit') return <AdminLayout active={module}><AuditPanel dairyId={dairyId} /></AdminLayout>;

  if (!allowed.includes(module)) notFound();
  return (
    <AdminLayout active={module}>
      <ModuleWorkspace module={module} />
    </AdminLayout>
  );
}

async function RateManagement({ dairyId }) {
  const rates = await prisma.milkRate.findMany({
    where: { dairyId: dairyId || undefined },
    take: 100,
    orderBy: { effectiveFrom: 'desc' },
    include: { milkType: true },
  });

  const serializedRates = rates.map((r) => ({
    ...r,
    fixedRate: r.fixedRate != null ? Number(r.fixedRate) : null,
    fatRate: r.fatRate != null ? Number(r.fatRate) : null,
    snfRate: r.snfRate != null ? Number(r.snfRate) : null,
    baseRate: r.baseRate != null ? Number(r.baseRate) : null,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <AdminRateManager initialRates={serializedRates} />;
}

async function StockPanel({ dairyId }) {
  const types = await prisma.milkTypeConfig.findMany();
  const sums = await prisma.stockMovement.groupBy({
    by: ['milkTypeId'],
    where: { dairyId: dairyId || undefined },
    _sum: { quantityLitres: true },
  });
  const movements = await prisma.stockMovement.findMany({
    where: { dairyId: dairyId || undefined },
    take: 100,
    orderBy: { movementAt: 'desc' },
    include: { milkType: true },
  });

  const serializedTypes = types.map((t) => ({
    ...t,
    stockLitres: Number(sums.find((s) => s.milkTypeId === t.id)?._sum.quantityLitres || 0),
  }));

  const serializedMovements = movements.map((m) => ({
    ...m,
    quantityLitres: Number(m.quantityLitres),
    movementAt: m.movementAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
  }));

  return <AdminStockManager initialTypes={serializedTypes} initialMovements={serializedMovements} />;
}

async function AccountingPanel({ dairyId }) {
  await ensureDairyChartOfAccounts(dairyId);

  const [
    accounts,
    journalEntries,
    collectionsAgg,
    salesAgg,
    expensesAgg,
    farmerPayAgg,
    customerPayAgg,
    cashInCustomer,
    bankInCustomer,
    cashOutFarmer,
    bankOutFarmer,
    cashOutExpense,
    bankOutExpense,
  ] = await Promise.all([
    prisma.account.findMany({ where: { dairyId }, orderBy: { code: 'asc' } }),
    prisma.journalEntry.findMany({
      where: { dairyId },
      take: 50,
      orderBy: { entryDate: 'desc' },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    }),
    prisma.milkCollection.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.sale.aggregate({ where: { dairyId, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.farmerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.customerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.customerPayment.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
    prisma.customerPayment.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
    prisma.farmerPayment.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
    prisma.farmerPayment.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { dairyId, method: 'CASH' }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { dairyId, method: { in: ['UPI', 'BANK_TRANSFER'] } }, _sum: { amount: true } }),
  ]);

  const revenue = Number(salesAgg._sum.amount || 0);
  const milkCost = Number(collectionsAgg._sum.amount || 0);
  const expenses = Number(expensesAgg._sum.amount || 0);
  const farmerPaid = Number(farmerPayAgg._sum.amount || 0);
  const customerReceived = Number(customerPayAgg._sum.amount || 0);
  const cashIn = Number(cashInCustomer._sum.amount || 0);
  const cashOut = Number(cashOutFarmer._sum.amount || 0) + Number(cashOutExpense._sum.amount || 0);
  const bankIn = Number(bankInCustomer._sum.amount || 0);
  const bankOut = Number(bankOutFarmer._sum.amount || 0) + Number(bankOutExpense._sum.amount || 0);

  const initialData = {
    summary: {
      revenue,
      milkCost,
      expenses,
      netProfit: revenue - milkCost - expenses,
      farmerPayables: milkCost - farmerPaid,
      customerReceivables: revenue - customerReceived,
      cashbookBalance: cashIn - cashOut,
      bankbookBalance: bankIn - bankOut,
      cashIn,
      cashOut,
      bankIn,
      bankOut,
    },
    accounts: accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    journalEntries: journalEntries.map((j) => ({
      ...j,
      entryDate: j.entryDate.toISOString(),
      createdAt: j.createdAt.toISOString(),
      lines: j.lines.map((l) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
    })),
  };

  return <AdminAccountingView initialData={initialData} />;
}

async function ReportsPanel({ dairyId }) {
  const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = new Date();
  to.setDate(to.getDate() + 1);

  const [dairy, c, s, fp, cp, e] = await Promise.all([
    prisma.dairy.findUnique({ where: { id: dairyId }, select: { name: true } }),
    prisma.milkCollection.aggregate({
      where: { dairyId: dairyId || undefined, collectionAt: { gte: from, lt: to } },
      _sum: { quantityLitres: true, amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { dairyId: dairyId || undefined, saleAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
      _sum: { quantityLitres: true, amount: true },
      _count: true,
    }),
    prisma.farmerPayment.aggregate({
      where: { dairyId: dairyId || undefined, paidAt: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.customerPayment.aggregate({
      where: { dairyId: dairyId || undefined, paidAt: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { dairyId: dairyId || undefined, expenseAt: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);

  const initialSummary = {
    collectionLitres: Number(c._sum.quantityLitres || 0),
    collectionValue: Number(c._sum.amount || 0),
    collectionCount: c._count,
    salesLitres: Number(s._sum.quantityLitres || 0),
    salesValue: Number(s._sum.amount || 0),
    salesCount: s._count,
    farmerPayments: Number(fp._sum.amount || 0),
    customerPayments: Number(cp._sum.amount || 0),
    expenses: Number(e._sum.amount || 0),
    estimatedDifference:
      Number(s._sum.amount || 0) - Number(c._sum.amount || 0) - Number(e._sum.amount || 0),
  };

  return <AdminReportsView initialSummary={initialSummary} dairyName={dairy?.name || 'Sharma Dairy'} />;
}

async function StaffPanel({ dairyId }) {
  const [staff, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { dairyId: dairyId || undefined, role: 'STAFF' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        staffProfile: { select: { employeeCode: true, jobTitle: true, department: true, managerRole: true } },
        permissions: { include: { permission: { select: { key: true } } } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staffInvitation.findMany({
      where: { dairyId: dairyId || undefined },
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { fullName: true } } },
    }),
  ]);

  const formattedStaff = staff.map((s) => ({
    ...s,
    permissionKeys: (s.permissions || []).map((p) => p.permission.key),
  }));

  const now = new Date();
  const formattedInvitations = invitations.map((inv) => {
    let status = 'ACTIVE';
    if (inv.usedAt) status = 'USED';
    else if (inv.expiresAt < now) status = 'EXPIRED';
    return {
      id: inv.id,
      email: inv.email,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      createdAt: inv.createdAt,
      status,
      invitedBy: inv.invitedBy?.fullName || 'Admin',
    };
  });

  return <AdminStaffManager initialStaff={formattedStaff} initialInvitations={formattedInvitations} />;
}

async function AuditPanel({ dairyId }) {
  const rows = await prisma.auditLog.findMany({
    where: { dairyId: dairyId || undefined },
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { fullName: true } } },
  });

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-3">Timestamp</th>
            <th className="p-3">Actor</th>
            <th className="p-3">Action</th>
            <th className="p-3">Entity</th>
            <th className="p-3">ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">{r.createdAt.toLocaleString('en-IN')}</td>
              <td className="p-3">{r.actor?.fullName || 'System'}</td>
              <td className="p-3">{r.action}</td>
              <td className="p-3">{r.entityType}</td>
              <td className="p-3 font-mono text-xs">{r.entityId || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-6 text-slate-500">No audit events recorded yet for this dairy.</p>}
    </div>
  );
}

async function SubscriptionsPanel({ dairyId }) {
  const [subs, deliveries, customers] = await Promise.all([
    prisma.milkSubscription.findMany({
      where: { dairyId },
      orderBy: { createdAt: 'desc' },
      include: { customer: { include: { user: { select: { fullName: true, phone: true } } } } },
      take: 200,
    }),
    prisma.dailyDelivery.findMany({
      where: { dairyId },
      orderBy: { deliveryDate: 'desc' },
      include: {
        customer: { include: { user: { select: { fullName: true, phone: true } } } },
        subscription: { select: { milkType: true, ratePerLitre: true } },
      },
      take: 200,
    }),
    prisma.customerProfile.findMany({
      where: { dairyId, isActive: true },
      include: { user: { select: { fullName: true } } },
      take: 200,
    }),
  ]);

  const serializedSubs = subs.map((s) => ({
    ...s,
    dailyQuantity: Number(s.dailyQuantity),
    ratePerLitre: Number(s.ratePerLitre),
    startDate: s.startDate.toISOString(),
    endDate: s.endDate ? s.endDate.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const serializedDeliveries = deliveries.map((d) => ({
    ...d,
    quantityLitres: Number(d.quantityLitres),
    deliveryDate: d.deliveryDate.toISOString(),
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    subscription: d.subscription
      ? { ...d.subscription, ratePerLitre: Number(d.subscription.ratePerLitre) }
      : null,
  }));

  return (
    <AdminSubscriptionsManager
      initialSubs={serializedSubs}
      initialDeliveries={serializedDeliveries}
      customers={customers.map((c) => ({ id: c.id, customerCode: c.customerCode, user: c.user }))}
    />
  );
}

async function ProductsPanel({ dairyId }) {
  const [products, suppliers, purchases] = await Promise.all([
    prisma.product.findMany({ where: { dairyId }, orderBy: { name: 'asc' }, take: 200 }),
    prisma.supplier.findMany({
      where: { dairyId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchases: true } } },
      take: 200,
    }),
    prisma.purchase.findMany({
      where: { dairyId },
      orderBy: { purchaseDate: 'desc' },
      include: {
        supplier: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
      take: 100,
    }),
  ]);

  const serializedProducts = products.map((p) => ({
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    currentStock: Number(p.currentStock),
    minStockAlert: Number(p.minStockAlert),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const serializedPurchases = purchases.map((po) => ({
    ...po,
    totalAmount: Number(po.totalAmount),
    paidAmount: Number(po.paidAmount),
    purchaseDate: po.purchaseDate.toISOString(),
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    items: po.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  }));

  return (
    <AdminProductsManager
      initialProducts={serializedProducts}
      initialSuppliers={suppliers.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      initialPurchases={serializedPurchases}
    />
  );
}

async function SettingsPanel({ dairyId }) {
  const [dairy, sub] = await Promise.all([
    prisma.dairy.findUnique({ where: { id: dairyId } }),
    prisma.subscription.findFirst({
      where: { dairyId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    }),
  ]);

  const serializedDairy = dairy
    ? {
        ...dairy,
        createdAt: dairy.createdAt.toISOString(),
        updatedAt: dairy.updatedAt.toISOString(),
      }
    : null;

  const serializedSub = sub
    ? {
        ...sub,
        startDate: sub.startDate.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        plan: sub.plan
          ? {
              ...sub.plan,
              priceMonthly: Number(sub.plan.priceMonthly),
              priceYearly: Number(sub.plan.priceYearly),
              createdAt: sub.plan.createdAt.toISOString(),
              updatedAt: sub.plan.updatedAt.toISOString(),
            }
          : null,
      }
    : null;

  return <AdminSettingsManager initialDairy={serializedDairy} initialSubscription={serializedSub} />;
}
