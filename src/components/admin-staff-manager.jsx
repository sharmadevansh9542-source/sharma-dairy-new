'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export default function AdminStaffManager({ initialStaff = [], initialInvitations = [] }) {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'invite' | 'invitations'
  const [staffList, setStaffList] = useState(initialStaff);
  const [invitations, setInvitations] = useState(initialInvitations);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTogglingId, setStatusTogglingId] = useState(null);

  // Create Staff Invitation
  async function handleSendInvite(e) {
    e.preventDefault();
    setInviteError('');
    setGeneratedInvite(null);
    setInviteBusy(true);

    try {
      const res = await fetch('/api/admin/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, expiresInHours: Number(expiresInHours) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff invitation.');

      setGeneratedInvite(data.invitation);
      setInviteEmail('');
      // refresh invitations list
      refreshInvitations();
    } catch (err) {
      setInviteError(err.message || 'Unable to generate invitation.');
    } finally {
      setInviteBusy(false);
    }
  }

  // Refresh invitations
  async function refreshInvitations() {
    try {
      const res = await fetch('/api/admin/staff/invitations');
      const data = await res.json();
      if (res.ok && data.invitations) {
        setInvitations(data.invitations);
      }
    } catch (e) {
      console.error('Failed to reload invitations', e);
    }
  }

  // Revoke invitation
  async function handleRevokeInvitation(id) {
    if (!confirm('Are you sure you want to revoke this staff invitation? The recipient will not be able to register.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff/invitations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke invitation.');
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      alert(err.message || 'Error revoking invitation');
    }
  }

  // Toggle staff account active/suspended
  async function handleToggleStatus(staffId, currentActive) {
    const action = currentActive ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this staff account? ${currentActive ? 'All active sessions for this user will be revoked immediately.' : ''}`)) {
      return;
    }

    setStatusTogglingId(staffId);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff status.');

      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, isActive: !currentActive } : s))
      );
    } catch (err) {
      alert(err.message || 'Failed to update staff status.');
    } finally {
      setStatusTogglingId(null);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredStaff = staffList.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.staffProfile?.employeeCode?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'staff'
                ? 'bg-green-950 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users size={16} />
            Staff Members ({staffList.length})
          </button>

          <button
            onClick={() => setActiveTab('invite')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'invite'
                ? 'bg-green-950 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserPlus size={16} />
            Invite New Staff
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'invitations'
                ? 'bg-green-950 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Mail size={16} />
            Pending Invitations ({invitations.filter((i) => i.status === 'ACTIVE').length})
          </button>
        </div>

        <button
          onClick={refreshInvitations}
          title="Refresh invitations"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tab 1: Staff Members List */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, code, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-green-800"
              />
            </div>
            <p className="text-xs text-slate-500">
              Showing {filteredStaff.length} of {staffList.length} staff accounts
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Staff Member</th>
                  <th className="p-3.5">Code / Designation</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{staff.fullName}</div>
                      <div className="text-xs text-slate-400">
                        Joined {new Date(staff.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-xs font-semibold rounded bg-slate-100 px-2 py-1 text-slate-800">
                        {staff.staffProfile?.employeeCode || '—'}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                        {staff.staffProfile?.jobTitle || 'Operations Staff'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">{staff.phone || 'No mobile'}</div>
                      <div className="text-xs text-slate-500">{staff.email || 'No email'}</div>
                    </td>
                    <td className="p-3.5">
                      {staff.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                        disabled={statusTogglingId === staff.id}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          staff.isActive
                            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                        }`}
                      >
                        {statusTogglingId === staff.id
                          ? 'Updating...'
                          : staff.isActive
                          ? 'Suspend Access'
                          : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No staff accounts found. Create staff invitations using the "Invite New Staff" tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Invite New Staff */}
      {activeTab === 'invite' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-green-100 p-2.5 text-green-900">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Secure Staff Invitation</h2>
              <p className="mt-1 text-sm text-slate-500 leading-6">
                Generate a single-use, cryptographically secure invitation link. Only users possessing this invitation can access the staff registration form.
              </p>
            </div>
          </div>

          {inviteError && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
              <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {generatedInvite && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/70 p-5">
              <div className="flex items-center gap-2 text-green-900 font-bold">
                <Check size={18} className="text-green-700" />
                Invitation Created Successfully!
              </div>
              <p className="mt-1 text-xs text-green-800">
                Send this secure single-use registration URL to{' '}
                <strong>{generatedInvite.email}</strong>. It expires on{' '}
                {new Date(generatedInvite.expiresAt).toLocaleString('en-IN')}.
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white border border-green-300 p-2.5">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${generatedInvite.inviteUrl}`}
                  className="flex-1 font-mono text-xs bg-transparent outline-none text-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${typeof window !== 'undefined' ? window.location.origin : ''}${generatedInvite.inviteUrl}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900 cursor-pointer"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendInvite} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Staff Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="staff.name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                The staff member must register with this exact email address.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Invitation Expiration
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-green-800 bg-white"
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours (Recommended)</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={168}>7 days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviteBusy}
              className="w-full rounded-xl bg-green-950 py-3 text-sm font-semibold text-white shadow hover:bg-green-900 disabled:opacity-60 cursor-pointer"
            >
              {inviteBusy ? 'Generating Secure Token...' : 'Generate Staff Invitation Link'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Invitation History */}
      {activeTab === 'invitations' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3.5">Invited Email</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5">Expires At</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900">{inv.email}</div>
                    <div className="text-xs text-slate-400">Invited by: {inv.invitedBy}</div>
                  </td>
                  <td className="p-3.5 text-slate-600 text-xs">
                    {new Date(inv.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5 text-slate-600 text-xs">
                    {new Date(inv.expiresAt).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5">
                    {inv.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        <Clock size={12} /> Pending Registration
                      </span>
                    )}
                    {inv.status === 'USED' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        <Check size={12} /> Used & Registered
                      </span>
                    )}
                    {inv.status === 'EXPIRED' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {inv.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={12} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No staff invitations generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
