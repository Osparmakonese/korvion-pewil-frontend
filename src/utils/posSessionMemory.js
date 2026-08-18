/**
 * The till remembers the session it was left on.
 *
 * Why this exists (2026-08-18)
 * ----------------------------
 * Reported from a real phone in aeroplane mode: a cashier with an OPEN
 * session closed the app, reopened it offline, and the till said
 * "You don't have an open cashier session. Please open one before
 * continuing." — refusing to sell, in a shop where the session had never
 * been closed.
 *
 * The cause is plain once you look: POS decides whether a session is open
 * from `GET /retail/cashier-sessions/`. Offline that request fails, React
 * Query hands the component its default `[]`, and an empty list is
 * indistinguishable from "every session is closed". So the till concluded
 * the cashier had no session — from an answer nobody gave it.
 *
 * A cashier session cannot be OPENED offline and that stays true: the sale
 * carries `session: <id>`, the id is minted by the server, and
 * `CashierSession` has no client-side idempotency key to mint one against
 * (Sale, StockAdjustment, Return and CashDrop have one; this does not). But
 * a session that was already open is a fact this device watched happen, and
 * forgetting it because the network went away is the app losing information
 * it already had.
 *
 * So: whenever the live list arrives, the open sessions are written here.
 * When the request FAILS, the till reads them back. Never when the request
 * succeeds — a genuinely empty list from a server that answered means the
 * session really was closed, and resurrecting it then would let a cashier
 * ring sales into a session that no longer exists.
 *
 * Known limit, stated rather than hidden: if a manager closes the session
 * from another device while this one is offline, this till keeps selling
 * into it. Those sales are refused on sync and land in the dead-letter list
 * on the sync-queue screen for a person to re-enter. That is the honest
 * trade against a till that cannot sell at all, and it is why this only
 * covers sessions THIS device saw open.
 */

const KEY = 'pewil_pos_open_sessions';

// Only the fields POS actually reads, so a stored session can never carry
// a stale total or cash figure that some screen might later believe.
const FIELDS = [
  'id', 'closed_at', 'cashier_username', 'cashier',
  'branch', 'branch_id', 'branch_name', 'opened_at', 'created_at',
];

function pick(session) {
  const out = {};
  for (const f of FIELDS) {
    if (session && session[f] !== undefined) out[f] = session[f];
  }
  return out;
}

/**
 * Store the OPEN sessions from a live list. Closed ones are dropped — this
 * is a memory of "what was open", not a cache of the endpoint.
 */
export function rememberOpenSessions(sessions) {
  try {
    if (!Array.isArray(sessions)) return;
    const open = sessions.filter((s) => s && !s.closed_at).map(pick);
    if (open.length === 0) {
      // The server answered and nothing is open. Forget, so a later offline
      // start does not resurrect a session that has since been closed.
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({
      saved_at: Date.now(),
      sessions: open,
    }));
  } catch (_) {
    /* private mode / quota — the till just falls back to the old behaviour */
  }
}

/**
 * The sessions this device last saw open, or `[]`.
 *
 * `maxAgeHours` guards against a till that has been offline for days
 * selling into a session that any real shop would have closed at the end of
 * that day. 24 hours is deliberately generous — a session spanning a night
 * shift is normal; one spanning a week is not.
 */
export function recallOpenSessions(maxAgeHours = 24) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const sessions = parsed && Array.isArray(parsed.sessions) ? parsed.sessions : [];
    if (!sessions.length) return [];
    const savedAt = Number(parsed.saved_at) || 0;
    if (savedAt && Date.now() - savedAt > maxAgeHours * 3600 * 1000) return [];
    return sessions;
  } catch (_) {
    return [];
  }
}

/** How old the remembered list is, in ms, or null. For the UI to be honest. */
export function recalledAge() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const savedAt = Number(JSON.parse(raw).saved_at) || 0;
    return savedAt ? Date.now() - savedAt : null;
  } catch (_) {
    return null;
  }
}

/** Logout, tenant switch, or a session the cashier has just closed. */
export function forgetOpenSessions() {
  try { localStorage.removeItem(KEY); } catch (_) {}
}
