'use client';

import { useEffect, useState } from 'react';
import {
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const q = filter ? `?entityType=${filter}` : '';
      const res = await fetch(`/api/super-admin/audit-logs${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load audit logs');
      setLogs(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="audit-logs" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Security</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Platform Audit Logs</h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Entity ID</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900">{l.action}</span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{l.entityType}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{l.entityId || '—'}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {l.details ? JSON.stringify(l.details) : '—'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{l.ipAddress || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

