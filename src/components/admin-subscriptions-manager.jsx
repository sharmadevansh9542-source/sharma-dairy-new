'use client';

import { useState } from 'react';
import {
  Truck,
  Plus,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import RecordDetailModal from '@/components/record-detail-modal';

export default function AdminSubscriptionsManager({ initialSubs = [], initialDeliveries = [], customers = [] }) {
  const [subs, setSubs] = useState(initialSubs);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [tab, setTab] = useState('deliveries');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [milkType, setMilkType] = useState('COW');
  const [dailyQuantity, setDailyQuantity] = useState('2');
  const [ratePerLitre, setRatePerLitre] = useState('65');
  const [deliveryShift, setDeliveryShift] = useState('MORNING');

  async function refreshAll() {
    const [subRes, delRes] = await Promise.all([
      fetch('/api/subscriptions'),
      fetch('/api/deliveries'),
    ]);
    const subJson = await subRes.json();
    const delJson = await delRes.json();
    if (subRes.ok && subJson.data) setSubs(subJson.data);
    if (delRes.ok && delJson.data) setDeliveries(delJson.data);
  }

  async function createSubscription(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          milkType,
          dailyQuantity: Number(dailyQuantity),
          ratePerLitre: Number(ratePerLitre),
          deliveryShift,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create subscription');
      setMessage(json.message);
      setShowForm(false);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateSubStatus(id, status) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update subscription');
      setMessage(`Subscription marked ${status}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateDeliveries(shift = 'MORNING') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE', shift }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate deliveries');
      setMessage(json.message);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function markDelivery(deliveryId, status) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update delivery');
      setMessage(json.message);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('deliveries')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'deliveries' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Daily Delivery Queue ({deliveries.length})
          </button>
          <button
            onClick={() => setTab('subscriptions')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'subscriptions' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Active Subscriptions ({subs.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => generateDeliveries('MORNING')}
            className="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-3.5 py-2 text-xs font-bold text-green-900 hover:bg-green-100 transition cursor-pointer"
          >
            <Calendar size={14} /> Generate Morning Route
          </button>
          <button
            disabled={busy}
            onClick={() => generateDeliveries('EVENING')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Calendar size={14} /> Generate Evening Route
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
          >
            <Plus size={15} /> New Subscription
          </button>
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

      {showForm && (
        <form onSubmit={createSubscription} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">Enroll Customer in Daily Milk Subscription</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user?.fullName} ({c.customerCode})
                  </option>
                ))}
              </select>
            </div>
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
              <label className="block font-bold text-slate-700 mb-1">Daily Qty (L)</label>
              <input
                type="number"
                step="0.25"
                required
                value={dailyQuantity}
                onChange={(e) => setDailyQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rate (₹/L) & Shift</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={ratePerLitre}
                  onChange={(e) => setRatePerLitre(e.target.value)}
                  className="w-20 rounded-xl border border-slate-300 p-2.5"
                />
                <select
                  value={deliveryShift}
                  onChange={(e) => setDeliveryShift(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5"
                >
                  <option value="MORNING">Morning</option>
                  <option value="EVENING">Evening</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Creating...' : 'Activate Subscription'}
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

      {tab === 'deliveries' ? (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
              <tr>
                <th className="p-3.5">Date & Shift</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Milk Type</th>
                <th className="p-3.5">Quantity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Fulfillment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.map((d) => (
                <tr
                  key={d.id}
                  onClick={() =>
                    setSelectedDetail({
                      title: 'Daily Route Delivery',
                      recordId: d.id,
                      recordType: 'DailyDelivery',
                      status: d.status,
                      fields: [
                        { label: 'Delivery Date', value: new Date(d.deliveryDate).toLocaleDateString('en-IN') },
                        { label: 'Shift', value: d.shift },
                        { label: 'Customer', value: d.customer?.user?.fullName },
                        { label: 'Phone', value: d.customer?.user?.phone },
                        { label: 'Milk Type', value: d.subscription?.milkType || 'COW' },
                        { label: 'Quantity', value: `${Number(d.quantityLitres)} Litres`, highlight: true },
                        { label: 'Notes', value: d.notes, fullWidth: true },
                      ],
                    })
                  }
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block">
                      {new Date(d.deliveryDate).toLocaleDateString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500">{d.shift}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800 block">{d.customer?.user?.fullName}</span>
                    <span className="text-[11px] text-slate-400">{d.customer?.user?.phone}</span>
                  </td>
                  <td className="p-3.5">{d.subscription?.milkType || 'COW'}</td>
                  <td className="p-3.5 font-bold">{Number(d.quantityLitres)} L</td>
                  <td className="p-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        d.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : d.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {d.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={busy}
                          onClick={() => markDelivery(d.id, 'DELIVERED')}
                          className="rounded-lg bg-emerald-700 px-3 py-1 text-white font-semibold hover:bg-emerald-800 cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => markDelivery(d.id, 'CANCELLED')}
                          className="rounded-lg border border-rose-200 px-3 py-1 text-rose-700 font-semibold hover:bg-rose-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 && (
            <p className="p-8 text-center text-xs text-slate-500">
              No daily deliveries generated yet. Click "Generate Morning Route" above to populate today's delivery tasks.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Milk Type</th>
                <th className="p-3.5">Daily Qty</th>
                <th className="p-3.5">Rate</th>
                <th className="p-3.5">Shift</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((s) => (
                <tr
                  key={s.id}
                  onClick={() =>
                    setSelectedDetail({
                      title: 'Milk Subscription Plan',
                      recordId: s.id,
                      recordType: 'MilkSubscription',
                      status: s.status,
                      fields: [
                        { label: 'Customer', value: s.customer?.user?.fullName },
                        { label: 'Milk Type', value: s.milkType },
                        { label: 'Daily Quantity', value: `${Number(s.dailyQuantity)} Litres`, highlight: true },
                        { label: 'Rate / Litre', value: `₹${Number(s.ratePerLitre).toFixed(2)}` },
                        { label: 'Delivery Shift', value: s.deliveryShift },
                        { label: 'Start Date', value: new Date(s.startDate).toLocaleDateString('en-IN') },
                        { label: 'Notes', value: s.notes, fullWidth: true },
                      ],
                      auditMeta: { createdAt: s.createdAt, updatedAt: s.updatedAt },
                    })
                  }
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3.5 font-bold text-slate-900">{s.customer?.user?.fullName}</td>
                  <td className="p-3.5">{s.milkType}</td>
                  <td className="p-3.5 font-bold">{Number(s.dailyQuantity)} L</td>
                  <td className="p-3.5">₹{Number(s.ratePerLitre).toFixed(2)}/L</td>
                  <td className="p-3.5">{s.deliveryShift}</td>
                  <td className="p-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : s.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    {s.status === 'ACTIVE' && (
                      <button
                        disabled={busy}
                        onClick={() => updateSubStatus(s.id, 'PAUSED')}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800 font-semibold hover:bg-amber-100 cursor-pointer"
                      >
                        Pause
                      </button>
                    )}
                    {s.status === 'PAUSED' && (
                      <button
                        disabled={busy}
                        onClick={() => updateSubStatus(s.id, 'ACTIVE')}
                        className="rounded-lg bg-emerald-700 px-2.5 py-1 text-white font-semibold hover:bg-emerald-800 cursor-pointer"
                      >
                        Resume
                      </button>
                    )}
                    {s.status !== 'CANCELLED' && (
                      <button
                        disabled={busy}
                        onClick={() => updateSubStatus(s.id, 'CANCELLED')}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-rose-700 font-semibold hover:bg-rose-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subs.length === 0 && (
            <p className="p-8 text-center text-xs text-slate-500">No milk subscriptions created yet.</p>
          )}
        </div>
      )}

      <RecordDetailModal
        open={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        title={selectedDetail?.title}
        recordId={selectedDetail?.recordId}
        recordType={selectedDetail?.recordType}
        status={selectedDetail?.status}
        fields={selectedDetail?.fields || []}
        auditMeta={selectedDetail?.auditMeta}
      />
    </div>
  );
}

