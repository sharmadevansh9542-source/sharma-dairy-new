import Link from 'next/link';
import {
  Milk,
  LayoutDashboard,
  Users,
  UserRound,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Boxes,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Package,
  Truck,
  Building,
  BookOpen,
} from 'lucide-react';
import { getTenantContext } from '@/lib/auth/tenant';
import NotificationBell from '@/components/notification-bell';
import { ThemeToggle } from '@/components/pwa-status';

const nav = [
  ['/admin/dashboard', 'Dashboard', LayoutDashboard],
  ['/admin/farmers', 'Farmers', Users],
  ['/admin/customers', 'Customers', UserRound],
  ['/admin/collections', 'Milk collection', Milk],
  ['/admin/rates', 'Milk rates', Settings],
  ['/admin/subscriptions', 'Subscriptions & Routes', Truck],
  ['/admin/sales', 'Sales & billing', ShoppingCart],
  ['/admin/farmer-payments', 'Farmer payments', Wallet],
  ['/admin/customer-payments', 'Customer payments', Receipt],
  ['/admin/stock', 'Raw Milk Stock', Boxes],
  ['/admin/products', 'Products & Purchases', Package],
  ['/admin/expenses', 'Expenses', ClipboardList],
  ['/admin/accounting', 'Accounting & Books', BookOpen],
  ['/admin/reports', 'Reports & P&L', ChartNoAxesCombined],
  ['/admin/staff', 'Staff & permissions', ShieldCheck],
  ['/admin/settings', 'Dairy Branding', Building],
  ['/admin/audit', 'Audit log', ClipboardList],
];

export function AdminNav({ active, dairyName = 'Sharma Dairy' }) {
  return (
    <aside className="w-full shrink-0 bg-green-950 p-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto flex flex-col justify-between print:hidden">
      <div>
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-2xl p-3 bg-white/5 border border-white/10">
          <div className="rounded-xl bg-green-800 p-2 text-white">
            <Milk size={24} />
          </div>
          <div>
            <b className="block text-sm font-bold tracking-tight text-white">{dairyName}</b>
            <small className="block text-[11px] text-green-300 font-medium">Dairy ERP Workspace</small>
          </div>
        </Link>

        <nav className="mt-5 grid grid-cols-2 gap-1 md:grid-cols-1">
          {nav.map(([href, label, Icon]) => {
            const pathSlug = href.split('/').pop();
            const isCurrent = active === pathSlug;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-white/20 text-white shadow-xs font-bold'
                    : 'text-green-100 hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <form action="/api/auth/logout" method="post" className="mt-6 pt-4 border-t border-white/10">
        <button className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-green-200 hover:bg-white/10 transition cursor-pointer">
          Sign out
        </button>
      </form>
    </aside>
  );
}

export async function AdminLayout({ children, active }) {
  const context = await getTenantContext();
  const dairyName = context?.dairy?.name || 'Sharma Dairy';
  const user = context?.user;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <AdminNav active={active} dairyName={dairyName} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
          <div>
            <p className="text-xs font-medium text-slate-500">{dairyName} / {active || 'dashboard'}</p>
            <h1 className="text-xl font-bold capitalize text-slate-900 md:text-2xl">
              {(active || 'dashboard').replaceAll('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationBell endpoint="/api/notifications" />
            <ThemeToggle />
            <span className="rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-900">
              {dairyName}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              {user?.fullName || 'Administrator'}
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
