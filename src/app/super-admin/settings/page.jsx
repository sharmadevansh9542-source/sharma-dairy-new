'use client';

import { useEffect, useState } from 'react';
import { Settings, Database, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'Sharma Dairy SaaS ERP',
    supportEmail: 'support@sharmadairy.com',
    defaultTrialDays: 14,
    gracePeriodDays: 7,
    maintenanceMode: false,
    allowPublicDairyRegistration: true,
  });
  const [backupData, setBackupData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [sRes, bRes] = await Promise.all([
      fetch('/api/super-admin/settings'),
      fetch('/api/super-admin/backup'),
    ]);
    const sJson = await sRes.json();
    const bJson = await bRes.json();
    if (sRes.ok && sJson.settings) setSettings(sJson.settings);
    if (bRes.ok) setBackupData(bJson);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (res.ok) setMessage(json.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBackupCheck() {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/backup', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setMessage(json.message);
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="settings" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Configuration</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">System Settings & Backup Health</h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Global SaaS Settings */}
          <form onSubmit={saveSettings} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
              <Settings size={16} className="text-emerald-700" />
              Global SaaS Configuration
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Platform Display Name</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Platform Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Trial Duration (Days)</label>
                  <input
                    type="number"
                    value={settings.defaultTrialDays}
                    onChange={(e) => setSettings({ ...settings, defaultTrialDays: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Grace Period (Days)</label>
                  <input
                    type="number"
                    value={settings.gracePeriodDays}
                    onChange={(e) => setSettings({ ...settings, gracePeriodDays: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicDairyRegistration}
                  onChange={(e) => setSettings({ ...settings, allowPublicDairyRegistration: e.target.checked })}
                  className="h-4 w-4 rounded text-emerald-700"
                />
                Allow Public Dairy Business Onboarding (/register-dairy)
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Saving...' : 'Save Global Settings'}
            </button>
          </form>

          {/* Database Health & Backup Verification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Database Integrity & Backup Verification
              </h2>
              <button
                onClick={runBackupCheck}
                disabled={busy}
                className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
              >
                Verify & Log Checkpoint
              </button>
            </div>

            {backupData?.health && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {Object.entries(backupData.health.tableCounts || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="uppercase text-[10px] font-bold text-slate-400 block">{k}</span>
                    <span className="text-lg font-extrabold text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase text-slate-500">Recent Verification Checkpoints</h3>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto text-xs">
                {(backupData?.backupHistory || []).map((log) => (
                  <div key={log.id} className="py-2 flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-600" /> Integrity Checked
                    </span>
                    <span className="text-[11px]">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {(!backupData?.backupHistory || backupData.backupHistory.length === 0) && (
                  <p className="py-4 text-slate-400">No verification checkpoints logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

