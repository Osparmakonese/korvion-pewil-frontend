import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  isOffline,
  getPendingSales,
  getDeadLetters,
  retryDeadLetter,
  dismissDeadLetter,
  removePendingSale,
  drainPendingSales,
  clearDeadLetters,
  onPendingChange,
} from '../utils/offlinePOS';
import { fmt } from '../utils/format';

/**
 * SyncQueue — cashier-facing page that surfaces the offline sales queue
 * and the dead-letter list. Reached via the OfflineIndicator pill in
 * Topbar (clicking takes the cashier here).
 *
 * Sections:
 *   1. Connection state header (Online / Offline + pending count)
 *   2. Pending sales — currently waiting to sync (drained automatically;
 *      this is mostly informational so the cashier can SEE the queue)
 *   3. Failed sales — permanent failures after 20 retries; cashier can
 *      Retry (move back to live queue) or Dismiss (drop permanently after
 *      they've handled it manually e.g. re-entered the sale)
 *
 * Why this page matters: without it, dead-lettered sales are only
 * accessible via console (getDeadLetters()). With it, a cashier sees
 * the queue, knows what's stuck, and can resolve it themselves.
 */

const C = {
  ink: '#111827', muted: '#6b7280', line: '#e5e7eb',
  green: '#1a6b3a', greenSoft: '#e8f5ee', greenDark: '#0d4a22',
  amber: '#c77700', amberSoft: '#fff4e1',
  red: '#991b1b', redSoft: '#fee2e2',
};

const SANS = "'Inter', system-ui, -apple-system, sans-serif";

