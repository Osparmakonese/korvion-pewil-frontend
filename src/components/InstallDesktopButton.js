import { useState, useEffect } from 'react';

/**
 * InstallDesktopButton — explicit "Install Pewil as a desktop app" button.
 *
 * Behavior matrix:
 *   1. Already running as installed PWA (display-mode: standalone)
 *      → renders nothing (or a small "Installed ✓" pill if `showInstalled`)
 *   2. Chrome / Edge / Brave on a supported OS
 *      → captures `beforeinstallprompt`; click triggers the native browser
 *        install dialog. One click, done.
 *   3. Chrome but `beforeinstallprompt` hasn't fired yet
 *      → button still renders; click scrolls to / shows manual instructions.
 *   4. Safari / Firefox / iOS / anything that doesn't fire `beforeinstallprompt`
 *      → button renders; click navigates to /download (or `onUnsupported`
 *        callback if provided) for manual install instructions.
 *
 * Why this isn't merged into PWAInstallPrompt: PWAInstallPrompt is a
 * passive toast that ONLY appears after Chrome's engagement heuristic
 * fires — most landing-page visitors never see it. This component is
 * the explicit CTA the user clicks: it always renders, and degrades
 * gracefully when the browser can't auto-install.
 *
 * Props:
 *   - className          extra className for the <button>
 *   - style              inline style overrides
 *   - label              button text (default: "Install Pewil for Desktop")
 *   - labelInstalled     text when already installed (default: "Pewil is installed ✓")
 *   - showInstalled      render the "installed" pill when running as PWA (default: false)
 *   - onUnsupported      called when click happens but browser can't auto-install.
 *                        Default: navigate to /download.
 */
export default function InstallDesktopButton({
  className = '',
  style = {},
  label = 'Install Pewil for Desktop',
  labelInstalled = 'Pewil is installed ✓',
  showInstalled = false,
  onUnsupported,
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Detect if already installed (running as standalone PWA).
  useEffect(() => {
    const check = () => {
      const m1 = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches;
      const m2 = typeof window !== 'undefined' && window.navigator &&
        window.navigator.standalone === true;  // iOS Safari
      setIsStandalone(Boolean(m1 || m2));
    };
    check();
    const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', check);
      return () => mq.removeEventListener('change', check);
    }
    return undefined;
  }, []);

  // Capture the deferred install prompt. Chrome/Edge fire this when the
  // page is install-eligible (valid manifest + registered SW + engagement).
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // If install completes outside this button, clear the prompt.
    const installedHandler = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Already installed — either hide or show a quiet pill.
  if (isStandalone) {
    if (!showInstalled) return null;
    return (
      <span className={className} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 999, background: '#e8f5ee',
        color: '#0d4a22', fontSize: 12, fontWeight: 600, ...style,
      }}>
        {labelInstalled}
      </span>
    );
  }

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
        // Chrome/Edge path: trigger the native install dialog.
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) { /* ignored */ }
        setDeferredPrompt(null);
      } else if (onUnsupported) {
        onUnsupported();
      } else {
        // Default fallback: send the user to /download for manual instructions.
        if (typeof window !== 'undefined') {
          window.location.href = '/download';
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={className}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        cursor: busy ? 'wait' : 'pointer', ...style,
      }}
    >
      <span aria-hidden="true">💻</span>
      <span>{label}</span>
    </button>
  );
}
