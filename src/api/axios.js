// Production: https://pewil-production.up.railway.app
import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401, handle 403 gracefully (FIX 11)
//
// Offline-safe behavior (added 2026-05-16):
//   The previous version would catch any failure of /api/token/refresh/
//   (including network failures while offline) and immediately wipe
//   localStorage + redirect to /login. That broke 4-hour offline
//   cashier shifts: 30 minutes in, the access token expires, a
//   background refetch hits 401, refresh fails because offline,
//   user gets kicked out mid-shift with their queued sales stuck.
//
//   New rule: if `navigator.onLine === false` OR the refresh request
//   itself fails with a network error, we DO NOT clear tokens and
//   DO NOT redirect. We just propagate the 401 to the caller. React
//   Query backs off. The cashier stays on the page. When connectivity
//   returns the next request triggers a successful refresh and life
//   resumes.
//
//   Only redirect to /login when refresh actually returns a 4xx
//   (refresh token genuinely expired or revoked) — that's a real
//   logged-out state, not a transient outage.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      // Don't even attempt refresh while offline — the request would
      // throw a network error, and we'd accidentally treat that as a
      // logged-out state. Just propagate the original 401.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return Promise.reject(error);
      }
      try {
        const refresh = localStorage.getItem('refresh_token');
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api/token/refresh/`,
          { refresh }
        );
        localStorage.setItem('access_token', res.data.access);
        original.headers.Authorization = `Bearer ${res.data.access}`;
        return api(original);
      } catch (refreshErr) {
        // Network error during refresh ≠ logged out. Could be the
        // browser flipped to offline between our navigator.onLine
        // check and the actual fetch, or the API host is reachable
        // but returning 502/503/504. Leave the session intact.
        const refreshStatus = refreshErr?.response?.status;
        const isNetwork = !refreshErr?.response
          || refreshErr.code === 'ERR_NETWORK'
          || refreshErr.message === 'Network Error'
          || (refreshStatus >= 500 && refreshStatus <= 599);
        if (isNetwork) {
          return Promise.reject(error);  // propagate the original 401
        }
        // Refresh genuinely rejected (4xx) → real logged-out state.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    // 403 — permission denied (role may have changed)
    if (error.response?.status === 403) {
      // Do not clear storage for 403 — just return the error
      // The UI should show the permission error to the user
    }
    // 402 Payment Required — backend's PlanEnforcementMiddleware blocked
    // a write because the tenant's subscription isn't in good standing.
    // Fire a window event so <BillingLockoutGate /> can flip into the
    // lockout takeover without the calling component having to know
    // anything about billing.
    //
    // The event carries the structured body the middleware emits:
    //   { code: 'subscription_expired', reason, module, status, plan_slug }
    // so the lockout page can render with the right copy.
    if (error.response?.status === 402) {
      try {
        const body = error.response.data || {};
        if (body.code === 'subscription_expired'
            && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pewil:payment-required', {
            detail: {
              reason: body.reason || null,
              module: body.module || null,
              status: body.status || null,
              plan_slug: body.plan_slug || null,
            },
          }));
        }
      } catch (_) {
        // Swallow — don't let interceptor bugs break the underlying error.
      }
    }
    return Promise.reject(error);
  }
);

export default api;
