'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  CreditCard,
  Receipt,
  Bell,
  History,
  Settings,
  LogOut,
} from 'lucide-react';

const nav = [
  ['/super-admin/dashboard', 'Control Panel', LayoutDashboard],
  ['/super-admin/dairies', 'Dairy Businesses', Building2],
  ['/super-admin/registrations', 'Registrations', UserCheck],
  ['/super-admin/users', 'Platform Users', Users],
  ['/super-admin/subscriptions', 'SaaS Plans & Billing', CreditCard],
  ['/super-admin/payments', 'SaaS Payments', Receipt],
  ['/super-admin/notifications', 'Notifications', Bell],
  ['/super-admin/audit-logs', 'Platform Audit Logs', History],
  ['/super-admin/settings', 'System & Backups', Settings],
];

export function SuperAdminNav({ active }) {
  return (
    <aside className="w-full shrink-0 bg-slate-950 p-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto flex flex-col justify-between">
      <div>
        <Link href="/super-admin/dashboard" className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 border border-white/10">
          <div className="rounded-xl bg-emerald-600 p-2 text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <b className="block text-sm font-bold tracking-tight text-white">Super Admin</b>
            <small className="block text-xs text-emerald-400 font-medium">SaaS Platform Root</small>
          </div>
        </Link>

        <div className="mt-6 px-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform Management</span>
        </div>

        <nav className="mt-2 space-y-1">
          {nav.map(([href, label, Icon]) => {
            const pathSlug = href.split('/').pop();
            const isCurrent = active === pathSlug || (active === 'dashboard' && pathSlug === 'dashboard');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} className={isCurrent ? 'text-white' : 'text-slate-400'} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-white/10 mt-6">
        <form action="/api/auth/logout" method="post">
          <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition cursor-pointer">
            <LogOut size={16} />
            Sign out Super Admin
          </button>
        </form>
      </div>
    </aside>
  );
}
