const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) return;
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker.register(swUrl).then(registration => {
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            if (config && config.onUpdate) config.onUpdate(registration);
          } else {
            if (config && config.onSuccess) config.onSuccess(registration);
          }
        }
      };
    };

    // Proactively check for a new version whenever the app regains focus
    // (e.g. reopening the installed PWA on Android) and once an hour while
    // it stays open. The browser otherwise only checks on a full
    // navigation, so a standalone PWA that's just resumed could keep
    // serving an old build until manually closed. With this, resuming the
    // app finds the new service worker, which then auto-reloads (see the
    // onUpdate handler in index.js).
    const checkForUpdate = () => { registration.update().catch(() => {}); };
    try {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });
      window.addEventListener('focus', checkForUpdate);
      setInterval(checkForUpdate, 60 * 60 * 1000);
    } catch (_) { /* best-effort */ }
  }).catch(error => console.error('SW error:', error));
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } }).then(response => {
    const contentType = response.headers.get('content-type');
    if (response.status === 404 || (contentType && contentType.indexOf('javascript') === -1)) {
      navigator.serviceWorker.ready.then(r => r.unregister().then(() => window.location.reload()));
    } else {
      registerValidSW(swUrl, config);
    }
  }).catch(() => console.log('Offline mode.'));
}

export async function unregister() {
  // Hardened kill: iterate ALL registrations (not just the default one) and clear every
  // Cache Storage entry. Necessary because a prior CRA Workbox SW could have registered
  // on a non-root scope; ready.then only resolves for the active one.
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (e) {
    // swallow
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    // swallow
  }
}
