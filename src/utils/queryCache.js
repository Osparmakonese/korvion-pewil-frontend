/**
 * Centralized React-Query cache invalidation helpers.
 *
 * Background — 2026-04-30 investor-eve incident
 * ---------------------------------------------
 * A product created on /products did not appear in POS, Categories,
 * StockAdjustments, Suppliers PO, or QuickCapture because each consumer
 * page used a *different* queryKey:
 *   Products.js              → ['retail-products']            (invalidated by mutations)
 *   POS.js                   → ['retail-products-pos']        (NOT invalidated)
 *   Categories.js            → ['retail-products-cats']       (NOT invalidated)
 *   StockAdjustments.js      → ['retail-products-adj']        (NOT invalidated)
 *   Suppliers.js (PO)        → ['retail-products-for-po']     (NOT invalidated)
 *   QuickCapture.js          → ['products']                   (NOT invalidated)
 *   MobileProducts.js        → ['retail-products']            (matched)
 *
 * React Query's prefix-based `invalidateQueries({ queryKey: ['retail-products'] })`
 * does NOT match `['retail-products-pos']` because the first array element
 * is a *different string*, not a sub-tree. So the create/update flows
 * silently leaked stale data into POS — the kind of "added but doesn't
 * show up" bug that destroys a demo.
 *
 * The fix: predicate-based invalidation. These helpers walk every cached
 * queryKey and match by string prefix on the first element, so they catch
 * every variant key in one call. Use them at the end of every mutation
 * onSuccess in the affected domain.
 *
 * Why a single shared key was rejected — under launch deadline, refactoring
 * every consumer to share one queryKey risks breaking filtered-list views
 * that depend on the suffix. The predicate approach lets each consumer
 * keep its narrow key while still being invalidated correctly.
 */

/**
 * Match a query key's first element against a list of substrings.
 * Tolerates non-string first elements (returns false).
 *
 * Uses substring (`includes`) match instead of strict prefix because
 * the codebase uses both conventions:
 *   ['retail-products', 'retail-products-pos', 'retail-products-cats',
 *    'retail-products-adj', 'retail-products-for-po', 'retail-products-cats',
 *    'products', 'product-history', 'top-customers', ...]
 *
 * A strict prefix matcher misses `top-customers` when invalidating
 * `customer`. Substring is broader but the consequence (an extra
 * refetch on a few unrelated queries) is harmless — invalidation only
 * triggers a network call for *mounted* queries, and unmounted ones
 * just get a flag flip.
 */
function matches(needles) {
  return (q) => {
    const k = q.queryKey?.[0];
    if (typeof k !== 'string') return false;
    return needles.some((n) => k.includes(n));
  };
}

/**
 * Invalidate every product-related query — and the dashboards that
 * report on product counts.
 *
 * Substring-based matching catches every variant in one pass: any key
 * containing 'product', 'category', 'dashboard', 'low-stock', 'lowStock',
 * 'stock-adjust', 'expiring', or 'pos'.
 */
export function invalidateProductCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'product',                   // retail-products*, products, product-history
      'categor',                   // retail-categories*, retail-categories-page
      'dashboard',                 // retail-dashboard, dashboard, etc.
      'low-stock',                 // retail-low-stock
      'lowStock',                  // farm dashboard low-stock alias
      'stock-adjust',              // retail-stock-adjustments, retail-products-adj
      'expiring',                  // retail-expiring
      'pos',                       // retail-products-pos, retail-sessions-pos
    ]),
  });
}

/**
 * Invalidate every customer-related query.
 *
 * Covers: customers list (search + filters), top customers, loyalty,
 * customer purchase history, mobile mirror.
 */
export function invalidateCustomerCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'customer',                  // retail-customers*, customers, customer-history
      'top-customers',             // retail-top-customers
      'loyalty',                   // retail-loyalty*
      'dashboard',                 // dashboard customer counts
    ]),
  });
}

/**
 * Invalidate every category-related query.
 *
 * Covers: categories list, products (because category labels change),
 * mobile mirrors.
 */
export function invalidateCategoryCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'categor',                   // retail-categories*, retail-categories-page
      'product',                   // product cards show category names
      'dashboard',                 // dashboard category counts
    ]),
  });
}

