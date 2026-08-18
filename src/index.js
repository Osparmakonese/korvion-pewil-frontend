// Extra safety net for very old browsers/tablets: guarantee Promise,
// Symbol, modern array/object methods etc. exist even beyond what the
// build's automatic per-file polyfilling covers. Must be the very first
// thing imported, before anything else touches these APIs.
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './context/AuthContext';
import { toast, errorMessage } from './utils/toast';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// ---------------------------------------------------------------------------
// Sentry error tracking + performance monitoring
// ---------------------------------------------------------------------------
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Performance: sample 10% of transactions
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    // Release tagging so Sentry knows which deploy introduced a bug
    release: process.env.REACT_APP_SENTRY_RELEASE || process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA || undefined,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'production',
    // Only send traces for API calls to our backend
    tracePropagationTargets: [
      /^https:\/\/api\.pewil\.org\/api/,
      /^https:\/\/pewil-production\.up\.railway\.app\/api/,
    ],
    // Scrub sensitive data
    sendDefaultPii: false,
    // Ignore noise
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Service worker / network
      'NetworkError',
      'Failed to fetch',
      'Load failed',
    ],
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      // ── WHY networkMode IS SET (2026-08-18) ────────────────────────
      //
      // React Query's default is `networkMode: 'online'`, which means it
      // will not run a query function at all when `navigator.onLine` is
      // false. The query does not fail — it is PAUSED. `status` stays
      // 'pending' and `fetchStatus` becomes 'paused', for as long as the
      // device is offline.
      //
      // That single default is why the whole offline effort appeared to do
      // nothing. Every screen was empty in aeroplane mode not because the
      // requests failed, but because THEY WERE NEVER MADE — so axios was
      // never called, so the saved-copy fallback in `offlineReadCache`
      // never got the chance to answer. We had built a cache that could
      // not be reached.
      //
      // 'offlineFirst' makes the first attempt regardless of what the
      // browser thinks of the network. It fails, axios serves the saved
      // copy, and the screen fills. Retries are still paused while
      // offline, so a dead network does not turn into a retry storm.
      networkMode: 'offlineFirst',
    },
    // Safety net for write failures.
    //
    // An audit on 5 Aug found 135 of 155 write mutations had no onError of
    // their own: when a save failed the user saw absolutely nothing — the
    // button stopped spinning and the change simply never happened. That is
    // what "it refuses but I think it works" looks like from the shop floor.
    //
    // react-query uses this only as a DEFAULT: any mutation that declares its
    // own onError overrides it, so pages with bespoke inline error UI
    // (ReceiptCustomization, TeamManagement, Billing…) are untouched and
    // nothing double-reports.
    mutations: {
      // Same default, worse consequence. A PAUSED mutation reports
      // `isPending: true` and never calls its mutationFn, so every save
      // button in the app spins forever with no error and no timeout the
      // moment the device goes offline — including the till's Charge
      // button, which is how "it sticks on Processing" happened on
      // desktop and mobile alike.
      //
      // Pausing exists so a mutation can resume when the network returns.
      // That is the wrong trade here: a cashier watching a spinner has no
      // idea whether the customer has been charged. Run it, let it fail,
      // and say so — the sale path has its own durable queue for the
      // offline case, and every other write is read-only-offline by
      // design and should report that plainly.
      networkMode: 'offlineFirst',
      onError: (err) => {
        // 401 is handled by the axios interceptor (redirects to login) and
        // 402 flips the billing gate — don't shout over either of those.
        const status = err?.response?.status;
        if (status === 401) return;
        try {
          toast({ message: errorMessage(err), kind: 'error' });
        } catch (_) {
          /* never let error reporting throw */
        }
      },
    },
  },
});

