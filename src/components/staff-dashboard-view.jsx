'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Milk,
  BriefcaseBusiness,
  LayoutDashboard,
  Calendar,
  Wallet,
  User,
  Lock,
  LogOut,
  ChevronRight,
  ShoppingCart,
  Boxes,
  ChartNoAxesCombined,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function StaffDashboardView({
  user,
  profile,
  userPermissions = [],
  todayCollectionsCount = 0,
  todayCollectionsLitres = 0,
  todaySalesCount = 0,
  todaySalesLitres = 0,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const hasPerm = (key) => userPermissions.includes(key);

  const modules = [
    {
      href: '/admin/collections',
      title: 'Milk Collection Intake',
      desc: 'Record shift-wise milk from farmers with fat/SNF verification',
      icon: Milk,
      perm: 'collection.create',
      enabled: hasPerm('collection.create'),
    },
    {
      href: '/admin/sales',
      title: 'Sales & Delivery',
      desc: 'Record customer purchases, deliveries and dispatch',
      icon: ShoppingCart,
      perm: 'sale.create',
      enabled: hasPerm('sale.create'),
    },
    {
      href: '/admin/farmer-payments',
      title: 'Farmer Payments',
      desc: 'Process supplier payouts and record references',
      icon: Wallet,
      perm: 'payment.record',
      enabled: hasPerm('payment.record'),
    },
    {
      href: '/admin/reports',
      title: 'Operational Reports',
      desc: 'View daily intake and sales reconciliation summaries',
      icon: ChartNoAxesCombined,
      perm: 'reports.view',
      enabled: hasPerm('reports.view'),
    },
  ];

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdBusy(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      setPwdSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.message || 'Unable to update password.');
    } finally {
      setPwdBusy(false);
    }
  }

  const navItems = [
    { id: 'overview', label: 'Workspace Overview', icon: LayoutDashboard },
    { id: 'modules', label: 'Operations Modules', icon: BriefcaseBusiness },
    { id: 'profile', label: 'Staff Profile', icon: User },
    { id: 'security', label: 'Account Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full shrink-0 bg-slate-900 p-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:flex md:flex-col md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/15 p-2 text-slate-200">
              <Milk size={24} />
            </span>
            <div>
              <div className="font-bold tracking-tight">Sharma Dairy</div>
              <p className="text-xs text-slate-300">Staff Workspace</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Employee Code</div>
            <div className="font-mono text-sm font-bold text-white mt-0.5">
              {profile.employeeCode || 'STAFF'}
            </div>
            <div className="text-xs text-slate-300 mt-1 truncate">{user.fullName}</div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <form action="/api/auth/logout" method="post" className="mt-8 border-t border-white/10 pt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </form>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-5 md:p-9">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operations Center · {profile.jobTitle || 'Dairy Staff'}
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
              Hello, {user.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Access your authorized operational modules below. Each transaction is server-verified.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-900">
              <ShieldCheck size={14} className="text-green-700" /> Authorized Staff
            </span>
          </div>
        </header>

        {/* TAB 1: WORKSPACE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Today's Collections</span>
                  <span className="rounded-xl bg-green-50 p-2 text-green-800">
                    <Milk size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{todayCollectionsCount}</div>
                <p className="mt-1 text-xs text-slate-500">{todayCollectionsLitres.toFixed(1)} L collected today</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-800">
                    <ShoppingCart size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{todaySalesCount}</div>
                <p className="mt-1 text-xs text-slate-500">{todaySalesLitres.toFixed(1)} L sold today</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Permissions Active</span>
                  <span className="rounded-xl bg-purple-50 p-2 text-purple-800">
                    <ShieldCheck size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{userPermissions.length}</div>
                <p className="mt-1 text-xs text-slate-500">Assigned role capabilities</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Assigned Area</span>
                  <span className="rounded-xl bg-amber-50 p-2 text-amber-800">
                    <BriefcaseBusiness size={18} />
                  </span>
                </div>
                <div className="mt-3 text-base font-bold text-slate-900 truncate">
                  {profile.department || 'Dairy Operations'}
                </div>
                <p className="mt-1 text-xs text-slate-500">{profile.jobTitle || 'Operations Staff'}</p>
              </div>
            </div>

            {/* Direct Modules Grid */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Your Work Modules</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((m) => {
                  const Icon = m.icon;
                  return m.enabled ? (
                    <Link
                      key={m.href}
                      href={m.href}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-green-600 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-xl bg-green-50 p-3 text-green-800 group-hover:bg-green-800 group-hover:text-white transition">
                            <Icon size={24} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Authorized
                          </span>
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-green-900">
                          {m.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 leading-5">{m.desc}</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-green-800 group-hover:translate-x-1 transition">
                        Open Workspace <ArrowRight size={14} />
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={m.href}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 opacity-75"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-xl bg-slate-200 p-3 text-slate-500">
                            <Icon size={24} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
                            <ShieldAlert size={12} /> Restricted
                          </span>
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-700">{m.title}</h3>
                        <p className="mt-1 text-xs text-slate-400 leading-5">{m.desc}</p>
                      </div>
                      <div className="mt-4 text-xs text-slate-400 italic">
                        Requires permission: {m.perm}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OPERATIONS MODULES */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Operations Modules & Permissions</h2>
            <p className="text-xs text-slate-500">
              Only modules granted to your account by the administrator can be accessed. Server-side security checks each data entry.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {modules.map((m) => {
                const Icon = m.icon;
                return m.enabled ? (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-800"
                  >
                    <span className="rounded-xl bg-slate-100 p-3 text-slate-800">
                      <Icon size={24} />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">{m.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-green-700">
                        Launch Module <ChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={m.href}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-100/60 p-5 opacity-60"
                  >
                    <span className="rounded-xl bg-slate-200 p-3 text-slate-400">
                      <Icon size={24} />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-600">{m.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                      <p className="mt-3 text-xs text-amber-700 font-semibold">Permission required from Admin</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-800">
                <BriefcaseBusiness size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
                <p className="text-xs text-slate-500">Employee Code: {profile.employeeCode}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Mobile</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" />
                  +91 {user.phone || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Email</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <Mail size={14} className="text-slate-500" />
                  {user.email || 'None on record'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Job Title</span>
                <p className="mt-1 font-semibold text-slate-800">{profile.jobTitle || 'Operations Staff'}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Department</span>
                <p className="mt-1 font-semibold text-slate-800">{profile.department || 'Dairy Operations'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Change Staff Password</h2>
                <p className="text-xs text-slate-500">Update your security credentials for the Staff Workspace</p>
              </div>
            </div>

            {pwdSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-3.5 text-sm text-green-900">
                <CheckCircle2 size={18} className="shrink-0 text-green-700" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            {pwdError && (
              <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  New Password (min. 8 characters) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={pwdBusy}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {pwdBusy ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
