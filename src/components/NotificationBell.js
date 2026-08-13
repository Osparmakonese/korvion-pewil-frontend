import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  scanNotifications,
  getWaDigest,
} from '../api/farmApi';

const S = {
  wrap: { position: 'relative' },
  btn: {
    background: '#f3f4f6', border: '1px solid #e3e8e4', borderRadius: 10,
    padding: '6px 10px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
    color: '#374151', position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4, background: '#c0392b',
    color: '#fff', borderRadius: 10, minWidth: 16, height: 16,
    fontSize: 9, fontWeight: 700, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '0 4px',
    border: '2px solid #fff',
  },
  panel: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
    width: 360, maxHeight: 460, background: '#fff',
    border: '1px solid #e3e8e4', borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  head: {
    padding: '12px 14px', borderBottom: '1px solid #e3e8e4',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#f6f8f6',
  },
  headTitle: {
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 700,
    color: '#111827',
  },
  headActions: { display: 'flex', gap: 6 },
  headBtn: {
    background: 'transparent', border: '1px solid #e3e8e4', borderRadius: 5,
    padding: '4px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
    color: '#374151',
  },
  list: { overflowY: 'auto', flex: 1 },
  item: {
    padding: '12px 14px', borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
    transition: 'background 0.15s',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0,
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 2,
  },
  itemText: { fontSize: 11, color: '#6b7280', lineHeight: 1.4 },
  itemTime: { fontSize: 9, color: '#9ca3af', marginTop: 4 },
  empty: {
    padding: 30, textAlign: 'center', fontSize: 12, color: '#6b7280',
  },
  foot: {
    padding: '10px 14px', borderTop: '1px solid #e3e8e4', background: '#f6f8f6',
    display: 'flex', gap: 6,
  },
  footBtn: {
    flex: 1, background: '#25D366', color: '#fff', border: 'none',
    borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer',
  },
};

const SEV_COLOR = {
  danger: '#c0392b', warning: '#c97d1a', success: '#1a6b3a', info: '#2563eb',
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export default function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const qc = useQueryClient();

  // Auto-scan on mount
  useEffect(() => {
    scanNotifications().catch(() => {});
    const iv = setInterval(() => {
      scanNotifications().catch(() => {});
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [qc]);

  // Click outside to close
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const { data: unread } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: getUnreadCount,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const { data: notifs } = useQuery({
    queryKey: ['notif-list'],
    queryFn: () => getNotifications(false),
    enabled: open,
    staleTime: 30000,
  });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  const unreadCount = unread?.unread_count ?? unread?.count ?? 0;
  const list = Array.isArray(notifs) ? notifs : (notifs?.results || []);

  // Where a notification should take you.
  //
  // The Notification model has a `url` field, but NOTHING in the backend ever
  // populates it — so `n.url` is always empty and, before this, every click
  // just marked the item read and closed the panel. Nothing navigated
  // anywhere. Map the notification KIND to a tab so a click always lands
  // somewhere useful, and keep honouring `url` if it ever starts being set.
  const KIND_TAB = {
    low_stock:        'Low Stock Alerts',
    new_sale:         'Sales History',
    wages_owed:       'Retail Payroll',
    overdue_task:     'Dashboard',
    livestock_health: 'Cattle',
    loan_due:         'Loans',
    water_needed:     'Water',
    budget_alert:     'Budget',
  };

  const handleItemClick = (n) => {
    if (!n.read_at) markOne.mutate(n.id);
    if (onNavigate) {
      // A populated url wins; otherwise fall back to the kind.
      const fromUrl = n.url && /[?&]t=([^&]+)/.exec(n.url);
      const target = fromUrl
        ? decodeURIComponent(fromUrl[1].replace(/\+/g, ' '))
        : KIND_TAB[n.kind];
      if (target) onNavigate(target);
    }
    setOpen(false);
  };

  const handleWhatsApp = async () => {
    try {
      const digest = await getWaDigest();
      const text = digest?.text || digest?.message || 'No alerts';
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    } catch (e) {
      console.error('WA digest failed', e);
    }
  };

  return (
    <div style={S.wrap} ref={wrapRef}>
      <button
        style={S.btn}
        onClick={() => setOpen(v => !v)}
        title="Notifications"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        Alerts
        {unreadCount > 0 && (
          <span style={S.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <div style={S.panel}>
          <div style={S.head}>
            <div style={S.headTitle}>Alerts</div>
            <div style={S.headActions}>
              {unreadCount > 0 && (
                <button style={S.headBtn} onClick={() => markAll.mutate()}>
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div style={S.list}>
            {list.length === 0 ? (
              <div style={S.empty}>No alerts right now. All clear.</div>
            ) : (
              list.slice(0, 30).map(n => (
                <div
                  key={n.id}
                  style={{
                    ...S.item,
                    background: n.read_at ? '#fff' : '#f6f8f6',
                  }}
                  onClick={() => handleItemClick(n)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read_at ? '#fff' : '#f6f8f6'; }}
                >
                  <div style={{ ...S.dot, background: SEV_COLOR[n.severity] || '#6b7280' }} />
                  <div style={S.itemBody}>
                    <div style={S.itemTitle}>{n.title}</div>
                    <div style={S.itemText}>{n.body}</div>
                    <div style={S.itemTime}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={S.foot}>
            <button style={S.footBtn} onClick={handleWhatsApp}>
              Send alerts to WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
