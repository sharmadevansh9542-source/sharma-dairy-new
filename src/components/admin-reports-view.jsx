'use client';

import { useState } from 'react';
import {
  ChartNoAxesCombined,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  Wallet,
  Milk,
  ShoppingBasket,
} from 'lucide-react';

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
    Number(v || 0)
  );

export default function AdminReportsView({ initialSummary, dairyName = 'Sharma Dairy' }) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(initialSummary);
  const [loading, setLoading] = useState(false);

  async function fetchReport(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      const res = await fetch(`/api/reports?from=${from}&to=${toDate.toISOString().split('T')[0]}`);
      const json = await res.json();
      if (res.ok && json.summary) {
        setData(json.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const rows = [
      ['Metric', 'Value'],
      ['Dairy Business', dairyName],
      ['Period Start', from],
      ['Period End', to],
      ['Milk Collected (Litres)', data.collectionLitres],
      ['Collection Cost (INR)', data.collectionValue],
      ['Milk Sold (Litres)', data.salesLitres],
      ['Sales Revenue (INR)', data.salesValue],
      ['Farmer Payments Paid (INR)', data.farmerPayments],
      ['Customer Receipts Collected (INR)', data.customerPayments],
      ['Operating Expenses (INR)', data.expenses],
      ['Estimated Net Operating Margin (INR)', data.estimatedDifference],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dairyName.toLowerCase().replace(/\s+/g, '-')}-financial-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    ['Milk Collected', `${Number(data.collectionLitres || 0).toLocaleString('en-IN')} L`, `${data.collectionCount || 0} entries`, Milk],
    ['Collection Value (COGS)', money(data.collectionValue), 'Payable to farmers', Wallet],
    ['Milk Sold', `${Number(data.salesLitres || 0).toLocaleString('en-IN')} L`, `${data.salesCount || 0} transactions`, ShoppingBasket],
    ['Gross Sales Revenue', money(data.salesValue), 'Total billed milk sales', TrendingUp],
    ['Farmer Payouts', money(data.farmerPayments), 'Cash / UPI / Bank paid out', Wallet],
    ['Customer Receipts', money(data.customerPayments), 'Cash / UPI / Bank received', Wallet],
    ['Operating Expenses', money(data.expenses), 'Transport, electricity, salaries', ChartNoAxesCombined],
    ['Estimated Net Margin', money(data.estimatedDifference), 'Sales − (Milk Cost + Expenses)', TrendingUp],
  ];

  return (
    <div className="space-y-6">
      {/* Filter & Export Controls */}
      <form
        onSubmit={fetchReport}
        className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs print:hidden"
      >
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-slate-300 p-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-slate-300 p-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2.5 font-bold text-white hover:bg-green-900 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Apply Range
          </button>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download size={14} /> Export Excel / CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </form>

      {/* Print Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h2 className="text-xl font-bold">{dairyName} — Financial & Operational Statement</h2>
        <p className="text-sm text-slate-600">
          Period: {from} to {to}
        </p>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, val, detail, Icon], idx) => (
          <article
            key={label}
            className={`rounded-2xl border p-5 shadow-xs ${
              idx === 7
                ? Number(data.estimatedDifference) >= 0
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-rose-300 bg-rose-50'
                : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <Icon size={17} className="text-green-800" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{val}</p>
            <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
          </article>
        ))}
      </div>

      {/* Financial Cashbook Breakdown */}
      <div className="rounded-2xl border bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
          Cashflow & P&L Reconciliation Breakdown
        </h3>
        <div className="grid sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Inflows & Revenue</h4>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Billed Milk Sales Value</span>
              <strong className="text-slate-900">{money(data.salesValue)}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Cash/UPI/Bank Receipts from Customers</span>
              <strong className="text-emerald-700">{money(data.customerPayments)}</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Net Customer Receivables Generated</span>
              <strong className="text-amber-700">
                {money(Number(data.salesValue || 0) - Number(data.customerPayments || 0))}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Outflows & Liabilities</h4>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Milk Collection Cost (Payable to Farmers)</span>
              <strong className="text-slate-900">{money(data.collectionValue)}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Settlement Payouts Made to Farmers</span>
              <strong className="text-emerald-700">{money(data.farmerPayments)}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Operating Expenses</span>
              <strong className="text-rose-700">{money(data.expenses)}</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Net Farmer Payables Generated</span>
              <strong className="text-amber-700">
                {money(Number(data.collectionValue || 0) - Number(data.farmerPayments || 0))}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

