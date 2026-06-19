// Lightweight haptic feedback via the Vibration API. Gives the app a native,
// tactile feel on supported phones (most Android; iOS Safari ignores it,
// which is fine — calls are silent no-ops there). Respects a user toggle and
// the OS "reduce motion" preference.

const STORE_KEY = 'pewil_haptics_enabled';

function enabled() {
  try {
    if (localStorage.getItem(STORE_KEY) === 'off') return false;
  } catch { /* ignore */ }
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* ignore */ }
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function buzz(pattern) {
  if (!enabled()) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

// Semantic helpers — call these, not raw patterns.
export const haptics = {
  tap: () => buzz(8),            // light tap on add-to-cart / button press
  select: () => buzz(12),        // selecting an item / toggling
  success: () => buzz([14, 40, 24]), // sale complete / saved
  warning: () => buzz([20, 50, 20]), // validation / blocked
  error: () => buzz([40, 60, 40, 60, 40]), // hard failure
};

export function setHapticsEnabled(on) {
  try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
}

export function hapticsEnabled() {
  try { return localStorage.getItem(STORE_KEY) !== 'off'; } catch { return true; }
}

export default haptics;
