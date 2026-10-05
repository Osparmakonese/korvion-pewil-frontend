/**
 * Offline-first POS sales queue.
 *
 * Why this exists: the store must keep selling when the internet drops.
 * The POS optimistically completes the sale locally, prints a receipt,
 * and queues the POST. On reconnect, the queue drains in order.
 *
 * Double-ring safety: each queued sale carries a client_receipt_number
 * (UUID). The backend's SaleViewSet.create treats it as an idempotency
 * key — if the server already saved a sale with that key, it returns
 * the existing row instead of creating a duplicate. So a retry after
 * a partial network success is safe.
 *
 * Storage: localStorage key 'pewil_offline_sales'. Holds <= a few
 * hundred items in practice — localStorage is fine. (If you ever
 * need >5MB, migrate to IndexedDB.)
 *
 * Usage:
 *   import { submitSaleOnline, isOffline, getPendingCount,
 *            drainPendingSales, onPendingChange } from './offlinePOS';
 *
 *   const result = await submitSaleOnline(api, saleData);
 *   // result: { sale, source: 'online' | 'offline-queued' | 'offline-replayed' }
 */

import axios from 'axios';
import { noteSaleQueued, clearSale } from './offlineStockLedger';

const KEY = 'pewil_offline_sales';
// How many failed attempts before a queued sale is called STUCK on the
// screen. It no longer decides whether the sale is kept — see
// isRetryableNetworkError for why nothing does — only when the app
// should stop being quiet about one.
const STUCK_AFTER_ATTEMPTS = 20;

// ─── ONE COPY OF EACH SALE IN FLIGHT, EVER (2026-08-30) ─────────────
//
// What went wrong: `submitSaleOnline` queues the sale and fires a
// background POST; `installOfflineSync` runs a drain every 30 s and once
// on install; and it was installed TWICE (OfflineIndicator in the layout
// and POS.js) with a fresh interval each time. Two drains ticking in the
// same instant both read the queue and both POSTed every sale still in it
// — including one whose first POST had not come back yet. The server's
// duplicate check was a read-then-insert, so two copies arriving together
// both got in. On REAPING TIME that was 55 sales saved twice in a month,
// each one deducting the basket from stock a second time and adding it to
// the day's takings a second time, always 0.0–0.7 s apart.
//
// The server now has a unique index and answers the second copy with the
// first row, so the books are safe whatever we send. This side stops
// sending it: one shared timer, one drain at a time, and a key that is
// currently on the wire is skipped by everyone else.
const _inFlight = new Set();          // client_receipt_number / client_key
let _draining = false;                // a drain (sales + aux) is running
let _syncInstalls = 0;                // how many components hold the timer
let _syncTimer = null;
let _syncOnline = null;
const _syncCallbacks = new Set();

/**
 * How many sales this till may take before it has to see the internet.
 *
 * Raised from 100 to 1000 on 2026-08-18, for a real reason: a busy shop runs
 * ~300 sales in one cashier session, so 100 would stop the till mid-shift on
 * an ordinary morning outage. 1000 is about three full sessions.
 *
 * NOTE — this is PER TILL, not per business. Each device keeps its own queue
 * in its own browser storage, so a chain with fifteen branches has fifteen
 * separate queues of up to 1000 each. Branch count does not eat into this
 * number at all.
 *
 * Measured before choosing it, on a realistic Zimbabwean basket (six lines,
 * product names around 24 characters):
 *
 *     one queued sale ......  ~1.0 KB   (12-line basket: ~1.6 KB)
 *     1000 queued sales .....  ~1.0 MB   (12-line basket: ~1.5 MB)
 *     localStorage budget ...   ~5 MB
 *     re-serialising the whole queue, per sale, at 1000 queued:
 *                              ~6 ms on a laptop, so tens of ms on a cheap
 *                              Android — a hitch at the very top of the
 *                              queue, not a freeze.
 *
 * That measurement is why the queue stays in localStorage instead of moving
 * to IndexedDB: at these sizes the move buys nothing and would mean
 * refactoring the till's sale path for no gain.
 *
 * What the number really trades is TRUST. Every queued sale is stock that
 * left the shelf with only one device knowing, so a lost, stolen or wiped
 * phone now costs up to 1000 sales instead of 100. That is a deliberate
 * choice: a till that refuses a customer standing at the counter costs the
 * shop money today, and the owner would rather carry the risk. The banner
 * escalates well before the ceiling so it is never a surprise.
 */
export const OFFLINE_QUEUE_LIMIT = 1000;

const DEAD_KEY = 'pewil_offline_sales_failed';

// ── storage ──────────────────────────────────────────────
//
// FAST, AND NEVER WIPES WHAT IT COULD NOT READ (2026-09-22).
//
// Every queue read used to JSON.parse the whole queue and every write
// JSON.stringify it again, several times per sale (the pending pill and
// the stuck count each re-read it on every change). At a few hundred
// queued sales that is tens of milliseconds per sale on a laptop and far
// more on a cheap phone — the till got slower the longer it was offline.
// Reads are now memoised on the raw string, and adding a sale splices it
// onto the stored string instead of re-serialising everything before it.
//
// And a queue that could not be parsed used to read as EMPTY, so the next
// sale's write replaced a whole day's trade with one sale. A value that
// will not parse is now copied to `<key>_corrupt_<time>` first; if even
// that copy cannot be made, writes to the key are refused (the cashier is
// told the device is out of room) rather than overwrite it.
//
// Callers must treat queue items as read-only: the memo shares them.
const _memo = new Map();       // storage key -> { raw, arr }
const _unsafe = new Set();     // keys whose stored value we could not read

