'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Milk,
  Tractor,
  LayoutDashboard,
  Calendar,
  Wallet,
  User,
  Lock,
  LogOut,
  ChevronRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

const formatMoney = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val || 0));

export default function FarmerDashboardView({
  user,
  profile,
  collections = [],
  payments = [],
  ledgerSum = 0,
  currentRate = null,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysCollections = collections.filter(
    (c) => new Date(c.collectionAt) >= today
  );
  const todaysLitres = todaysCollections.reduce(
    (acc, c) => acc + Number(c.quantityLitres || 0),
    0
  );
  const todaysAmount = todaysCollections.reduce(
    (acc, c) => acc + Number(c.amount || 0),
    0
  );
  const totalLitresAllTime = collections.reduce(
    (acc, c) => acc + Number(c.quantityLitres || 0),
    0
  );
  const totalPaidOut = payments.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );

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
    { id: 'collections', label: 'Milk Collection History', icon: Milk },
    { id: 'payments', label: 'Payments & Ledger', icon: Wallet },
    { id: 'profile', label: 'Farmer Profile', icon: User },
    { id: 'security', label: 'Account Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full shrink-0 bg-green-950 p-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:flex md:flex-col md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/15 p-2 text-green-200">
              <Milk size={24} />
            </span>
            <div>
              <div className="font-bold tracking-tight">Sharma Dairy</div>
              <p className="text-xs text-green-200">Farmer Portal</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <div className="text-xs text-green-200 uppercase tracking-wider font-semibold">Farmer ID</div>
            <div className="font-mono text-sm font-bold text-white mt-0.5">{profile.farmerCode}</div>
            <div className="text-xs text-green-100/80 mt-1 truncate">{user.fullName}</div>
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
                      : 'text-green-100/80 hover:bg-white/10 hover:text-white'
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
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-green-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
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
            <div className="text-xs font-semibold uppercase tracking-wider text-green-800">
              Farmer Workspace · {profile.village || 'Village Supply'}
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
              Namaste, {user.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your real-time milk collection entries, rates, and direct settlement records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-900 border border-green-200">
              <Tractor size={14} /> Registered Farmer
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
                  <span className="text-xs font-bold uppercase tracking-wider">Today's Milk</span>
                  <span className="rounded-xl bg-green-50 p-2 text-green-800">
                    <Milk size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  {todaysLitres.toFixed(2)} <span className="text-sm font-normal text-slate-500">L</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {todaysCollections.length} shift {todaysCollections.length === 1 ? 'entry' : 'entries'} today (Value: {formatMoney(todaysAmount)})
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Rate Policy</span>
                  <span className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
                    <TrendingUp size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  {currentRate ? `₹${currentRate.fixedRate || 'Formula'}` : '₹60.00'}{' '}
                  <span className="text-sm font-normal text-slate-500">/ Litre</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Standard dairy procurement baseline
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Supply Record</span>
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-800">
                    <Calendar size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  {totalLitresAllTime.toFixed(1)} <span className="text-sm font-normal text-slate-500">L</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Across {collections.length} lifetime collections</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Ledger Net Settlement</span>
                  <span className="rounded-xl bg-amber-50 p-2 text-amber-800">
                    <Wallet size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  {formatMoney(ledgerSum)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Total payments recorded: {formatMoney(totalPaidOut)}
                </p>
              </div>
            </div>

            {/* Recent Collections Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Latest Milk Collection Entries</h2>
                  <p className="text-xs text-slate-500">Recent milk deposits recorded at collection center</p>
                </div>
                <button
                  onClick={() => setActiveTab('collections')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-800 hover:underline"
                >
                  View all history <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Milk Type</th>
                      <th className="p-3">Litres</th>
                      <th className="p-3">Fat % / SNF %</th>
                      <th className="p-3">Rate</th>
                      <th className="p-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collections.slice(0, 5).map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-800">
                          {new Date(col.collectionAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              col.shift === 'MORNING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {col.shift}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{col.milkType?.label || 'Milk'}</td>
                        <td className="p-3 font-bold text-slate-900">{Number(col.quantityLitres).toFixed(2)} L</td>
                        <td className="p-3 text-slate-600">
                          {col.fatPercent != null ? `${Number(col.fatPercent).toFixed(1)}%` : '—'} /{' '}
                          {col.snfPercent != null ? `${Number(col.snfPercent).toFixed(1)}%` : '—'}
                        </td>
                        <td className="p-3 text-slate-600">₹{Number(col.ratePerLitre).toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-green-900">
                          ₹{Number(col.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {collections.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No milk collections recorded yet. Once you deliver milk to the Sharma Dairy center, your entries will appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MILK COLLECTIONS */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Milk Collection History</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of all milk poured, certified fat/SNF, and computed rates.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                Total Records: {collections.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="p-3.5">Collection ID</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Shift</th>
                    <th className="p-3.5">Milk Type</th>
                    <th className="p-3.5">Quantity (L)</th>
                    <th className="p-3.5">Fat % / SNF %</th>
                    <th className="p-3.5">Rate / L</th>
                    <th className="p-3.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-xs text-slate-500">{col.collectionCode || col.id.slice(0, 8)}</td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {new Date(col.collectionAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            col.shift === 'MORNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {col.shift}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{col.milkType?.label || 'Milk'}</td>
                      <td className="p-3.5 font-bold text-slate-900">{Number(col.quantityLitres).toFixed(2)} L</td>
                      <td className="p-3.5 text-slate-600">
                        {col.fatPercent != null ? `${Number(col.fatPercent).toFixed(1)}%` : '—'} /{' '}
                        {col.snfPercent != null ? `${Number(col.snfPercent).toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-3.5 text-slate-700">₹{Number(col.ratePerLitre).toFixed(2)}</td>
                      <td className="p-3.5 text-right font-bold text-green-900">
                        ₹{Number(col.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500">
                        No collection records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS & LEDGER */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Payment & Settlement History</h2>
              <p className="mt-1 text-xs text-slate-500">
                Direct payouts, bank transfers, and cash disbursements received from Sharma Dairy.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3.5">Payment Code</th>
                      <th className="p-3.5">Payment Date</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Reference / Notes</th>
                      <th className="p-3.5 text-right">Amount Received</th>
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
                        <td className="p-3.5 text-xs text-slate-500">{p.reference || p.notes || 'Direct payment'}</td>
                        <td className="p-3.5 text-right font-bold text-green-900">
                          {formatMoney(p.amount)}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No payments recorded yet. Payouts processed by the administrator will be listed here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-green-100 p-3 text-green-900">
                <Tractor size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
                <p className="text-xs text-slate-500">Farmer Code: {profile.farmerCode}</p>
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

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Village / Town</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <Building size={14} className="text-slate-500" />
                  {profile.village || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cattle Type</span>
                <p className="mt-1 font-semibold text-slate-800">{profile.animalType || 'Cow & Buffalo'}</p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Address / Location</span>
                <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-500 shrink-0" />
                  {profile.address || profile.village || 'Sharma Dairy Milk Route'}
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              * To update your official village or contact details, please notify the Sharma Dairy administrator.
            </p>
          </div>
        )}

        {/* TAB 5: SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Change Account Password</h2>
                <p className="text-xs text-slate-500">Update your security credentials for the Farmer Portal</p>
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <button
                type="submit"
                disabled={pwdBusy}
                className="w-full rounded-xl bg-green-950 py-3 text-sm font-semibold text-white shadow hover:bg-green-900 disabled:opacity-60 cursor-pointer"
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
