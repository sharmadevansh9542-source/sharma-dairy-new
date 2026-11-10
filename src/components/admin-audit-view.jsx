'use client';

import { useState } from 'react';
import { History, ShieldCheck, Search } from 'lucide-react';
import RecordDetailModal, {
  EditedByAdminBadge,
  StatusBadge,
} from '@/components/record-detail-modal';

export default function AdminAuditView({ editHistory = [], auditLogs = [] }) {
  const [tab, setTab] = useState('edits');
  const [recordTypeFilter, setRecordTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  const recordTypes = Array.from(new Set(editHistory.map((e) => e.recordType))).sort();

  const filteredEdits = editHistory.filter((e) => {
    if (recordTypeFilter !== 'ALL' && e.recordType !== recordTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return JSON.stringify(e).toLowerCase().includes(q);
    }
    return true;
  });

  const filteredLogs = auditLogs.filter((l) => {
    if (!search.trim()) return true;
    return JSON.stringify(l).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <History size={20} className="text-green-800" />
              Admin Edit History & Immutable Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Every Admin modification across Farmers, Customers, Milk Entries, Staff, Sales, and Settings is permanently logged and immutable.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck size={14} /> Immutable Ledger
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setTab('edits')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === 'edits' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Admin Edit History ({editHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === 'logs' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            System Security Audit Log ({auditLogs.length})
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by reason, record ID, admin name, or entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          {tab === 'edits' && (
            <select
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
            >
              <option value="ALL">All Record Types</option>
              {recordTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {tab === 'edits' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Record Type</th>
                  <th className="p-3.5">Record ID</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEdits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No Admin modifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredEdits.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedEdit(row)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="p-3.5 whitespace-nowrap text-slate-700">
                        {new Date(row.performedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900">{row.recordType}</td>
                      <td className="p-3.5 font-mono text-xs text-slate-600">{row.recordId}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={row.action === 'REJECT' ? 'REJECTED' : row.action === 'APPROVE' ? 'APPROVED' : 'ACTIVE'} />
                          {row.action === 'EDIT' && <EditedByAdminBadge compact />}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700">{row.reason}</td>
                      <td className="p-3.5 font-medium text-slate-900">{row.performedByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity Type</th>
                  <th className="p-3.5">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No audit events recorded yet for this dairy.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedLog(r)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="p-3.5 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">{r.actorName || 'System'}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{r.action}</td>
                      <td className="p-3.5 text-slate-700">{r.entityType}</td>
                      <td className="p-3.5 font-mono text-xs text-slate-500">{r.entityId || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail popup for AdminEditHistory row */}
      <RecordDetailModal
        open={Boolean(selectedEdit)}
        onClose={() => setSelectedEdit(null)}
        title={`Admin Edit Audit (${selectedEdit?.recordType || ''})`}
        recordId={selectedEdit?.recordId}
        recordCode={selectedEdit?.id}
        recordType={selectedEdit?.recordType}
        status={selectedEdit?.action}
        isEditedByAdmin={selectedEdit?.action === 'EDIT'}
        editHistory={selectedEdit ? [selectedEdit] : []}
        fields={
          selectedEdit
            ? [
                { label: 'Record Type', value: selectedEdit.recordType },
                { label: 'Target Record ID', value: selectedEdit.recordId },
                { label: 'Action', value: selectedEdit.action },
                { label: 'Performed By', value: selectedEdit.performedByName },
                {
                  label: 'Performed At',
                  value: new Date(selectedEdit.performedAt).toLocaleString('en-IN'),
                },
                { label: 'Mandatory Reason', value: selectedEdit.reason, fullWidth: true },
              ]
            : []
        }
      />

      {/* Detail popup for AuditLog row */}
      <RecordDetailModal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Security & Activity Audit Event"
        recordId={selectedLog?.entityId || selectedLog?.id}
        recordCode={selectedLog?.id}
        recordType={selectedLog?.entityType}
        status={selectedLog?.action}
        fetchAuditHistory={Boolean(selectedLog?.entityType && selectedLog?.entityId)}
        fields={
          selectedLog
            ? [
                { label: 'Actor', value: selectedLog.actorName || 'System' },
                { label: 'Action', value: selectedLog.action },
                { label: 'Entity Type', value: selectedLog.entityType },
                { label: 'Entity ID', value: selectedLog.entityId || '—' },
                { label: 'IP Address', value: selectedLog.ipAddress },
                {
                  label: 'Timestamp',
                  value: new Date(selectedLog.createdAt).toLocaleString('en-IN'),
                },
                {
                  label: 'Before Snapshot',
                  value: selectedLog.before ? JSON.stringify(selectedLog.before) : null,
                  fullWidth: true,
                },
                {
                  label: 'After Snapshot',
                  value: selectedLog.after ? JSON.stringify(selectedLog.after) : null,
                  fullWidth: true,
                },
              ]
            : []
        }
      />
    </section>
  );
}

