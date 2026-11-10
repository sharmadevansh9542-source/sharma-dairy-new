'use client';

import { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Pencil,
  Printer,
  History,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const STATUS_STYLES = {
  PENDING_VERIFICATION: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_APPROVAL: 'border-amber-200 bg-amber-50 text-amber-800',
  TRIAL: 'border-amber-200 bg-amber-50 text-amber-800',
  PAST_DUE: 'border-amber-200 bg-amber-50 text-amber-800',
  PAUSED: 'border-amber-200 bg-amber-50 text-amber-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ISSUED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  RECORDED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-red-200 bg-red-50 text-red-800',
  SUSPENDED: 'border-red-200 bg-red-50 text-red-800',
  INACTIVE: 'border-red-200 bg-red-50 text-red-800',
  EXPIRED: 'border-red-200 bg-red-50 text-red-800',
};

const STATUS_LABELS = {
  PENDING_VERIFICATION: 'Pending Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toUpperCase().replace(/\s+/g, '_');
  const style = STATUS_STYLES[key] || 'border-slate-200 bg-slate-100 text-slate-700';
  const label = STATUS_LABELS[key] || String(status).replaceAll('_', ' ');
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

export function EditedByAdminBadge({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
      <Pencil size={11} />
      {compact ? 'Edited' : 'Edited by Admin'}
    </span>
  );
}

function formatDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.length ? val.join(', ') : null;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function renderDiffPairs(oldValues, newValues) {
  const oldObj = oldValues && typeof oldValues === 'object' ? oldValues : {};
  const newObj = newValues && typeof newValues === 'object' ? newValues : {};
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  if (keys.length === 0) return null;

  const changed = keys.filter((k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]));
  const displayKeys = changed.length > 0 ? changed : keys;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {displayKeys.map((key) => {
        const before = formatValue(oldObj[key]);
        const after = formatValue(newObj[key]);
        return (
          <div key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
            <p className="font-semibold capitalize text-slate-600">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {before !== null && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">
                  {before}
                </span>
              )}
              {before !== null && after !== null && <ArrowRight size={12} className="text-slate-400" />}
              {after !== null && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                  {after}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Universal responsive detail modal triggered on row clicks across all tables.
 */
export default function RecordDetailModal({
  open,
  onClose,
  title = 'Record Details',
  recordId,
  recordCode,
  recordType,
  status,
  isEditedByAdmin = false,
  fields = [],
  auditMeta = null,
  editHistory: initialEditHistory = null,
  fetchAuditHistory = true,
  onEdit = null,
  onApprove = null,
  onReject = null,
  allowPrint = true,
  extraActions = null,
}) {
  const [history, setHistory] = useState(Array.isArray(initialEditHistory) ? initialEditHistory : []);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (Array.isArray(initialEditHistory)) {
      setHistory(initialEditHistory);
    }
  }, [initialEditHistory]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !fetchAuditHistory || !recordType || !recordId) return;
    let cancelled = false;
    setLoadingHistory(true);
    fetch(
      `/api/audit-history?recordType=${encodeURIComponent(recordType)}&recordId=${encodeURIComponent(recordId)}`,
      { cache: 'no-store' }
    )
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (!cancelled && Array.isArray(json.data)) {
          setHistory(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchAuditHistory, recordType, recordId]);

  if (!open) return null;

  const nonEmptyFields = fields.filter(
    (f) => f && f.value !== null && f.value !== undefined && f.value !== '' && f.value !== '—'
  );

  const editEntries = history.filter((h) => ['EDIT', 'UPDATE', 'ADJUST'].includes(h.action));
  const showEditedBadge = isEditedByAdmin || editEntries.length > 0;
  const latestEdit = editEntries[0] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {status && <StatusBadge status={status} />}
              {showEditedBadge && <EditedByAdminBadge />}
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">
              ID: {recordCode || recordId || '—'}
              {recordCode && recordId && recordCode !== recordId ? ` (${recordId})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail popup"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Detail Section */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Record Information
            </h3>
            {nonEmptyFields.length === 0 ? (
              <p className="text-sm text-slate-500">No additional fields recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nonEmptyFields.map((field, idx) => (
                  <div
                    key={`${field.label}-${idx}`}
                    className={`rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 ${
                      field.fullWidth ? 'sm:col-span-2 lg:col-span-3' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-slate-500">{field.label}</p>
                    <p
                      className={`mt-0.5 break-words text-sm font-semibold ${
                        field.highlight ? 'text-green-800' : 'text-slate-900'
                      }`}
                    >
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Latest Admin Correction Highlight */}
          {latestEdit && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-blue-700" />
                  <h3 className="text-sm font-bold text-blue-950">Admin Modification Summary</h3>
                  <EditedByAdminBadge compact />
                </div>
                <span className="text-xs font-medium text-blue-800">
                  {formatDateTime(latestEdit.performedAt)}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-xs text-blue-950 sm:grid-cols-2">
                <p>
                  <span className="font-semibold">Edited By:</span> {latestEdit.performedByName}
                </p>
                <p>
                  <span className="font-semibold">Edit Reason:</span> {latestEdit.reason}
                </p>
              </div>
              {renderDiffPairs(latestEdit.oldValues, latestEdit.newValues)}
            </section>
          )}

          {/* Audit Section */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Audit Metadata & Edit History
              </h3>
            </div>

            {auditMeta && (
              <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                {auditMeta.createdAt && (
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="block text-slate-400">Created At</span>
                    <span className="font-semibold">{formatDateTime(auditMeta.createdAt)}</span>
                  </div>
                )}
                {auditMeta.createdBy && (
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="block text-slate-400">Created By</span>
                    <span className="font-semibold">{auditMeta.createdBy}</span>
                  </div>
                )}
                {auditMeta.updatedAt && (
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="block text-slate-400">Last Updated</span>
                    <span className="font-semibold">{formatDateTime(auditMeta.updatedAt)}</span>
                  </div>
                )}
                {auditMeta.verifiedBy && (
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="block text-slate-400">Verified By</span>
                    <span className="font-semibold">
                      {auditMeta.verifiedBy}
                      {auditMeta.verifiedAt ? ` (${formatDateTime(auditMeta.verifiedAt)})` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3">
              {loadingHistory ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} className="animate-spin" /> Loading audit history…
                </p>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No Admin modifications recorded for this item yet.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                            {item.action}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.performedByName}
                          </span>
                        </div>
                        <span className="text-slate-500">{formatDateTime(item.performedAt)}</span>
                      </div>
                      <p className="mt-1.5 flex items-start gap-1.5 text-slate-700">
                        <AlertCircle size={13} className="mt-0.5 shrink-0 text-slate-400" />
                        <span>
                          <strong>Reason:</strong> {item.reason}
                        </span>
                      </p>
                      {renderDiffPairs(item.oldValues, item.newValues)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <CheckCircle2 size={15} /> Approve
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                <XCircle size={15} /> Reject
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Pencil size={15} /> Edit
              </button>
            )}
            {extraActions}
          </div>

          <div className="flex items-center gap-2">
            {allowPrint && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Printer size={15} /> Print
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

