'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Milk,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function RegisterDairyPage() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [form, setForm] = useState({
    // Business info
    dairyName: '',
    ownerName: '',
    businessEmail: '',
    phone: '',
    businessType: 'PRIVATE_DAIRY',
    address: '',
    city: '',
    state: '',
    pincode: '',
    logoUrl: '',
    description: '',
    // Admin info
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const update = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (field === 'ownerName' && !form.adminFullName) {
      setForm((prev) => ({ ...prev, adminFullName: val }));
    }
    if (field === 'businessEmail' && !form.adminEmail) {
      setForm((prev) => ({ ...prev, adminEmail: val }));
    }
    if (field === 'phone' && !form.adminPhone) {
      setForm((prev) => ({ ...prev, adminPhone: val }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!form.dairyName.trim() || !form.ownerName.trim() || !form.businessEmail.trim() || !form.phone.trim()) {
        setError('Please fill in all required business information fields.');
        return;
      }
      if (!/^[0-9]{10}$/.test(form.phone.trim())) {
        setError('Business mobile number must be exactly 10 digits.');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.adminFullName.trim() || !form.adminEmail.trim() || !form.password) {
      setError('Please fill in all required administrator account details.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!form.terms) {
      setError('You must accept the SaaS platform terms of service.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/register-dairy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit dairy registration request.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-emerald-50 px-4 py-8 md:py-12 flex items-center justify-center">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden grid md:grid-cols-[40%_60%]">
        {/* Left Sidebar branding */}
        <aside className="bg-green-950 text-white p-8 md:p-10 flex flex-col justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="rounded-xl bg-white/15 p-2.5">
                <Milk size={26} className="text-white" />
              </span>
              <div>
                <span className="text-xl font-bold tracking-tight block">Sharma Dairy</span>
                <span className="text-xs text-green-300">Multi-Tenant SaaS ERP</span>
              </div>
            </Link>

            <div className="mt-12 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-900/80 px-3.5 py-1 text-xs font-semibold text-green-200 border border-green-800">
                <Sparkles size={14} /> Enterprise Onboarding
              </div>
              <h1 className="text-3xl font-extrabold leading-snug">
                Digitize and scale your dairy enterprise.
              </h1>
              <p className="text-sm leading-relaxed text-green-200/90">
                Deploy your dedicated cloud ERP workspace in minutes. Complete with automated milk collection,
                Fat/SNF rate engines, farmer ledgers, recurring customer deliveries, and audit-ready accounts.
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-100">
                    <strong>Completely Isolated Tenant:</strong> Your records, farmers, and financial books belong solely to you.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-100">
                    <strong>Full Operational Control:</strong> Unlimited milk collection entries, digital payment receipts, and QR identity cards.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-100">
                    <strong>14-Day Free Evaluation:</strong> Test every enterprise feature without upfront gateway commitment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-green-900 text-xs text-green-400">
            Already have an active dairy account?{' '}
            <Link href="/login" className="font-semibold text-white underline hover:text-green-200">
              Sign in here
            </Link>
          </div>
        </aside>

        {/* Right Form container */}
        <section className="p-8 md:p-10 flex flex-col justify-center">
          {submitted ? (
            <div className="text-center py-8 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800">
                <Clock size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{form.ownerName}</strong>! Your registration request for{' '}
                <strong>{form.dairyName}</strong> has been logged under status{' '}
                <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 text-xs">
                  PENDING_APPROVAL
                </span>
                .
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-xs text-slate-700 space-y-2 max-w-md mx-auto">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                  <ShieldCheck size={16} className="text-green-800" />
                  Super Admin Security Review Policy
                </div>
                <p>
                  To preserve platform security and data isolation, each new dairy tenant undergoes verification by
                  our platform team before account activation.
                </p>
                <p>
                  Once approved, your Dairy Admin credentials (<strong>{form.adminEmail}</strong>) will be activated
                  and you can access your private dashboard immediately.
                </p>
              </div>
              <div className="pt-4 flex justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-green-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-900 transition"
                >
                  Go to Sign-in
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Steps Indicator */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-800">
                    Step {step} of 2
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {step === 1 ? 'Business & Operations Profile' : 'Dairy Administrator Credentials'}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`h-2.5 w-8 rounded-full transition-all ${
                      step >= 1 ? 'bg-green-800' : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`h-2.5 w-8 rounded-full transition-all ${
                      step >= 2 ? 'bg-green-800' : 'bg-slate-200'
                    }`}
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleNext} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Dairy Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Royal Fresh Dairy"
                        value={form.dairyName}
                        onChange={(e) => update('dairyName', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Owner / Director Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Verma"
                        value={form.ownerName}
                        onChange={(e) => update('ownerName', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="contact@royaldairy.com"
                        value={form.businessEmail}
                        onChange={(e) => update('businessEmail', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Official Mobile Number (10 Digits) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Business Entity Type
                      </label>
                      <select
                        value={form.businessType}
                        onChange={(e) => update('businessType', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      >
                        <option value="PRIVATE_DAIRY">Private Dairy Company</option>
                        <option value="COOPERATIVE">Cooperative Society</option>
                        <option value="FARM">Dairy Farm Producer</option>
                        <option value="MILK_COLLECTION_CENTER">Milk Collection Center / BMC</option>
                        <option value="OTHER">Other Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 250001"
                        maxLength={6}
                        value={form.pincode}
                        onChange={(e) => update('pincode', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        City / District
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meerut"
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Uttar Pradesh"
                        value={form.state}
                        onChange={(e) => update('state', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Full Business Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Village / Industrial Area / Street"
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Dairy Logo URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={form.logoUrl}
                        onChange={(e) => update('logoUrl', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Business Description (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Daily fresh buffalo & cow milk procurement"
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-800 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-900 transition cursor-pointer"
                  >
                    Continue to Admin Account <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Administrator Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Verma"
                      value={form.adminFullName}
                      onChange={(e) => update('adminFullName', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Admin Login Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@royaldairy.com"
                        value={form.adminEmail}
                        onChange={(e) => update('adminEmail', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Admin Mobile (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={form.adminPhone}
                        onChange={(e) => update('adminPhone', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Password (Min 8 chars) *
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-2.5 pr-10 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.terms}
                        onChange={(e) => update('terms', e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-800 focus:ring-green-700"
                      />
                      <span>
                        I agree to the SaaS Subscription Agreement, Multi-Tenant Data Protection Policy, and confirm I
                        am an authorized representative of <strong>{form.dairyName || 'the dairy enterprise'}</strong>.
                      </span>
                    </label>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex-1 rounded-xl bg-green-800 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? 'Submitting Registration...' : 'Complete & Request Dairy Activation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

