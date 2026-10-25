'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Milk,
  ShoppingBag,
  LayoutDashboard,
  Calendar,
  Wallet,
  User,
  Lock,
  LogOut,
  ChevronRight,
  Receipt,
  Package,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
} from 'lucide-react';

const formatMoney = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val || 0));

export default function CustomerDashboardView({
  user,
  profile,
  sales = [],
  payments = [],
  totalBilled = 0,
  totalPaid = 0,
  invoices = [],
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Calculations
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders & Deliveries', icon: ShoppingBag },
    { id: 'subscription', label: 'Daily Delivery Plan', icon: Package },
    { id: 'payments', label: 'Payments & Invoices', icon: Receipt },
    { id: 'profile', label: 'Customer Profile', icon: User },
    { id: 'security', label: 'Account Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full shrink-0 bg-emerald-950 p-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:flex md:flex-col md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/15 p-2 text-emerald-200">
              <Milk size={24} />
            </span>
            <div>
              <div className="font-bold tracking-tight">Sharma Dairy</div>
              <p className="text-xs text-emerald-200">Customer Portal</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <div className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">Customer Code</div>
            <div className="font-mono text-sm font-bold text-white mt-0.5">{profile.customerCode}</div>
            <div className="text-xs text-emerald-100/80 mt-1 truncate">{user.fullName}</div>
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
                      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
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
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
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
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Customer Portal · {profile.category || 'Household'} Account
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
              Welcome, {user.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track your daily milk deliveries, billing statements, and payments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200">
              <ShoppingBag size={14} /> Registered Buyer
            </span>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Deliveries</span>
                  <span className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
                    <ShoppingBag size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{sales.length}</div>
                <p className="mt-1 text-xs text-slate-500">Recorded purchases / sales</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Billed</span>
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-800">
                    <Receipt size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{formatMoney(totalBilled)}</div>
                <p className="mt-1 text-xs text-slate-500">All-time consumption charges</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Payments Made</span>
                  <span className="rounded-xl bg-green-50 p-2 text-green-800">
                    <Wallet size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{formatMoney(totalPaid)}</div>
                <p className="mt-1 text-xs text-slate-500">{payments.length} payments recorded</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Outstanding Balance</span>
                  <span className="rounded-xl bg-amber-50 p-2 text-amber-800">
                    <Clock size={18} />
                  </span>
                </div>
                <div className={`mt-3 text-2xl font-bold ${outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {formatMoney(outstandingBalance)}
                </div>
                <p className="mt-1 text-xs text-slate-500">Current due amount</p>
              </div>
            </div>

            {/* Recent Deliveries Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent Deliveries</h2>
                  <p className="text-xs text-slate-500">Latest milk supply recorded for your account</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline"
                >
                  View all <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Milk Type</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Rate / L</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-800">
                          {new Date(sale.saleAt).toLocaleDateString('en-IN', {
                            dateStyle: 'medium',
                          })}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{sale.milkType?.label || 'Milk'}</td>
                        <td className="p-3 font-bold text-slate-900">{Number(sale.quantityLitres).toFixed(2)} L</td>
                        <td className="p-3 text-slate-600">₹{Number(sale.ratePerLitre).toFixed(2)}</td>
                        <td className="p-3 font-bold text-emerald-950">₹{Number(sale.amount).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              sale.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-800'
                                : sale.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No deliveries recorded yet. When you receive milk from Sharma Dairy, deliveries will appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ORDERS & DELIVERIES */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Orders & Deliveries</h2>
                <p className="text-xs text-slate-500">Complete record of all dairy items and milk delivered.</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                Total Deliveries: {sales.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="p-3.5">Sale Code</th>
                    <th className="p-3.5">Delivery Date</th>
                    <th className="p-3.5">Milk Type</th>
                    <th className="p-3.5">Quantity (L)</th>
                    <th className="p-3.5">Rate / L</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-xs text-slate-500">{sale.saleCode || sale.id.slice(0, 8)}</td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {new Date(sale.saleAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{sale.milkType?.label || 'Milk'}</td>
                      <td className="p-3.5 font-bold text-slate-900">{Number(sale.quantityLitres).toFixed(2)} L</td>
                      <td className="p-3.5 text-slate-700">₹{Number(sale.ratePerLitre).toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-emerald-950">₹{Number(sale.amount).toFixed(2)}</td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            sale.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-800'
                              : sale.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        No delivery records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DAILY DELIVERY PLAN / SUBSCRIPTIONS */}
        {activeTab === 'subscription' && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
                  <Package size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Daily Milk Subscription</h2>
                  <p className="text-xs text-slate-500">Your standing dairy supply preference</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Category</span>
                  <p className="mt-1 font-semibold text-slate-800">{profile.category || 'HOUSEHOLD'}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Default Milk Variety</span>
                  <p className="mt-1 font-semibold text-slate-800">{profile.defaultMilkType || 'COW'}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Requirement</span>
                  <p className="mt-1 font-semibold text-slate-800">
                    {profile.dailyRequirement ? `${Number(profile.dailyRequirement).toFixed(1)} Litres / day` : 'Ad-hoc daily order'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Billing Cycle</span>
                  <p className="mt-1 font-semibold text-slate-800">{profile.billingCycle || 'MONTHLY'}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 leading-5">
                <strong className="block font-bold">Delivery Notice:</strong>
                Morning deliveries take place between 5:30 AM and 7:30 AM. To adjust your daily litre quantity or pause delivery during travel, please inform your delivery representative or contact the Sharma Dairy desk.
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS & INVOICES */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Payment History & Receipts</h2>
              <p className="mt-1 text-xs text-slate-500">
                Payments made towards your milk account via Cash, UPI, or Bank Transfer.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3.5">Payment Code</th>
                      <th className="p-3.5">Date Paid</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Reference / Notes</th>
                      <th className="p-3.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono text-xs font-semibold text-slate-700">
                          {p.paymentCode}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {new Date(p.paidAt).toLocaleDateString('en-IN', {
                            dateStyle: 'long',
                          })}
                        </td>
                        <td className="p-3.5">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                            {p.method}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-slate-500">{p.reference || p.notes || 'Payment recorded'}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-950">
                          {formatMoney(p.amount)}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-900">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
                <p className="text-xs text-slate-500">Customer Code: {profile.customerCode}</p>
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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <Mail size={14} className="text-slate-500" />
                  {user.email || 'None on record'}
                </p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Address</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-500 shrink-0" />
                  {profile.address || 'Standard Delivery Route'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Change Account Password</h2>
                <p className="text-xs text-slate-500">Update your security credentials for the Customer Portal</p>
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={pwdBusy}
                className="w-full rounded-xl bg-emerald-950 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60 cursor-pointer"
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
