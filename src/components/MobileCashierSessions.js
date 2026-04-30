/**
 * MobileCashierSessions.js — phone-first cashier session list.
 *
 * Used by pages/CashierSessions.js when window.innerWidth <= 500.
 * Same getCashierSessions query, same open / close mutations — only
 * the layout is mobile-flavoured.
 *
 * Visual style: locked mobile language (cream + green). Sessions are
 * shown as cards: top section = status pill + cashier + duration,
 * bottom = revenue + transaction count + variance pill if closed.
 * "Open new session" CTA pinned via FAB.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCashierSessions } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  cream:   '#ffffff',
  cream2:  '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange:  '#c77700',
  orange2: '#e09a2b',
  amber:   '#f5c518',
  red:     '#c0392b',
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function durationOf(opened, closed) {
  if (!opened) return '—';
  const start = new Date(opened).getTime();
  const end = closed ? new Date(closed).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function MobileCashierSessions({ onOpenSession, onCloseSession, onViewSession }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['retail-cashier-sessions-page'],
    queryFn: getCashierSessions,
    staleTime: 30000,
  });

  const open = sessions.filter((s) => !s.closed_at);
  const closed = sessions
    .filter((s) => s.closed_at)
    .sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at))
    .slice(0, 20);

  return (
    <div style={{
      padding: '12px 16px 0',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: T.ink,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Open sessions */}
      <SectionLabel>Open now</SectionLabel>
      {isLoading ? (
        <Skeleton h={92} mb={10} />
      ) : open.length === 0 ? (
        <Empty
          message="No active cashier sessions."
          hint="Tap + to open a new till."
        />
      ) : open.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          status="open"
          onCloseSession={onCloseSession}
          onViewSession={onViewSession}
        />
      ))}

      <div style={{ height: 14 }} />

      {/* Recent closed */}
      <SectionLabel>Recent</SectionLabel>
      {isLoading ? (
        <Skeleton h={92} />
      ) : closed.length === 0 ? (
        <Empty message="No closed sessions yet." />
      ) : closed.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          status="closed"
          onCloseSession={onCloseSession}
          onViewSession={onViewSession}
        />
      ))}

      {/* FAB to open a new session */}
      <button
        type="button"
        onClick={() => onOpenSession?.()}
        aria-label="Open new cashier session"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          width: 56, height: 56,
          borderRadius: '50%',
          background: T.ink, color: T.cream,
          border: 'none',
          fontSize: 24, fontWeight: 700,
          boxShadow: '0 12px 30px rgba(28,22,10,0.30)',
          cursor: 'pointer',
          zIndex: 400,
          fontFamily: 'inherit',
        }}
      >+</button>
    </div>
  );
}

function SessionCard({ session, status, onCloseSession, onViewSession }) {
  const cashier = session.cashier_name || session.cashier_username || `Cashier #${session.cashier || '—'}`;
  const isOpen = status === 'open';
  const total = parseFloat(session.total_sales || 0);
  const txCount = session.transaction_count || 0;
  const variance = session.variance != null ? parseFloat(session.variance) : null;
  const varianceTone = variance == null
    ? null
    : Math.abs(variance) < 0.01
    ? 'ok'
    : Math.abs(variance) < 5
    ? 'warn'
    : 'bad';

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
      }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: isOpen ? 'rgba(26,107,58,0.10)' : 'rgba(0,0,0,0.05)',
          color: isOpen ? T.green : T.muted,
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {isOpen && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.green,
              boxShadow: '0 0 0 4px rgba(26,107,58,0.18)',
            }} />
          )}
          {isOpen ? 'Open' : 'Closed'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14, color: T.ink,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{cashier}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
            {isOpen
              ? `Open ${durationOf(session.opened_at)} · started ${timeAgo(session.opened_at)}`
              : `${durationOf(session.opened_at, session.closed_at)} · closed ${timeAgo(session.closed_at)}`}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, marginBottom: 10,
      }}>
        <KV label="Sales" value={fmt(total, 'zwd')} />
        <KV label="Transactions" value={txCount} />
      </div>

      {variance != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 700,
          background:
            varianceTone === 'ok'   ? '#dcfce7' :
            varianceTone === 'warn' ? '#fef3c7' :
            '#fee2e2',
          color:
            varianceTone === 'ok'   ? '#166534' :
            varianceTone === 'warn' ? '#92400e' :
            '#7f1d1d',
          marginBottom: 10,
        }}>
          Variance: {variance >= 0 ? '+' : ''}{fmt(variance, 'zwd')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {isOpen ? (
          <button
            type="button"
            onClick={() => onCloseSession?.(session)}
            style={{
              flex: 1, padding: 12, borderRadius: 12,
              background: T.ink, color: T.cream,
              border: 'none', fontWeight: 800, fontSize: 13,
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >Close session</button>
        ) : (
          <button
            type="button"
            onClick={() => onViewSession?.(session)}
            style={{
              flex: 1, padding: 12, borderRadius: 12,
              background: '#fff', color: T.ink,
              border: `1px solid ${T.line}`,
              fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >View Z-Report</button>
        )}
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{
      background: T.cream2,
      borderRadius: 10,
      padding: '8px 10px',
    }}>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 16, fontWeight: 700, color: T.ink, marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.muted,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '0 4px 8px',
    }}>{children}</div>
  );
}

function Empty({ message, hint }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${T.line}`,
      borderRadius: 16,
      padding: 24, textAlign: 'center',
      color: T.muted, fontSize: 13,
    }}>
      {message}
      {hint && <div style={{ fontSize: 11, marginTop: 6, color: T.muted }}>{hint}</div>}
    </div>
  );
}

function Skeleton({ h, mb }) {
  return (
    <div style={{
      height: h, borderRadius: 16, marginBottom: mb,
      background: 'linear-gradient(90deg, #f1e8d4, #f9efd9, #f1e8d4)',
      backgroundSize: '200% 100%',
      animation: 'pulseShimmer 1.4s ease-in-out infinite',
    }} />
  );
}
