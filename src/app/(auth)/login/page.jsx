'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Milk,
  ShieldCheck,
  Tractor,
  ShoppingBag,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

const roles = [
  { label: 'Admin', icon: ShieldCheck, query: 'Admin' },
  { label: 'Farmer', icon: Tractor, query: 'Farmer' },
  { label: 'Customer', icon: ShoppingBag, query: 'Customer' },
  { label: 'Staff', icon: BriefcaseBusiness, query: 'Staff' },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-green-50" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const selectedRole = params.get('role') || 'Member';
  const registeredType = params.get('registered');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null;

      if (!data) throw new Error('The sign-in service returned an invalid response.');
      if (!response.ok) throw new Error(data.error || 'Login failed.');

      // Redirect strictly based on the server-authenticated database role
      const dest = data.redirectUrl || (data.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-green-950/10 md:grid-cols-[.9fr_1.1fr]">
        {/* Left column branding and portal selector */}
        <aside className="bg-green-950 p-8 text-white md:p-10 flex flex-col justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="rounded-xl bg-white/15 p-2">
                <Milk size={24} />
              </span>
              <span className="text-xl font-bold tracking-tight">Sharma Dairy</span>
            </Link>

            <h1 className="mt-12 text-3xl font-bold leading-tight">
              One sign-in for every dairy role.
            </h1>
            <p className="mt-4 text-sm leading-6 text-green-100">
              Select your portal label below, then enter your registered mobile number or email.
              Your database-verified account role determines your dashboard permissions.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {roles.map(({ label, icon: Icon, query }) => (
                <Link
                  key={label}
                  href={`/login?role=${query}`}
                  className={`rounded-xl border p-4 text-sm font-medium transition ${
                    selectedRole.toLowerCase() === query.toLowerCase()
                      ? 'border-white bg-white/20 shadow-inner'
                      : 'border-white/15 hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} className="mb-3 text-green-200" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-8 text-xs text-green-300/80">
            * Portal selection does not grant permissions. Security is strictly enforced by the server.
          </p>
        </aside>

        {/* Right column login form and registration links */}
        <section className="p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 border border-green-200">
                <UserCheck size={14} />
                {selectedRole} Portal
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in securely with your registered email or mobile number.
            </p>

            {registeredType && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-3.5 text-sm text-green-900">
                <CheckCircle2 size={18} className="shrink-0 text-green-700" />
                <span>
                  {registeredType === 'farmer' && 'Farmer registration successful! Please enter your credentials to log in.'}
                  {registeredType === 'customer' && 'Customer registration successful! Please sign in with your password.'}
                  {registeredType === 'staff' && 'Staff onboarding complete! You can now log into your staff portal.'}
                </span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Email or mobile number
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="e.g. 9876543210 or user@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-green-800 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-green-800 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Signing in securely...' : 'Sign in securely'}
              </button>
            </form>
          </div>

          {/* Registration Section */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <UserPlus size={16} className="text-green-800" />
              <span>Don't have an account? <strong className="text-green-900">Create an account:</strong></span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                href="/register/farmer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50/60 px-3 py-2.5 text-xs font-semibold text-green-900 transition hover:bg-green-100 hover:border-green-300"
              >
                <Tractor size={14} className="text-green-800" />
                Register as Farmer
              </Link>

              <Link
                href="/register/customer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 hover:border-emerald-300"
              >
                <ShoppingBag size={14} className="text-emerald-800" />
                Register as Customer
              </Link>

              <Link
                href="/register/staff"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 hover:border-slate-300"
              >
                <BriefcaseBusiness size={14} className="text-slate-700" />
                Register as Staff
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Admin registration is strictly protected and managed internally.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
