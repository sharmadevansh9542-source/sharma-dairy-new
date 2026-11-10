'use client';

import { useEffect, useState } from 'react';
import {
  UserCheck,
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminRegistrationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/super-admin/registrations?status=${statusFilter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load registration requests');
      setRequests(json.data || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function approve(id) {
    if (!confirm('Approve this dairy registration application? This will create a dedicated tenant and admin login.')) {
      return;
    }
    setBusyId(id);
    setMessage('');
    try {
      const res = await fetch(`/api/super-admin/registrations/${id}/approve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Approval failed');
      setMessage(json.message || 'Dairy approved successfully!');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!rejectingId) return;
    setBusyId(rejectingId);
    setMessage('');
    try {
      const res = await fetch(`/api/super-admin/registrations/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rejection failed');
      setMessage(json.message || 'Application rejected.');
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="registrations" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Onboarding</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Dairy Registration Pipeline</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="PENDING_APPROVAL">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Applications</option>
            </select>
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
          >
            {message}
          </div>
        )}

        {/* Modal for Reject Reason */}
        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Reject Dairy Application</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please provide the reason for declining this dairy onboarding request.
              </p>
              <form onSubmit={submitReject} className="mt-4 space-y-4">
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Incomplete address documentation, unverified business contact..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-rose-700 focus:ring-1 focus:ring-rose-200"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason('');
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busyId === rejectingId}
                    className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {busyId === rejectingId ? 'Declining...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Loading registration applications...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              No registration requests under "{statusFilter}".
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 transition hover:border-slate-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-800 border border-emerald-100">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{r.dairyName}</h3>
                      <p className="text-xs text-slate-500">
                        Type: {r.businessType || 'Private Dairy'} · Submitted on{' '}
                        {new Date(r.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 ${
                      r.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : r.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {r.status === 'PENDING_APPROVAL' && <Clock size={13} />}
                    {r.status === 'APPROVED' && <CheckCircle2 size={13} />}
                    {r.status === 'REJECTED' && <XCircle size={13} />}
                    {r.status}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">
                      Business Details
                    </span>
                    <p className="font-semibold text-slate-800">Owner: {r.ownerName}</p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      {r.businessEmail}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {r.phone}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">
                      Administrator Account
                    </span>
                    <p className="font-semibold text-slate-800">Admin: {r.adminFullName}</p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      {r.adminEmail}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {r.adminPhone || 'Same as business'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">
                      Location & Details
                    </span>
                    <p className="text-slate-700 flex items-start gap-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {r.address || 'No street address'}, {r.city || ''} {r.state || ''} {r.pincode ? `(${r.pincode})` : ''}
                      </span>
                    </p>
                    {r.description && <p className="text-slate-500 italic mt-1">{r.description}</p>}
                    {r.rejectionReason && (
                      <p className="text-rose-700 font-semibold mt-1">Declined: {r.rejectionReason}</p>
                    )}
                  </div>
                </div>

                {r.status === 'PENDING_APPROVAL' && (
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setRejectingId(r.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => approve(r.id)}
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      {busyId === r.id ? 'Approving...' : 'Approve & Create Tenant'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

