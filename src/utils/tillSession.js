/**
 * Which open till belongs to the person at this screen.
 *
 * ONE rule, in one place. POS.js used to repeat the same inline filter seven
 * times: `!s.closed_at && s.cashier_username.toLowerCase() === user.username.toLowerCase()`.
 * That is the gate that produced "no cashier session open" for a cashier
 * whose session the server plainly showed as open (REAPING TIME, 23–29 Aug
 * 2026: one cashier could not sell for a week; a whole Saturday's sales were
 * never recorded). Two weaknesses, both fixed here:
 *
 *   1. It matched on the NAME. `user.username` came from whatever was typed
 *      in the login box, `cashier_username` from the server. Now the
 *      cashier's numeric id is compared first - the server puts `user_id` in
 *      the login reply and `cashier` (the id) on every session row - and the
 *      name is only a fallback for rows that predate the id.
 *   2. It trusted whatever list it was handed. The caller decides where the
 *      list came from and how fresh it is; this module just answers the
 *      question honestly for the list it is given, and `describeSessions`
 *      renders that list compactly so a refusal can be reported with the
 *      evidence attached.
 */

export function isMySession(session, user) {
  if (!session || !user) return false;
  const myId = Number(user.user_id ?? user.id);
  const sid = Number(session.cashier);
  if (Number.isFinite(myId) && myId > 0 && Number.isFinite(sid) && sid > 0) {
    return sid === myId;
  }
  const mine = String(user.username || '').trim().toLowerCase();
  const theirs = String(session.cashier_username || '').trim().toLowerCase();
  return !!mine && mine === theirs;
}

export function isOpenSession(session) {
  if (!session) return false;
  if (session.closed_at) return false;
  if (session.status && session.status !== 'open') return false;
  return true;
}

/** The caller's open session, or null. Newest first if several. */
export function findMyOpenSession(sessions, user) {
  const list = Array.isArray(sessions) ? sessions : [];
  const mine = list.filter((s) => isOpenSession(s) && isMySession(s, user));
  if (mine.length <= 1) return mine[0] || null;
  return [...mine].sort((a, b) => new Date(b.opened_at || 0) - new Date(a.opened_at || 0))[0];
}

/** Compact evidence for a telemetry event - ids and names only, no money. */
export function describeSessions(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.slice(0, 30).map((s) => ({
    id: s.id,
    cashier: s.cashier,
    cashier_username: s.cashier_username,
    branch: s.branch,
    status: s.status,
    closed_at: s.closed_at || null,
  }));
}
