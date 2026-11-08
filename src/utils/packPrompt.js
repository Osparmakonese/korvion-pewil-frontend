import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import { fmt, price as fmtUnitPrice } from './format';
import { shopPrice } from './branchStock';
import {
  packSize, packLabel, packPrice, packsOnHand, packSaving,
} from './packs';

/**
 * promptPackOrSingle(product) → Promise<{ kind, quantity } | null>
 *
 * The till asks the one question a shop that sells both has to answer:
 * singles, or a pack? Resolves null if the cashier backs out, so nothing
 * is added to the basket.
 *
 * It opens on SINGLE, because that is the common sale and the cashier must
 * be able to carry on at speed: Enter takes the highlighted choice.
 */
export function promptPackOrSingle(product) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    const cleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    root.render(
      <PackModal
        product={product}
        onPick={(v) => { cleanup(); resolve(v); }}
        onCancel={() => { cleanup(); resolve(null); }}
      />
    );
  });
}

function PackModal({ product, onPick, onCancel }) {
  const [kind, setKind] = useState('single');
  const [qty, setQty] = useState('1');
  const per = packSize(product);
  const packs = packsOnHand(product);
  const saving = packSaving(product);
  const n = Math.max(1, parseInt(qty, 10) || 1);
  const each = kind === 'pack' ? packPrice(product) : shopPrice(product);

  const take = () => onPick({ kind, quantity: n });

  const choice = (value, title, sub, priceText, disabled) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setKind(value)}
      style={{
        flex: 1, textAlign: 'left', padding: '12px 14px', borderRadius: 10,
        border: `2px solid ${kind === value ? '#1a6b3a' : '#e5e7eb'}`,
        background: kind === value ? '#f0f7f2' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{sub}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1a6b3a', marginTop: 6 }}>
        {priceText}
      </div>
    </button>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10004,
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      <div
        role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter') take();
        }}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
                 boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{product.name}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
            Sold singly or by the {packLabel(product).toLowerCase()}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {choice('single', 'Single', `one ${product.unit || 'each'}`,
                    `${fmtUnitPrice(shopPrice(product), 'zwd')}`, false)}
            {choice('pack', packLabel(product),
                    packs > 0
                      ? `${packs} ${packs === 1 ? 'pack' : 'packs'} on the shelf`
                      : 'not enough stock for a full pack',
                    `${fmt(packPrice(product), 'zwd')}`, packs <= 0)}
          </div>

          {kind === 'pack' && saving > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#166534', fontWeight: 600 }}>
              Saves the customer {fmt(saving, 'zwd')} against {per} singles.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              How many {kind === 'pack' ? packLabel(product).toLowerCase() + 's' : 'singles'}?
            </label>
            <input
              type="number" min="1" step="1" value={qty} autoFocus
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 90, padding: '8px 10px', border: '1px solid #d1d5db',
                       borderRadius: 8, fontSize: 14 }}
            />
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#0f172a', fontWeight: 700 }}>
              {fmt(each * n, 'zwd')}
            </span>
          </div>

          {kind === 'pack' && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
              Takes {per * n} off the shelf.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onCancel}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                       background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600,
                       cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={take}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
                       background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700,
                       cursor: 'pointer' }}>
              Add to sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default promptPackOrSingle;
