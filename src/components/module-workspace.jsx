'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, Plus, Download, Pencil } from 'lucide-react';
import RecordDetailModal, {
  EditedByAdminBadge,
  StatusBadge,
} from '@/components/record-detail-modal';

const config = {
  farmers: {
    title: 'Farmers',
    recordType: 'FarmerProfile',
    endpoint: '/api/farmers',
    fields: [
      ['fullName', 'Farmer name', 'text'],
      ['phone', 'Mobile number', 'tel'],
      ['email', 'Email', 'email'],
      ['village', 'Village', 'text'],
      ['address', 'Address', 'text'],
      ['animalType', 'Animal type', 'text'],
      ['password', 'Initial portal password (12+ chars)', 'password'],
    ],
  },
  customers: {
    title: 'Customers',
    recordType: 'CustomerProfile',
    endpoint: '/api/customers',
    fields: [
      ['fullName', 'Customer name', 'text'],
      ['phone', 'Mobile number', 'tel'],
      ['email', 'Email', 'email'],
      ['address', 'Address', 'text'],
      ['category', 'Category', 'select:HOUSEHOLD,RETAIL,HOTEL,RESTAURANT'],
      ['defaultRate', 'Default rate (₹/L)', 'number'],
      ['dailyRequirement', 'Daily requirement (L)', 'number'],
      ['password', 'Initial portal password (12+ chars)', 'password'],
    ],
  },
  collections: {
    title: 'Milk collection',
    recordType: 'MilkCollection',
    endpoint: '/api/collections',
    fields: [
      ['farmerId', 'Farmer profile ID', 'text'],
      ['milkType', 'Milk type', 'select:COW,BUFFALO,OTHER'],
      ['shift', 'Shift', 'select:MORNING,EVENING'],
      ['quantityLitres', 'Quantity (litres)', 'number'],
      ['fatPercent', 'Fat % (optional)', 'number'],
      ['snfPercent', 'SNF % (optional)', 'number'],
      ['ratePerLitre', 'Rate (₹/L)', 'number'],
      ['collectionAt', 'Collection date/time', 'datetime-local'],
      ['notes', 'Notes', 'text'],
    ],
  },
  sales: {
    title: 'Sales & delivery',
    recordType: 'Sale',
    endpoint: '/api/sales',
    fields: [
      ['customerId', 'Customer profile ID', 'text'],
      ['milkType', 'Milk type', 'select:COW,BUFFALO,OTHER'],
      ['quantityLitres', 'Quantity (litres)', 'number'],
      ['ratePerLitre', 'Selling rate (₹/L)', 'number'],
      ['saleAt', 'Sale date/time', 'datetime-local'],
      ['notes', 'Notes', 'text'],
    ],
  },
  expenses: {
    title: 'Expenses',
    recordType: 'Expense',
    endpoint: '/api/expenses',
    fields: [
      ['category', 'Category', 'select:TRANSPORT,ELECTRICITY,SALARIES,PACKAGING,MAINTENANCE,RENT,FUEL,OTHER'],
      ['amount', 'Amount (₹)', 'number'],
      ['method', 'Payment method', 'select:CASH,UPI,BANK_TRANSFER,OTHER'],
      ['expenseAt', 'Date/time', 'datetime-local'],
      ['description', 'Description', 'text'],
    ],
  },
  'farmer-payments': {
    title: 'Farmer payments',
    recordType: 'FarmerPayment',
    endpoint: '/api/payments/farmer',
    fields: [
      ['farmerId', 'Farmer profile ID', 'text'],
      ['amount', 'Amount (₹)', 'number'],
      ['method', 'Payment method', 'select:CASH,UPI,BANK_TRANSFER,OTHER'],
      ['reference', 'Transaction reference', 'text'],
      ['paidAt', 'Payment date/time', 'datetime-local'],
      ['notes', 'Notes', 'text'],
    ],
  },
  'customer-payments': {
    title: 'Customer payments',
    recordType: 'CustomerPayment',
    endpoint: '/api/payments/customer',
    fields: [
      ['customerId', 'Customer profile ID', 'text'],
      ['amount', 'Amount (₹)', 'number'],
      ['method', 'Payment method', 'select:CASH,UPI,BANK_TRANSFER,OTHER'],
      ['reference', 'Transaction reference', 'text'],
      ['paidAt', 'Payment date/time', 'datetime-local'],
      ['notes', 'Notes', 'text'],
    ],
  },
};

const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v || 0));

