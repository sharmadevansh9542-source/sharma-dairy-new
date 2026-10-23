'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Milk } from 'lucide-react';
export default function LoginPage() {
  const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
      if (!data) throw new Error('The sign-in service returned an invalid response. Check the server and database setup.');
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      router.push(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'); router.refresh();
    } catch (err) { setError(err.message || 'Unable to sign in.'); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-4 py-12"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
    <Link href="/" className="mb-8 inline-flex items-center gap-3"><span className="rounded-xl bg-green-800 p-2 text-white"><Milk/></span><span className="font-bold text-green-950">Sharma Dairy</span></Link>
    <h1 className="text-2xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in with your registered email or mobile number.</p>
    <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold">Email or mobile number<input autoComplete="username" required value={identifier} onChange={e=>setIdentifier(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"/></label><label className="block text-sm font-semibold">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"/></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-green-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?'Signing in…':'Sign in securely'}</button></form>
    <p className="mt-6 text-xs leading-5 text-slate-500">Forgot password? Password reset workflow is scheduled for the authentication phase; contact your administrator during initial setup.</p>
  </div></main>;
}
