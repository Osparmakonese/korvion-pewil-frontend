import React, { useState, useEffect } from "react";
import { getPendingCount, onPendingChange, OFFLINE_QUEUE_LIMIT } from "./utils/offlinePOS";

/**
 * The one place the app tells you what "offline" currently means for you.
 *
 * Rewritten 2026-08-18. It used to read `offlineQueue.js`, a generic action
 * queue that nothing has ever written to — so the count was permanently zero
 * and the copy ("changes will sync when reconnected") was a promise the app
 * does not keep: outside the till, nothing you change offline is saved
 * anywhere. Telling a shopkeeper their edit will sync when it will not is
 * worse than telling them nothing.
 *
 * What it says now, and why each case is different:
 *
 *   * Offline with no sales waiting → you are looking at SAVED information
 *     and cannot change anything. That is the honest description of
 *     read-only offline, and it stops someone typing a stock count into a
 *     screen that will quietly drop it.
 *
 *   * Offline with sales waiting → how many, out of how many. A cashier
 *     mid-outage needs to know the ceiling is coming before they hit it, not
 *     when the till refuses a customer standing in front of them.
 *
 *   * At the limit → the till has stopped taking sales, said plainly, with
 *     the one action that fixes it.
 *
 *   * Back online with sales waiting → they are being sent. This is the only
 *     state where "syncing" is a true word.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pending, setPending] = useState(() => {
    try { return getPendingCount(); } catch (_) { return 0; }
  });
  // When a screen has just been answered from the saved copy rather than the
  // network, we know how old that copy is. Showing the time is the
  // difference between "the app is broken" and "this is this morning's
  // figure" — and the shopkeeper is the only one who can judge whether that
  // is good enough for what they are about to do.
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    const onSavedRead = (e) => {
      const ts = e?.detail?.saved_at;
      if (ts) setSavedAt(ts);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("pewil:offline-read", onSavedRead);
    const unsub = onPendingChange((n) => setPending(n));
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("pewil:offline-read", onSavedRead);
      try { unsub(); } catch (_) { /* best effort */ }
    };
  }, []);

  // Clear the "saved copy" note the moment we are back on the network, so a
  // stale timestamp can never sit under live figures.
  useEffect(() => { if (!offline) setSavedAt(null); }, [offline]);

  if (!offline && pending === 0) return null;

  // Two warnings, not one. At a limit of 1000 a single alert at 90% leaves
  // only 100 sales of notice — twenty minutes at a busy till — which is not
  // enough time to go and find a signal. The first nudge lands with 400
  // still to go.
  const full = pending >= OFFLINE_QUEUE_LIMIT;
  const urgent = !full && pending >= OFFLINE_QUEUE_LIMIT * 0.85;
  const warn = !full && !urgent && pending >= OFFLINE_QUEUE_LIMIT * 0.6;

  let background = "#e65100";     // amber — online, draining
  if (offline) background = "#b71c1c";
  if (urgent) background = "#8e0000";
  if (full) background = "#7f0000";

  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  let text;
  if (full) {
    text = `${'\u{1F6D1}'} ${pending} sales saved on this till — that is the limit. `
         + `Connect to the internet to send them before selling again.`;
  } else if (offline && pending > 0) {
    let tail = '.';
    if (urgent) {
      tail = `. Connect now — the till stops at ${OFFLINE_QUEUE_LIMIT}.`;
    } else if (warn) {
      tail = '. Find a signal when you can.';
    }
    text = `${'\u{1F4F5}'} Offline — ${pending} sale${pending === 1 ? '' : 's'} saved on this till `
         + `(${pending} of ${OFFLINE_QUEUE_LIMIT})${tail}`;
  } else if (offline) {
    text = `${'\u{1F4F5}'} Offline — showing saved information`
         + `${savedTime ? ` from ${savedTime}` : ''}. `
         + `You can look, but not change anything until you reconnect.`;
  } else {
    text = `${'\u{1F504}'} Back online — sending ${pending} saved sale${pending === 1 ? '' : 's'}…`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="offline-banner"
      style={{
        // `pointerEvents: none` because this is a notice, never a control.
        // Fixed to the bottom of a phone it sat directly over the bottom
        // navigation and, inside POS, over the Charge button itself — so a
        // cashier tapping to take money was tapping the banner instead.
        // index.css lifts it clear of the nav on phones and hides it in the
        // POS, which has its own offline pill and pending counter.
        pointerEvents: "none",
        position: "fixed", bottom: "16px", left: "50%",
        transform: "translateX(-50%)", zIndex: 9999,
        background,
        color: "#fff", padding: "10px 20px", borderRadius: "8px",
        fontSize: "13px", fontWeight: "500",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", gap: "8px",
        fontFamily: "Inter, sans-serif",
        // The read-only sentence does not fit one line on a phone, and
        // `nowrap` used to push it off the screen edge.
        maxWidth: "min(92vw, 560px)", textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