function buildDetailFields(module, r) {
  if (!r) return [];
  if (module === 'farmers') {
    return [
      { label: 'Farmer Code', value: r.farmerCode },
      { label: 'Full Name', value: r.user?.fullName },
      { label: 'Phone', value: r.user?.phone },
      { label: 'Email', value: r.user?.email },
      { label: 'Village', value: r.village },
      { label: 'Cattle / Animal Type', value: r.animalType },
      { label: 'Address', value: r.address, fullWidth: true },
      {
        label: 'Opening Balance',
        value: r.openingBalance != null ? money(r.openingBalance) : null,
      },
    ];
  }
  if (module === 'customers') {
    return [
      { label: 'Customer Code', value: r.customerCode },
      { label: 'Full Name', value: r.user?.fullName },
      { label: 'Phone', value: r.user?.phone },
      { label: 'Email', value: r.user?.email },
      { label: 'Category', value: r.category },
      { label: 'Default Milk Type', value: r.defaultMilkType },
      { label: 'Default Rate', value: r.defaultRate != null ? `₹${Number(r.defaultRate).toFixed(2)}/L` : null },
      { label: 'Daily Requirement', value: r.dailyRequirement != null ? `${r.dailyRequirement} L` : null },
      { label: 'Address', value: r.address, fullWidth: true },
    ];
  }
  if (module === 'collections') {
    return [
      { label: 'Collection Code', value: r.collectionCode },
      { label: 'Farmer', value: r.farmer?.user?.fullName },
      { label: 'Milk Type', value: r.milkType?.label || r.milkTypeId },
      { label: 'Shift', value: r.shift },
      { label: 'Quantity', value: r.quantityLitres != null ? `${Number(r.quantityLitres).toFixed(2)} Litres` : null, highlight: true },
      { label: 'Rate / Litre', value: r.ratePerLitre != null ? `₹${Number(r.ratePerLitre).toFixed(2)}` : null },
      { label: 'Fat %', value: r.fatPercent != null ? `${r.fatPercent}%` : null },
      { label: 'SNF %', value: r.snfPercent != null ? `${r.snfPercent}%` : null },
      { label: 'Total Amount', value: r.amount != null ? money(r.amount) : null, highlight: true },
      { label: 'Date / Time', value: r.collectionAt ? new Date(r.collectionAt).toLocaleString('en-IN') : null },
      { label: 'Notes', value: r.notes, fullWidth: true },
    ];
  }
  if (module === 'sales') {
    return [
      { label: 'Sale Code', value: r.saleCode },
      { label: 'Customer / Buyer', value: r.customer?.user?.fullName || r.walkInName },
      { label: 'Milk / Product', value: r.milkType?.label || r.product?.name },
      { label: 'Quantity', value: r.quantityLitres != null ? `${Number(r.quantityLitres).toFixed(2)} Litres` : null, highlight: true },
      { label: 'Selling Rate', value: r.ratePerLitre != null ? `₹${Number(r.ratePerLitre).toFixed(2)}` : null },
      { label: 'Amount', value: r.amount != null ? money(r.amount) : null, highlight: true },
      { label: 'Payment Method', value: r.paymentMethod },
      { label: 'Payment Status', value: r.paymentStatus },
      { label: 'Sale Date', value: r.saleAt ? new Date(r.saleAt).toLocaleString('en-IN') : null },
      { label: 'Notes', value: r.notes, fullWidth: true },
    ];
  }
  return [
    { label: 'Code', value: r.paymentCode || r.expenseCode || r.id },
    { label: 'Party / Category', value: r.farmer?.user?.fullName || r.customer?.user?.fullName || r.category },
    { label: 'Amount', value: r.amount != null ? money(r.amount) : null, highlight: true },
    { label: 'Method', value: r.method },
    { label: 'Reference', value: r.reference },
    { label: 'Date / Time', value: new Date(r.paidAt || r.expenseAt || r.createdAt || Date.now()).toLocaleString('en-IN') },
    { label: 'Notes / Description', value: r.notes || r.description, fullWidth: true },
  ];
}