function _readArr(key) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch (_) { _unsafe.add(key); return []; }
  if (!raw) { _unsafe.delete(key); _memo.delete(key); return []; }
  const m = _memo.get(key);
  if (m && m.raw === raw) { _unsafe.delete(key); return m.arr.slice(); }
  let arr = null;
  try { arr = JSON.parse(raw); } catch (_) { arr = null; }
  if (!Array.isArray(arr)) { _quarantine(key, raw); return []; }
  _unsafe.delete(key);
  _memo.set(key, { raw, arr });
  return arr.slice();
}

function _quarantine(key, raw) {
  _memo.delete(key);
  try {
    localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw);
    localStorage.removeItem(key);
    _unsafe.delete(key);
  } catch (_) {
    _unsafe.add(key);
  }
}

function _writeArr(key, arr) {
  if (_unsafe.has(key)) {
    _readArr(key);                       // try again to read / set it aside
    if (_unsafe.has(key)) return false;
  }
  let raw;
  try {
    raw = JSON.stringify(arr);
    localStorage.setItem(key, raw);
  } catch (_) {
    _memo.delete(key);
    return false;
  }
  _memo.set(key, { raw, arr: arr.slice() });
  return true;
}

// Append one item without re-serialising the items already stored.
function _appendArr(key, item) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch (_) { _unsafe.add(key); return false; }
  const m = _memo.get(key);
  if (!raw || !m || m.raw !== raw || _unsafe.has(key)) {
    const arr = _readArr(key);
    arr.push(item);
    return _writeArr(key, arr);
  }
  let next;
  try {
    const s = JSON.stringify(item);
    next = m.arr.length ? `${raw.slice(0, -1)},${s}]` : `[${s}]`;
    localStorage.setItem(key, next);
  } catch (_) {
    _memo.delete(key);
    return false;
  }
  _memo.set(key, { raw: next, arr: m.arr.concat([item]) });
  return true;
}

function read() { return _readArr(KEY); }
/**
 * Persist the queue. Returns whether it actually stuck.
 *
 * It used to swallow the failure and carry on (2026-08-18). At a 100-sale
 * cap that was unreachable; at 1000 it is not, and a storage failure that
 * nobody hears about means the cashier is shown "Sale Complete" for a sale
 * that exists nowhere — not on the server, not on the device. Money taken,
 * stock gone, no record. Callers that are ADDING a sale must check this and
 * refuse rather than lie.
 *
 * Callers that are REMOVING a sale can ignore a false: the sale stays queued
 * and gets posted again, and the backend's `client_receipt_number` key makes
 * that a no-op.
 */
function write(arr) {
  const ok = _writeArr(KEY, arr);
  fireChange();
  return ok;
}

// Who is signed in on this device right now (2026-09-22). Stamped on every
// queued item, because the queue deliberately survives sign-out: a sale
// rung under one business must never be posted under another's login.
function _whoAmI() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return {
      tenant_id: u?.tenant_id ?? null,
      user_id: u?.user_id ?? u?.id ?? null,
    };
  } catch (_) {
    return { tenant_id: null, user_id: null };
  }
}
const FOREIGN_MSG = 'Rung up under another business — sign in as that business on this device to send it.';
function _isForeign(item, me) {
  return item?.tenant_id != null && me?.tenant_id != null
    && String(item.tenant_id) !== String(me.tenant_id);
}

