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
 * Match a query key's first element against a list of prefix strings.
 * Tolerates non-string first elements (returns false).
 */
function matches(prefixes) {
  return (q) => {
    const k = q.queryKey?.[0];
    if (typeof k !== 'string') return false;
    return prefixes.some((p) => k === p || k.startsWith(p + '-') || k.startsWith(p + '_'));
  };
}

/**
 * Invalidate every product-related query.
 *
 * Covers: product list (every `retail-products*` variant), low-stock,
 * expiring, categories (because category counts can change), stock
 * adjustments, dashboard tiles, mobile mirrors, and the legacy bare
 * `['products']` key used by QuickCapture.
 */
export function invalidateProductCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'retail-products',
      'retail-low-stock',
      'lowStock',
      'retail-expiring',
      'retail-categories',
      'retail-categories-page',
      'retail-stock-adjustments',
      'products',                  // QuickCapture bare key
      'product',                   // any future variants
      'retail-dashboard',
      'dashboard',
      'retail-pos',                // POS tile/listing fallbacks if ever introduced
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
      'retail-customers',
      'retail-top-customers',
      'customers',
      'customer',
      'customer-history',
      'retail-loyalty',
      'retail-loyalty-stats',
      'retail-loyalty-transactions',
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
      'retail-categories',
      'retail-categories-page',
      'retail-products',
      'products',
      'retail-dashboard',
      'dashboard',
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
export function invalidateSaleCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'retail-products',
      'retail-products-pos',
      'retail-low-stock',
      'lowStock',
      'retail-stock-adjustments',
      'retail-sales',
      'retail-sales-history',
      'sales-history-mobile',
      'retail-end-of-day',
      'end-of-day-report',
      'retail-cashier-sessions',
      'retail-cashier-sessions-page',
      'retail-sessions-pos',
      'retail-dashboard',
      'dashboard',
      'retail-customers',
      'retail-top-customers',
      'customers',
      'customer-history',
      'retail-loyalty',
      'retail-loyalty-stats',
      'retail-loyalty-transactions',
    ]),
  });
}

/**
 * Invalidate cashier-session-related queries after open/close/cash-drop.
 * Also touches POS sessions list and end-of-day rollup.
 */
export function invalidateSessionCaches(qc) {
  qc.invalidateQueries({
    predicate: matches([
      'retail-cashier-sessions',
      'retail-cashier-sessions-page',
      'retail-sessions-pos',
      'retail-end-of-day',
      'end-of-day-report',
      'retail-dashboard',
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
      'retail-suppliers',
      'retail-purchase-orders',
      'retail-products',          // receiving PO bumps stock
      'retail-products-for-po',
      'retail-low-stock',
      'lowStock',
    ]),
  });
}
