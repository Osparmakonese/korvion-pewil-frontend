// Single source of truth for the PWA install prompt.
// beforeinstallprompt fires once, only to listeners that exist at that
// moment. This module attaches the listener immediately on import and
// holds the event in module scope so any component - however many, however
// late-mounted - can ask for current state or trigger the real dialog.

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb({ available: !!deferredPrompt, installed }));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  return (
    installed ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function subscribe(callback) {
  callback({ available: !!deferredPrompt, installed });
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function promptInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome;
}
