/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

/**
 * Pewil service worker — safe re-enable (2026-04-28).
 *
 * History:
 *   - 2026-04-23: previous SW used Workbox precacheAndRoute, which pinned
 *     returning users to old hashed bundles after Vercel rotated filenames.
 *     Replaced with a kill-shim that unregistered itself.
 *   - 2026-04-28: re-enabled with the strategy below.
 *
 * Strategy (the rules that keep us out of the previous trap):
 *   1. NEVER precache-and-ROUTE. Workbox's precacheAndRoute is what caused the
 *      2026-04-23 bug, and it is still not used. The build manifest is read
 *      once, at install, only to warm the fallback cache (see warmShell);
 *      nothing is ever SERVED from it ahead of the network.
 *   2. Network-first for navigation, JS, CSS — always try the network; cache
 *      is only used as the offline fallback. So a fresh deploy with rotated
 *      hashes will be served immediately on the next online load.
 *   3. Cache-first for stable static assets (icons, fonts, manifest) — these
 *      URLs don't change with deploys, safe to cache aggressively.
 *   4. API calls bypass the SW entirely (api.pewil.org, staging-api.pewil.org).
 *      We don't want stale tenant data and the backend has its own cache headers.
 *   5. Versioned caches; activate cleans every cache that's not the current
 *      version. Bump CACHE_VERSION to force a clean wipe on the next deploy.
 *   6. skipWaiting + clients.claim so a new SW takes over fast — no two-load
 *      delay before the user sees the latest version.
 *
 * If you ever see a stale-bundle issue again, the answer is NOT to add
 * precache — it's to bump CACHE_VERSION below.
 */

// CRA's Workbox plugin injects the build manifest here — the list of this
// build's hashed assets.
//
// READ IT EXACTLY ONCE. `InjectManifest` splits the compiled source on this
// injection point and fails the build if it does not find precisely one
// occurrence ("Multiple instances of the injection point were found in your
// SW source"). That is what broke the build on 2026-08-18: `warmShell()` read it
// a second time. Capture it in this constant and use the constant everywhere
// else.
//
// We still never ROUTE from it — see rule 1 above. It is used only to know
// which files to fetch into the fallback cache at install.
const BUILD_MANIFEST = self.__WB_MANIFEST || [];

// 2026-04-30 — bumped to v4 to force every existing client to wipe any
// pre-substring-matcher build still pinned in their cache. Combined with
// the onUpdate callback in src/index.js, returning users will auto-reload
// the moment the new SW activates.
const CACHE_VERSION = 'pewil-v5-2026-08-18';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

self.addEventListener('install', (event) => {
  // WARM the shell — deliberately not the same thing as precaching it.
  //
  // The rule above still stands: we never SERVE from a precache manifest,
  // because routing from a stale manifest is exactly what pinned phones to
  // old bundles on 2026-04-23. Every serving strategy below is unchanged —
  // navigation and hashed JS/CSS stay network-first, so a fresh deploy is
  // still served the instant the device is online.
  //
  // What was missing is that the cache only ever contained what THAT phone
  // had already fetched. Install the app, never open it online, and there
  // was nothing to fall back to; open a page you had not visited before and
  // there was nothing for that route either. The shop opens at 6am with no
  // data bundle and the app will not start.
  //
  // So at install time we fetch this build's shell once and put it in the
  // runtime cache as a FALLBACK. Network still wins whenever it answers.
  event.waitUntil(warmShell());
  self.skipWaiting();
});

/**
 * Fetch this build's HTML/JS/CSS into the runtime cache.
 *
 * Every failure is swallowed per-URL: a shell that is 90% warmed is far
 * better than an install that fails and leaves the old worker in place.
 */
async function warmShell() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    // '/' is what a navigation actually asks for, and what networkFirst
    // falls back to for a deep link like /pos that was never visited online.
    const urls = new Set(['/']);
    for (const entry of BUILD_MANIFEST) {
      const raw = typeof entry === 'string' ? entry : (entry && entry.url);
      if (!raw) continue;
      if (/\.map$/i.test(raw)) continue;              // source maps: never
      if (!/\.(js|css|html)$/i.test(raw)) continue;   // icons are cache-first already
      urls.add(raw);
    }
    await Promise.all([...urls].map(async (u) => {
      try {
        // `cache: 'reload'` so we warm from the network, not from an HTTP
        // cache entry belonging to the build we are replacing.
        const res = await fetch(u, { cache: 'reload' });
        if (!res || !res.ok) return;
        await cache.put(u, res.clone());
        // index.html is the document behind every route. Store it under '/'
        // as well, which is the key the navigation fallback looks for.
        if (/index\.html$/i.test(u)) await cache.put('/', res.clone());
      } catch (_) { /* one asset short is not a failed install */ }
    }));
  } catch (_) { /* never fail the install */ }
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Wipe every cache that isn't part of the current version.
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
    } catch (_) { /* best-effort */ }
    // Take control of any tabs that were already open.
    try { await self.clients.claim(); } catch (_) { /* best-effort */ }
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET. POST/PUT/DELETE always go to network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass: API calls. The backend has its own cache policy and we don't
  // want stale tenant data showing up on offline -> online transitions.
  if (url.hostname.includes('api.pewil.org')) return;

  // Bypass: cross-origin (Sentry, Google Fonts, Pesepay, etc.). The SW
  // shouldn't intercept third-party requests.
  if (url.origin !== self.location.origin) return;

  // Strategy 1 — stable static assets: cache-first.
  // These URLs don't change between deploys (icons, manifest, fonts).
  const isStableAsset =
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/favicon.svg' ||
    url.pathname.startsWith('/logo') ||
    /\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|otf|eot|ico)$/i.test(url.pathname);
  if (isStableAsset) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2 — navigation + hashed JS/CSS: network-first.
  // ALWAYS hit network first; cache is only the offline fallback. This is
  // the fix for the 2026-04-23 bug — fresh deploys are served immediately
  // even when Vercel rotates main.*.js / main.*.css hashes.
  const isAppShell =
    request.mode === 'navigate' ||
    url.pathname.startsWith('/static/js/') ||
    url.pathname.startsWith('/static/css/') ||
    url.pathname.startsWith('/static/media/');
  if (isAppShell) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Anything else: don't intercept; let the browser handle it normally.
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background so the cache stays warm without blocking
    // the response. If the network call fails, the cached copy still served.
    fetch(request).then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (e) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    // For navigation requests, fall back to the last cached '/'  so the
    // PWA shows *something* offline instead of a chrome error page.
    if (request.mode === 'navigate') {
      const fallback = await cache.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Allow the page to ask the SW to skip waiting (used by an in-app
// "update available" banner if we ever add one).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
