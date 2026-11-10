'use client';

import { useState } from 'react';
import { Settings, Plus, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { resolveMilkRate } from '@/lib/calculations/milk';
import RecordDetailModal from '@/components/record-detail-modal';

export default function AdminRateManager({ initialRates = [] }) {
  const [rates, setRates] = useState(initialRates);
  const [selectedRate, setSelectedRate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [milkType, setMilkType] = useState('BUFFALO');
  const [pricingMethod, setPricingMethod] = useState('FAT_BASED');
  const [fixedRate, setFixedRate] = useState('50');
  const [baseRate, setBaseRate] = useState('0');
  const [fatRate, setFatRate] = useState('7.5');
  const [snfRate, setSnfRate] = useState('0');

  // Preview simulator
  const [testFat, setTestFat] = useState('6.5');
  const [testSnf, setTestSnf] = useState('8.5');

  let previewRate = null;
  try {
    previewRate = resolveMilkRate(
      {
        pricingMethod,
        fixedRate: Number(fixedRate),
        baseRate: Number(baseRate),
        fatRate: Number(fatRate),
        snfRate: Number(snfRate),
      },
      { fatPercent: Number(testFat), snfPercent: Number(testSnf) }
    );
  } catch {
    previewRate = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        milkType,
        pricingMethod,
        fixedRate: pricingMethod === 'FIXED' ? Number(fixedRate) : null,
        baseRate: pricingMethod !== 'FIXED' ? Number(baseRate || 0) : null,
        fatRate: pricingMethod !== 'FIXED' ? Number(fatRate) : null,
        snfRate: pricingMethod === 'FAT_SNF_BASED' ? Number(snfRate) : null,
      };

      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save milk rate');

      setMessage(json.message || 'Milk rate policy saved successfully!');
      setShowForm(false);

      const listRes = await fetch('/api/rates');
      const listJson = await listRes.json();
      if (listRes.ok && listJson.data) setRates(listJson.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Settings size={18} className="text-green-800" />
            Milk Rate Policy & Fat/SNF Engine
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Configure flat rates or automated Fat/SNF pricing formulas. Historical collections strictly preserve the rate captured at entry.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
        >
          <Plus size={15} /> {showForm ? 'Close Editor' : 'Configure New Rate'}
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
        <form onSubmit={handleSubmit} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">New Milk Pricing Rule</h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Milk Type</label>
              <select
                value={milkType}
                onChange={(e) => setMilkType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 outline-none focus:border-green-800"
              >
                <option value="COW">Cow Milk</option>
                <option value="BUFFALO">Buffalo Milk</option>
                <option value="OTHER">Other Milk</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Pricing Method</label>
              <select
                value={pricingMethod}
                onChange={(e) => setPricingMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 outline-none focus:border-green-800"
              >
                <option value="FIXED">Flat Fixed Rate (₹/L)</option>
                <option value="FAT_BASED">Fat-Based Formula</option>
                <option value="FAT_SNF_BASED">Combined Fat + SNF Formula</option>
              </select>
            </div>

            {pricingMethod === 'FIXED' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fixed Rate (₹ / Litre)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fixedRate}
                  onChange={(e) => setFixedRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none focus:border-green-800"
                />
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Rate (₹ / Litre)</label>
                <input
                  type="number"
                  step="0.01"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none focus:border-green-800"
                />
              </div>
            )}

            {pricingMethod !== 'FIXED' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fat Multiplier (₹ per 1% Fat)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={fatRate}
                  onChange={(e) => setFatRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none focus:border-green-800"
                />
              </div>
            )}

            {pricingMethod === 'FAT_SNF_BASED' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">SNF Multiplier (₹ per 1% SNF)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={snfRate}
                  onChange={(e) => setSnfRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none focus:border-green-800"
                />
              </div>
            )}
          </div>

          {/* Live Simulator */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calculator size={16} className="text-green-800" />
              Rate Preview Calculator:
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                Fat %:
                <input
                  type="number"
                  step="0.1"
                  value={testFat}
                  onChange={(e) => setTestFat(e.target.value)}
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1.5">
                SNF %:
                <input
                  type="number"
                  step="0.1"
                  value={testSnf}
                  onChange={(e) => setTestSnf(e.target.value)}
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1"
                />
              </label>
              <div className="rounded-lg bg-green-800 text-white px-3 py-1 font-bold">
                Result: {previewRate != null ? `₹${previewRate.toFixed(2)} / L` : 'Invalid'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Activating...' : 'Activate New Rate Policy'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Historical Rates Table */}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
            <tr>
              <th className="p-3.5">Milk Type</th>
              <th className="p-3.5">Method</th>
              <th className="p-3.5">Base / Fixed Rate</th>
              <th className="p-3.5">Fat Coeff</th>
              <th className="p-3.5">SNF Coeff</th>
              <th className="p-3.5">Effective From</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedRate(r)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="p-3.5 font-bold text-slate-900">{r.milkType?.label || r.milkTypeId}</td>
                <td className="p-3.5">{r.pricingMethod}</td>
                <td className="p-3.5 font-semibold">
                  {r.fixedRate != null ? `₹${Number(r.fixedRate).toFixed(2)}` : `Base ₹${Number(r.baseRate || 0).toFixed(2)}`}
                </td>
                <td className="p-3.5">{r.fatRate != null ? Number(r.fatRate) : '—'}</td>
                <td className="p-3.5">{r.snfRate != null ? Number(r.snfRate) : '—'}</td>
                <td className="p-3.5 text-slate-500">{new Date(r.effectiveFrom).toLocaleDateString('en-IN')}</td>
                <td className="p-3.5">
                  {!r.effectiveTo ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Current Active
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Closed {new Date(r.effectiveTo).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rates.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-500">
            No custom milk rate rules configured yet. Click "Configure New Rate" to set your pricing policy.
          </p>
        )}
      </div>

      <RecordDetailModal
        open={Boolean(selectedRate)}
        onClose={() => setSelectedRate(null)}
        title="Milk Rate Policy Details"
        recordId={selectedRate?.id}
        recordType="MilkRate"
        status={selectedRate ? (!selectedRate.effectiveTo ? 'ACTIVE' : 'INACTIVE') : null}
        fields={
          selectedRate
            ? [
                { label: 'Milk Type', value: selectedRate.milkType?.label || selectedRate.milkTypeId },
                { label: 'Pricing Method', value: selectedRate.pricingMethod },
                {
                  label: 'Fixed Rate',
                  value: selectedRate.fixedRate != null ? `₹${Number(selectedRate.fixedRate).toFixed(2)}/L` : null,
                  highlight: true,
                },
                {
                  label: 'Base Rate',
                  value: selectedRate.baseRate != null ? `₹${Number(selectedRate.baseRate).toFixed(2)}/L` : null,
                },
                { label: 'Fat Multiplier', value: selectedRate.fatRate != null ? String(selectedRate.fatRate) : null },
                { label: 'SNF Multiplier', value: selectedRate.snfRate != null ? String(selectedRate.snfRate) : null },
                {
                  label: 'Effective From',
                  value: new Date(selectedRate.effectiveFrom).toLocaleString('en-IN'),
                },
                {
                  label: 'Effective To',
                  value: selectedRate.effectiveTo ? new Date(selectedRate.effectiveTo).toLocaleString('en-IN') : 'Currently Active',
                },
              ]
            : []
        }
        auditMeta={selectedRate ? { createdAt: selectedRate.createdAt } : null}
      />
    </div>
  );
}

