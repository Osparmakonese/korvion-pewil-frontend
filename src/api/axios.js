// Production: https://pewil-production.up.railway.app
import axios from 'axios';
import { toast } from '../utils/toast';
import { rememberRead, recallRead, isCacheable } from '../utils/offlineReadCache';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`,
  headers: { 'Content-Type': 'application/json' },
  // Added 2026-07-28: no timeout meant a dead/weak connection could hang
  // a request indefinitely instead of failing fast into the offline queue.
  timeout: 15000,
});

// Attach JWT token to every request
// Key the owner's "viewing this shop" choice lives under. Exported so the
// switcher and this interceptor can never disagree about the name.
export const VIEW_BRANCH_KEY = 'pewil-view-branch';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // ── Owner branch switcher ────────────────────────────────────────
  // When an owner picks a shop, every retail READ should answer for that
  // shop. Doing that here means one hook instead of threading a branch
  // parameter through several dozen queries — and a query added tomorrow
  // gets it for free.
  //
  // Reads only. A write must never be silently retargeted at another shop
  // by a leftover setting; the server decides where writes land.
  try {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    const viewing = localStorage.getItem(VIEW_BRANCH_KEY);
    if (
      viewing &&
      method === 'get' &&
      url.startsWith('/retail/') &&
      !('branch' in (config.params || {}))
    ) {
      config.params = { ...(config.params || {}), branch: viewing };
    }
  } catch (_) {
    // localStorage can throw in private mode — never break a request over it.
  }

  return config;
});

// ── One refresh at a time, and keep the token it hands back (2026-09-22) ──
//
// The server rotates refresh tokens (ROTATE_REFRESH_TOKENS) and returns a
// new one with every refresh, but only the access token was ever saved. The
// refresh token from the original login therefore expired 14 days after
// sign-in no matter how often the till refreshed, and the till was sent to
// /login in the middle of trading. Every request that 401s together now
// shares ONE refresh call, which has a timeout (plain axios has none, so on
// a dead line it could hang the offline drain behind it indefinitely).
let _refreshing = null;
function refreshAccessToken() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refresh = localStorage.getItem('refresh_token');
    const res = await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api/token/refresh/`,
      { refresh },
      { timeout: 15000 }
    );
    localStorage.setItem('access_token', res.data.access);
    if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);
    return res.data.access;
  })();
  _refreshing.then(() => { _refreshing = null; }, () => { _refreshing = null; });
  return _refreshing;
}

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
  (response) => {
    // Keep the last good answer to every retail/farm read so the same screen
    // can be opened with no internet at all. Fire-and-forget on purpose: the
    // caller already has its data and must never wait on, or fail because
    // of, our bookkeeping.
    try {
      if (isCacheable(response.config)) rememberRead(response.config, response.data);
    } catch (_) { /* never break a good response */ }
    return response;
  },
  async (error) => {
    const original = error.config;

    // ── Offline read fallback (2026-08-18) ────────────────────────────
    // A GET that came back with NO response at all is a dead network — the
    // server never spoke. If we are holding the last good answer to this
    // exact request (same tenant, same shop, same filters — all of it is in
    // the key) serve that instead of an empty screen, flagged so the UI can
    // say how old it is.
    //
    // A 4xx or 5xx is a real answer and is NEVER replaced by a saved copy:
    // "you may not see this" and "that is gone" have to keep meaning what
    // they say. Cancelled requests are skipped too — React Query cancels on
    // unmount, and that is not a failure to paper over.
    const isCancelled = (axios.isCancel && axios.isCancel(error))
      || error?.code === 'ERR_CANCELED';
    if (!error.response && !isCancelled && original && isCacheable(original)) {
      const hit = await recallRead(original);
      if (hit) {
        try {
          window.dispatchEvent(new CustomEvent('pewil:offline-read', {
            detail: { url: original.url, saved_at: hit.saved_at },
          }));
        } catch (_) { /* best effort */ }
        return {
          data: hit.data,
          status: 200,
          statusText: 'OK (saved copy)',
          headers: {},
          config: original,
          request: null,
          __fromOfflineCache: true,
          __cachedAt: hit.saved_at,
        };
      }
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      // Don't even attempt refresh while offline — the request would
      // throw a network error, and we'd accidentally treat that as a
      // logged-out state. Just propagate the original 401.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return Promise.reject(error);
      }
      try {
        const access = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch (refreshErr) {
        // Only the server saying the refresh token itself is bad (400/401)
        // means logged out. Everything else — no response, a timeout, a
        // 429 because a burst of requests all refreshed at once, a 5xx —
        // is not, and used to sign the cashier out mid-shift (2026-09-22).
        // Leave the session intact and propagate the original 401.
        const refreshStatus = refreshErr?.response?.status;
        if (refreshStatus !== 400 && refreshStatus !== 401) {
          return Promise.reject(error);
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
          // Say it plainly, right now, wherever the user is. Pages catch
          // errors and show their own guesses ("no open session", generic
          // save-failed text) — this toast guarantees the REAL reason is
          // on screen before the lockout gate takes over.
          toast({
            message: body.detail
              || 'Your subscription has expired. Pay your bill to continue.',
            kind: 'error',
          });
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