// Sentry error boundary fallback
function SentryFallback({ error, resetError }) {
  // Independent of React context on purpose: if the crash happened inside
  // AuthProvider itself, hooks like useAuth() would not be safely usable
  // here (this fallback replaces that entire subtree). So this reads the
  // token straight from localStorage and talks to the API with plain
  // fetch, not the shared axios instance or any app context.
  const [payBusy, setPayBusy] = React.useState(false);
  const [payError, setPayError] = React.useState(null);

  const goToPayment = async () => {
    setPayBusy(true);
    setPayError(null);
    try {
      const token = localStorage.getItem('access_token');
      const baseURL = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      let module = 'retail';
      try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (cachedUser && cachedUser.modules && cachedUser.modules[0]) {
          module = cachedUser.modules[0];
        }
      } catch (_) { /* best-effort */ }

      const plansRes = await fetch(`${baseURL}/billing/plans/?module=${module}`, { headers });
      const plansData = await plansRes.json();
      const plans = plansData.results || plansData || [];
      const sorted = [...plans].sort(
        (a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0)
      );
      const slug = sorted[0] && sorted[0].slug;
      if (!slug) {
        setPayError('No plan available - please contact support.');
        setPayBusy(false);
        return;
      }

      const payRes = await fetch(`${baseURL}/billing/billing/initialize_payment/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan_slug: slug, billing_cycle: 'monthly', payment_method: 'card' }),
      });
      const payData = await payRes.json();
      const url = payData.redirect_url || payData.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        setPayError('Could not start payment - please try again or contact support.');
        setPayBusy(false);
      }
    } catch (e) {
      setPayError('Could not start payment - please try again or contact support.');
      setPayBusy(false);
    }
  };

  // Not every error reaching this boundary is a bug, and "Something went
  // wrong" is the wrong thing to tell a shopkeeper who is merely offline or
  // who happens to have the app open while a deploy lands.
  //
  // STALE BUNDLE is the big one. Pewil is a PWA, so a phone can sit on an old
  // bundle for days. Every deploy renames the lazy-loaded chunks, so the old
  // bundle then asks for a filename that no longer exists on Vercel and React
  // throws ChunkLoadError the moment a route is opened. It looks exactly like
  // "sometimes when I open it, it says something went wrong" — and it has
  // nothing to do with payment. The cure is simply to load the new bundle, so
  // do that automatically, once, guarded against a reload loop.
  const msg = String(error?.name || '') + ' ' + String(error?.message || '');
  const isStaleBundle = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i.test(msg);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const isNetwork = !isOffline && /NetworkError|Failed to fetch|Load failed/i.test(msg);

  React.useEffect(() => {
    if (!isStaleBundle) return;
    const KEY = 'pewil_chunk_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    // Only auto-reload if we haven't just tried — otherwise a genuinely broken
    // deploy would put the app in an endless refresh.
    if (Date.now() - last < 20000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }, [isStaleBundle]);

  const heading = isStaleBundle ? 'Updating Pewil…'
    : isOffline ? 'You’re offline'
    : isNetwork ? 'Can’t reach Pewil'
    : 'Something went wrong';

  const detail = isStaleBundle
    ? 'A new version was just released. Loading it now — this takes a second.'
    : isOffline
      ? 'Your device has no connection. Sales you have already rung up are saved on this device and will sync when you’re back online.'
      : isNetwork
        ? 'We couldn’t reach the server. Check your connection and try again — nothing has been lost.'
        : 'The error has been reported. If this happened because your subscription needs attention, you can go straight to payment below.';

  return (
    <div style={{
      padding: 40, fontFamily: 'Inter, sans-serif', maxWidth: 520, margin: '80px auto',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 36 }}>{isStaleBundle ? '↻' : isOffline || isNetwork ? '⚠' : '!'}</div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#111827', marginTop: 8 }}>
        {heading}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
        {detail}
      </p>
      {payError && (
        <div style={{ background: '#fff1f1', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginTop: 10 }}>
          {payError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={resetError}
          style={{
            padding: '10px 20px', background: '#fff', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try again
        </button>
        {/* Only offer payment when the cause could plausibly BE payment.
            Showing "Go to payment" to someone who is simply offline suggests
            they owe money, which is both alarming and wrong. */}
        {!isStaleBundle && !isOffline && !isNetwork && (
        <button
          onClick={goToPayment}
          disabled={payBusy}
          style={{
            padding: '10px 20px', background: payBusy ? '#3d8a5b' : '#1a6b3a', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: payBusy ? 'wait' : 'pointer',
          }}
        >
          {payBusy ? 'Starting payment...' : 'Go to payment'}
        </button>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 16 }}>
        Still stuck? Email{' '}
        <a href="mailto:osy@pewil.org?subject=App%20error" style={{ color: '#1a6b3a' }}>
          osy@pewil.org
        </a>
      </p>
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Sentry.ErrorBoundary fallback={SentryFallback}>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </Sentry.ErrorBoundary>
);

// Service worker re-enabled 2026-04-28 with a network-first strategy that
// won't repeat the 2026-04-23 stale-bundle bug. See src/service-worker.js
// for the full strategy comment. The new SW NEVER precaches; navigation +
// JS/CSS are network-first so a fresh deploy is always served first;
// stable static assets (icons, fonts, manifest) are cache-first.
//
// 2026-04-30 — added onUpdate auto-reload. When a NEW service worker
// installs while the user is running the old bundle (e.g. CRA's prior
// Workbox precache), this callback (a) tells the new SW to skip waiting
// so it activates immediately, and (b) reloads the page once the new SW
// is in control. Without this, returning users could be stuck on the
// old bundle for HOURS or until they manually closed/reopened the PWA —
// which broke the "added a product but dashboard didn't update" demo.
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    const waiting = registration && registration.waiting;
    if (!waiting) return;
    // Listen for the new SW taking control, then reload.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    // Tell the waiting SW to activate now instead of waiting for all tabs to close.
    try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) { /* swallow */ }
  },
});

// Ask the browser to KEEP our offline data (2026-08-18).
//
// IndexedDB is "best-effort" storage by default: when an Android phone runs
// low on space the browser may evict the whole origin, without asking, and
// that would take the product catalogue AND any sales still queued on a till
// with it. Granting persistence means the browser has to ask the user first.
//
// Chrome grants this silently to an installed PWA the user actually uses, so
// there is no prompt to time carefully — we just ask once per load, after
// first paint, and carry on regardless of the answer.
try {
  import('./utils/offlineReadCache')
    .then(({ requestPersistentStorage }) => requestPersistentStorage())
    .catch(() => {});
} catch (_) { /* best effort */ }
