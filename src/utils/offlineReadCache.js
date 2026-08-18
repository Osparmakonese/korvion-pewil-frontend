/**
 * Offline read cache — so the app opens and SHOWS something with no internet.
 *
 * Why this exists (2026-08-18)
 * ----------------------------
 * The service worker caches the app shell, and `AuthContext` boots from
 * localStorage, so the app already opened offline — to a set of completely
 * empty pages. Every list on every screen is an API call, the API is
 * deliberately not intercepted by the service worker (we never want stale
 * tenant data served as if it were live), and a failed call renders nothing.
 * An app that opens to blank screens is worse than one that says it needs
 * the internet, because the shopkeeper cannot tell the difference between
 * "offline" and "broken".
 *
 * So: every successful GET is written here, and a GET that fails with a
 * NETWORK error — never a 4xx, never a 5xx — is answered from here instead.
 *
 * The rules that keep this honest
 * -------------------------------
 *   1. **Never served while online.** A cached copy is a fallback for a
 *      failed request, not a cache layer in front of a working one. If the
 *      network answers, the network wins, always. That is the difference
 *      between this and the 2026-04-23 stale-bundle trap.
 *   2. **Scoped to the tenant AND the shop.** The key carries the tenant id
 *      and the full query string, and `?branch=` is part of that query
 *      string (the axios interceptor adds it to every retail read). So one
 *      shop can never be served another shop's numbers, which is exactly
 *      the class of bug the whole per-shop stock effort has been about.
 *   3. **Reads only.** Nothing here writes to the server or replays
 *      anything. Editing offline is the POS sale queue's job, and only the
 *      POS does it.
 *   4. **Bounded.** Oversized payloads are skipped and the store is pruned
 *      to the most recent MAX_ENTRIES, oldest first. A cache that grows
 *      forever eventually gets evicted wholesale by the browser, which
 *      would take the POS catalogue with it.
 *   5. **Never fatal.** Every entry point swallows its own errors. A broken
 *      cache must never break a working request.
 *
 * The UI learns a response came from here via `response.__fromOfflineCache`
 * and the `pewil:offline-read` window event, which carries the age of the
 * copy so a banner can say "saved data from 14:32" rather than pretending
 * it is live.
 */

const DB_NAME = 'pewil-offline';
const DB_VERSION = 1;
const STORE = 'reads';
const MAX_ENTRIES = 400;
// Roughly 1.5 MB of JSON. A single response bigger than this is a report or
// an export, not something worth holding for a shopkeeper to browse.
const MAX_BYTES = 1_500_000;

// Only these are worth keeping. Everything else — auth, billing, token
// refresh — is either useless offline or actively wrong to answer stale.
const CACHEABLE_PREFIXES = ['/retail/', '/farm/'];

// Things that live under those prefixes but must never be cached: file
// downloads (the body is not JSON), and anything that mints or submits.
const NEVER_CACHE = [
  'export', 'download', '.pdf', '.csv', '.xlsx',
  'receipt-pdf', 'fiscal', 'print',
];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no indexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        // Pruning walks oldest-first; without this index that is a full scan.
        store.createIndex('saved_at', 'saved_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    // Let a later call try again rather than caching the failure forever —
    // private-mode and quota errors are often transient.
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── identity ─────────────────────────────────────────────────────────
/**
 * Which business this browser is currently signed in as.
 *
 * Part of every key. Two tenants can sign into the same browser (we support
 * tenant switching), and serving one of them the other's product list from
 * a stale cache would be the worst bug in this file.
 */
function currentTenant() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'anon';
    const u = JSON.parse(raw);
    return String(u?.tenant_id ?? u?.tenant_slug ?? 'anon');
  } catch (_) {
    return 'anon';
  }
}

/**
 * A stable key for a request. Params are sorted so that `?a=1&b=2` and
 * `?b=2&a=1` are one entry rather than two copies that can disagree.
 */
