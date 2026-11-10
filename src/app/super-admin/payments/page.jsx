'use client';

import { useEffect, useState } from 'react';
import { Receipt, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/payments');
      const json = await res.json();
      if (res.ok) setPayments(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(paymentId, status) {
    if (!confirm(`Mark SaaS subscription payment as ${status}?`)) return;
    const res = await fetch('/api/super-admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, status }),
    });
    if (res.ok) {
      setMessage(`Payment updated to ${status}.`);
      load();
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="payments" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Billing</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">SaaS Subscription Payments</h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Invoice / Ref</th>
                  <th className="p-3.5">Dairy Business</th>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Loading payments...</td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No commercial SaaS subscription payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{p.invoiceNumber || p.id}</span>
                        <span className="text-[11px] text-slate-400">Ref: {p.transactionRef || '—'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">{p.dairyName}</span>
                        <span className="font-mono text-[10px] text-slate-400">{p.dairyCode}</span>
                      </td>
                      <td className="p-3.5 font-semibold">{p.planName}</td>
                      <td className="p-3.5 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5">{p.method}</td>
                      <td className="p-3.5">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {p.status !== 'COMPLETED' && (
                          <button
                            onClick={() => updateStatus(p.id, 'COMPLETED')}
                            className="rounded-lg bg-emerald-700 px-3 py-1 text-white font-semibold hover:bg-emerald-800 cursor-pointer"
                          >
                            Verify Paid
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
    </div>
  );
}

