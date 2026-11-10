'use client';

import { useEffect, useState } from 'react';
import {
  Milk,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Send,
  Info,
} from 'lucide-react';
import RecordDetailModal, {
  EditedByAdminBadge,
  StatusBadge,
} from '@/components/record-detail-modal';

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MilkEntryPanel({
  roleLabel = 'Farmer',
  defaultMilkType = 'COW',
  showQualityFields = true,
  initialEntries = null,
}) {
  const [entries, setEntries] = useState(Array.isArray(initialEntries) ? initialEntries : []);
  const [loading, setLoading] = useState(!Array.isArray(initialEntries));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [entryDate, setEntryDate] = useState(todayIsoDate);
  const [session, setSession] = useState('MORNING');
  const [milkType, setMilkType] = useState(defaultMilkType || 'COW');
  const [quantity, setQuantity] = useState('');
  const [fatPercent, setFatPercent] = useState('');
  const [snfPercent, setSnfPercent] = useState('');
  const [remarks, setRemarks] = useState('');

  // Modal state
  const [selectedEntry, setSelectedEntry] = useState(null);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await fetch('/api/milk-entries', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load milk entries');
      setEntries(json.entries || []);
    } catch (err) {
      setError(err.message || 'Unable to load submitted milk entries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Array.isArray(initialEntries)) {
      loadEntries();
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid positive milk quantity in litres.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/milk-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate,
          session,
          milkType,
          quantity: qtyNum,
          fatPercent: fatPercent !== '' ? Number(fatPercent) : null,
          snfPercent: snfPercent !== '' ? Number(snfPercent) : null,
          remarks: remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to submit milk entry');
      }

      setSuccess(
        `Milk entry ${json.data?.entryCode || ''} submitted (${qtyNum} L ${milkType}, ${session}). Status: Pending Verification.`
      );
      setQuantity('');
      setFatPercent('');
      setSnfPercent('');
      setRemarks('');
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Failed to submit milk entry');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Milk size={20} className="text-green-800" />
              Submit Daily Milk Entry ({roleLabel})
            </h2>
            <p className="text-xs text-slate-500">
              Submitted entries remain Pending Verification until reviewed by your Dairy Admin.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Admin Approval Required
          </span>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 size={17} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Date *
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Collection Time *
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            >
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Milk Type *
            <select
              value={milkType}
              onChange={(e) => setMilkType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            >
              <option value="COW">Cow Milk</option>
              <option value="BUFFALO">Buffalo Milk</option>
              <option value="OTHER">Other / Mixed</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Milk Quantity (Litres) *
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100000"
              required
              placeholder="e.g. 15"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Fat % {showQualityFields ? '(optional)' : '(optional)'}
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 4.5"
              value={fatPercent}
              onChange={(e) => setFatPercent(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            SNF % (optional)
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 8.5"
              value={snfPercent}
              onChange={(e) => setSnfPercent(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
            Remarks (optional)
            <input
              type="text"
              maxLength={400}
              placeholder="Any delivery notes, container count, or quality note…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-700 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info size={14} className="shrink-0 text-slate-400" />
            Once submitted, only your Dairy Admin can approve, reject, or modify quantities.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
          >
            <Send size={15} />
            {busy ? 'Submitting Entry…' : 'Submit Milk Entry'}
          </button>
        </div>
      </form>

      {/* Submitted Entries History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              My Submitted Milk Entries ({entries.length})
            </h3>
            <p className="text-xs text-slate-500">
              Click any row to view complete submission details, Admin edits, and audit timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={loadEntries}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="p-3">Entry ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Session</th>
                <th className="p-3">Milk Type</th>
                <th className="p-3">Submitted Qty</th>
                <th className="p-3">Current Qty</th>
                <th className="p-3">Fat / SNF</th>
                <th className="p-3">Status & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading submitted milk entries…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No submitted milk entries yet. Use the form above to record today&apos;s milk entry.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="p-3 font-mono text-xs font-bold text-slate-800">
                      {entry.entryCode}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </td>
                    <td className="p-3 text-slate-700">{entry.session}</td>
                    <td className="p-3 font-medium text-slate-700">{entry.milkType}</td>
                    <td className="p-3 text-slate-600">
                      {Number(entry.submittedQuantity).toFixed(2)} L
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {Number(entry.currentQuantity).toFixed(2)} L
                    </td>
                    <td className="p-3 text-slate-600">
                      {entry.fatPercent != null ? `${Number(entry.fatPercent).toFixed(1)}%` : '—'} /{' '}
                      {entry.snfPercent != null ? `${Number(entry.snfPercent).toFixed(1)}%` : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={entry.status} />
                        {entry.isEditedByAdmin && <EditedByAdminBadge compact />}
                      </div>
                      {entry.isEditedByAdmin && entry.latestEdit?.reason && (
                        <p className="mt-1 text-xs text-blue-800">
                          Reason: {entry.latestEdit.reason}
                        </p>
                      )}
                      {entry.status === 'REJECTED' && entry.rejectionReason && (
                        <p className="mt-1 text-xs text-red-700">
                          Rejected: {entry.rejectionReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Detail Popup (Read-only for Farmer / Customer) */}
      <RecordDetailModal
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title="Submitted Milk Entry Details"
        recordId={selectedEntry?.id}
        recordCode={selectedEntry?.entryCode}
        recordType="MilkEntry"
        status={selectedEntry?.status}
        isEditedByAdmin={selectedEntry?.isEditedByAdmin}
        editHistory={selectedEntry?.editHistory}
        fields={
          selectedEntry
            ? [
                {
                  label: 'Entry Date',
                  value: new Date(selectedEntry.entryDate).toLocaleDateString('en-IN', {
                    dateStyle: 'medium',
                  }),
                },
                { label: 'Collection Session', value: selectedEntry.session },
                { label: 'Milk Type', value: selectedEntry.milkType },
                {
                  label: 'Original Submitted Quantity',
                  value: `${Number(selectedEntry.submittedQuantity).toFixed(2)} Litres`,
                },
                {
                  label: 'Current Quantity',
                  value: `${Number(selectedEntry.currentQuantity).toFixed(2)} Litres`,
                  highlight: true,
                },
                {
                  label: 'Fat %',
                  value:
                    selectedEntry.fatPercent != null
                      ? `${Number(selectedEntry.fatPercent).toFixed(1)}%`
                      : null,
                },
                {
                  label: 'SNF %',
                  value:
                    selectedEntry.snfPercent != null
                      ? `${Number(selectedEntry.snfPercent).toFixed(1)}%`
                      : null,
                },
                {
                  label: 'Rejection Reason',
                  value: selectedEntry.rejectionReason,
                  fullWidth: true,
                },
                { label: 'Remarks', value: selectedEntry.remarks, fullWidth: true },
              ]
            : []
        }
        auditMeta={
          selectedEntry
            ? {
                createdAt: selectedEntry.submittedAt || selectedEntry.createdAt,
                createdBy: selectedEntry.submitterName,
                updatedAt: selectedEntry.updatedAt,
                verifiedBy: selectedEntry.verifiedByName,
                verifiedAt: selectedEntry.verifiedAt,
              }
            : null
        }
      />
    </div>
  );
}

