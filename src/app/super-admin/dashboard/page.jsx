import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { SuperAdminLayout } from '@/components/super-admin-shell';
import { prisma } from '@/lib/db/prisma';
import { DairyBarChart, DairyPieChart } from '@/components/analytics-charts';

export const metadata = {
  title: 'Super Admin Control Panel | Sharma Dairy SaaS',
};

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(v || 0)
  );

export default async function SuperAdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  const [
    totalDairies,
    activeDairies,
    pendingRequests,
    suspendedDairies,
    totalUsers,
    totalFarmers,
    totalCustomers,
    totalStaff,
    activeSubscriptions,
    expiredSubscriptions,
    plans,
    recentRequests,
    recentDairies,
  ] = await Promise.all([
    prisma.dairy.count(),
    prisma.dairy.count({ where: { status: 'APPROVED' } }),
    prisma.dairyRegistrationRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.dairy.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.farmerProfile.count(),
    prisma.customerProfile.count(),
    prisma.staffProfile.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: { in: ['EXPIRED', 'PAST_DUE'] } } }),
    prisma.subscriptionPlan.findMany({
      include: { _count: { select: { subscriptions: true } } },
    }),
    prisma.dairyRegistrationRequest.findMany({
      where: { status: 'PENDING_APPROVAL' },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dairy.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: { select: { memberships: true, farmerProfiles: true } },
      },
    }),
  ]);

  // Calculate MRR
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true },
  });
  const mrr = activeSubs.reduce((acc, s) => acc + Number(s.plan.priceMonthly || 0), 0);

  const kpis = [
    { label: 'Total Registered Dairies', value: totalDairies, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Dairies', value: activeDairies, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Approvals', value: pendingRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', alert: pendingRequests > 0 },
    { label: 'Suspended Dairies', value: suspendedDairies, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Platform Users', value: totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Farmers', value: totalFarmers, icon: Layers, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Customers', value: totalCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Staff', value: totalStaff, icon: ShieldCheck, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Active Subscriptions', value: activeSubscriptions, icon: CreditCard, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Expired Subscriptions', value: expiredSubscriptions, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Monthly Recurring Revenue', value: money(mrr), icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-100', highlight: true },
  ];

  const platformBarData = [
    { name: 'Dairies', count: totalDairies },
    { name: 'Farmers', count: totalFarmers },
    { name: 'Customers', count: totalCustomers },
    { name: 'Staff', count: totalStaff },
    { name: 'Users', count: totalUsers },
  ];

  const planPieData = plans.map((p) => ({
    name: p.name,
    value: p._count.subscriptions,
  }));

  return (
    <SuperAdminLayout active="dashboard">
      <div className="space-y-6">
        {/* KPI Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  k.highlight
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200 sm:col-span-2'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{k.label}</span>
                  <span className={`rounded-xl p-2 ${k.bg} ${k.color}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{k.value}</span>
                  {k.alert && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Action Needed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Platform Analytics Charts */}
        <section className="grid gap-6 lg:grid-cols-[58%_42%]">
          <DairyBarChart
            title="Platform Ecosystem Growth"
            subtitle="Active tenants, farmers, customers, and staff across the SaaS network"
            data={platformBarData}
            bars={[{ dataKey: 'count', name: 'Total Count', color: '#059669' }]}
          />
          <DairyPieChart
            title="Subscription Plan Distribution"
            subtitle="Active tenant allocation by SaaS tier"
            data={planPieData}
          />
        </section>

        {/* Action Row: Pending Registration Requests */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-amber-600" />
                Pending Dairy Registration Requests ({pendingRequests})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                New dairy businesses waiting for platform verification and activation.
              </p>
            </div>
            <Link
              href="/super-admin/registrations"
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              View all requests <ArrowRight size={14} />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending registrations at the moment. All business accounts are up to date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Dairy Business</th>
                    <th className="p-3.5">Owner / Contact</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Submitted At</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{r.dairyName}</span>
                        <span className="text-slate-400 text-[11px]">{r.businessType || 'Dairy'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 block">{r.ownerName}</span>
                        <span className="text-slate-500 text-[11px]">{r.businessEmail} · {r.phone}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {r.city ? `${r.city}, ${r.state || ''}` : 'Location unlisted'}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3.5 text-right">
                        <Link
                          href={`/super-admin/registrations?id=${r.id}`}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
                        >
                          Review & Approve
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Active Dairies and SaaS Plans Overview */}
        <div className="grid gap-6 lg:grid-cols-[60%_40%]">
          {/* Recent Dairies Table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600" />
                  Registered Dairies
                </h3>
                <p className="text-xs text-slate-500">Recently active and onboarded dairy tenants</p>
              </div>
              <Link
                href="/super-admin/dairies"
                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
              >
                Manage all <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {recentDairies.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{d.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600">
                        {d.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {d.ownerName} · {d.email || d.phone || 'No direct contact'} · {d._count.farmerProfiles} farmers
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-700">
                      {d.subscriptions[0]?.plan.name || 'No Plan'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {d.subscriptions[0]?.status || 'INACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Subscription Plans Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CreditCard size={16} className="text-purple-600" />
                    SaaS Tier Distribution
                  </h3>
                  <p className="text-xs text-slate-500">Commercial pricing plans configured</p>
                </div>
                <Link
                  href="/super-admin/subscriptions"
                  className="text-xs font-bold text-purple-700 hover:text-purple-800"
                >
                  Edit plans
                </Link>
              </div>

              <div className="space-y-3">
                {plans.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                      <span className="font-extrabold text-xs text-emerald-800">
                        {Number(p.priceMonthly) === 0 ? 'Free' : `₹${Number(p.priceMonthly)}/mo`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Max {p.maxFarmers} farmers · {p.maxCustomers} customers</span>
                      <span className="font-semibold text-slate-700">
                        {p._count.subscriptions} active tenant(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-900 p-4 text-white text-xs space-y-1">
              <span className="font-bold block text-emerald-400">Multi-Tenant Isolation Status: ACTIVE</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Database queries and session contexts are strictly scoped to verified tenant credentials.
                Cross-tenant operations and client-side tenant spoofing are strictly blocked.
              </p>
            </div>
          </section>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

