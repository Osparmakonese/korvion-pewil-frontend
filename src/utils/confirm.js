import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * Promise-based in-app confirm dialog.
 * Replaces window.confirm() which freezes CDP/browser automation renderers
 * and provides a better, on-brand UX.
 *
 * Usage:
 *   if (await confirm('Delete this item?')) { ... }
 *   if (await confirm({ title: 'Delete', message: 'Sure?', confirmText: 'Delete', danger: true })) { ... }
 */
export function confirm(optsOrMessage) {
  const opts =
    typeof optsOrMessage === 'string'
      ? { message: optsOrMessage }
      : optsOrMessage || {};

  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = true,
  } = opts;

  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.setAttribute('data-pewil-confirm', '');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);

    const cleanup = (result) => {
      try {
        root.unmount();
      } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
      resolve(result);
    };

    const Modal = () => (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
        onClick={() => cleanup(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '24px 28px',
            maxWidth: 440,
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
            {title}
          </h3>
          <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.5, fontSize: 14 }}>
            {message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {cancelText !== null && (
              // Passing cancelText: null turns the dialog into a one-button
              // notice (use for "this isn't allowed offline" style messages
              // where there's no decision to make).
              <button
                type="button"
                onClick={() => cleanup(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#334155',
                }}
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => cleanup(true)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: danger ? '#dc2626' : '#2563eb',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );

    root.render(<Modal />);
  });
}

export default confirm;
