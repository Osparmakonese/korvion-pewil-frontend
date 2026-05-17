/**
 * Phase 2B.3 — Offline product catalog cache (IndexedDB).
 *
 * Why a cache layer instead of just relying on React Query:
 *   - React Query's cache is in-memory only; a refresh or a fresh
 *     tab loses it. A cashier opening the till at 8am on a flaky
 *     connection should still see yesterday's catalog instantly.
 *   - localStorage works for a few KB but a real catalog can be
 *     thousands of products + barcodes — IndexedDB scales there.
 *   - Search by SKU/barcode needs to be O(1) per lookup; an index
 *     on barcode is the only way to make that fast offline.
 *
 * Design:
 *   - One database `pewil-pos` with a single object store `products`,
 *     keyed by product id. Indexes on `sku` and `barcode` for the
 *     scan-by-code path. Plus a `meta` store that holds the last-
 *     sync timestamp so the UI can show "synced 12 min ago".
 *   - The catalog is **per-tenant** but the storage isn't partitioned —
 *     we rely on the AuthContext to log out + clearCatalog() on tenant
 *     switch. Single-tenant-per-browser is consistent with everything
 *     else in the app (single-module rule, localStorage tokens, etc.).
 *
 * Public surface (kept small on purpose):
 *   - syncCatalog(api): fetch /retail/products/ + replace store.
 *   - searchOffline({ barcode | sku | q }): lookup by exact barcode/sku
 *     or substring on name.
 *   - getCatalogStatus(): { count, last_sync_at }.
 *   - clearCatalog(): wipe both stores. Called on logout/tenant switch.
 *
 * This file deliberately doesn't import axios or React Query —
 * the caller passes its own `api` instance so we don't double-wrap
 * the JWT-refresh interceptor.
 */

const DB_NAME = 'pewil-pos';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products';
const STORE_META = 'meta';
const META_KEY_LAST_SYNC = 'products:last_sync_at';

function _openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      // Old browsers / SSR / Cowork test environments. Caller falls
      // back to live API reads.
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const store = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
        store.createIndex('sku', 'sku', { unique: false });
        store.createIndex('barcode', 'barcode', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _tx(storeName, mode = 'readonly') {
  const db = await _openDB();
  const tx = db.transaction(storeName, mode);
  return { db, store: tx.objectStore(storeName), tx };
}

function _await(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Refresh the local product catalog from /retail/products/. Replaces
 * the entire store in one transaction so a partial fetch doesn't leave
 * a half-populated catalog the cashier later relies on.
 *
 * Pass `api` (the axios instance) so we go through the JWT refresh
 * interceptor.
 *
 * Returns { count, last_sync_at }.
 */
export async function syncCatalog(api) {
  let products = [];
  try {
    const res = await api.get('/retail/products/');
    products = Array.isArray(res.data) ? res.data : (res.data.results || []);
  } catch (e) {
    // No catalog if we can't fetch. Don't wipe the existing one —
    // a stale catalog is still better than no catalog.
    throw new Error('Failed to fetch product catalog: ' + (e?.message || 'unknown'));
  }

  try {
    const db = await _openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PRODUCTS, STORE_META], 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);

      const productStore = tx.objectStore(STORE_PRODUCTS);
      productStore.clear();
      for (const p of products) {
        // We deliberately keep the row shape close to the server's so
        // POS code can render straight from the cached row without a
        // separate shape adapter.
        productStore.put(p);
      }
      const metaStore = tx.objectStore(STORE_META);
      metaStore.put({ key: META_KEY_LAST_SYNC, value: new Date().toISOString() });
    });
  } catch (e) {
    // IndexedDB write failed — surface but don't crash the caller.
    throw new Error('Failed to write catalog cache: ' + (e?.message || 'unknown'));
  }

  return {
    count: products.length,
    last_sync_at: new Date().toISOString(),
  };
}

/**
 * Search the local catalog. Returns up to `limit` matches.
 *
 *   searchOffline({ barcode: '6001241038055' })  // exact barcode hit
 *   searchOffline({ sku: 'COKE-500' })           // exact SKU hit
 *   searchOffline({ q: 'coke' })                 // substring on name
 *
 * If IndexedDB is unavailable the function rejects — caller should
 * fall back to a live GET.
 */
export async function searchOffline({ barcode, sku, q, limit = 50 }) {
  const { store } = await _tx(STORE_PRODUCTS, 'readonly');

  if (barcode) {
    const idx = store.index('barcode');
    return _await(idx.getAll(barcode, limit));
  }
  if (sku) {
    const idx = store.index('sku');
    return _await(idx.getAll(sku, limit));
  }
  // Substring on name — IndexedDB doesn't do substring natively, so
  // we cursor-scan. For catalogs up to ~10k products this is plenty
  // fast at the till; bigger catalogs would need a separate prefix
  // tree. Cap at `limit` so a typo-as-empty-q doesn't traverse all.
  if (q) {
    const needle = q.toLowerCase();
    return new Promise((resolve, reject) => {
      const out = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor || out.length >= limit) { resolve(out); return; }
        const p = cursor.value;
        if ((p.name || '').toLowerCase().includes(needle) ||
            (p.sku || '').toLowerCase().includes(needle) ||
            (p.barcode || '').toLowerCase().includes(needle)) {
          out.push(p);
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }
  // No filters — return all (capped). Used by the POS initial render
  // when the catalog tile grid wants to show everything.
  return _await(store.getAll(undefined, limit));
}

/**
 * Per-id lookup, optimised for the scan-then-add path. POS calls
 * this after a barcode scan to render the line item without a
 * network round-trip.
 */
export async function getOfflineById(id) {
  const { store } = await _tx(STORE_PRODUCTS, 'readonly');
  return _await(store.get(id));
}

/**
 * Catalog status — used by the offline indicator + a "last synced"
 * line on the POS topbar. `count` is the row count in the local
 * store; `last_sync_at` is an ISO string or null.
 */
export async function getCatalogStatus() {
  try {
    const db = await _openDB();
    const [count, meta] = await Promise.all([
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PRODUCTS, 'readonly');
        const req = tx.objectStore(STORE_PRODUCTS).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get(META_KEY_LAST_SYNC);
        req.onsuccess = () => resolve(req.result?.value || null);
        req.onerror = () => resolve(null);
      }),
    ]);
    return { count, last_sync_at: meta };
  } catch (_) {
    return { count: 0, last_sync_at: null };
  }
}

/**
 * Wipe the cache. Called on logout or tenant switch — leftover
 * products from a previous tenant must not bleed into a new one.
 */
export async function clearCatalog() {
  try {
    const db = await _openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PRODUCTS, STORE_META], 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_PRODUCTS).clear();
      tx.objectStore(STORE_META).clear();
    });
  } catch (_) {
    // Best effort — if IndexedDB is unavailable nothing to clear.
  }
}
