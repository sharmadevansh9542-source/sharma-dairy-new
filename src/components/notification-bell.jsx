'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationBell({ endpoint = '/api/notifications' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data || []);
      setUnread(json.unreadCount || 0);
    } catch {}
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    try {
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5 text-xs">
            <span className="font-bold text-slate-800">Notifications ({unread} unread)</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 font-semibold text-green-800 hover:underline cursor-pointer"
              >
                <CheckCheck size={13} /> Mark read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`p-3 text-xs ${n.isRead ? 'bg-white' : 'bg-green-50/50'}`}>
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="text-slate-600 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {new Date(n.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

