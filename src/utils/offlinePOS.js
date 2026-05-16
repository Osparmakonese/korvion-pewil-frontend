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

const KEY = 'pewil_offline_sales';
const MAX_ATTEMPTS = 20;

// ── storage ──────────────────────────────────────────────
function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (_) { return []; }
}
function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); }
  catch (_) {}
  fireChange();
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
  const crn = saleData.client_receipt_number || newClientReceiptNumber();
  const payload = { ...saleData, client_receipt_number: crn };

  // Fast-path: offline detected up front — queue & return optimistic receipt.
  if (isOffline()) {
    queueSale(payload);
    return { sale: optimisticReceipt(payload), source: 'offline-queued' };
  }

  try {
    const res = await api.post('/retail/sales/', payload);
    return { sale: res.data, source: 'online' };
  } catch (err) {
    if (isRetryableNetworkError(err)) {
      queueSale(payload);
      return { sale: optimisticReceipt(payload), source: 'offline-queued' };
    }
    throw err;  // 4xx application error — caller must surface it
  }
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
  write(q);
}

/**
 * Drain the queue. Returns { sent, failed, remaining }.
 * Called automatically on window 'online' event, and on a periodic timer.
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
      // Success (either 201 new or 200 existing idempotent). Drop from queue.
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
    if ((result.sent || result.failed) && onDrain) onDrain(result);
    return result;
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
