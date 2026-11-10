'use client';

import { useState } from 'react';
import { Building2, CheckCircle2, AlertCircle, CreditCard, Sparkles } from 'lucide-react';

export default function AdminSettingsManager({ initialDairy, initialSubscription }) {
  const [dairy, setDairy] = useState(initialDairy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const settingsObj = (dairy?.settings && typeof dairy.settings === 'object') ? dairy.settings : {};

  const [form, setForm] = useState({
    name: dairy?.name || '',
    ownerName: dairy?.ownerName || '',
    email: dairy?.email || '',
    phone: dairy?.phone || '',
    address: dairy?.address || '',
    city: dairy?.city || '',
    state: dairy?.state || '',
    pincode: dairy?.pincode || '',
    logoUrl: dairy?.logoUrl || '',
    invoiceHeader: settingsObj.invoiceHeader || '',
    invoiceFooter: settingsObj.invoiceFooter || 'Thank you for choosing pure quality dairy.',
    whatsappEnabled: Boolean(settingsObj.whatsappEnabled),
    autoInvoicing: settingsObj.autoInvoicing !== false,
  });

  async function saveSettings(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update settings');
      setDairy(json.data);
      setMessage(json.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-950 to-green-900 p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
            <Sparkles size={14} /> Active SaaS Subscription
          </div>
          <h2 className="text-xl font-extrabold">
            {initialSubscription?.plan?.name || 'Enterprise SaaS'}
          </h2>
          <p className="text-xs text-emerald-200">
            Dairy Tenant Code: <span className="font-mono font-bold text-white">{dairy?.code}</span> · Status:{' '}
            <span className="font-bold text-white">{initialSubscription?.status || 'ACTIVE'}</span>
          </p>
        </div>

        <div className="text-right text-xs space-y-1">
          <span className="block text-emerald-200">Farmer Onboarding Link:</span>
          <code className="block rounded-lg bg-black/30 px-3 py-1.5 font-mono text-[11px] text-emerald-300">
            /register/farmer?dairy={dairy?.code}
          </code>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={saveSettings} className="rounded-2xl border bg-white p-6 shadow-xs space-y-6">
        <div className="border-b pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building2 size={17} className="text-green-800" />
            Dairy Brand & Invoice Customization
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            These details are used across your isolated workspace, collection slips, and customer invoices.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dairy Display Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Owner / Authorized Signatory *</label>
            <input
              type="text"
              required
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Business Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Support Mobile Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">State & PIN Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="flex-1 rounded-xl border border-slate-300 p-2.5"
              />
              <input
                type="text"
                placeholder="PIN"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="w-24 rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Full Registered Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Invoice / Slip Header Notice</label>
            <input
              type="text"
              placeholder="e.g. FSSAI Reg No: 12345678901234 · GSTIN: 09ABCDE..."
              value={form.invoiceHeader}
              onChange={(e) => setForm({ ...form, invoiceHeader: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Invoice / Receipt Footer Message</label>
            <input
              type="text"
              value={form.invoiceFooter}
              onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2 text-xs">
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappEnabled}
              onChange={(e) => setForm({ ...form, whatsappEnabled: e.target.checked })}
              className="h-4 w-4 rounded text-green-800"
            />
            Enable Automated WhatsApp Collection & Payment Receipts (when credentials configured)
          </label>
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoInvoicing}
              onChange={(e) => setForm({ ...form, autoInvoicing: e.target.checked })}
              className="h-4 w-4 rounded text-green-800"
            />
            Generate Monthly Customer Billing Automatically
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-green-800 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-green-900 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Saving Branding...' : 'Save Dairy Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

