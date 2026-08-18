/**
 * What this till has already sold but the server has not been told about yet.
 *
 * Why this exists (2026-08-18)
 * ----------------------------
 * Offline sales queue instantly and sync later. Until they sync, the server's
 * stock figure — and therefore the cached catalogue the till is reading — is
 * the figure from BEFORE those sales. So a cashier with no internet could
 * sell the last bottle, see "1 in stock" still on the tile, and sell it
 * again. And again. A hundred times, if the queue lets them.
 *
 * That is exactly the way per-shop figures went negative in the first place:
 * units leaving without the number moving. Building an offline till without
 * this would be re-creating that bug deliberately, at a hundred sales a
 * time, on a device nobody can see.
 *
 * So: every queued sale writes its lines here, and `shopStock()` subtracts
 * them. The tile counts down as the cashier sells, and `sellState()` — which
 * already refuses at zero — stops the sale at the right moment with no
 * special offline case anywhere in the till.
 *
 * When a sale reaches the server its entry is removed, because from that
 * moment the server's own figure includes it and subtracting again would
 * double-count.
 *
 * Design notes
 * ------------
 *   * Keyed by `client_receipt_number`, the same idempotency key the queue
 *     and the backend use. One key, one sale, everywhere — so removing an
 *     entry can never remove the wrong one.
 *   * localStorage, not IndexedDB. The queue is capped at 1000 sales, which
 *     measures around 1 MB against a ~5 MB budget, and this ledger is a
 *     fraction of that again — while `shopStock()` is called for every
 *     product on every render and so has to answer SYNCHRONOUSLY.
 *     IndexedDB cannot.
 *   * Aggregated once into a plain object and cached in memory; any write
 *     drops the cache. Lookup is a property read.
 *   * Product id only, not (product, shop). A till sells at one shop — the
 *     one its open session belongs to — and this data never leaves the
 *     device, so there is no second shop for it to be confused with.
 */

const KEY = 'pewil_offline_stock_ledger';

// { [client_receipt_number]: { [product_id]: units } }
function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (_) {
    /* quota or private mode — the cap still holds, we just lose the count */
  }
  agg = null;
  fire();
}

// ── aggregate cache ──────────────────────────────────────────────────
let agg = null;

function aggregate() {
  if (agg) return agg;
  const out = Object.create(null);
  const all = readAll();
  for (const crn of Object.keys(all)) {
    const lines = all[crn] || {};
    for (const pid of Object.keys(lines)) {
      const n = Number(lines[pid]) || 0;
      if (!n) continue;
      out[pid] = (out[pid] || 0) + n;
    }
  }
  agg = out;
  return agg;
}

const listeners = new Set();
/** Subscribe to changes — for a "3 sales waiting" indicator. */
export function onLedgerChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function fire() {
  listeners.forEach((cb) => { try { cb(); } catch (_) {} });
}

// ── write ────────────────────────────────────────────────────────────
/**
 * Record the lines of a sale that has just been queued.
 *
 * `items` is the sale's `items_data`: `[{ product_id, qty }, ...]`.
 * Quantities are rounded UP to whole units, on purpose — a 0.75 kg line
 * still means a bag left the shelf, and rounding it to zero would let a
 * weighable be sold without ever counting down.
 */
export function noteSaleQueued(clientReceiptNumber, items) {
  if (!clientReceiptNumber || !Array.isArray(items)) return;
  const lines = {};
  for (const item of items) {
    const pid = item && (item.product_id ?? item.product);
    const qty = Number(item && item.qty) || 0;
    if (pid == null || qty <= 0) continue;
    const key = String(pid);
    lines[key] = (lines[key] || 0) + Math.ceil(qty);
  }
  if (!Object.keys(lines).length) return;
  const all = readAll();
  all[String(clientReceiptNumber)] = lines;
  writeAll(all);
}

/**
 * Forget a sale — it reached the server, or the cashier voided it before it
 * ever did. Either way its units are no longer "sold but untold".
 */
export function clearSale(clientReceiptNumber) {
  if (!clientReceiptNumber) return;
  const all = readAll();
  const k = String(clientReceiptNumber);
  if (!(k in all)) return;
  delete all[k];
  writeAll(all);
}

/** Wipe everything. Logout, tenant switch, or a deliberate queue reset. */
export function clearLedger() {
  try { localStorage.removeItem(KEY); } catch (_) {}
  agg = null;
  fire();
}

// ── read ─────────────────────────────────────────────────────────────
/**
 * Units of this product sold on this device that the server does not know
 * about yet. Called for every product on every render — keep it O(1).
 */
export function pendingUnitsFor(productId) {
  if (productId == null) return 0;
  return aggregate()[String(productId)] || 0;
}

/** Total units awaiting sync, across every product. For the sync banner. */
export function pendingUnitsTotal() {
  const a = aggregate();
  let total = 0;
  for (const k of Object.keys(a)) total += a[k];
  return total;
}

/** The per-product map, for the sync-queue screen. */
export function pendingUnitsByProduct() {
  return { ...aggregate() };
}
