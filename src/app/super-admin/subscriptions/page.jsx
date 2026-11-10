'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  Edit2,
  Check,
  X,
  Users,
  Building2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/subscriptions');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load subscription plans');
      setPlans(json.plans || []);
      setSubscriptions(json.subscriptions || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(plan) {
    setEditingId(plan.id);
    setEditForm({
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxFarmers: plan.maxFarmers,
      maxCustomers: plan.maxCustomers,
      maxStaff: plan.maxStaff,
      description: plan.description || '',
    });
  }

  async function saveEdit(id) {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update plan');
      setMessage(json.message || 'Plan updated successfully!');
      setEditingId(null);
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="subscriptions" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Monetization</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">SaaS Plans & Subscription Management</h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
          >
            {message}
          </div>
        )}

        {/* Pricing Plans Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Loading SaaS plans...
            </div>
          ) : (
            plans.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between ${
                    p.code === 'PREMIUM'
                      ? 'border-purple-300 bg-gradient-to-b from-purple-50/50 to-white ring-1 ring-purple-200'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 uppercase">{p.code}</span>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit plan pricing & limits"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-4 space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block">Monthly (₹)</label>
                          <input
                            type="number"
                            value={editForm.priceMonthly}
                            onChange={(e) => setEditForm({ ...editForm, priceMonthly: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 p-1.5 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block">Yearly (₹)</label>
                          <input
                            type="number"
                            value={editForm.priceYearly}
                            onChange={(e) => setEditForm({ ...editForm, priceYearly: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 p-1.5 text-xs mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500 block">Farmers</label>
                            <input
                              type="number"
                              value={editForm.maxFarmers}
                              onChange={(e) => setEditForm({ ...editForm, maxFarmers: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500 block">Customers</label>
                            <input
                              type="number"
                              value={editForm.maxCustomers}
                              onChange={(e) => setEditForm({ ...editForm, maxCustomers: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-500 block">Staff</label>
                            <input
                              type="number"
                              value={editForm.maxStaff}
                              onChange={(e) => setEditForm({ ...editForm, maxStaff: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            disabled={busy}
                            onClick={() => saveEdit(p.id)}
                            className="flex-1 rounded-lg bg-emerald-700 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="text-2xl font-extrabold text-slate-900">
                            {p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}`}
                            <span className="text-xs font-normal text-slate-400">/mo</span>
                          </div>
                          {p.priceYearly > 0 && (
                            <p className="text-[11px] text-slate-500 mt-0.5">₹{p.priceYearly}/year (Save ~17%)</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{p.description}</p>
                        </div>

                        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Max Farmers</span>
                            <strong className="text-slate-800">{p.maxFarmers}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Max Customers</span>
                            <strong className="text-slate-800">{p.maxCustomers}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Max Staff</span>
                            <strong className="text-slate-800">{p.maxStaff}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Trial Period</span>
                            <strong className="text-slate-800">{p.trialDays} Days</strong>
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2.5 text-center text-xs text-slate-600 font-semibold border border-slate-100">
                          {p.subscriptionsCount} Active Dairy Tenant(s)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Active Tenant Subscriptions Table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              Tenant Subscription Roster
            </h2>
            <span className="text-xs text-slate-500">{subscriptions.length} Subscribed Dairies</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Dairy Business</th>
                  <th className="p-3.5">Subscribed Plan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Started At</th>
                  <th className="p-3.5">Period Renewal / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{s.dairyName}</span>
                      <span className="font-mono text-slate-400 text-[10px]">{s.dairyCode}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{s.planName}</td>
                    <td className="p-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(s.startDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(s.currentPeriodEnd).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