/**
 * Invalidate every sale/POS-related query after a sale is finalized.
 *
 * A sale changes: stock (decrement), low-stock alerts (some products
 * may cross threshold), end-of-day totals, dashboard hero numbers,
 * sales history, customer LTV (if a customer was attached), loyalty
 * balance, and cashier session totals.
 */
export function invalidateSaleCaches(qc, options) {
  qc.invalidateQueries({
    predicate: matches([
      'product',                   // stock count decrements
      'low-stock',
      'lowStock',
      'stock-adjust',
      'sale',                      // retail-sales*, sales-history*, livestockSales
      'end-of-day',                // retail-end-of-day, end-of-day-report
      'cashier-session',           // retail-cashier-sessions*
      // 2026-09-22: 'session' and 'pos' are gone. As substrings they also
      // hit pos-settings, pos-credit-accounts, medaid-providers-pos and
      // retail-sessions-pos — none of which a sale changes — so every sale
      // refetched them all. The POS product grid is still covered by
      // 'product' (retail-products-pos).
      'dashboard',                 // hero numbers
      'customer',                  // LTV when customer attached
      'loyalty',                   // points balance
      'recent-activity',           // dashboard recent feed
    ]),
  }, options);
}

// ── Coalesced refresh for sales that sync in the background (2026-09-22) ──
//
// Every sale that reached the server used to refresh every sale-related
// screen on its own. An offline queue drains at a couple of sales a second,
// so a backlog meant the product catalogue and half a dozen other lists
// were re-requested several times a second — well past the API's 300
// requests a minute — and the till throttled itself: the drain, the grid
// and new sales all got 429s together. Now: at most one refresh every
// SALE_REFRESH_GAP_MS, plus one trailing refresh after the last sale in a
// burst, so the screens still end up current. An in-flight refetch is left
// to finish rather than cancelled and restarted.
const SALE_REFRESH_GAP_MS = 10000;
let _saleRefreshLast = 0;
let _saleRefreshTimer = null;
export function requestSaleCachesRefresh(qc) {
  if (_saleRefreshTimer) return;                  // a trailing one is booked
  const wait = _saleRefreshLast + SALE_REFRESH_GAP_MS - Date.now();
  const run = () => {
    _saleRefreshTimer = null;
    _saleRefreshLast = Date.now();
    try { invalidateSaleCaches(qc, { cancelRefetch: false }); } catch (_) { /* never break a sale */ }
  };
  if (wait <= 0) { run(); return; }
  _saleRefreshTimer = setTimeout(run, wait);
}

/**
 * Invalidate cashier-session-related queries after open/close/cash-drop.
 * Also touches POS sessions list and end-of-day rollup.
 */
export function invalidateSessionCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'cashier-session',
      'session',
      'end-of-day',
      'pos',                       // retail-sessions-pos for live POS list
      'dashboard',
    ]),
  });
}

/**
 * Invalidate purchase-order related queries (when a PO is created or received).
 * Receiving a PO mutates stock too — call invalidateProductCaches as well.
 */
export function invalidateSupplierCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'supplier',                  // retail-suppliers
      'purchase-order',            // retail-purchase-orders
      'product',                   // receiving PO bumps stock
      'low-stock',
      'lowStock',
      'dashboard',
    ]),
  });
}

/**
 * Invalidate every branch / multi-branch related query.
 *
 * Multi-branch retail (May 2026) introduces a new family of query keys:
 *   ['retail-branches']
 *   ['retail-branch-transfers', ...]
 *   ['chain-rollup']
 *
 * Plus any sibling page that derives "active branch" or "branch picker"
 * data from `retail-branch*` keys. We use a strict regex on the *first*
 * element of the queryKey because a substring match on 'branch' would
 * collide with words like "branch_office" or future unrelated keys.
 */
export function invalidateBranchCaches(qc) {
  qc.invalidateQueries({
    predicate: (q) =>
      /^retail-branch/.test(String(q.queryKey?.[0] || '')) ||
      /^chain-rollup/.test(String(q.queryKey?.[0] || '')),
  });
}

/**
 * Nuke every cached query — last-resort fallback when a mutation could
 * affect arbitrary parts of the system (tenant switch, reset_for_launch,
 * bulk import). Mounted queries refetch immediately; unmounted ones are
 * flagged stale for the next mount.
 *
 * Avoid for normal CRUD — use the targeted invalidators above so unrelated
 * views don't refetch unnecessarily.
 */
export function invalidateAllCaches(qc) {
  qc.invalidateQueries();
}
