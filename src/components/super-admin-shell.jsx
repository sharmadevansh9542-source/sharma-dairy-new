import { Sparkles } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { SuperAdminNav } from './super-admin-nav';
import NotificationBell from '@/components/notification-bell';
import { ThemeToggle } from '@/components/pwa-status';

export { SuperAdminNav };

export async function SuperAdminLayout({ children, active }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active={active} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Sharma Dairy SaaS Platform / {active || 'dashboard'}</p>
            <h1 className="text-xl font-bold capitalize text-slate-900 md:text-2xl">
              {(active || 'dashboard').replaceAll('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationBell endpoint="/api/super-admin/notifications" />
            <ThemeToggle />
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <Sparkles size={13} className="text-emerald-600" />
              Platform Owner
            </span>
            <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">
              {user?.fullName || 'Super Administrator'}
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
