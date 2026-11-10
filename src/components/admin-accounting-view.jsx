'use client';

import { useState } from 'react';
import { BookOpen, Landmark, Wallet, Plus, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import RecordDetailModal from '@/components/record-detail-modal';

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
    Number(v || 0)
  );

export default function AdminAccountingView({ initialData }) {
  const [data, setData] = useState(initialData);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [debitAccountCode, setDebitAccountCode] = useState('1001');
  const [creditAccountCode, setCreditAccountCode] = useState('1002');
  const [amount, setAmount] = useState('');

  async function refresh() {
    const res = await fetch('/api/accounting');
    const json = await res.json();
    if (res.ok) setData(json);
  }

  async function submitJournal(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          debitAccountCode,
          creditAccountCode,
          amount: Number(amount),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to post journal entry');
      setMessage(json.message);
      setDescription('');
      setAmount('');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const s = data.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-green-800" />
            Financial Accounting, Cashbook & Double-Entry Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Isolated dairy business books: Cashbook, Bankbook, Payables, Receivables, and balanced Journal Entries.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-green-900 cursor-pointer"
        >
          <Plus size={15} /> Post Journal Entry
        </button>
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

      {showForm && (
        <form onSubmit={submitJournal} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">Post Balanced Double-Entry Journal</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Debit Account (Dr)</label>
              <select
                value={debitAccountCode}
                onChange={(e) => setDebitAccountCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                {(data.accounts || []).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Credit Account (Cr)</label>
              <select
                value={creditAccountCode}
                onChange={(e) => setCreditAccountCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                {(data.accounts || []).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Narration / Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Cash deposit to bank"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900">
              {busy ? 'Posting...' : 'Post Balanced Entry'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cashbook, Bankbook, Receivables & Payables */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Cashbook Balance</span>
            <Wallet size={17} className="text-emerald-700" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{money(s.cashbookBalance)}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            In: {money(s.cashIn)} · Out: {money(s.cashOut)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Bankbook (UPI / Transfer)</span>
            <Landmark size={17} className="text-blue-700" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{money(s.bankbookBalance)}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            In: {money(s.bankIn)} · Out: {money(s.bankOut)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Farmer Payables / Cust Receivables</span>
            <BookOpen size={17} className="text-amber-700" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-800">
            Payables: <span className="text-rose-700">{money(s.farmerPayables)}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            Receivables: <span className="text-emerald-700">{money(s.customerReceivables)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Operating P&L Summary</span>
            <TrendingUp size={17} className="text-emerald-800" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-emerald-950">{money(s.netProfit)}</p>
          <p className="mt-1 text-[11px] text-emerald-800">
            Rev: {money(s.revenue)} − Cost: {money(s.milkCost + s.expenses)}
          </p>
        </div>
      </div>

      {/* Chart of Accounts & Journal Entries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b bg-slate-50 font-bold text-xs text-slate-700 uppercase">Chart of Accounts</div>
          <table className="w-full text-xs text-left">
            <thead className="border-b text-[10px] uppercase text-slate-400">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Account Name</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Manual Ledger Bal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.accounts || []).map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedAccount(a)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3 font-mono font-bold text-slate-700">{a.code}</td>
                  <td className="p-3 font-semibold text-slate-900">{a.name}</td>
                  <td className="p-3 text-[11px] text-slate-500">{a.type}</td>
                  <td className="p-3 text-right font-bold">{money(a.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b bg-slate-50 font-bold text-xs text-slate-700 uppercase">Recent Journal Entries</div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {(data.journalEntries || []).map((j) => (
              <div key={j.id} className="p-4 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{j.entryNumber} — {j.description}</span>
                  <span className="text-[11px] text-slate-400">{new Date(j.entryDate).toLocaleDateString('en-IN')}</span>
                </div>
                {j.lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-[11px] text-slate-600 pl-3">
                    <span>{l.account.code} {l.account.name}</span>
                    <span>{l.debit > 0 ? `Dr ${money(l.debit)}` : `Cr ${money(l.credit)}`}</span>
                  </div>
                ))}
              </div>
            ))}
            {(!data.journalEntries || data.journalEntries.length === 0) && (
              <p className="p-8 text-center text-xs text-slate-400">No manual journal entries posted yet.</p>
            )}
          </div>
        </div>
      </div>

      <RecordDetailModal
        open={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        title="Chart of Accounts Ledger"
        recordId={selectedAccount?.id}
        recordCode={selectedAccount?.code}
        recordType="Account"
        status="ACTIVE"
        fields={
          selectedAccount
            ? [
                { label: 'Account Code', value: selectedAccount.code },
                { label: 'Account Name', value: selectedAccount.name },
                { label: 'Account Type', value: selectedAccount.type },
                { label: 'System Account', value: selectedAccount.isSystem ? 'Yes' : 'No' },
                { label: 'Manual Ledger Balance', value: money(selectedAccount.balance), highlight: true },
              ]
            : []
        }
      />
    </div>
  );
}

