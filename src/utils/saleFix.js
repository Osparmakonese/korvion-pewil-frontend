import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

/**
 * promptSaleFix({ receipt }) → Promise<{ reason, label } | null>
 *
 * Asks the cashier what was wrong with the sale they just rang up. The
 * answer goes on the record (Sales History, the loss-prevention log), so it
 * is a pick-list, not free text. Resolves null on cancel.
 */
export const SALE_FIX_REASONS = [
  { code: 'wrong_quantity', label: 'Wrong quantity', hint: 'e.g. rang 3 loaves, customer took 2' },
  { code: 'wrong_item', label: 'Wrong item', hint: 'rang the wrong product or size' },
  { code: 'wrong_price', label: 'Wrong price', hint: 'redo it at today’s shelf price' },
  { code: 'wrong_payment', label: 'Wrong payment method', hint: 'e.g. marked EcoCash, customer paid cash' },
  { code: 'changed_mind', label: 'Customer changed their mind', hint: 'gave something back or left it' },
];

export function promptSaleFix({ receipt } = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    const cleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    root.render(
      <SaleFixModal
        receipt={receipt || {}}
        onConfirm={(v) => { cleanup(); resolve(v); }}
        onCancel={() => { cleanup(); resolve(null); }}
      />
    );
  });
}

function SaleFixModal({ receipt, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const picked = SALE_FIX_REASONS.find((r) => r.code === reason);
  const total = parseFloat(receipt.total) || 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10003,
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="sale-fix-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && picked) onConfirm({ reason: picked.code, label: picked.label });
        }}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420,
                 boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b86a00', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Fix sale {receipt.receipt_number || ''}
          </div>
          <div id="sale-fix-title" style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            What was wrong?
          </div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SALE_FIX_REASONS.map((r, i) => (
            <label key={r.code}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                       border: `1.5px solid ${reason === r.code ? '#1a6b3a' : '#e5e7eb'}`,
                       background: reason === r.code ? '#f0f7f2' : '#fff',
                       borderRadius: 8, cursor: 'pointer' }}>
              <input type="radio" name="sale-fix-reason" value={r.code} autoFocus={i === 0}
                checked={reason === r.code} onChange={() => setReason(r.code)}
                style={{ marginTop: 3 }} />
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.hint}</span>
              </span>
            </label>
          ))}
          <div style={{ fontSize: 12.5, color: '#475569', background: '#f8fafc', borderRadius: 8,
                        padding: '10px 12px', lineHeight: 1.45, marginTop: 4 }}>
            The sale is cancelled and its items go back on the shelf. The basket
            comes back so you can ring it up correctly. The customer already
            paid <strong>{total.toFixed(2)}</strong> — only the difference changes hands.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onCancel}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                       background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Keep the sale
            </button>
            <button type="button" disabled={!picked}
              onClick={() => picked && onConfirm({ reason: picked.code, label: picked.label })}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none',
                       background: picked ? '#b86a00' : '#e5e7eb', color: picked ? '#fff' : '#94a3b8',
                       fontSize: 13, fontWeight: 700, cursor: picked ? 'pointer' : 'not-allowed' }}>
              Cancel sale &amp; fix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
