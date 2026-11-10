'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Milk,
  Filter,
} from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';
import RecordDetailModal from '@/components/record-detail-modal';

export default function SuperAdminDairiesPage() {
  const [dairies, setDairies] = useState([]);
  const [selectedDairy, setSelectedDairy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);

      const res = await fetch(`/api/super-admin/dairies?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load dairies');
      setDairies(json.data || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function toggleStatus(dairyId, newStatus) {
    if (!confirm(`Are you sure you want to change the status of this dairy to ${newStatus}?`)) {
      return;
    }
    setBusyId(dairyId);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/dairies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dairyId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update dairy status');
      setMessage(json.message || 'Status updated successfully');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="dairies" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Dairies</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Registered Dairy Businesses</h1>
          </div>
          <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">
            {dairies.length} Businesses Listed
          </span>
        </header>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
          >
            {message}
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="relative flex-1 min-w-56"
          >
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by dairy name, code, owner, email or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-slate-800"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Active / Approved</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Dairies List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4">Dairy Enterprise</th>
                  <th className="p-4">Owner & Contact</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Subscription</th>
                  <th className="p-4">Active Farmers</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      Loading registered dairies...
                    </td>
                  </tr>
                ) : dairies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No dairy businesses match your criteria.
                    </td>
                  </tr>
                ) : (
                  dairies.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDairy(d)}
                      className="cursor-pointer hover:bg-slate-50/70 transition"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800 border border-emerald-100">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{d.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              Code: {d.code} · /{d.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 block">{d.ownerName}</span>
                        <span className="text-slate-500 text-[11px] block">{d.email || 'No email'}</span>
                        <span className="text-slate-400 text-[11px] block">{d.phone || 'No phone'}</span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {d.city ? `${d.city}, ${d.state || ''}` : 'Unspecified'}
                      </td>
                      <td className="p-4">
                        {d.currentSubscription ? (
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {d.currentSubscription.planName}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold inline-block ${
                                d.currentSubscription.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {d.currentSubscription.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">No active plan</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Users size={14} className="text-slate-400" />
                          <span>{d.stats.totalFarmers} Farmers</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {d.stats.totalCollections} milk collections
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 ${
                            d.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {d.status === 'APPROVED' ? (
                            <CheckCircle2 size={12} className="text-emerald-700" />
                          ) : (
                            <AlertTriangle size={12} className="text-rose-700" />
                          )}
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {d.status === 'APPROVED' ? (
                          <button
                            disabled={busyId === d.id}
                            onClick={() => toggleStatus(d.id, 'SUSPENDED')}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                          >
                            {busyId === d.id ? 'Suspending...' : 'Suspend Dairy'}
                          </button>
                        ) : (
                          <button
                            disabled={busyId === d.id}
                            onClick={() => toggleStatus(d.id, 'APPROVED')}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
                          >
                            {busyId === d.id ? 'Activating...' : 'Re-Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <RecordDetailModal
        open={Boolean(selectedDairy)}
        onClose={() => setSelectedDairy(null)}
        title="Dairy Business Details"
        recordId={selectedDairy?.id}
        recordCode={selectedDairy?.code}
        recordType="Dairy"
        status={selectedDairy?.status}
        fields={
          selectedDairy
            ? [
                { label: 'Dairy Name', value: selectedDairy.name },
                { label: 'Code / Slug', value: `${selectedDairy.code} (/${selectedDairy.slug})` },
                { label: 'Owner Name', value: selectedDairy.ownerName },
                { label: 'Email', value: selectedDairy.email },
                { label: 'Phone', value: selectedDairy.phone },
                { label: 'City / State', value: [selectedDairy.city, selectedDairy.state].filter(Boolean).join(', ') },
                { label: 'Plan', value: selectedDairy.currentSubscription?.planName },
                { label: 'Farmers / Collections', value: `${selectedDairy.stats?.totalFarmers || 0} farmers · ${selectedDairy.stats?.totalCollections || 0} collections` },
              ]
            : []
        }
      />
    </div>
  );
}

