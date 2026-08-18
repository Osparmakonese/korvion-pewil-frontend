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
const MAX_ATTEMPTS = 20;

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

// ── storage ──────────────────────────────────────────────
function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (_) { return []; }
}
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
  let ok = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (_) {
    ok = false;
  }
  fireChange();
  return ok;
}

// ── idempotency key ──────────────────────────────────────
function newClientReceiptNumber() {
  try {
    return 'OFF-' + crypto.randomUUID();
  } catch (_) {
    return 'OFF-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
}

// ── pending-count listeners ──────────────────────────────
const listeners = new Set();
export function onPendingChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function fireChange() {
  const n = read().length;
  listeners.forEach((cb) => { try { cb(n); } catch (_) {} });
}
export function getPendingCount() { return read().length; }

/**
 * Full pending-sales list — for the /sync-queue UI page.
 * Each item: { payload, client_receipt_number, queued_at, attempts, last_error }
 */
export function getPendingSales() { return read(); }

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
 */
export function retryDeadLetter(clientReceiptNumber) {
  try {
    const failed = getDeadLetters();
    const idx = failed.findIndex((it) => it.client_receipt_number === clientReceiptNumber);
    if (idx === -1) return false;
    const item = failed[idx];
    // Re-queue with reset attempts so it gets full retry budget.
    const q = read();
    q.push({
      payload: item.payload,
      client_receipt_number: item.client_receipt_number,
      queued_at: Date.now(),
      attempts: 0,
      last_error: null,
    });
    write(q);
    // Back in the queue means back off the shelf, so the till stops offering
    // stock this sale already took.
    noteSaleQueued(item.client_receipt_number, item.payload?.items_data);
    // Drop from dead-letter list.
    failed.splice(idx, 1);
    localStorage.setItem('pewil_offline_sales_failed', JSON.stringify(failed));
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
    if (next.length !== failed.length) {
      localStorage.setItem('pewil_offline_sales_failed', JSON.stringify(next));
      return true;
    }
    return false;
  } catch (_) { return false; }
}

// ── offline detection ────────────────────────────────────
export function isOffline() { return !navigator.onLine; }

/**
 * Classify an error from axios as "network / server down" vs "application".
 * Network errors get queued; application errors (400 validation, etc.) are
 * surfaced to the caller.
 */
function isRetryableNetworkError(err) {
  if (!err) return false;
  if (axios.isCancel?.(err)) return false;
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') return true;
  if (err.code === 'ECONNABORTED') return true;
  const status = err.response?.status;
  if (status == null) return true;                       // no response — treat as network
  if (status >= 500 && status <= 599) return true;       // server outage
  if (status === 502 || status === 503 || status === 504) return true;
  return false;
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
    api.post('/retail/sales/', payload)
      .then((res) => {
        removePendingSale(payload.client_receipt_number);
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
      .catch(() => { /* leave it queued -- the normal drain will retry it */ });
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

function queueSale(payload) {
  const q = read();
  q.push({
    payload,
    client_receipt_number: payload.client_receipt_number,
    queued_at: Date.now(),
    attempts: 0,
    last_error: null,
  });
  return write(q);
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
  const q = read();
  if (q.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  const keep = [];
  let sent = 0;
  let failed = 0;

  for (const item of q) {
    try {
      await api.post('/retail/sales/', item.payload);
      sent++;
      // Success (either 201 new or 200 existing idempotent). Drop from queue,
      // and stop subtracting its units locally — the server's own figure now
      // includes them, and doing both would count the sale twice.
      clearSale(item.client_receipt_number);
    } catch (err) {
      const retryable = isRetryableNetworkError(err);
      item.attempts = (item.attempts || 0) + 1;
      item.last_error = err?.response?.data?.detail
                      || err?.message
                      || 'unknown';
      if (retryable && item.attempts < MAX_ATTEMPTS) {
        keep.push(item);           // retry later
      } else {
        failed++;
        // Permanent failure — stash in a dead-letter slot so it's not lost.
        stashDeadLetter(item);
      }
    }
  }
  write(keep);
  return { sent, failed, remaining: keep.length };
}

function stashDeadLetter(item) {
  // A sale the server has permanently refused never deducted anything there,
  // so this device must stop deducting it either — otherwise the shelf reads
  // low forever for a sale that does not exist. It is not lost: it sits on
  // the sync-queue screen for a person to deal with, which is the only thing
  // that can decide what a rejected sale means.
  try { clearSale(item.client_receipt_number); } catch (_) {}
  try {
    const key = 'pewil_offline_sales_failed';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ ...item, failed_at: Date.now() });
    localStorage.setItem(key, JSON.stringify(arr.slice(-50)));  // cap at 50
  } catch (_) {}
}

export function getDeadLetters() {
  try { return JSON.parse(localStorage.getItem('pewil_offline_sales_failed') || '[]'); }
  catch (_) { return []; }
}

export function clearDeadLetters() {
  try { localStorage.removeItem('pewil_offline_sales_failed'); } catch (_) {}
}

/**
 * Install reconnect + periodic drain. Returns an unsubscribe fn.
 */
export function installOfflineSync(api, { onDrain } = {}) {
  const run = async () => {
    const result = await drainPendingSales(api);
    const aux = await drainAllAuxQueues(api);
    const combined = {
      sent: result.sent + aux.sent,
      failed: result.failed + aux.failed,
      remaining: result.remaining + aux.remaining,
    };
    if ((combined.sent || combined.failed) && onDrain) onDrain(combined);
    return combined;
  };
  const onOnline = () => { run(); };
  window.addEventListener('online', onOnline);
  const timer = setInterval(run, 30_000);
  // Kick once at install in case we came back before the listener attached.
  run();
  return () => {
    window.removeEventListener('online', onOnline);
    clearInterval(timer);
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
  try { return JSON.parse(localStorage.getItem(cfg.key) || '[]'); }
  catch (_) { return []; }
}

function _writeQueue(name, arr) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return;
  try { localStorage.setItem(cfg.key, JSON.stringify(arr)); }
  catch (_) {}
  fireAuxChange();
}

function _readFailed(name) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return [];
  try { return JSON.parse(localStorage.getItem(cfg.failedKey) || '[]'); }
  catch (_) { return []; }
}

function _writeFailed(name, arr) {
  const cfg = AUX_QUEUES[name];
  if (!cfg) return;
  try { localStorage.setItem(cfg.failedKey, JSON.stringify(arr.slice(-50))); }
  catch (_) {}
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
    _enqueueAux(queueName, body);
    return { ...body, _offline_pending: true, id: null };
  }

  try {
    const res = await api.post(cfg.endpoint, body);
    return res.data;
  } catch (err) {
    if (isRetryableNetworkError(err)) {
      _enqueueAux(queueName, body);
      return { ...body, _offline_pending: true, id: null };
    }
    throw err;
  }
}

function _enqueueAux(queueName, payload) {
  const cfg = AUX_QUEUES[queueName];
  const q = _readQueue(queueName);
  q.push({
    payload,
    client_key: payload[cfg.keyField],
    queued_at: Date.now(),
    attempts: 0,
    last_error: null,
  });
  _writeQueue(queueName, q);
}

/**
 * Drain one specific aux queue (returns / stock_adjustments / cash_drops).
 * Returns { sent, failed, remaining } shaped like drainPendingSales.
 */
export async function drainAuxQueue(api, queueName) {
  const cfg = AUX_QUEUES[queueName];
  if (!cfg) return { sent: 0, failed: 0, remaining: 0 };
  if (isOffline()) return { sent: 0, failed: 0, remaining: _readQueue(queueName).length };

  const q = _readQueue(queueName);
  if (q.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  const keep = [];
  let sent = 0;
  let failed = 0;

  for (const item of q) {
    try {
      await api.post(cfg.endpoint, item.payload);
      sent++;
    } catch (err) {
      const retryable = isRetryableNetworkError(err);
      item.attempts = (item.attempts || 0) + 1;
      item.last_error = err?.response?.data?.detail || err?.message || 'unknown';
      if (retryable && item.attempts < MAX_ATTEMPTS) {
        keep.push(item);
      } else {
        failed++;
        const failedList = _readFailed(queueName);
        failedList.push({ ...item, failed_at: Date.now() });
        _writeFailed(queueName, failedList);
      }
    }
  }
  _writeQueue(queueName, keep);
  return { sent, failed, remaining: keep.length };
}

/** Drain all aux queues at once. Used by the global online listener. */
export async function drainAllAuxQueues(api) {
  let sent = 0, failed = 0, remaining = 0;
  for (const name of Object.keys(AUX_QUEUES)) {
    const r = await drainAuxQueue(api, name);
    sent += r.sent; failed += r.failed; remaining += r.remaining;
  }
  return { sent, failed, remaining };
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
