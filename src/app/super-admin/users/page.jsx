'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';
import RecordDetailModal from '@/components/record-detail-modal';

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (roleFilter !== 'ALL') q.set('role', roleFilter);

      const res = await fetch(`/api/super-admin/users?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      setUsers(json.data || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [roleFilter]);

  async function toggleUser(userId, currentActive) {
    const nextState = !currentActive;
    if (!confirm(`Are you sure you want to ${nextState ? 'activate' : 'deactivate'} this user account?`)) {
      return;
    }
    setBusyId(userId);
    setMessage('');
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update user');
      setMessage(json.message || 'User status updated');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <SuperAdminNav active="users" />
      <main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Platform Control / Identity</p>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Platform Users & Role Accounts</h1>
          </div>
          <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">
            {users.length} Users Listed
          </span>
        </header>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900"
          >
            {message}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="relative flex-1 min-w-56"
          >
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-slate-800"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Dairy Admin</option>
              <option value="STAFF">Staff</option>
              <option value="FARMER">Farmer</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3.5">User Identity</th>
                  <th className="p-3.5">Associated Dairy Tenant</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Created At</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No users match your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{u.fullName}</span>
                        <span className="text-slate-500 text-[11px] block">{u.email || u.phone || 'No identifier'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 block">{u.dairyName}</span>
                        <span className="font-mono text-slate-400 text-[10px]">{u.dairyCode}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-slate-900 text-white'
                              : u.role === 'ADMIN'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : u.role === 'FARMER'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : u.role === 'CUSTOMER'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${
                            u.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {u.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => toggleUser(u.id, u.isActive)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition disabled:opacity-50 cursor-pointer ${
                              u.isActive
                                ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'bg-emerald-700 text-white hover:bg-emerald-800'
                            }`}
                          >
                            {busyId === u.id ? 'Updating...' : u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <RecordDetailModal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Platform User Account"
        recordId={selectedUser?.id}
        recordType="User"
        status={selectedUser ? (selectedUser.isActive ? 'ACTIVE' : 'SUSPENDED') : null}
        fields={
          selectedUser
            ? [
                { label: 'Full Name', value: selectedUser.fullName },
                { label: 'System Role', value: selectedUser.role },
                { label: 'Email', value: selectedUser.email },
                { label: 'Phone', value: selectedUser.phone },
                { label: 'Dairy Tenant', value: selectedUser.dairyName },
                { label: 'Dairy Code', value: selectedUser.dairyCode },
              ]
            : []
        }
        auditMeta={selectedUser ? { createdAt: selectedUser.createdAt } : null}
      />
    </div>
  );
}

