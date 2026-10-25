'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Milk,
  BriefcaseBusiness,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
} from 'lucide-react';

export default function StaffRegistrationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-green-50" />}>
      <StaffRegistrationContent />
    </Suspense>
  );
}

function StaffRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [activeToken, setActiveToken] = useState(tokenFromUrl);
  const [tokenVerification, setTokenVerification] = useState({
    loading: !!tokenFromUrl,
    valid: false,
    email: '',
    invitedBy: '',
    error: '',
  });

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    jobTitle: '',
    department: 'Dairy Operations',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function verifyToken(tokenToTest) {
    setTokenVerification({ loading: true, valid: false, email: '', invitedBy: '', error: '' });
    setError('');

    try {
      const res = await fetch(`/api/auth/register/staff/verify?token=${encodeURIComponent(tokenToTest)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setTokenVerification({
          loading: false,
          valid: false,
          email: '',
          invitedBy: '',
          error: data.error || 'Invitation token is invalid or has expired.',
        });
      } else {
        setTokenVerification({
          loading: false,
          valid: true,
          email: data.email,
          invitedBy: data.invitedBy,
          error: '',
        });
        setActiveToken(tokenToTest);
      }
    } catch {
      setTokenVerification({
        loading: false,
        valid: false,
        email: '',
        invitedBy: '',
        error: 'Unable to connect to verification service.',
      });
    }
  }

  function handleManualTokenSubmit(e) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    verifyToken(tokenInput.trim());
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/auth/register/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          email: tokenVerification.email,
          fullName: formData.fullName,
          phone: formData.phone,
          jobTitle: formData.jobTitle,
          department: formData.department,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Staff registration failed.');
      }

      setSuccess({
        message: data.message,
        employeeCode: data.employeeCode,
      });

      setTimeout(() => {
        router.push('/login?registered=staff');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Unable to complete staff registration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-100 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header navigation */}
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

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-green-950/5">
          {/* Header Banner */}
          <div className="bg-slate-900 p-6 md:p-8 text-white flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3.5 text-slate-200">
              <BriefcaseBusiness size={32} />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-slate-100">
                Staff Onboarding System
              </span>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold">Staff Account Registration</h1>
              <p className="mt-1 text-sm text-slate-300 leading-6">
                Authorized staff registration for milk collection centers, delivery operations, and accounts.
              </p>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {/* Case 1: Successfully registered */}
            {success ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-700" />
                <h2 className="mt-4 text-2xl font-bold text-green-950">Staff Account Activated!</h2>
                <p className="mt-2 text-green-800">{success.message}</p>
                <div className="mt-4 inline-block rounded-xl bg-white px-4 py-2 border border-green-300 font-mono text-sm font-bold text-green-900">
                  Employee Code: {success.employeeCode}
                </div>
                <p className="mt-6 text-sm text-slate-500">Redirecting to sign-in portal...</p>
                <Link
                  href="/login?registered=staff"
                  className="mt-4 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Sign in to Staff Workspace
                </Link>
              </div>
            ) : tokenVerification.valid ? (
              /* Case 2: Token is valid - Display staff registration form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-900">
                  <ShieldCheck size={24} className="shrink-0 text-green-700" />
                  <div>
                    <p className="font-bold">Authorized Invitation Verified</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Invited by: <strong>{tokenVerification.invitedBy}</strong> for email:{' '}
                      <strong className="underline">{tokenVerification.email}</strong>
                    </p>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                    <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Unable to register</p>
                      <p className="mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={18} className="text-slate-800" />
                    Staff Profile Details
                  </h2>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Assigned Email <span className="text-xs text-slate-400 font-normal">(Locked from invitation)</span>
                      </label>
                      <input
                        type="email"
                        disabled
                        value={tokenVerification.email}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-600 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        placeholder="e.g. Suresh Kumar"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
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
                          className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-2.5 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Job Title / Designation <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        placeholder="e.g. Collection Officer, Billing Operator"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Lock size={18} className="text-slate-800" />
                    Account Security Credentials
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
                          placeholder="Choose password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
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
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
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

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Activating staff account...' : 'Complete Staff Onboarding'}
                </button>
              </form>
            ) : (
              /* Case 3: No token or invalid token */
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={28} className="shrink-0 text-amber-700 mt-1" />
                    <div>
                      <h2 className="text-lg font-bold text-amber-950">
                        Staff Registration Requires Administrator Invitation
                      </h2>
                      <p className="mt-2 text-sm text-amber-900 leading-6">
                        For operational security, public self-registration for Staff and Admin roles is prohibited. Staff accounts can only be activated using a single-use invitation token issued by an authorized Sharma Dairy Administrator.
                      </p>
                    </div>
                  </div>
                </div>

                {tokenVerification.error && (
                  <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                    <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Token Verification Failed</p>
                      <p className="mt-0.5">{tokenVerification.error}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound size={18} className="text-slate-700" />
                    Have an invitation code or token?
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    If your administrator gave you an invitation code directly, enter it below to unlock the staff registration form.
                  </p>

                  <form onSubmit={handleManualTokenSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Paste your invitation token here"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-100 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={tokenVerification.loading}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                    >
                      {tokenVerification.loading ? 'Verifying...' : 'Verify Token'}
                    </button>
                  </form>
                </div>

                <div className="pt-2 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    If you are an employee awaiting onboarding, please reach out to your Dairy Administrator.
                  </p>
                  <div>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <ArrowLeft size={16} /> Return to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