// ── idempotency key ──────────────────────────────────────
export function newClientReceiptNumber() {
  try {
    return 'OFF-' + crypto.randomUUID();
  } catch (_) {
    return 'OFF-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
}

// ── pending-count listeners ──────────────────────────────
//
// Listeners get the count AND a snapshot of what the pill needs (2026-09-22),
// so a change costs one read of the queue instead of one per subscriber.
const listeners = new Set();
export function onPendingChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function fireChange() {
  const q = read();
  const status = {
    pending: q.length,
    stuck: getStuckSales(q).length,
    dead: getDeadLetters().length,
  };
  listeners.forEach((cb) => { try { cb(q.length, status); } catch (_) {} });
}
export function getPendingCount() { return read().length; }

/**
 * Full pending-sales list — for the /sync-queue UI page.
 * Each item: { payload, client_receipt_number, queued_at, attempts, last_error }
 */
export function getPendingSales() { return read(); }

/** Queued sales rung up in one cashier session — for the close-till guard. */
export function getQueuedSalesForSession(sessionId) {
  if (sessionId == null) return [];
  return read().filter((it) => String(it?.payload?.session) === String(sessionId));
}

// ── is the queue moving? (2026-09-22) ────────────────────
//
// A drain round now ends at the first sign that the server cannot be
// reached (see _drainPendingSalesLocked), so only the sale at the front
// of the queue collects failed attempts and the per-sale count alone would
// keep quiet for hours. Rounds that end that way without sending anything
// are counted too; after STALLED_ROUNDS of them (~10 min at one round per
// 30 s) the whole queue is shown as not syncing. Any sale reaching the
// server resets it.
const STALLED_ROUNDS = 20;
const HEALTH_KEY = 'pewil_offline_sync_health';
let _stalled = null;
function _getStalled() {
  if (_stalled == null) {
    try { _stalled = Number(JSON.parse(localStorage.getItem(HEALTH_KEY) || '{}').stalled_rounds) || 0; }
    catch (_) { _stalled = 0; }
  }
  return _stalled;
}
function _setStalled(n) {
  if (_getStalled() === n) return;
  _stalled = n;
  try { localStorage.setItem(HEALTH_KEY, JSON.stringify({ stalled_rounds: n, at: Date.now() })); } catch (_) {}
}
function _noteProgress() { _setStalled(0); }

/**
 * Sales that are still queued but have been failing for a long time.
 *
 * Nothing is discarded any more, which means "0 failed" no longer implies
 * "all sent". A queue that cannot reach the server — an expired login, an
 * unpaid subscription, a cashier whose permissions changed — would
 * otherwise sit there looking like it was merely busy. These are the ones
 * worth putting in front of somebody.
 */
export function getStuckSales(q = read()) {
  if (q.length && _getStalled() >= STALLED_ROUNDS) return q;
  const me = _whoAmI();
  return q.filter((it) => (it.attempts || 0) >= STUCK_AFTER_ATTEMPTS || _isForeign(it, me));
}

/**
 * Remove a single pending sale by its client_receipt_number. Use when a
 * cashier manually voids a queued sale that should never sync (e.g. they
 * realised mid-shift they entered the wrong items).
 */
export function removePendingSale(clientReceiptNumber) {
  const q = read();
  const next = q.filter((item) => item.client_receipt_number !== clientReceiptNumber);
  if (next.length !== q.length) {
    write(next);
    // The units stop being "sold but untold" the moment the sale leaves this
    // queue — whether it synced or the cashier voided it. Leaving the ledger
    // entry behind would keep the shelf reading low forever.
    clearSale(clientReceiptNumber);
    return true;
  }
  return false;
}

/**
 * Retry a single dead-lettered sale: move it back into the live queue
 * with attempts reset to 0. Caller should then call drainPendingSales()
 * to push it. Returns true if the dead-letter was found + re-queued.
 *
 * 2026-09-22: it is taken off the failed list only once it is safely back
 * in the queue. It used to be dropped from the list even when the queue
 * write had failed, which lost it from both.
 */
export function retryDeadLetter(clientReceiptNumber) {
  try {
    const failed = getDeadLetters();
    const idx = failed.findIndex((it) => it.client_receipt_number === clientReceiptNumber);
    if (idx === -1) return false;
    const item = failed[idx];
    const already = read().some((it) => it.client_receipt_number === clientReceiptNumber);
    if (!already) {
      const ok = _appendArr(KEY, {
        payload: item.payload,
        client_receipt_number: item.client_receipt_number,
        tenant_id: item.tenant_id ?? null,
        user_id: item.user_id ?? null,
        queued_at: Date.now(),
        attempts: 0,
        last_error: null,
      });
      fireChange();
      if (!ok) return false;
    }
    // Back in the queue means back off the shelf, so the till stops offering
    // stock this sale already took.
    noteSaleQueued(item.client_receipt_number, item.payload?.items_data);
    // Drop from dead-letter list. If this write fails the sale is in both
    // lists for a while, which is harmless: the server key makes it a no-op.
    _writeArr(DEAD_KEY, failed.filter((_, i) => i !== idx));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Permanently drop a single dead-letter (cashier has handled it manually).
 */
export function dismissDeadLetter(clientReceiptNumber) {
  try {
    const failed = getDeadLetters();
    const next = failed.filter((it) => it.client_receipt_number !== clientReceiptNumber);
    if (next.length !== failed.length) return _writeArr(DEAD_KEY, next);
    return false;
  } catch (_) { return false; }
}

// ── offline detection ────────────────────────────────────
export function isOffline() { return !navigator.onLine; }

/**
 * Is this failure about the SALE, or about everything else?
 *
 * A queued sale is money the shop has already taken. It may leave this
 * queue for exactly one reason: the server has it. Anything else keeps it
 * here, however long that takes, because the alternative is a shop that
 * rings a day's trade and finds no record of it.
 *
 * This used to answer `false` for every 4xx, and a `false` here sends the
 * sale to the dead-letter list on its FIRST failure. Three ordinary things
 * therefore erased a queue (2026-09-20):
 *
 *   401 — the refresh token lives one day. A till that goes offline on
 *         Friday evening and reconnects on Monday cannot refresh. Every
 *         queued sale 401'd, dead-lettered on the spot, and the browser
 *         was redirected to /login in the middle of the drain.
 *   429 — the API allows 300 requests a minute per user. A day's offline
 *         trade drains as fast as the loop can post, so a queue of 400
 *         sales trips the throttle around sale 300 and the REST of the
 *         day's takings were discarded, one 429 at a time.
 *   402 — a lapsed subscription blocks writes. The queue was thrown away
 *         rather than waiting for the bill to be paid.
 *
 * None of those say anything is wrong with the sale. Only the server
 * saying "this request is malformed or refers to something that is not
 * there" is permanent, and even then the sale is kept — in the
 * dead-letter list, where a person decides.
 */
const PERMANENT_STATUSES = new Set([400, 404, 405, 409, 410, 415, 422]);

function isRetryableNetworkError(err) {
  if (!err) return false;
  if (axios.isCancel?.(err)) return false;
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') return true;
  if (err.code === 'ECONNABORTED') return true;
  const status = err.response?.status;
  if (status == null) return true;                       // no response — treat as network
  // Anything not on the list is retryable, including statuses nobody has
  // thought of yet. For money, "I don't recognise this" must mean "keep it".
  return !PERMANENT_STATUSES.has(status);
}

// ── Draining without tripping the rate limit ─────────────
//
// The API allows 300 requests/min per user. A serial loop posts far faster
// than that, so a long offline day used to throttle itself halfway through.
// The drain now posts in paced batches and stands down when told to.
const DRAIN_BATCH = 60;      // sales per cycle; the timer comes round again
const DRAIN_GAP_MS = 150;    // between posts — ~400/min ceiling, under 300 in practice
let _throttledUntil = 0;     // epoch ms; set from a 429's Retry-After

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function _noteThrottle(err) {
  const retryAfter = Number(err?.response?.headers?.['retry-after']);
  const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
    ? (retryAfter + 1) * 1000
    : 60000;
  _throttledUntil = Date.now() + waitMs;
  return waitMs;
}

/**
 * Submit a sale. Falls back to the queue on offline / network errors.
 *
 * @param {AxiosInstance} api - authenticated axios instance
 * @param {object} saleData   - the payload without client_receipt_number
 * @returns {Promise<{ sale, source }>} sale is the server response (or the
 *          optimistic receipt shape when queued), source tells the caller
 *          whether the sale is confirmed or still pending.
 */
export async function submitSaleOnline(api, saleData) {
  // The ceiling. Checked before anything else so the cashier is told BEFORE
  // they take the customer's money, not after. The message is the whole
  // instruction — a cashier should never have to work out what to do next.
  const queued = read().length;
  if (queued >= OFFLINE_QUEUE_LIMIT) {
    const err = new Error(
      `${queued} sales are still waiting to be sent. Connect to the internet `
      + `so they can sync, then carry on selling.`
    );
    err.code = 'offline_queue_full';
    err.pending = queued;
    throw err;
  }

  const crn = saleData.client_receipt_number || newClientReceiptNumber();
  const payload = {
    client_sold_at: saleData.client_sold_at || new Date().toISOString(),
    ...saleData,
    client_receipt_number: crn,
  };

  // 2026-07-28: ALWAYS queue first, instantly, no matter what navigator.onLine
  // says. navigator.onLine is unreliable on mobile -- it can report "online"
  // on a dead connection -- which previously made the cashier wait on a live
  // request that sometimes never resolved, freezing the till. Now the
  // cashier always gets an immediate "Sale Complete" and can keep ringing up
  // sales back-to-back, even 100 in a row, fully offline.
  //
  // Known follow-up: loyalty points, the "give change another way" prompt,
  // and mobile-money-payment linking previously only fired for a live
  // ('online') sale. Since every sale now queues first, those should be
  // triggered on successful background/drain sync instead of here -- not
  // yet wired up. Cash/card/on-account completion itself is unaffected.
  // If the queue could not be written, the sale exists NOWHERE. Say so
  // instead of handing back a receipt for it. This is the one failure in the
  // whole offline path that could take a customer's money and leave no trace.
  if (!queueSale(payload)) {
    const err = new Error(
      'This device has run out of room to save the sale. Connect to the '
      + 'internet so the saved sales can be sent, then try again.'
    );
    err.code = 'offline_queue_write_failed';
    throw err;
  }
  // Take the units off the shelf locally, right now. Until this sale reaches
  // the server, this device is the only thing that knows they are gone.
  noteSaleQueued(payload.client_receipt_number, payload.items_data);
  const optimistic = optimisticReceipt(payload);

  // Best-effort background sync, fire-and-forget. If there IS a live
  // connection, the sale usually confirms within a second or two without
  // the cashier ever waiting on it. If it fails, or we're actually offline,
  // the existing periodic/online-triggered drain (installOfflineSync)
  // retries it automatically -- nothing is lost either way.
  if (!isOffline()) {
    _inFlight.add(payload.client_receipt_number);
    api.post('/retail/sales/', payload)
      .then((res) => {
        removePendingSale(payload.client_receipt_number);
        _noteProgress();
        // 2026-07-31: the cashier already saw "Sale Complete" optimistically
        // before this resolved (that's the whole point of the instant-queue
        // change). Without this signal, dashboards/lists would sit on
        // stale pre-sale numbers until the next 30s stale-time refetch --
        // exactly the "false sales, slow to update" bug reported in prod.
        // Carry the SERVER's sale back with the event. The cashier was shown
        // an optimistic receipt numbered OFF-<uuid>; the server assigns the
        // real one (e.g. HQ01-000002). Without passing it back, the receipt on
        // screen — and the copy printed or sent to the customer's WhatsApp —
        // kept the OFF- number, which does not exist in Sales History. A
        // customer returning with that slip could not be found.
        try {
          window.dispatchEvent(new CustomEvent('pewil:sale-synced', {
            detail: {
              client_receipt_number: payload.client_receipt_number,
              sale: (res && res.data) || null,
            },
          }));
        } catch (_) {}
      })
      .catch(() => { /* leave it queued -- the normal drain will retry it */ })
      .finally(() => { _inFlight.delete(payload.client_receipt_number); });
  }

  return { sale: optimistic, source: 'offline-queued' };
}
function optimisticReceipt(payload) {
  // Minimal receipt shape so ReceiptModal renders. No real sale.id yet.
  return {
    id: null,
    receipt_number: payload.client_receipt_number,
    client_receipt_number: payload.client_receipt_number,
    subtotal: payload.subtotal,
    discount: payload.discount || 0,
    tax: payload.tax || 0,
    total: payload.total,
    payment_method: payload.payment_method,
    amount_tendered: payload.amount_tendered,
    change_given: payload.change_given,
    customer_name: payload.customer_name || null,
    items_data: payload.items_data || [],
    fiscal_submitted: false,
    _offline_pending: true,   // ReceiptModal can check this to show the OFFLINE pill
    created_at: new Date().toISOString(),
  };
}

// Appended in place — no re-serialising the sales already queued (2026-09-22).
// Stamped with who rang it, so it can only ever be posted under that
// business's login.
function queueSale(payload) {
  const me = _whoAmI();
  const ok = _appendArr(KEY, {
    payload,
    client_receipt_number: payload.client_receipt_number,
    tenant_id: me.tenant_id,
    user_id: me.user_id,
    queued_at: Date.now(),
    attempts: 0,
    last_error: null,
  });
  fireChange();
  return ok;
}

/**
 * Drain the queue. Returns { sent, failed, remaining }.
 * Called automatically on window 'online' event, and on a periodic timer.
 *
 * Sequential. A thousand sales at a second each is a quarter of an hour,
 * so this is the obvious thing to speed up — read this before you do.
 *
 * The original reason was a hard one: `Sale.save()` deducted stock by
 * reading the figure into Python, adding the delta and writing it back, so
 * two sales of the same product landing at once could lose a deduction —
 * stock walking out of the shop with the books saying it is still there.
 * **That reason is gone**: `apply_stock_delta` now does the arithmetic in a
 * single `UPDATE ... SET quantity = quantity + %s` (2026-08-18), so
 * concurrent posts queue on the row lock and every delta lands.
 *
 * It stays sequential for smaller reasons — one till hammering the API with
 * a thousand parallel writes is not kind to the other shops on the same
 * server, and the drain runs in the background and never blocks the till,
 * so slow costs nobody a sale. When you do make it concurrent, a small
 * fixed width (four or six) is the whole change; the idempotency key makes
 * retries safe. A bulk endpoint would be better still.
 */
export async function drainPendingSales(api) {
  if (isOffline()) return { sent: 0, failed: 0, remaining: read().length };
  // Serving a 429 back to back is how a queue talks itself into a longer
  // ban. Wait out whatever Retry-After asked for.
  if (Date.now() < _throttledUntil) {
    return { sent: 0, failed: 0, remaining: read().length };
  }
  // One drain at a time. A second caller (another timer, the 'online'
  // event, the sync-queue page) gets "nothing to report" rather than a
  // second copy of every POST. See the note at the top of this file.
  if (_draining) return { sent: 0, failed: 0, remaining: read().length };
  _draining = true;
  try {
    return await _withCrossTabLock(
      'pewil-offline-sales-drain',
      () => _drainPendingSalesLocked(api),
      () => ({ sent: 0, failed: 0, remaining: read().length }),
    );
  } finally {
    _draining = false;
  }
}

// ── one drain across ALL tabs (2026-09-22) ───────────────
//
// `_draining` and `_inFlight` live in one tab's memory. Two tabs (or the
// installed app and a browser tab) on the same till each drained the same
// stored queue, posting every sale twice and doubling the load that trips
// the rate limit. Where the browser has the Web Locks API only the tab
// holding the lock drains; the others skip the round. A tab that dies
// releases the lock with it. Without the API it behaves as before.
async function _withCrossTabLock(name, fn, busy) {
  let locks = null;
  try { locks = typeof navigator !== 'undefined' ? navigator.locks : null; } catch (_) { locks = null; }
  if (!locks || typeof locks.request !== 'function') return fn();
  let ran = false;
  try {
    return await locks.request(name, { ifAvailable: true }, (lock) => {
      if (!lock) return busy();
      ran = true;
      return fn();
    });
  } catch (e) {
    if (ran) throw e;
    return fn();
  }
}

// Is this failure about the whole connection rather than this one sale?
// (2026-09-22) No response at all (dead link, timeout), an expired login or
// a blocked subscription fails every sale behind it the same way. The round
// used to carry on regardless: on a line that says "online" but is dead,
// every queued sale waited out its own 15 s timeout — 300 queued sales held
// one round for over an hour. Now the round stops and the timer comes back.
function _endsTheRound(err) {
  const status = err?.response?.status;
  return !err?.response || status === 401 || status === 402;
}

async function _drainPendingSalesLocked(api) {
  const q = read();
  if (q.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  const me = _whoAmI();
  const updates = new Map();   // key -> replacement item (attempts, last_error)
  const removed = new Set();   // keys the server now has, or that were dead-lettered
  let sent = 0;
  let failed = 0;
  let stop = false;
  let failures = 0;
  let serverErrorsInARow = 0;

  for (const item of q) {
    // Set when the server tells us to slow down or cannot be reached, or
    // when the batch ceiling is reached. Everything still in the queue is
    // kept for the next cycle — never posted harder, never discarded.
    if (stop || sent >= DRAIN_BATCH) break;
    const key = item.client_receipt_number;
    if (_isForeign(item, me)) {
      // Another business's sale. Leave it queued and visible; posting it
      // under this login would have it refused and dead-lettered.
      if (item.last_error !== FOREIGN_MSG) updates.set(key, { ...item, last_error: FOREIGN_MSG });
      continue;
    }
    // submitSaleOnline's own POST for this sale is still on the wire. It
    // removes the item itself on success; if it fails, the next drain picks
    // it up. Never send a second copy alongside it.
    if (_inFlight.has(key)) continue;
    // The list above was read when the round began. A sale whose own POST
    // landed since then (or that another tab sent) is no longer queued —
    // posting it again only costs a request and a second sync event.
    if (!read().some((it) => it.client_receipt_number === key)) continue;
    _inFlight.add(key);
    try {
      const res = await api.post('/retail/sales/', item.payload);
      sent++;
      serverErrorsInARow = 0;
      removed.add(key);
      // Same signal submitSaleOnline's background POST sends: the server has
      // confirmed this sale, so the receipt on screen can swap to the real
      // number, and anything keyed on this sale (a quote to convert, a
      // prescription to mark dispensed) can now link the real sale id.
      // Without this, sales that synced via the DRAIN — a till that rang
      // offline and reconnected later — never fired it at all.
      try {
        window.dispatchEvent(new CustomEvent('pewil:sale-synced', {
          detail: { client_receipt_number: key, sale: (res && res.data) || null },
        }));
      } catch (_) {}
      // Success (either 201 new or 200 existing idempotent). Drop from queue,
      // and stop subtracting its units locally — the server's own figure now
      // includes them, and doing both would count the sale twice.
      clearSale(key);
      if (DRAIN_GAP_MS) await _sleep(DRAIN_GAP_MS);
    } catch (err) {
      failures++;
      const status = err?.response?.status;
      const next = {
        ...item,
        attempts: (item.attempts || 0) + 1,
        last_error: err?.response?.data?.detail || err?.message || 'unknown',
      };
      if (status === 429) {
        // Too fast. Stop the cycle, keep everything, come back later.
        _noteThrottle(err);
        updates.set(key, next);
        stop = true;
      } else if (_endsTheRound(err)) {
        updates.set(key, next);
        stop = true;
      } else if (isRetryableNetworkError(err)) {
        // Kept for as long as it takes. The attempt count is for the
        // cashier's benefit — it no longer decides anything, because a
        // counter is not a reason to throw away a sale that was rung up.
        updates.set(key, next);
        // One 500 can be about this sale; three in a row is the server.
        if (status >= 500 && ++serverErrorsInARow >= 3) stop = true;
      } else if (stashDeadLetter(next)) {
        // The request itself is wrong, so retrying it forever would only
        // hide it. Stashed where a person can see it and decide.
        failed++;
        removed.add(key);
      } else {
        // Could not even save it to the failed list: keep it queued.
        updates.set(key, next);
      }
    } finally {
      _inFlight.delete(key);
    }
  }
  // Merge onto what is stored NOW, not onto the list read at the start. The
  // queue moved while this loop was awaiting: `removePendingSale` may have
  // dropped a sale whose background POST completed, and the cashier may have
  // rung NEW sales. Keep everything that is there, apply what this round
  // learned, drop only what the server now has.
  if (sent > 0) _noteProgress();
  else if (failures > 0) _setStalled(_getStalled() + 1);
  const final = read()
    .filter((it) => !removed.has(it.client_receipt_number))
    .map((it) => updates.get(it.client_receipt_number) || it);
  write(final);
  return { sent, failed, remaining: final.length };
}

// No cap (2026-09-22). This list used to keep only the last 50, so the
// 51st sale the server refused silently pushed the oldest one out of
// existence. Returns false when it could not be saved — the caller then
// keeps the sale in the live queue rather than lose it.
function stashDeadLetter(item) {
  const ok = _appendArr(DEAD_KEY, { ...item, failed_at: Date.now() });
  if (ok) {
    // A sale the server has permanently refused never deducted anything
    // there, so this device must stop deducting it either — otherwise the
    // shelf reads low forever for a sale that does not exist. It is not
    // lost: it sits on the sync-queue screen for a person to deal with.
    try { clearSale(item.client_receipt_number); } catch (_) {}
  }
  return ok;
}

export function getDeadLetters() { return _readArr(DEAD_KEY); }

export function clearDeadLetters() {
  try { localStorage.removeItem(DEAD_KEY); } catch (_) {}
  _memo.delete(DEAD_KEY);
}

/**
 * Install reconnect + periodic drain. Returns an unsubscribe fn.
 */
export function installOfflineSync(api, { onDrain } = {}) {
  // A SINGLETON, refcounted. Every caller shares one interval and one
  // 'online' listener; the timer is torn down only when the last caller
  // has gone. It used to make a new interval per call, and with two
  // callers on the till (OfflineIndicator + POS) that was two drains
  // ticking together — the source of the duplicated sales. The `onDrain`
  // callbacks are kept per caller so each screen still hears the result.
  if (onDrain) _syncCallbacks.add(onDrain);
  _syncInstalls += 1;

  if (!_syncTimer) {
    const run = async () => {
      const result = await drainPendingSales(api);
      const aux = await drainAllAuxQueues(api);
      const combined = {
        sent: result.sent + aux.sent,
        failed: result.failed + aux.failed,
        remaining: result.remaining + aux.remaining,
      };
      if (combined.sent || combined.failed) {
        _syncCallbacks.forEach((cb) => { try { cb(combined); } catch (_) {} });
      }
      return combined;
    };
    _syncOnline = () => { run(); };
    window.addEventListener('online', _syncOnline);
    _syncTimer = setInterval(run, 30_000);
    // Kick once at install in case we came back before the listener attached.
    run();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (onDrain) _syncCallbacks.delete(onDrain);
    _syncInstalls = Math.max(0, _syncInstalls - 1);
    if (_syncInstalls === 0 && _syncTimer) {
      clearInterval(_syncTimer);
      _syncTimer = null;
      window.removeEventListener('online', _syncOnline);
      _syncOnline = null;
    }
  };
}


// ─── PHASE 2B.2 — extra queues ─────────────────────────────
// Returns, StockAdjustments and CashDrops are write paths the cashier
// also uses mid-shift. Pre-Phase-2B.2 they failed silently with
// ERR_NETWORK; now they queue alongside Sales and drain on reconnect.
//
// Each queue is its own localStorage key with its own dead-letter and
// its own POST endpoint. They share the same retry budget, listener
// signature, and client_key UUID (the backend ViewSets check for
// existing rows with the same client_key per tenant before inserting,
// so a replay after a partial network success is safe — same pattern
// as Sale.client_receipt_number).

const AUX_QUEUES = {
  returns: {
    key: 'pewil_offline_returns',
    failedKey: 'pewil_offline_returns_failed',
    endpoint: '/retail/returns/',
    keyField: 'client_key',
  },
  stock_adjustments: {
    key: 'pewil_offline_stock_adjustments',
    failedKey: 'pewil_offline_stock_adjustments_failed',
    endpoint: '/retail/stock-adjustments/',
    keyField: 'client_key',
  },
  cash_drops: {
    key: 'pewil_offline_cash_drops',
    failedKey: 'pewil_offline_cash_drops_failed',
    endpoint: '/retail/cash-drops/',
    keyField: 'client_key',
  },
};

const auxListeners = new Set();
export function onAuxQueueChange(cb) {
  auxListeners.add(cb);
  return () => auxListeners.delete(cb);
}
function fireAuxChange() {
  const counts = {};
  for (const name of Object.keys(AUX_QUEUES)) {
    counts[name] = _readQueue(name).length;
  }
  auxListeners.forEach((cb) => { try { cb(counts); } catch (_) {} });
}

function newClientKey() {
  try { return 'OFF-' + crypto.randomUUID(); }
  catch (_) {
    return 'OFF-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
}

function _readQueue(name) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return [];
  return _readArr(cfg.key);
}

function _writeQueue(name, arr) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return false;
  const ok = _writeArr(cfg.key, arr);
  fireAuxChange();
  return ok;
}

function _readFailed(name) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return [];
  return _readArr(cfg.failedKey);
}

// No cap and a real answer (2026-09-22) — same reasons as stashDeadLetter.
function _stashAuxFailed(name, item) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return false;
  return _appendArr(cfg.failedKey, { ...item, failed_at: Date.now() });
}

/**
 * Generic queue + immediate-send. The page calls this from its submit
 * handler. Online → POST and return server data. Network failure →
 * queue and return optimistic { _offline_pending: true, ...payload }.
 *
 *   const result = await submitWithQueue(api, 'returns', returnData);
 *   if (result._offline_pending) showToast('Queued — will sync when online.');
 */
export async function submitWithQueue(api, queueName, payload) {
  const cfg = AUX_QUEUES[queueName];
  if (!cfg) throw new Error(`Unknown offline queue: ${queueName}`);

  const key = payload[cfg.keyField] || newClientKey();
  const body = { ...payload, [cfg.keyField]: key };

  if (isOffline()) {
    _enqueueAuxOrThrow(queueName, body);
    return { ...body, _offline_pending: true, id: null };
  }

  _inFlight.add(key);
  try {
    const res = await api.post(cfg.endpoint, body);
    return res.data;
  } catch (err) {
    if (isRetryableNetworkError(err)) {
      _enqueueAuxOrThrow(queueName, body);
      return { ...body, _offline_pending: true, id: null };
    }
    throw err;
  } finally {
    _inFlight.delete(key);
  }
}

// Queued, or the caller hears it was not (2026-09-22) — never a silent
// "queued" for something that was not saved anywhere.
function _enqueueAuxOrThrow(queueName, payload) {
  if (_enqueueAux(queueName, payload)) return;
  const err = new Error(
    'This device has run out of room to save this. Connect to the internet '
    + 'so the saved work can be sent, then try again.'
  );
  err.code = 'offline_queue_write_failed';
  throw err;
}

function _enqueueAux(queueName, payload) {
  const cfg = AUX_QUEUES[queueName];
  const me = _whoAmI();
  const ok = _appendArr(cfg.key, {
    payload,
    client_key: payload[cfg.keyField],
    tenant_id: me.tenant_id,
    user_id: me.user_id,
    queued_at: Date.now(),
    attempts: 0,
    last_error: null,
  });
  fireAuxChange();
  return ok;
}

/**
 * Drain one specific aux queue (returns / stock_adjustments / cash_drops).
 * Returns { sent, failed, remaining } shaped like drainPendingSales.
 * Same rules as the sales drain (2026-09-22): stops at the first sign the
 * server is unreachable, honours a 429's wait, never posts an item that has
 * left the queue, and never drops one it could not dead-letter.
 */
export async function drainAuxQueue(api, queueName) {
  const cfg = AUX_QUEUES[queueName];
  if (!cfg) return { sent: 0, failed: 0, remaining: 0 };
  if (isOffline() || Date.now() < _throttledUntil) {
    return { sent: 0, failed: 0, remaining: _readQueue(queueName).length };
  }

  const q = _readQueue(queueName);
  if (q.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  const me = _whoAmI();
  const updates = new Map();
  const removed = new Set();
  let sent = 0;
  let failed = 0;

  for (const item of q) {
    const key = item.client_key;
    if (_isForeign(item, me)) continue;                     // another business's
    if (_inFlight.has(key)) continue;                       // already on the wire
    if (!_readQueue(queueName).some((it) => it.client_key === key)) continue;
    _inFlight.add(key);
    let stop = false;
    try {
      await api.post(cfg.endpoint, item.payload);
      sent++;
      removed.add(key);
    } catch (err) {
      const next = {
        ...item,
        attempts: (item.attempts || 0) + 1,
        last_error: err?.response?.data?.detail || err?.message || 'unknown',
      };
      if (err?.response?.status === 429) {
        _noteThrottle(err);
        updates.set(key, next);
        stop = true;
      } else if (_endsTheRound(err)) {
        updates.set(key, next);
        stop = true;
      } else if (isRetryableNetworkError(err)) {
        // Kept until it lands. A refund the shop has already paid out is
        // money too; see isRetryableNetworkError.
        updates.set(key, next);
      } else if (_stashAuxFailed(queueName, next)) {
        failed++;
        removed.add(key);
      } else {
        updates.set(key, next);
      }
    } finally {
      _inFlight.delete(key);
    }
    if (stop) break;
  }
  const final = _readQueue(queueName)
    .filter((it) => !removed.has(it.client_key))
    .map((it) => updates.get(it.client_key) || it);
  _writeQueue(queueName, final);
  return { sent, failed, remaining: final.length };
}

/** Drain all aux queues at once. Used by the global online listener. */
let _auxDraining = false;
export async function drainAllAuxQueues(api) {
  const idle = () => {
    let remaining = 0;
    for (const name of Object.keys(AUX_QUEUES)) remaining += _readQueue(name).length;
    return { sent: 0, failed: 0, remaining };
  };
  // One at a time, in this tab and across tabs (2026-09-22).
  if (_auxDraining) return idle();
  _auxDraining = true;
  try {
    return await _withCrossTabLock('pewil-offline-aux-drain', async () => {
      let sent = 0, failed = 0, remaining = 0;
      for (const name of Object.keys(AUX_QUEUES)) {
        const r = await drainAuxQueue(api, name);
        sent += r.sent; failed += r.failed; remaining += r.remaining;
      }
      return { sent, failed, remaining };
    }, idle);
  } finally {
    _auxDraining = false;
  }
}

export function getAuxPendingCount(queueName) {
  return _readQueue(queueName).length;
}

export function getAuxPendingList(queueName) {
  return _readQueue(queueName);
}

export function getAuxDeadLetters(queueName) {
  return _readFailed(queueName);
}

export function getAuxTotalPending() {
  let total = 0;
  for (const name of Object.keys(AUX_QUEUES)) total += _readQueue(name).length;
  return total;
}