export default function ModuleWorkspace({ module }) {
  const cfg = config[module];
  const [rows, setRows] = useState([]);
  const [editedMap, setEditedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Modal & Edit states
  const [selectedRow, setSelectedRow] = useState(null);
  const [editDialog, setEditDialog] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [res, auditRes] = await Promise.all([
        fetch(cfg.endpoint, { cache: 'no-store' }),
        fetch(`/api/audit-history?recordType=${encodeURIComponent(cfg.recordType)}`, {
          cache: 'no-store',
        }),
      ]);
      const j = await res.json();
      if (!res.ok) throw Error(j.error || 'Could not load records');
      setRows(j.data || []);

      if (auditRes.ok) {
        const aj = await auditRes.json();
        const grouped = {};
        for (const h of aj.data || []) {
          if (!grouped[h.recordId]) grouped[h.recordId] = [];
          grouped[h.recordId].push(h);
        }
        setEditedMap(grouped);
      }
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [module]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    for (const f of cfg.fields) {
      if (f[2] === 'number' && data[f[0]] !== '') data[f[0]] = Number(data[f[0]]);
    }
    try {
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Could not save record');
      setMessage('Saved successfully.');
      setShow(false);
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEditDialog(row) {
    if (module === 'farmers') {
      setEditDialog({
        row,
        fullName: row.user?.fullName || '',
        village: row.village || '',
        address: row.address || '',
        animalType: row.animalType || '',
        isActive: row.isActive !== false,
        reason: '',
      });
    } else if (module === 'customers') {
      setEditDialog({
        row,
        fullName: row.user?.fullName || '',
        address: row.address || '',
        category: row.category || 'HOUSEHOLD',
        defaultRate: row.defaultRate != null ? String(row.defaultRate) : '',
        dailyRequirement: row.dailyRequirement != null ? String(row.dailyRequirement) : '',
        isActive: row.isActive !== false,
        reason: '',
      });
    }
  }

  async function submitEditDialog(e) {
    e.preventDefault();
    if (!editDialog?.row) return;
    if (!editDialog.reason.trim() || editDialog.reason.trim().length < 3) {
      setMessage('Mandatory edit reason is required (at least 3 characters).');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const endpoint =
        module === 'farmers'
          ? `/api/farmers/${editDialog.row.id}`
          : `/api/customers/${editDialog.row.id}`;
      const payload =
        module === 'farmers'
          ? {
              fullName: editDialog.fullName,
              village: editDialog.village,
              address: editDialog.address,
              animalType: editDialog.animalType,
              isActive: editDialog.isActive,
              reason: editDialog.reason.trim(),
            }
          : {
              fullName: editDialog.fullName,
              address: editDialog.address,
              category: editDialog.category,
              defaultRate: editDialog.defaultRate !== '' ? Number(editDialog.defaultRate) : null,
              dailyRequirement:
                editDialog.dailyRequirement !== '' ? Number(editDialog.dailyRequirement) : null,
              isActive: editDialog.isActive,
              reason: editDialog.reason.trim(),
            };

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not update record');

      setMessage('Record updated with Admin edit audit trail.');
      setEditDialog(null);
      setSelectedRow(null);
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-48 flex-1">
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3"
            placeholder="Search records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="flex items-center gap-2 rounded-xl bg-green-800 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add new
        </button>
        <button
          type="button"
          onClick={() => {
            const keys = [...new Set(filtered.flatMap((r) => Object.keys(r)))];
            const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
            const csv = [
              keys.map(esc).join(','),
              ...filtered.map((r) =>
                keys
                  .map((k) =>
                    esc(typeof r[k] === 'object' && r[k] !== null ? JSON.stringify(r[k]) : r[k])
                  )
                  .join(',')
              ),
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sharma-dairy-${module}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-900">
          {message}
        </p>
      )}

      {show && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-green-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <h2 className="font-bold sm:col-span-2 lg:col-span-3">
            New {cfg.title.toLowerCase()} record
          </h2>
          {cfg.fields.map(([name, label, type]) => (
            <label key={name} className="grid gap-1.5 text-sm font-medium text-slate-700">
              {label}
              {type.startsWith('select:') ? (
                <select
                  name={name}
                  required={!name.includes('fatPercent') && !name.includes('snfPercent')}
                  className="rounded-xl border border-slate-200 bg-white p-2.5"
                >
                  {type
                    .slice(7)
                    .split(',')
                    .map((v) => (
                      <option key={v.trim()} value={v.trim()}>
                        {v.trim().replaceAll('_', ' ')}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  name={name}
                  type={type}
                  step={type === 'number' ? '0.001' : undefined}
                  required={
                    ![
                      'password',
                      'email',
                      'village',
                      'address',
                      'animalType',
                      'fatPercent',
                      'snfPercent',
                      'notes',
                      'reference',
                      'description',
                      'collectionAt',
                      'saleAt',
                      'expenseAt',
                      'paidAt',
                      'defaultRate',
                      'dailyRequirement',
                    ].includes(name)
                  }
                  className="rounded-xl border border-slate-200 p-2.5"
                />
              )}
            </label>
          ))}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button
              disabled={busy}
              className="rounded-xl bg-green-800 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save record'}
            </button>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="rounded-xl border px-4 py-2.5"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">
            Use the farmer/customer profile ID from the records list when entering collection, sale,
            or payment records. Financial records are not silently deleted.
          </p>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Reference / Party</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                {(module === 'farmers' || module === 'customers') && (
                  <th className="px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading records…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No records found. Add the first record to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const rowHistory = editedMap[r.id] || [];
                  const isEdited = rowHistory.some((h) => ['EDIT', 'UPDATE', 'ADJUST'].includes(h.action));
                  const rowStatus =
                    r.status || (r.isActive === false ? 'INACTIVE' : 'RECORDED');
                  return (
                    <tr
                      key={r.id || i}
                      onClick={() => setSelectedRow(r)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {r.collectionCode ||
                          r.saleCode ||
                          r.paymentCode ||
                          r.expenseCode ||
                          r.farmerCode ||
                          r.customerCode ||
                          r.id}
                      </td>
                      <td className="px-4 py-3">
                        {r.user?.fullName ||
                          r.farmer?.user?.fullName ||
                          r.customer?.user?.fullName ||
                          r.category ||
                          r.milkType?.label ||
                          r.method ||
                          '—'}
                        <small className="block text-slate-400">{r.id}</small>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(
                          r.collectionAt || r.saleAt || r.paidAt || r.expenseAt || r.createdAt || Date.now()
                        ).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        {r.quantityLitres != null ? `${r.quantityLitres} L` : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {r.amount != null ? money(r.amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={rowStatus} />
                          {isEdited && <EditedByAdminBadge compact />}
                        </div>
                      </td>
                      {(module === 'farmers' || module === 'customers') && (
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openEditDialog(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing {filtered.length} of {rows.length} records · Click any row to open complete details and edit history.
        </footer>
      </div>

      {/* Universal Table Detail Modal */}
      <RecordDetailModal
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        title={`${cfg.title} Details`}
        recordId={selectedRow?.id}
        recordCode={
          selectedRow?.collectionCode ||
          selectedRow?.saleCode ||
          selectedRow?.paymentCode ||
          selectedRow?.expenseCode ||
          selectedRow?.farmerCode ||
          selectedRow?.customerCode ||
          selectedRow?.id
        }
        recordType={cfg.recordType}
        status={
          selectedRow
            ? selectedRow.status || (selectedRow.isActive === false ? 'INACTIVE' : 'RECORDED')
            : null
        }
        isEditedByAdmin={Boolean(
          selectedRow &&
            (editedMap[selectedRow.id] || []).some((h) => ['EDIT', 'UPDATE', 'ADJUST'].includes(h.action))
        )}
        editHistory={selectedRow ? editedMap[selectedRow.id] : null}
        fields={buildDetailFields(module, selectedRow)}
        auditMeta={
          selectedRow
            ? {
                createdAt:
                  selectedRow.createdAt ||
                  selectedRow.collectionAt ||
                  selectedRow.saleAt ||
                  selectedRow.paidAt ||
                  selectedRow.expenseAt ||
                  selectedRow.registrationDate,
                updatedAt: selectedRow.updatedAt,
              }
            : null
        }
        onEdit={
          selectedRow && (module === 'farmers' || module === 'customers')
            ? () => openEditDialog(selectedRow)
            : null
        }
      />

      {/* Edit Farmer / Customer Modal with Mandatory Reason */}
      {editDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
          onClick={() => setEditDialog(null)}
        >
          <form
            onSubmit={submitEditDialog}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              Edit {module === 'farmers' ? 'Farmer' : 'Customer'} Record
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Full Name *
                <input
                  type="text"
                  required
                  value={editDialog.fullName}
                  onChange={(e) => setEditDialog((p) => ({ ...p, fullName: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              {module === 'farmers' ? (
                <>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Village
                    <input
                      type="text"
                      value={editDialog.village}
                      onChange={(e) => setEditDialog((p) => ({ ...p, village: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Animal Type
                    <input
                      type="text"
                      value={editDialog.animalType}
                      onChange={(e) => setEditDialog((p) => ({ ...p, animalType: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Category
                    <select
                      value={editDialog.category}
                      onChange={(e) => setEditDialog((p) => ({ ...p, category: e.target.value }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="HOUSEHOLD">HOUSEHOLD</option>
                      <option value="RETAIL">RETAIL</option>
                      <option value="HOTEL">HOTEL</option>
                      <option value="RESTAURANT">RESTAURANT</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    Default Rate (₹/L)
                    <input
                      type="number"
                      step="0.01"
                      value={editDialog.defaultRate}
                      onChange={(e) => setEditDialog((p) => ({ ...p, defaultRate: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              )}

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Account Status
                <select
                  value={editDialog.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) =>
                    setEditDialog((p) => ({ ...p, isActive: e.target.value === 'ACTIVE' }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Address
                <input
                  type="text"
                  value={editDialog.address}
                  onChange={(e) => setEditDialog((p) => ({ ...p, address: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="grid gap-1 text-xs font-semibold text-blue-900">
              Mandatory Edit Reason *
              <textarea
                rows={2}
                required
                minLength={3}
                placeholder="Reason for Admin modification…"
                value={editDialog.reason}
                onChange={(e) => setEditDialog((p) => ({ ...p, reason: e.target.value }))}
                className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 text-sm"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditDialog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save Changes & Audit Log'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
