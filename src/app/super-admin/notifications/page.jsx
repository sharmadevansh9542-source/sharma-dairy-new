'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminNotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/notifications');
      const json = await res.json();
      if (res.ok) setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await fetch('/api/super-admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="notifications" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Alerts</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Platform Notifications Center</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {loading ? (
            <p className="p-8 text-center text-xs text-slate-500">Loading platform alerts...</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">No platform notifications recorded yet.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`p-5 flex items-start justify-between gap-4 ${n.isRead ? '' : 'bg-emerald-50/40'}`}>
                <div>
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 mb-1">
                    {n.type}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(n.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