export default function SyncQueue() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(() => getPendingSales());
  const [failed, setFailed] = useState(() => getDeadLetters());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [draining, setDraining] = useState(false);
  const [drainResult, setDrainResult] = useState(null);

  // Subscribe to queue changes.
  useEffect(() => {
    const refresh = () => {
      setPending(getPendingSales());
      setFailed(getDeadLetters());
    };
    const unsub = onPendingChange(refresh);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Refresh every 3s in case dead-letter list mutated outside our subscribers
    const t = setInterval(refresh, 3000);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(t);
    };
  }, []);

  const forceDrain = useCallback(async () => {
    if (draining) return;
    setDraining(true);
    try {
      const result = await drainPendingSales(api);
      setDrainResult(result);
      setPending(getPendingSales());
      setFailed(getDeadLetters());
      setTimeout(() => setDrainResult(null), 5000);
    } finally {
      setDraining(false);
    }
  }, [draining]);

  const handleRetry = useCallback((crn) => {
    retryDeadLetter(crn);
    setPending(getPendingSales());
    setFailed(getDeadLetters());
    // Kick the drain so the retried sale gets sent immediately.
    drainPendingSales(api).then(() => {
      setPending(getPendingSales());
      setFailed(getDeadLetters());
    });
  }, []);

  const handleDismiss = useCallback((crn) => {
    if (!window.confirm('Dismiss this failed sale? You will need to enter it manually if you want to keep it.')) {
      return;
    }
    dismissDeadLetter(crn);
    setFailed(getDeadLetters());
  }, []);

  const handleRemovePending = useCallback((crn) => {
    if (!window.confirm('Remove this pending sale from the queue? This is a manual void — only do this if you are sure this sale should NOT sync.')) {
      return;
    }
    removePendingSale(crn);
    setPending(getPendingSales());
  }, []);

  const handleClearAllFailed = useCallback(() => {
    if (failed.length === 0) return;
    if (!window.confirm(`Dismiss all ${failed.length} failed sales? Only do this if you have entered them manually elsewhere.`)) {
      return;
    }
    clearDeadLetters();
    setFailed([]);
  }, [failed]);

  const totalPending = pending.length;
  const totalFailed = failed.length;
  const allClear = online && totalPending === 0 && totalFailed === 0;

  return (
    <div style={{ fontFamily: SANS, padding: '24px 28px', maxWidth: 1100, margin: '0 auto', color: C.ink }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 0, color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 6 }}
          >
            &larr; Back
          </button>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: C.ink, letterSpacing: '-0.01em' }}>
            Offline sync queue
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0', maxWidth: 700, lineHeight: 1.55 }}>
            Pewil keeps your shop running when the internet drops. Sales
            ring up locally, then sync automatically when you reconnect.
            This page shows the state of the queue.
          </p>
        </div>
        <button
          type="button"
          onClick={forceDrain}
          disabled={draining || !online || totalPending === 0}
          style={{
            background: online && totalPending > 0 ? C.green : C.line,
            color: online && totalPending > 0 ? '#fff' : C.muted,
            border: 0, borderRadius: 999, padding: '9px 20px',
            fontSize: 13, fontWeight: 700,
            cursor: (draining || !online || totalPending === 0) ? 'not-allowed' : 'pointer',
            opacity: draining ? 0.7 : 1,
          }}
        >
          {draining ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {/* Connection state header */}
      <StateCard online={online} pending={totalPending} failed={totalFailed} drainResult={drainResult} />

      {/* Failed first — highest priority */}
      {totalFailed > 0 && (
        <Section
          title={`Failed sales (${totalFailed})`}
          subtitle="These sales hit a server error and gave up after 20 retries. Tap Retry to try again, or Dismiss after you've recorded them manually."
          accent={C.red}
          right={
            <button
              type="button" onClick={handleClearAllFailed}
              style={{
                background: 'none', border: '1px solid ' + C.line, borderRadius: 999,
                padding: '6px 14px', fontSize: 12, fontWeight: 600, color: C.muted, cursor: 'pointer',
              }}
            >
              Dismiss all
            </button>
          }
        >
          {failed.map((item) => (
            <QueueRow
              key={item.client_receipt_number}
              item={item}
              accent={C.red}
              status="FAILED"
              actions={[
                { label: 'Retry', onClick: () => handleRetry(item.client_receipt_number), primary: true },
                { label: 'Dismiss', onClick: () => handleDismiss(item.client_receipt_number) },
              ]}
            />
          ))}
        </Section>
      )}

      {/* Pending — informational */}
      {totalPending > 0 ? (
        <Section
          title={`Pending sales (${totalPending})`}
          subtitle={online
            ? "These are queued and will sync as soon as the network is stable. You don't need to do anything."
            : "Waiting for the internet to come back. They will sync automatically once it does."}
          accent={online ? C.amber : C.red}
        >
          {pending.map((item) => (
            <QueueRow
              key={item.client_receipt_number}
              item={item}
              accent={online ? C.amber : C.red}
              status={online ? 'SYNCING' : 'OFFLINE'}
              actions={[
                { label: 'Remove from queue', onClick: () => handleRemovePending(item.client_receipt_number) },
              ]}
            />
          ))}
        </Section>
      ) : null}

      {/* All clear */}
      {allClear && (
        <div style={{
          background: C.greenSoft, border: '1px solid #a3e7b8',
          borderRadius: 16, padding: '28px 30px', marginTop: 20,
          color: C.greenDark, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
          <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            All sales synced
          </div>
          <div style={{ fontSize: 13, color: C.greenDark, opacity: 0.8 }}>
            Nothing queued, nothing failed, connection is good. Carry on selling.
          </div>
        </div>
      )}
    </div>
  );
}

function StateCard({ online, pending, failed, drainResult }) {
  const status = !online ? 'offline' : failed > 0 ? 'failed' : pending > 0 ? 'syncing' : 'good';
  const cfg = {
    offline:  { bg: C.redSoft,    bd: '#fecaca',                  fg: C.red,       icon: '⚡', title: 'Offline',        sub: 'New sales will queue and sync when you reconnect.' },
    failed:   { bg: C.redSoft,    bd: '#fecaca',                  fg: C.red,       icon: '⚠', title: 'Action needed',   sub: 'Some sales could not sync after multiple retries. Resolve them below.' },
    syncing:  { bg: C.amberSoft,  bd: 'rgba(199,119,0,0.3)',      fg: '#7a4a00',   icon: '⟳', title: 'Syncing sales',   sub: 'Your queued sales are being pushed to the server. This usually takes a few seconds.' },
    good:     { bg: C.greenSoft,  bd: '#a3e7b8',                  fg: C.greenDark, icon: '✓', title: 'Online · synced', sub: 'Everything is up to date.' },
  }[status];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      background: cfg.bg, border: '1px solid ' + cfg.bd, borderRadius: 16,
      padding: '20px 24px', marginBottom: 22,
    }}>
      <div style={{ fontSize: 24, color: cfg.fg }}>{cfg.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: cfg.fg, marginBottom: 4 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 13, color: cfg.fg, opacity: 0.9, lineHeight: 1.55 }}>
          {cfg.sub}
        </div>
        {drainResult && (
          <div style={{ marginTop: 10, fontSize: 12, color: cfg.fg, opacity: 0.85 }}>
            Last sync attempt: <strong>{drainResult.sent}</strong> sent
            {drainResult.failed ? <>, <strong>{drainResult.failed}</strong> failed</> : null}
            {drainResult.remaining ? <>, <strong>{drainResult.remaining}</strong> still queued</> : null}.
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, accent, right, children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: accent }}>
            {title}
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 700, lineHeight: 1.55 }}>
            {subtitle}
          </div>
        </div>
        {right}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function QueueRow({ item, accent, status, actions }) {
  const payload = item.payload || {};
  const queuedAgo = item.queued_at ? formatAgo(Date.now() - item.queued_at) : '—';
  const lineCount = (payload.items_data || []).length;
  const total = Number(payload.total || 0);
  return (
    <div style={{
      background: '#fff', border: '1px solid ' + C.line, borderRadius: 14,
      padding: '14px 18px',
      display: 'grid', gridTemplateColumns: '90px 1fr auto', alignItems: 'center', gap: 14,
    }}>
      <span style={{
        background: accent, color: '#fff', fontSize: 10, fontWeight: 700,
        padding: '3px 10px', borderRadius: 999, letterSpacing: '0.08em',
        textAlign: 'center', justifySelf: 'start',
      }}>{status}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 3 }}>
          {fmt(total, 'zwd')} &middot; {lineCount} item{lineCount === 1 ? '' : 's'} &middot;{' '}
          <span style={{ color: C.muted, fontWeight: 500 }}>{payload.payment_method || '—'}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, fontFamily: 'monospace' }}>
          {item.client_receipt_number}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
          Queued <strong>{queuedAgo}</strong>
          {item.attempts > 0 && <> &middot; <strong>{item.attempts}</strong> attempt{item.attempts === 1 ? '' : 's'}</>}
          {item.last_error && (
            <> &middot; last error: <span style={{ color: C.red }}>{String(item.last_error).slice(0, 80)}</span></>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            style={{
              background: a.primary ? accent : '#fff',
              color: a.primary ? '#fff' : C.muted,
              border: a.primary ? 'none' : '1px solid ' + C.line,
              borderRadius: 999, padding: '6px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatAgo(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
