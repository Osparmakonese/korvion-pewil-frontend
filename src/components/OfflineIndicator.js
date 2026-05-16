import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isOffline,
  getPendingCount,
  onPendingChange,
  installOfflineSync,
  getDeadLetters,
} from '../utils/offlinePOS';
import api from '../api/axios';

/**
 * OfflineIndicator — app-wide pill showing connection + queue state.
 *
 * Three states:
 *   1. Online + 0 pending     → renders nothing (don't add noise when fine).
 *   2. Online + N pending     → amber pill "Syncing N sales…"  (auto-drains
 *                               in the background via installOfflineSync).
 *   3. Offline + N pending    → red pill "Offline · N sales queued".
 *
 * Also handles the "everything synced" toast: when pendingCount goes from
 * N > 0 → 0 we briefly flash a green "✓ All sales synced" pill for ~3s
 * so the cashier knows the queue is empty.
 *
 * Mounts once at the app root (Layout.js). Multiple instances are safe —
 * installOfflineSync's drain timer is process-global because it lives on
 * localStorage, but the visual pill should only render once.
 *
 * The actual queue + drain logic lives in src/utils/offlinePOS.js — this
 * component is purely visual.
 */
export default function OfflineIndicator() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(() => getPendingCount());
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [deadLetters, setDeadLetters] = useState(() => getDeadLetters().length);

  // Click handler — any non-null pill navigates to the sync queue page
  // so the cashier can see what's queued / failed / draining.
  const goToQueue = () => navigate('/sync-queue');

  // Subscribe to pending-count changes (fired by offlinePOS write()).
  useEffect(() => {
    let prev = pending;
    const unsub = onPendingChange((n) => {
      if (prev > 0 && n === 0 && online) {
        // Just finished draining — flash a success pill for 3s.
        setFlashSuccess(true);
        setTimeout(() => setFlashSuccess(false), 3000);
      }
      prev = n;
      setPending(n);
      setDeadLetters(getDeadLetters().length);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Track online/offline events.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Install the global drain timer (idempotent — installOfflineSync uses
  // a singleton interval). This is also called by POS.js, but mounting
  // it here means the queue drains even when the cashier isn't on /pos.
  useEffect(() => {
    const stop = installOfflineSync(api, {
      onDrain: () => {
        setPending(getPendingCount());
        setDeadLetters(getDeadLetters().length);
      },
    });
    return () => stop();
  }, []);

  // Decide what (if anything) to render.
  // Priority: dead-letters > offline > pending > success-flash > hidden.

  if (deadLetters > 0) {
    return (
      <Pill
        bg="#fee2e2" border="#fecaca" color="#991b1b" icon="⚠"
        title={`${deadLetters} sale${deadLetters === 1 ? '' : 's'} failed to sync after multiple retries — click to resolve`}
        onClick={goToQueue}
      >
        <strong>{deadLetters}</strong> sale{deadLetters === 1 ? '' : 's'} failed to sync
      </Pill>
    );
  }

  if (!online) {
    return (
      <Pill
        bg="#fef2f2" border="#fecaca" color="#991b1b" icon="⚡"
        title={pending > 0
          ? `Offline. ${pending} sale${pending === 1 ? '' : 's'} queued — click to view`
          : 'Offline. New sales will queue and sync when you reconnect.'}
        onClick={goToQueue}
      >
        Offline
        {pending > 0 && (
          <> &middot; <strong>{pending}</strong> queued</>
        )}
      </Pill>
    );
  }

  if (pending > 0) {
    return (
      <Pill
        bg="#fff4e1" border="rgba(199,119,0,0.3)" color="#7a4a00" icon="⟳"
        title={`Syncing ${pending} pending sale${pending === 1 ? '' : 's'} — click to view queue`}
        onClick={goToQueue}
      >
        Syncing <strong>{pending}</strong> sale{pending === 1 ? '' : 's'}…
      </Pill>
    );
  }

  if (flashSuccess) {
    return (
      <Pill bg="#e8f5ee" border="#a3e7b8" color="#0d4a22" icon="✓" onClick={goToQueue}>
        All sales synced
      </Pill>
    );
  }

  return null;
}

function Pill({ bg, border, color, icon, title, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '5px 11px',
        borderRadius: 999,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 12 }}>{icon}</span>
      <span>{children}</span>
    </button>
  );
}
