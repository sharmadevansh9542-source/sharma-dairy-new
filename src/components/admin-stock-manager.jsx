'use client';

import { useState } from 'react';
import { Boxes, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import RecordDetailModal from '@/components/record-detail-modal';

export default function AdminStockManager({ initialTypes = [], initialTotals = [], initialMovements = [] }) {
  const [types, setTypes] = useState(initialTypes);
  const [movements, setMovements] = useState(initialMovements);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [milkType, setMilkType] = useState('COW');
  const [movementType, setMovementType] = useState('LOSS');
  const [quantityLitres, setQuantityLitres] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const res = await fetch('/api/stock');
    const json = await res.json();
    if (res.ok) {
      setTypes(json.data || []);
      setMovements(json.movements || []);
    }
  }

  async function submitAdjustment(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milkType,
          movementType,
          quantityLitres: Number(quantityLitres),
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to adjust stock');
      setMessage('Stock movement recorded successfully.');
      setQuantityLitres('');
      setNotes('');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Boxes size={18} className="text-green-800" />
            Raw Milk Inventory & Tank Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track collection inflows, sales outflows, processing losses, and physical adjustments.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-900 cursor-pointer"
        >
          <Plus size={15} /> Record Stock Adjustment / Loss
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
        <form onSubmit={submitAdjustment} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Record Stock Movement</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Milk Type</label>
              <select
                value={milkType}
                onChange={(e) => setMilkType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="COW">Cow Milk</option>
                <option value="BUFFALO">Buffalo Milk</option>
                <option value="OTHER">Other Milk</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Operation Type</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="OPENING_STOCK">Opening Stock (+)</option>
                <option value="ADJUSTMENT">Physical Adjustment (+)</option>
                <option value="LOSS">Processing Loss / Wastage (−)</option>
                <option value="INTERNAL_CONSUMPTION">Internal Consumption (−)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity (Litres)</label>
              <input
                type="number"
                step="0.001"
                required
                value={quantityLitres}
                onChange={(e) => setQuantityLitres(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Chilling tank spillage"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900">
              {busy ? 'Saving...' : 'Save Movement'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {types.map((t) => {
          const stock =
            t.stockLitres !== undefined
              ? t.stockLitres
              : Number(initialTotals.find((s) => s.milkTypeId === t.id)?._sum?.quantityLitres || 0);
          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">{t.label} Stock</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{stock.toLocaleString('en-IN')} L</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Milk type</th>
              <th className="p-3.5">Movement</th>
              <th className="p-3.5">Quantity (L)</th>
              <th className="p-3.5">Reference / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => (
              <tr
                key={m.id}
                onClick={() => setSelectedMovement(m)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="p-3.5">{new Date(m.movementAt).toLocaleString('en-IN')}</td>
                <td className="p-3.5 font-semibold">{m.milkType?.label || 'Milk'}</td>
                <td className="p-3.5">{m.movementType}</td>
                <td className={`p-3.5 font-bold ${Number(m.quantityLitres) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {Number(m.quantityLitres) > 0 ? `+${m.quantityLitres}` : m.quantityLitres}
                </td>
                <td className="p-3.5 text-slate-500">{m.notes || m.referenceType || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!movements.length && <p className="p-8 text-center text-xs text-slate-500">No stock movements recorded yet.</p>}
      </div>

      <RecordDetailModal
        open={Boolean(selectedMovement)}
        onClose={() => setSelectedMovement(null)}
        title="Raw Milk Stock Movement"
        recordId={selectedMovement?.id}
        recordType="StockMovement"
        status={selectedMovement?.movementType}
        fields={
          selectedMovement
            ? [
                { label: 'Milk Type', value: selectedMovement.milkType?.label || 'Milk' },
                { label: 'Movement Type', value: selectedMovement.movementType },
                {
                  label: 'Quantity Delta',
                  value: `${Number(selectedMovement.quantityLitres) > 0 ? '+' : ''}${selectedMovement.quantityLitres} Litres`,
                  highlight: true,
                },
                { label: 'Reference Type', value: selectedMovement.referenceType },
                { label: 'Reference ID', value: selectedMovement.referenceId },
                {
                  label: 'Movement Time',
                  value: new Date(selectedMovement.movementAt).toLocaleString('en-IN'),
                },
                { label: 'Notes', value: selectedMovement.notes, fullWidth: true },
              ]
            : []
        }
        auditMeta={selectedMovement ? { createdAt: selectedMovement.createdAt } : null}
      />
    </div>
  );
}

