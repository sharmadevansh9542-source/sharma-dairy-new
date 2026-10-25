'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Milk,
  Tractor,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Phone,
  User,
  Lock,
} from 'lucide-react';

export default function FarmerRegistrationPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    village: '',
    address: '',
    fatherName: '',
    alternatePhone: '',
    animalType: 'Cow & Buffalo',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Pre-flight client checks
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!formData.terms) {
      setError('Please agree to the Terms of Service & Privacy Policy to proceed.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/auth/register/farmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Farmer registration failed.');
      }

      setSuccess({
        message: data.message,
        farmerCode: data.farmerCode,
      });

      setTimeout(() => {
        router.push('/login?registered=farmer');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Unable to register farmer account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header with back link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-900 hover:text-green-700 transition"
          >
            <ArrowLeft size={16} />
            Back to Sign in
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-green-800 p-2 text-white">
              <Milk size={20} />
            </span>
            <span className="font-bold text-slate-900">Sharma Dairy</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-green-950/5">
          {/* Top Banner */}
          <div className="bg-green-950 p-6 md:p-8 text-white flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3.5 text-green-200">
              <Tractor size={32} />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-green-100">
                Farmer Onboarding Portal
              </span>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold">Register as Dairy Farmer</h1>
              <p className="mt-1 text-sm text-green-100/90 leading-6">
                Connect your milk supply with Sharma Dairy. Track shift collections, fat/SNF records, rates, and direct payments in real time.
              </p>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {success ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-700" />
                <h2 className="mt-4 text-2xl font-bold text-green-950">Registration Complete!</h2>
                <p className="mt-2 text-green-800">{success.message}</p>
                <div className="mt-4 inline-block rounded-xl bg-white px-4 py-2 border border-green-300 font-mono text-sm font-bold text-green-900">
                  Assigned Farmer ID: {success.farmerCode}
                </div>
                <p className="mt-6 text-sm text-slate-500">
                  Redirecting to login portal in a few seconds...
                </p>
                <Link
                  href="/login?registered=farmer"
                  className="mt-4 inline-block rounded-xl bg-green-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-900"
                >
                  Sign in immediately
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                    <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Unable to register</p>
                      <p className="mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                {/* Section 1: Personal Details */}
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={18} className="text-green-800" />
                    Personal & Contact Information
                  </h2>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        placeholder="e.g. Ramesh Kumar Sharma"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Mobile Number (10 digits) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">
                          +91
                        </span>
                        <input
                          type="tel"
                          name="phone"
                          required
                          pattern="[0-9]{10}"
                          maxLength={10}
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Father's / Spouse's Name <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="fatherName"
                        placeholder="e.g. Ramprasad Sharma"
                        value={formData.fatherName}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="farmer@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Alternate Mobile <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="alternatePhone"
                        maxLength={15}
                        placeholder="Optional backup number"
                        value={formData.alternatePhone}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Cattle / Animal Type <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        name="animalType"
                        value={formData.animalType}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 bg-white"
                      >
                        <option value="Cow">Cow</option>
                        <option value="Buffalo">Buffalo</option>
                        <option value="Cow & Buffalo">Both Cow & Buffalo</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Location */}
                <div className="pt-2">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MapPin size={18} className="text-green-800" />
                    Village & Dairy Location
                  </h2>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Village / Town Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="village"
                        required
                        placeholder="e.g. Rampur"
                        value={formData.village}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Detailed Address / Ward <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        placeholder="House no., street, landmarks"
                        value={formData.address}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Portal Security */}
                <div className="pt-2">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Lock size={18} className="text-green-800" />
                    Portal Account Security
                  </h2>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Create Password (min. 8 characters) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          minLength={8}
                          placeholder="Choose a strong password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          required
                          minLength={8}
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consent checkbox */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={formData.terms}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-green-800 focus:ring-green-700"
                    />
                    <span className="text-xs text-slate-600 leading-5">
                      I confirm that the details provided are accurate. I agree to Sharma Dairy's milk supply terms, quality test policies (fat/SNF verification), and privacy policy for digital records.
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-green-800 py-3.5 text-sm font-bold text-white shadow-md shadow-green-950/10 transition hover:bg-green-900 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Registering farmer profile...' : 'Complete Farmer Registration'}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Already registered as a supplier?{' '}
                  <Link href="/login?role=Farmer" className="font-semibold text-green-800 hover:underline">
                    Sign in to Farmer Portal
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