export function cacheKeyFor(config) {
  if (!config) return null;
  const url = config.url || '';
  const params = config.params || {};
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${String(params[k])}`);
  return `${currentTenant()}|${url}${parts.length ? `?${parts.join('&')}` : ''}`;
}

export function isCacheable(config) {
  if (!config) return false;
  if ((config.method || 'get').toLowerCase() !== 'get') return false;
  const url = config.url || '';
  if (!CACHEABLE_PREFIXES.some((p) => url.startsWith(p))) return false;
  const lower = url.toLowerCase();
  if (NEVER_CACHE.some((bad) => lower.includes(bad))) return false;
  return true;
}

// ── write ────────────────────────────────────────────────────────────
/**
 * Remember a successful response. Fire-and-forget: the caller already has
 * its data and must not wait on, or fail because of, our bookkeeping.
 */
export async function rememberRead(config, data) {
  try {
    if (!isCacheable(config)) return;
    const key = cacheKeyFor(config);
    if (!key) return;

    let serialised;
    try {
      serialised = JSON.stringify(data);
    } catch (_) {
      return;                       // not JSON-serialisable — not ours to keep
    }
    if (!serialised || serialised.length > MAX_BYTES) return;

    const db = await openDB();
    await wrap(tx(db, 'readwrite').put({
      key,
      url: config.url || '',
      data,
      saved_at: Date.now(),
    }));
    prune().catch(() => {});
  } catch (_) {
    /* never fatal */
  }
}

/**
 * Keep the store to MAX_ENTRIES, dropping the oldest first. Runs after a
 * write, and only actually deletes when we are over the line.
 */
async function prune() {
  try {
    const db = await openDB();
    const count = await wrap(tx(db, 'readonly').count());
    if (count <= MAX_ENTRIES) return;
    const excess = count - MAX_ENTRIES;
    await new Promise((resolve) => {
      let removed = 0;
      const store = tx(db, 'readwrite');
      const cursorReq = store.index('saved_at').openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || removed >= excess) { resolve(); return; }
        cursor.delete();
        removed += 1;
        cursor.continue();
      };
      cursorReq.onerror = () => resolve();
    });
  } catch (_) {
    /* best effort */
  }
}

// ── read ─────────────────────────────────────────────────────────────
/**
 * The last good answer to this exact request, or null.
 *
 * Returns `{ data, saved_at }` — the age matters, because the UI has to be
 * able to say how old the figures are. A stock number from three days ago
 * is worth showing and is NOT worth trusting, and only the person looking
 * at it can judge which.
 */
export async function recallRead(config) {
  try {
    if (!isCacheable(config)) return null;
    const key = cacheKeyFor(config);
    if (!key) return null;
    const db = await openDB();
    const row = await wrap(tx(db, 'readonly').get(key));
    if (!row) return null;
    return { data: row.data, saved_at: row.saved_at };
  } catch (_) {
    return null;
  }
}

/**
 * Wipe everything. Called on logout and tenant switch, alongside
 * `clearCatalog()` — same reasoning, same place.
 */
export async function clearOfflineReads() {
  try {
    const db = await openDB();
    await wrap(tx(db, 'readwrite').clear());
  } catch (_) {
    /* best effort */
  }
}

/** How many answers we are holding — for the offline banner / settings. */
export async function getOfflineReadStats() {
  try {
    const db = await openDB();
    const count = await wrap(tx(db, 'readonly').count());
    return { count };
  } catch (_) {
    return { count: 0 };
  }
}

// ── storage durability ───────────────────────────────────────────────
/**
 * Ask the browser to keep this data.
 *
 * Without this, IndexedDB is "best-effort" storage: Android may evict the
 * whole origin when the phone runs low on space, and it does not ask first.
 * That would take the product catalogue AND any queued sales with it. With
 * persistence granted, the browser must ask the user before clearing it.
 *
 * Chrome grants this silently to an installed PWA that the user actually
 * uses; it is a request, not a guarantee, which is the honest reason the
 * SQLite build exists as the next step for the bigger shops.
 */
export async function requestPersistentStorage() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage) return false;
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (typeof navigator.storage.persist !== 'function') return false;
    return await navigator.storage.persist();
  } catch (_) {
    return false;
  }
}
