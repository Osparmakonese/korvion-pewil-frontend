import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './context/AuthContext';
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
    queries: { retry: 1, staleTime: 30000 },
  },
});

// Sentry error boundary fallback
function SentryFallback({ error, resetError }) {
  return (
    <div style={{
      padding: 40, fontFamily: 'Inter, sans-serif', maxWidth: 520, margin: '80px auto',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#111827', marginTop: 8 }}>
        Something went wrong
      </h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
        The error has been reported. You can try reloading this page.
      </p>
      <button
        onClick={resetError}
        style={{
          marginTop: 16, padding: '10px 20px', background: '#1a6b3a', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Try again
      </button>
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
// On the first load after this lands, returning users with the old
// kill-shim SW will have it auto-unregister and reload, then the new SW
// installs. From that point forward the PWA is offline-capable.
serviceWorkerRegistration.register();
