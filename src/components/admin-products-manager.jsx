'use client';

import { useState } from 'react';
import {
  Package,
  Truck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import RecordDetailModal from '@/components/record-detail-modal';

export default function AdminProductsManager({ initialProducts = [], initialSuppliers = [], initialPurchases = [] }) {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState(initialProducts);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Product Form
  const [pForm, setPForm] = useState({
    sku: '',
    name: '',
    category: 'GHEE',
    unit: 'KG',
    purchasePrice: '450',
    sellingPrice: '550',
    currentStock: '10',
    minStockAlert: '5',
  });

  // Supplier Form
  const [sForm, setSForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    gstin: '',
  });

  // Purchase Form
  const [poForm, setPoForm] = useState({
    supplierId: initialSuppliers[0]?.id || '',
    productId: initialProducts[0]?.id || '',
    quantity: '10',
    unitPrice: '450',
    paymentStatus: 'PAID',
  });

  async function refreshAll() {
    const [pRes, sRes, poRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/suppliers'),
      fetch('/api/purchases'),
    ]);
    const [pJson, sJson, poJson] = await Promise.all([pRes.json(), sRes.json(), poRes.json()]);
    if (pRes.ok && pJson.data) setProducts(pJson.data);
    if (sRes.ok && sJson.data) setSuppliers(sJson.data);
    if (poRes.ok && poJson.data) setPurchases(poJson.data);
  }

  async function createProduct(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pForm,
          purchasePrice: Number(pForm.purchasePrice),
          sellingPrice: Number(pForm.sellingPrice),
          currentStock: Number(pForm.currentStock),
          minStockAlert: Number(pForm.minStockAlert),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add product');
      setMessage(json.message);
      setShowProductForm(false);
      setPForm({ sku: '', name: '', category: 'GHEE', unit: 'KG', purchasePrice: '450', sellingPrice: '550', currentStock: '0', minStockAlert: '5' });
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function createSupplier(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add supplier');
      setMessage(json.message);
      setShowSupplierForm(false);
      setSForm({ name: '', contactPerson: '', phone: '', email: '', city: '', gstin: '' });
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function createPurchase(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const qty = Number(poForm.quantity);
      const price = Number(poForm.unitPrice);
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          paidAmount: poForm.paymentStatus === 'PAID' ? qty * price : 0,
          paymentStatus: poForm.paymentStatus,
          items: [{ productId: poForm.productId, quantity: qty, unitPrice: price }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record purchase');
      setMessage(json.message);
      setShowPurchaseForm(false);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('products')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'products' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Packaged Products ({products.length})
          </button>
          <button
            onClick={() => setTab('suppliers')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'suppliers' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setTab('purchases')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'purchases' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Purchase Orders ({purchases.length})
          </button>
        </div>

        <div className="flex gap-2">
          {tab === 'products' && (
            <button
              onClick={() => setShowProductForm(!showProductForm)}
              className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-900 cursor-pointer"
            >
              <Plus size={15} /> Add Dairy Product
            </button>
          )}
          {tab === 'suppliers' && (
            <button
              onClick={() => setShowSupplierForm(!showSupplierForm)}
              className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-900 cursor-pointer"
            >
              <Plus size={15} /> Register Supplier
            </button>
          )}
          {tab === 'purchases' && (
            <button
              onClick={() => setShowPurchaseForm(!showPurchaseForm)}
              className="flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-900 cursor-pointer"
            >
              <Plus size={15} /> Record Purchase
            </button>
          )}
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

      {/* Forms */}
      {showProductForm && tab === 'products' && (
        <form onSubmit={createProduct} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">Add Packaged Dairy Product</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
              <input
                type="text"
                required
                placeholder="e.g. GHEE-1KG"
                value={pForm.sku}
                onChange={(e) => setPForm({ ...pForm, sku: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Pure Desi Cow Ghee"
                value={pForm.name}
                onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={pForm.category}
                onChange={(e) => setPForm({ ...pForm, category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="GHEE">Ghee</option>
                <option value="PANEER">Paneer</option>
                <option value="CURD">Curd / Dahi</option>
                <option value="BUTTER">Butter</option>
                <option value="SWEETS">Dairy Sweets</option>
                <option value="FEED">Cattle Feed</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit</label>
              <select
                value={pForm.unit}
                onChange={(e) => setPForm({ ...pForm, unit: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="KG">KG</option>
                <option value="LITRE">LITRE</option>
                <option value="PACK">PACK</option>
                <option value="PIECE">PIECE</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={pForm.purchasePrice}
                onChange={(e) => setPForm({ ...pForm, purchasePrice: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={pForm.sellingPrice}
                onChange={(e) => setPForm({ ...pForm, sellingPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Opening Stock</label>
              <input
                type="number"
                step="0.01"
                required
                value={pForm.currentStock}
                onChange={(e) => setPForm({ ...pForm, currentStock: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                step="0.01"
                required
                value={pForm.minStockAlert}
                onChange={(e) => setPForm({ ...pForm, minStockAlert: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900">
              {busy ? 'Saving...' : 'Save Product'}
            </button>
            <button type="button" onClick={() => setShowProductForm(false)} className="rounded-xl border px-4 py-2.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showSupplierForm && tab === 'suppliers' && (
        <form onSubmit={createSupplier} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">Register New Supplier</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier / Company Name *</label>
              <input
                type="text"
                required
                value={sForm.name}
                onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={sForm.contactPerson}
                onChange={(e) => setSForm({ ...sForm, contactPerson: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={sForm.phone}
                onChange={(e) => setSForm({ ...sForm, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={sForm.city}
                onChange={(e) => setSForm({ ...sForm, city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={sForm.gstin}
                onChange={(e) => setSForm({ ...sForm, gstin: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900">
              {busy ? 'Saving...' : 'Save Supplier'}
            </button>
            <button type="button" onClick={() => setShowSupplierForm(false)} className="rounded-xl border px-4 py-2.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showPurchaseForm && tab === 'purchases' && (
        <form onSubmit={createPurchase} className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-3">Record Purchase & Increment Stock</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier</label>
              <select
                required
                value={poForm.supplierId}
                onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product</label>
              <select
                required
                value={poForm.productId}
                onChange={(e) => setPoForm({ ...poForm, productId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                required
                value={poForm.quantity}
                onChange={(e) => setPoForm({ ...poForm, quantity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Unit Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={poForm.unitPrice}
                onChange={(e) => setPoForm({ ...poForm, unitPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
              <select
                value={poForm.paymentStatus}
                onChange={(e) => setPoForm({ ...poForm, paymentStatus: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5"
              >
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending Credit</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900">
              {busy ? 'Recording...' : 'Complete Purchase'}
            </button>
            <button type="button" onClick={() => setShowPurchaseForm(false)} className="rounded-xl border px-4 py-2.5 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tables */}
      {tab === 'products' && (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
              <tr>
                <th className="p-3.5">SKU & Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Purchase Price</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const isLow = Number(p.currentStock) <= Number(p.minStockAlert);
                return (
                  <tr
                    key={p.id}
                    onClick={() =>
                      setSelectedDetail({
                        title: 'Packaged Product Details',
                        recordId: p.id,
                        recordCode: p.sku,
                        recordType: 'Product',
                        status: isLow ? 'PAUSED' : 'ACTIVE',
                        fields: [
                          { label: 'SKU Code', value: p.sku },
                          { label: 'Product Name', value: p.name },
                          { label: 'Category', value: p.category },
                          { label: 'Unit', value: p.unit },
                          { label: 'Purchase Price', value: `₹${Number(p.purchasePrice).toFixed(2)}` },
                          { label: 'Selling Price', value: `₹${Number(p.sellingPrice).toFixed(2)}`, highlight: true },
                          { label: 'Current Stock', value: `${Number(p.currentStock)} ${p.unit}`, highlight: true },
                          { label: 'Min Alert Threshold', value: `${Number(p.minStockAlert)} ${p.unit}` },
                        ],
                        auditMeta: { createdAt: p.createdAt, updatedAt: p.updatedAt },
                      })
                    }
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{p.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                    </td>
                    <td className="p-3.5">{p.category}</td>
                    <td className="p-3.5">₹{Number(p.purchasePrice).toFixed(2)}</td>
                    <td className="p-3.5 font-semibold">₹{Number(p.sellingPrice).toFixed(2)}</td>
                    <td className="p-3.5 font-bold">
                      {Number(p.currentStock)} {p.unit}
                    </td>
                    <td className="p-3.5">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          <AlertTriangle size={11} /> Low Stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="p-8 text-center text-xs text-slate-500">
              No packaged products added yet. Add Ghee, Paneer, Curd, or Cattle Feed to track packaged inventory separately from raw milk.
            </p>
          )}
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
              <tr>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone / City</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  onClick={() =>
                    setSelectedDetail({
                      title: 'Supplier Details',
                      recordId: s.id,
                      recordType: 'Supplier',
                      status: 'ACTIVE',
                      fields: [
                        { label: 'Supplier Name', value: s.name },
                        { label: 'Contact Person', value: s.contactPerson },
                        { label: 'Phone', value: s.phone },
                        { label: 'City', value: s.city },
                        { label: 'GSTIN', value: s.gstin },
                        { label: 'Total Orders', value: String(s._count?.purchases || 0) },
                      ],
                      auditMeta: { createdAt: s.createdAt, updatedAt: s.updatedAt },
                    })
                  }
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3.5 font-bold text-slate-900">{s.name}</td>
                  <td className="p-3.5">{s.contactPerson || '—'}</td>
                  <td className="p-3.5">
                    {s.phone || '—'} · {s.city || '—'}
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">{s.gstin || '—'}</td>
                  <td className="p-3.5 font-bold">{s._count?.purchases || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No suppliers registered yet.</p>}
        </div>
      )}

      {tab === 'purchases' && (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
              <tr>
                <th className="p-3.5">PO Code</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((po) => (
                <tr
                  key={po.id}
                  onClick={() =>
                    setSelectedDetail({
                      title: 'Purchase Order Details',
                      recordId: po.id,
                      recordCode: po.purchaseCode,
                      recordType: 'Purchase',
                      status: po.paymentStatus,
                      fields: [
                        { label: 'PO Code', value: po.purchaseCode },
                        { label: 'Supplier', value: po.supplier?.name },
                        { label: 'Purchase Date', value: new Date(po.purchaseDate).toLocaleDateString('en-IN') },
                        { label: 'Total Amount', value: `₹${Number(po.totalAmount).toLocaleString('en-IN')}`, highlight: true },
                        {
                          label: 'Purchased Items',
                          value: po.items?.map((i) => `${i.product?.name} (${Number(i.quantity)} ${i.product?.unit})`).join(', '),
                          fullWidth: true,
                        },
                      ],
                      auditMeta: { createdAt: po.createdAt, updatedAt: po.updatedAt },
                    })
                  }
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-3.5 font-mono font-bold text-slate-900">{po.purchaseCode}</td>
                  <td className="p-3.5">{new Date(po.purchaseDate).toLocaleDateString('en-IN')}</td>
                  <td className="p-3.5 font-semibold">{po.supplier?.name}</td>
                  <td className="p-3.5">
                    {po.items?.map((i) => `${i.product?.name} (${Number(i.quantity)} ${i.product?.unit})`).join(', ')}
                  </td>
                  <td className="p-3.5 font-bold">₹{Number(po.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="p-3.5">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {po.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No purchase orders recorded yet.</p>}
        </div>
      )}

      <RecordDetailModal
        open={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        title={selectedDetail?.title}
        recordId={selectedDetail?.recordId}
        recordCode={selectedDetail?.recordCode}
        recordType={selectedDetail?.recordType}
        status={selectedDetail?.status}
        fields={selectedDetail?.fields || []}
        auditMeta={selectedDetail?.auditMeta}
      />
    </div>
  );
}

