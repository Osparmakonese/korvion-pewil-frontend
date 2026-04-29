/**
 * MobileInstallPrompt.js — sticky bottom card that nudges first-time
 * mobile visitors to install Pewil as a home-screen app.
 *
 * Behavior:
 *   - Hides if not on a phone-sized viewport.
 *   - Hides if already running as an installed PWA (display-mode standalone).
 *   - Hides if visitor previously dismissed (localStorage flag).
 *   - For Chrome / Android: captures `beforeinstallprompt`, shows
 *     a one-tap "Install" button that calls deferredPrompt.prompt().
 *   - For iOS Safari (no beforeinstallprompt support): shows the
 *     Share → Add to Home Screen instruction with a small icon hint.
 *
 * Visual style is the locked mobile language (cream + green).
 */
import React, { useEffect, useState } from 'react';

const T = {
  cream:   '#ffffff',
  cream2:  '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  orange:  '#c77700',
  orange2: '#e09a2b',
};

const STORAGE_KEY = 'pewil_install_prompt_dismissed_v1';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  // PWA installed → display-mode is standalone (or fullscreen). iOS Safari
  // also exposes navigator.standalone when launched from home screen.
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.navigator && window.navigator.standalone) return true;
  return false;
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPad on iOS 13+ reports as Mac in UA; check touch support too.
  const isIPadIOS13 = /Mac/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || isIPadIOS13;
}

export default function MobileInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iOS, setIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Gate: already installed → never show.
    if (isStandaloneMode()) return;
    // Gate: previously dismissed → respect that for 14 days.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const dismissedAt = parseInt(raw, 10);
        if (Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000) return;
      }
    } catch (_) { /* localStorage may be blocked; safe to continue */ }

    setIOS(detectIOS());

    // Chrome / Android: stash the install event and show the card when
    // the browser says we're eligible.
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // If we're on iOS, beforeinstallprompt never fires — show the
    // instruction-style prompt after a small delay so the visitor has
    // a chance to read the page first.
    let iosTimer = null;
    if (detectIOS()) {
      iosTimer = window.setTimeout(() => setVisible(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (_) {}
  };

  const onInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      // Wait for the user's choice; we don't show the result, just dismiss.
      await deferredPrompt.userChoice;
    } catch (_) {
      // Fail silently — the prompt may have been refused or expired.
    }
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;
  // Only render at mobile widths. Desktop visitors don't need this.
  if (typeof window !== 'undefined' && window.innerWidth > 500) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      left: 14,
      right: 14,
      zIndex: 1200,
      background: '#fff',
      border: `1px solid ${T.line}`,
      borderRadius: 18,
      boxShadow: '0 18px 50px rgba(28,22,10,0.18), 0 6px 16px rgba(28,22,10,0.10)',
      padding: 14,
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: "'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
        color: '#fff', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 46px',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 22,
      }}>P</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          {iOS ? 'Add Pewil to Home Screen' : 'Install Pewil'}
        </div>
        <div style={{
          fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.35,
        }}>
          {iOS
            ? 'Tap Share, then "Add to Home Screen" — works offline at the till.'
            : 'One tap to install. Works offline, lives next to your other apps.'}
        </div>
      </div>
      {iOS ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: T.cream2, border: 'none',
            color: T.muted, fontSize: 16, cursor: 'pointer',
          }}
        >×</button>
      ) : (
        <>
          <button
            type="button"
            onClick={onInstall}
            disabled={!deferredPrompt}
            style={{
              padding: '8px 14px', borderRadius: 10,
              background: T.ink, color: T.cream,
              border: 'none', fontWeight: 700, fontSize: 12,
              fontFamily: 'inherit',
              opacity: deferredPrompt ? 1 : 0.5,
              cursor: deferredPrompt ? 'pointer' : 'not-allowed',
            }}
          >Install</button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'transparent', border: 'none',
              color: T.muted, fontSize: 16, cursor: 'pointer',
            }}
          >×</button>
        </>
      )}
    </div>
  );
}
