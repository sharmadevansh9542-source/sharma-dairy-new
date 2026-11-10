import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Milk,
  Users,
  ShoppingBasket,
  Wallet,
  ReceiptText,
  Boxes,
  TrendingUp,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { getTenantContext } from '@/lib/auth/tenant';
import { prisma } from '@/lib/db/prisma';
import { AdminLayout } from '@/components/admin-shell';
import { DairyBarChart, DairyPieChart } from '@/components/analytics-charts';

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

export default async function AdminDashboard() {
  const context = await getTenantContext();
  if (!context.user) redirect('/login');
  if (context.isSuperAdmin) redirect('/super-admin/dashboard');
  if (context.role !== 'ADMIN') redirect('/dashboard');

  const dairyId = context.dairyId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59);

  const [
    farmers,
    customers,
    staff,
    todayCollection,
    todaySales,
    todayExpenses,
    monthSales,
    monthCollection,
    monthExpenses,
    allCollections,
    allFarmerPayments,
    allSales,
    allCustomerPayments,
    stockSum,
    recentCollections,
    recentSales,
    weekCollections,
    weekSales,
    milkTypes,
  ] = await Promise.all([
    prisma.farmerProfile.count({ where: { dairyId, isActive: true } }),
    prisma.customerProfile.count({ where: { dairyId, isActive: true } }),
    prisma.user.count({ where: { dairyId, role: 'STAFF', isActive: true } }),
    prisma.milkCollection.aggregate({
      where: { dairyId, collectionAt: { gte: todayStart, lt: todayEnd } },
      _sum: { quantityLitres: true, amount: true },
    }),
    prisma.sale.aggregate({
      where: { dairyId, saleAt: { gte: todayStart, lt: todayEnd }, status: { not: 'CANCELLED' } },
      _sum: { quantityLitres: true, amount: true },
    }),
    prisma.expense.aggregate({
      where: { dairyId, expenseAt: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { dairyId, saleAt: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
    }),
    prisma.milkCollection.aggregate({
      where: { dairyId, collectionAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { dairyId, expenseAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.milkCollection.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.farmerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.sale.aggregate({ where: { dairyId, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
    prisma.customerPayment.aggregate({ where: { dairyId }, _sum: { amount: true } }),
    prisma.stockMovement.aggregate({ where: { dairyId }, _sum: { quantityLitres: true } }),
    prisma.milkCollection.findMany({
      where: { dairyId },
      take: 5,
      orderBy: { collectionAt: 'desc' },
      include: { farmer: { include: { user: { select: { fullName: true } } } }, milkType: true },
    }),
    prisma.sale.findMany({
      where: { dairyId },
      take: 5,
      orderBy: { saleAt: 'desc' },
      include: { customer: { include: { user: { select: { fullName: true } } } }, milkType: true, product: true },
    }),
    prisma.milkCollection.findMany({
      where: { dairyId, collectionAt: { gte: sevenDaysAgo, lt: todayEnd } },
      select: { collectionAt: true, quantityLitres: true, milkTypeId: true },
    }),
    prisma.sale.findMany({
      where: { dairyId, saleAt: { gte: sevenDaysAgo, lt: todayEnd }, status: { not: 'CANCELLED' } },
      select: { saleAt: true, quantityLitres: true },
    }),
    prisma.milkTypeConfig.findMany(),
  ]);

  const monthlyRev = Number(monthSales._sum.amount || 0);
  const monthlyExp = Number(monthExpenses._sum.amount || 0);
  const monthlyCost = Number(monthCollection._sum.amount || 0) + monthlyExp;
  const estimatedProfit = monthlyRev - monthlyCost;

  const pendingFarmerPayments = Math.max(
    0,
    Number(allCollections._sum.amount || 0) - Number(allFarmerPayments._sum.amount || 0)
  );
  const pendingCustomerPayments = Math.max(
    0,
    Number(allSales._sum.amount || 0) - Number(allCustomerPayments._sum.amount || 0)
  );

  // Build 7-day trend chart data
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const colLitres = weekCollections
      .filter((c) => c.collectionAt.toISOString().slice(0, 10) === key)
      .reduce((acc, c) => acc + Number(c.quantityLitres), 0);
    const saleLitres = weekSales
      .filter((s) => s.saleAt.toISOString().slice(0, 10) === key)
      .reduce((acc, s) => acc + Number(s.quantityLitres), 0);
    trendData.push({ name: label, collected: Number(colLitres.toFixed(1)), sold: Number(saleLitres.toFixed(1)) });
  }

  // Milk Type pie breakdown
  const milkPieData = milkTypes.map((mt) => ({
    name: mt.label,
    value: Number(
      weekCollections
        .filter((c) => c.milkTypeId === mt.id)
        .reduce((acc, c) => acc + Number(c.quantityLitres), 0)
        .toFixed(1)
    ),
  }));

  const cards = [
    { label: 'Active Farmers', value: farmers, icon: Users, detail: 'Registered milk suppliers', bg: 'bg-green-50', text: 'text-green-800' },
    { label: 'Active Customers', value: customers, icon: Users, detail: 'Registered buyers & subscribers', bg: 'bg-blue-50', text: 'text-blue-800' },
    { label: 'Active Staff', value: staff, icon: Users, detail: 'Authorized staff & managers', bg: 'bg-purple-50', text: 'text-purple-800' },
    { label: 'Milk In Stock', value: `${Number(stockSum._sum.quantityLitres || 0).toLocaleString('en-IN')} L`, icon: Boxes, detail: 'Available raw milk tank stock', bg: 'bg-teal-50', text: 'text-teal-800' },
    { label: "Today's Milk Intake", value: `${Number(todayCollection._sum.quantityLitres || 0).toLocaleString('en-IN')} L`, icon: Milk, detail: money(todayCollection._sum.amount) + ' purchase value', bg: 'bg-emerald-50', text: 'text-emerald-800' },
    { label: "Today's Revenue / Sales", value: money(todaySales._sum.amount), icon: ShoppingBasket, detail: `${Number(todaySales._sum.quantityLitres || 0).toLocaleString('en-IN')} L sold today`, bg: 'bg-amber-50', text: 'text-amber-800' },
    { label: "Today's Expenses", value: money(todayExpenses._sum.amount), icon: ClipboardList, detail: 'Operating costs today', bg: 'bg-rose-50', text: 'text-rose-800' },
    { label: 'Pending Farmer Payables', value: money(pendingFarmerPayments), icon: Wallet, detail: 'Unsettled farmer earnings', bg: 'bg-orange-50', text: 'text-orange-800' },
    { label: 'Pending Cust. Receivables', value: money(pendingCustomerPayments), icon: ReceiptText, detail: 'Outstanding customer bills', bg: 'bg-sky-50', text: 'text-sky-800' },
    { label: 'Monthly Revenue', value: money(monthlyRev), icon: TrendingUp, detail: 'Month-to-date sales', bg: 'bg-indigo-50', text: 'text-indigo-800' },
    { label: 'Monthly Expenses', value: money(monthlyExp), icon: ClipboardList, detail: 'Month-to-date expenses', bg: 'bg-rose-50', text: 'text-rose-800' },
    {
      label: 'Estimated Net Profit',
      value: money(estimatedProfit),
      icon: TrendingUp,
      detail: 'Monthly Sales − (Milk Cost + Expenses)',
      bg: estimatedProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100',
      text: estimatedProfit >= 0 ? 'text-emerald-900' : 'text-rose-900',
      highlight: true,
    },
  ];

  return (
    <AdminLayout active="dashboard">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.label}
                className={`rounded-2xl border p-5 shadow-xs transition ${
                  c.highlight
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">{c.label}</p>
                  <span className={`rounded-xl p-2 ${c.bg} ${c.text}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-extrabold text-slate-900">{c.value}</p>
                <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
              </article>
            );
          })}
        </section>

        {/* Analytics Charts */}
        <section className="grid gap-6 lg:grid-cols-[62%_38%]">
          <DairyBarChart
            title="7-Day Milk Collection vs Sales (Litres)"
            subtitle="Daily procurement vs outward volume for your dairy"
            data={trendData}
            bars={[
              { dataKey: 'collected', name: 'Collected (L)', color: '#166534' },
              { dataKey: 'sold', name: 'Sold (L)', color: '#0284c7' },
            ]}
          />
          <DairyPieChart
            title="Milk Intake by Type (7 Days)"
            subtitle="Cow vs Buffalo milk procurement split"
            data={milkPieData}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Milk size={16} className="text-emerald-700" />
                  Recent Milk Collections
                </h3>
                <p className="text-xs text-slate-500">Latest milk intake recorded</p>
              </div>
              <Link href="/admin/collections" className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentCollections.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No milk collections recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCollections.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {c.farmer?.user?.fullName || 'Farmer'} ({c.farmer?.farmerCode})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {c.shift} · {c.milkType.label} · {new Date(c.collectionAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">{Number(c.quantityLitres)} L</span>
                      <span className="text-[11px] font-semibold text-emerald-700">{money(c.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShoppingBasket size={16} className="text-amber-700" />
                  Recent Sales & Outflow
                </h3>
                <p className="text-xs text-slate-500">Latest deliveries and buyer invoices</p>
              </div>
              <Link href="/admin/sales" className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No sales transactions entered yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {s.customer?.user?.fullName || s.walkInName || 'Walk-in Buyer'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {s.product?.name || s.milkType?.label || 'Milk'} · {new Date(s.saleAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">{Number(s.quantityLitres)} {s.product?.unit || 'L'}</span>
                      <span className="text-[11px] font-semibold text-emerald-700">{money(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
