'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Pencil,
  Search,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
  Filter,
} from 'lucide-react';
import RecordDetailModal, {
  EditedByAdminBadge,
  StatusBadge,
} from '@/components/record-detail-modal';

const TABS = [
  { id: 'ALL', label: 'All Entries', countKey: 'all' },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verification', countKey: 'pending' },
  { id: 'APPROVED', label: 'Approved', countKey: 'approved' },
  { id: 'REJECTED', label: 'Rejected', countKey: 'rejected' },
  { id: 'EDITED', label: 'Admin Edited', countKey: 'edited' },
];

export default function AdminMilkVerification() {
  const [tab, setTab] = useState('ALL');
  const [submitterFilter, setSubmitterFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, edited: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [banner, setBanner] = useState({ type: '', text: '' });

  // Popups
  const [detailEntry, setDetailEntry] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, entry: null, reason: '' });
  const [editModal, setEditModal] = useState({
    open: false,
    entry: null,
    currentQuantity: '',
    milkType: 'COW',
    session: 'MORNING',
    fatPercent: '',
    snfPercent: '',
    remarks: '',
    reason: '',
  });

  async function loadEntries(activeTab = tab, subType = submitterFilter, query = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      if (subType !== 'ALL') params.set('submitterType', subType);
      if (query.trim()) params.set('search', query.trim());

      const res = await fetch(`/api/milk-entries?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load milk entries');
      setEntries(json.entries || []);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to load entries' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries(tab, submitterFilter, search);
  }, [tab, submitterFilter]);

  async function handleApprove(entry) {
    setBusyId(entry.id);
    setBanner({ type: '', text: '' });
    try {
      const res = await fetch(`/api/milk-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          reason: `Approved by Dairy Admin (${entry.currentQuantity} L ${entry.milkType})`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Approval failed');

      setBanner({
        type: 'success',
        text: `Approved ${entry.entryCode} (${entry.submitterName} · ${Number(entry.currentQuantity).toFixed(2)} L) and posted to stock & ledger.`,
      });
      if (detailEntry?.id === entry.id) setDetailEntry(json.data);
      await loadEntries();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  function openRejectModal(entry) {
    setRejectModal({ open: true, entry, reason: '' });
  }

  async function submitReject(e) {
    e.preventDefault();
    const entry = rejectModal.entry;
    if (!entry) return;
    if (!rejectModal.reason.trim() || rejectModal.reason.trim().length < 3) {
      setBanner({ type: 'error', text: 'Rejection reason is mandatory (at least 3 characters).' });
      return;
    }

    setBusyId(entry.id);
    setBanner({ type: '', text: '' });
    try {
      const res = await fetch(`/api/milk-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          reason: rejectModal.reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rejection failed');

      setBanner({ type: 'success', text: `Rejected entry ${entry.entryCode}.` });
      setRejectModal({ open: false, entry: null, reason: '' });
      if (detailEntry?.id === entry.id) setDetailEntry(json.data);
      await loadEntries();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  function openEditModal(entry) {
    setEditModal({
      open: true,
      entry,
      currentQuantity: String(entry.currentQuantity ?? entry.submittedQuantity ?? ''),
      milkType: entry.milkType || 'COW',
      session: entry.session || 'MORNING',
      fatPercent: entry.fatPercent != null ? String(entry.fatPercent) : '',
      snfPercent: entry.snfPercent != null ? String(entry.snfPercent) : '',
      remarks: entry.remarks || '',
      reason: '',
    });
  }

  async function submitEdit(e) {
    e.preventDefault();
    const entry = editModal.entry;
    if (!entry) return;
    if (!editModal.reason.trim() || editModal.reason.trim().length < 3) {
      setBanner({ type: 'error', text: 'Mandatory edit reason is required when Admin edits a milk entry.' });
      return;
    }

    setBusyId(entry.id);
    setBanner({ type: '', text: '' });
    try {
      const res = await fetch(`/api/milk-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT',
          reason: editModal.reason.trim(),
          currentQuantity: Number(editModal.currentQuantity),
          milkType: editModal.milkType,
          session: editModal.session,
          fatPercent: editModal.fatPercent !== '' ? Number(editModal.fatPercent) : null,
          snfPercent: editModal.snfPercent !== '' ? Number(editModal.snfPercent) : null,
          remarks: editModal.remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save edited details');

      setBanner({
        type: 'success',
        text: `Updated ${entry.entryCode} with Admin edit audit trail (${Number(json.data?.currentQuantity).toFixed(2)} L).`,
      });
      setEditModal((prev) => ({ ...prev, open: false, entry: null, reason: '' }));
      if (detailEntry?.id === entry.id) setDetailEntry(json.data);
      await loadEntries();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-5">
      {/* Summary / Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ClipboardCheck size={20} className="text-green-800" />
              Admin Milk Verification & Corrections
            </h2>
            <p className="text-xs text-slate-500">
              Review daily milk entries submitted by Farmers & Customers. Every Admin edit requires a reason and records immutable audit history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadEntries()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* 5 Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-green-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {summary[t.countKey] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Submitter Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadEntries(tab, submitterFilter, search);
            }}
            className="relative min-w-56 flex-1"
          >
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Entry ID, Farmer or Customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-green-700 focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={submitterFilter}
              onChange={(e) => setSubmitterFilter(e.target.value)}
              aria-label="Filter by User Type"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              <option value="ALL">All User Types</option>
              <option value="FARMER">Farmers Only</option>
              <option value="CUSTOMER">Customers Only</option>
            </select>
          </div>
        </div>
      </div>

      {banner.text && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            banner.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {banner.type === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Entries Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Entry ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">User Type</th>
                <th className="px-4 py-3">Milk Type</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Submitted Qty</th>
                <th className="px-4 py-3">Fat</th>
                <th className="px-4 py-3">SNF</th>
                <th className="px-4 py-3">Current Qty</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    Loading milk verification queue…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    No milk entries match the current filter.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setDetailEntry(entry)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      {entry.entryCode}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{entry.submitterName}</span>
                      {entry.submitterCode && (
                        <small className="block text-xs text-slate-400">{entry.submitterCode}</small>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          entry.submitterType === 'FARMER'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-purple-50 text-purple-800'
                        }`}
                      >
                        {entry.submitterType === 'FARMER' ? 'Farmer' : 'Customer'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{entry.milkType}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.session}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {Number(entry.submittedQuantity).toFixed(2)} L
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.fatPercent != null ? `${Number(entry.fatPercent).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.snfPercent != null ? `${Number(entry.snfPercent).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {Number(entry.currentQuantity).toFixed(2)} L
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={entry.status} />
                        {entry.isEditedByAdmin && <EditedByAdminBadge compact />}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {entry.status === 'PENDING_VERIFICATION' && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === entry.id}
                              onClick={() => handleApprove(entry)}
                              title="Approve entry"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === entry.id}
                              onClick={() => openRejectModal(entry)}
                              title="Reject entry"
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busyId === entry.id}
                          onClick={() => openEditModal(entry)}
                          title="Edit milk details with mandatory reason"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing {entries.length} entries · Click any row to open full verification details & audit history.
        </footer>
      </div>

      {/* Universal Detail Popup */}
      <RecordDetailModal
        open={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        title="Milk Entry Verification Details"
        recordId={detailEntry?.id}
        recordCode={detailEntry?.entryCode}
        recordType="MilkEntry"
        status={detailEntry?.status}
        isEditedByAdmin={detailEntry?.isEditedByAdmin}
        editHistory={detailEntry?.editHistory}
        fields={
          detailEntry
            ? [
                {
                  label: 'Submitted By',
                  value: `${detailEntry.submitterName} (${detailEntry.submitterType === 'FARMER' ? 'Farmer' : 'Customer'})`,
                },
                { label: 'Party Code', value: detailEntry.submitterCode },
                {
                  label: 'Entry Date',
                  value: new Date(detailEntry.entryDate).toLocaleDateString('en-IN', {
                    dateStyle: 'medium',
                  }),
                },
                { label: 'Collection Session', value: detailEntry.session },
                { label: 'Milk Type', value: detailEntry.milkType },
                {
                  label: 'Original Quantity',
                  value: `${Number(detailEntry.submittedQuantity).toFixed(2)} Litres`,
                },
                {
                  label: 'Updated / Current Quantity',
                  value: `${Number(detailEntry.currentQuantity).toFixed(2)} Litres`,
                  highlight: true,
                },
                {
                  label: 'Fat %',
                  value:
                    detailEntry.fatPercent != null
                      ? `${Number(detailEntry.fatPercent).toFixed(1)}%`
                      : null,
                },
                {
                  label: 'SNF %',
                  value:
                    detailEntry.snfPercent != null
                      ? `${Number(detailEntry.snfPercent).toFixed(1)}%`
                      : null,
                },
                {
                  label: 'Rejection Reason',
                  value: detailEntry.rejectionReason,
                  fullWidth: true,
                },
                { label: 'Remarks', value: detailEntry.remarks, fullWidth: true },
              ]
            : []
        }
        auditMeta={
          detailEntry
            ? {
                createdAt: detailEntry.submittedAt || detailEntry.createdAt,
                createdBy: detailEntry.submitterName,
                updatedAt: detailEntry.updatedAt,
                verifiedBy: detailEntry.verifiedByName,
                verifiedAt: detailEntry.verifiedAt,
              }
            : null
        }
        onApprove={
          detailEntry?.status === 'PENDING_VERIFICATION'
            ? () => handleApprove(detailEntry)
            : null
        }
        onReject={
          detailEntry?.status === 'PENDING_VERIFICATION'
            ? () => openRejectModal(detailEntry)
            : null
        }
        onEdit={detailEntry ? () => openEditModal(detailEntry) : null}
      />

      {/* Reject Reason Modal */}
      {rejectModal.open && rejectModal.entry && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
          onClick={() => setRejectModal({ open: false, entry: null, reason: '' })}
        >
          <form
            onSubmit={submitReject}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              Reject Milk Entry ({rejectModal.entry.entryCode})
            </h3>
            <p className="text-xs text-slate-600">
              Submitted by <strong>{rejectModal.entry.submitterName}</strong> ·{' '}
              {Number(rejectModal.entry.currentQuantity).toFixed(2)} L {rejectModal.entry.milkType}
            </p>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Mandatory Rejection Reason *
              <textarea
                rows={3}
                required
                minLength={3}
                placeholder="Explain clearly why this entry is rejected…"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="rounded-xl border border-slate-200 p-3 text-sm focus:border-red-600 focus:outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, entry: null, reason: '' })}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === rejectModal.entry.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === rejectModal.entry.id ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Edit Modal with Mandatory Reason */}
      {editModal.open && editModal.entry && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
          onClick={() => setEditModal((prev) => ({ ...prev, open: false, entry: null }))}
        >
          <form
            onSubmit={submitEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Edit Milk Entry ({editModal.entry.entryCode})
              </h3>
              <p className="text-xs text-slate-600">
                Original Submitted Quantity:{' '}
                <strong>{Number(editModal.entry.submittedQuantity).toFixed(2)} Litres</strong> · Submitted By:{' '}
                <strong>{editModal.entry.submitterName}</strong>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Updated Quantity (Litres) *
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editModal.currentQuantity}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, currentQuantity: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Milk Type *
                <select
                  value={editModal.milkType}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, milkType: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="COW">COW</option>
                  <option value="BUFFALO">BUFFALO</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Session *
                <select
                  value={editModal.session}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, session: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="MORNING">MORNING</option>
                  <option value="EVENING">EVENING</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Fat %
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editModal.fatPercent}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, fatPercent: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  SNF %
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editModal.snfPercent}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, snfPercent: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <label className="grid gap-1 text-xs font-semibold text-slate-700">
              Remarks
              <input
                type="text"
                maxLength={400}
                value={editModal.remarks}
                onChange={(e) => setEditModal((prev) => ({ ...prev, remarks: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-blue-900">
              Mandatory Edit Reason *
              <textarea
                rows={3}
                required
                minLength={3}
                placeholder="e.g. Incorrect quantity entered by farmer."
                value={editModal.reason}
                onChange={(e) => setEditModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModal((prev) => ({ ...prev, open: false, entry: null }))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === editModal.entry.id}
                className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {busyId === editModal.entry.id ? 'Saving…' : 'Save Correction & Audit Log'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

