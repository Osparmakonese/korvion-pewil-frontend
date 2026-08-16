/**
 * weightPrompt.js — imperative weight-entry modal for weighable products.
 *
 * Shows a dialog with the product name + unit price, and two ways to capture
 * a weight:
 *   1. Connect to a USB/serial scale via Web Serial API — the modal
 *      subscribes to the live reading and lets the cashier tap "Capture"
 *      when the scale goes stable.
 *   2. Manual entry — a text field, used when the scale isn't connected or
 *      the browser doesn't support Web Serial (Firefox / Safari).
 *
 * Resolves with `{ weight, unit }` where weight is always in the product's
 * declared `unit_of_weight` (so the caller can multiply the unit price by
 * weight without converting again). Rejects with `Error('cancelled')`.
 *
 * `unitPrice` — what THIS shop charges per unit of weight. The modal used to
 * read `product.selling_price`, the CHAIN price, while POS.js put
 * `shopPrice(product)` on the cart line. On a chain with per-shop pricing the
 * cashier read one number off the screen to the customer and the till charged
 * a different one. Optional, and it falls back to `selling_price`, so a
 * single-branch tenant sees exactly what it saw before.
 *
 * Usage:
 *   const { weight } = await promptWeight({
 *     product: { name: 'Bananas', selling_price: 2.5, unit_of_weight: 'kg' },
 *     unitPrice: shopPrice(product),
 *   });
 *   addToCart({ ...product, quantity: weight });
 */
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { isSupported, connectScale } from './webSerialScale';
import { fmt } from './format';

export function promptWeight({ product, unitPrice }) {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.setAttribute('data-pewil-weight-prompt', '');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);

    const cleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    };

    root.render(
      <WeightModal
        product={product}
        unitPrice={unitPrice}
        onCaptured={(r) => { cleanup(); resolve(r); }}
        onCancel={() => { cleanup(); reject(new Error('cancelled')); }}
      />
    );
  });
}

function WeightModal({ product, unitPrice: unitPriceProp, onCaptured, onCancel }) {
  const targetUnit = product.unit_of_weight || 'kg';
  const [reading, setReading] = useState(null); // { weight, unit, stable }
  const [manual, setManual] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const scaleRef = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    // On unmount, tear down any active scale connection.
    return () => {
      try { unsubRef.current?.(); } catch (_) {}
      try { scaleRef.current?.disconnect(); } catch (_) {}
    };
  }, []);

  const connect = async () => {
    setError('');
    setConnecting(true);
    try {
      const scale = await connectScale();
      scaleRef.current = scale;
      unsubRef.current = scale.onReading((r) => setReading(r));
      setConnected(true);
    } catch (e) {
      if (e?.code === 'NOT_SUPPORTED') {
        setError('Web Serial is not supported in this browser. Enter the weight manually.');
      } else {
        setError(e?.message || 'Could not connect to the scale.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Convert reading.weight (always kg from webSerialScale) back to the
  // product's declared unit.
  const convertFromKg = (kg) => {
    if (targetUnit === 'g') return kg * 1000;
    if (targetUnit === 'lb') return kg / 0.45359237;
    return kg;
  };

  const captureFromScale = () => {
    if (!reading) return;
    if (!reading.stable) {
      setError('Scale is not stable yet — wait for the reading to settle.');
      return;
    }
    const weight = convertFromKg(reading.weight);
    if (weight < 0.005) {
      setError('Reading is zero. Place the item on the scale.');
      return;
    }
    onCaptured({ weight: Number(weight.toFixed(3)), unit: targetUnit });
  };

  const captureManual = () => {
    const n = parseFloat(manual);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive weight.');
      return;
    }
    onCaptured({ weight: Number(n.toFixed(3)), unit: targetUnit });
  };

  // This shop's price when the caller supplied one, else the chain price —
  // which is the same number for a single-branch tenant.
  const unitPrice = parseFloat(
    unitPriceProp != null ? unitPriceProp : product.selling_price
  ) || 0;
  const liveWeight = reading ? convertFromKg(reading.weight) : null;
  const liveTotal = liveWeight != null ? liveWeight * unitPrice : null;
  const manualNum = parseFloat(manual);
  const manualTotal = Number.isFinite(manualNum) && manualNum > 0 ? manualNum * unitPrice : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: '92%', maxWidth: 460,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a6b3a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Weigh item
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {product.name}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {fmt(unitPrice, 'zwd')} / {targetUnit}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Live scale reading */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, background: '#f9fafb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
              From scale
            </div>
            {connected ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: reading?.stable ? '#1a6b3a' : '#b45309', marginTop: 6 }}>
                  {liveWeight != null ? liveWeight.toFixed(3) : '—'} <span style={{ fontSize: 14, fontWeight: 600 }}>{targetUnit}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {reading ? (reading.stable ? 'Stable' : 'Settling…') : 'Waiting for reading…'}
                  {liveTotal != null && ` · ${fmt(liveTotal, 'zwd')}`}
                </div>
                <button type="button" onClick={captureFromScale} style={{ ...captureBtn, marginTop: 10 }}>
                  Capture weight
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={connecting || !isSupported()}
                style={{ ...connectBtn, marginTop: 8, opacity: (connecting || !isSupported()) ? 0.6 : 1 }}
              >
                {isSupported()
                  ? (connecting ? 'Waiting for scale…' : '⚖️ Connect scale')
                  : 'Scale connection not supported in this browser'}
              </button>
            )}
          </div>

          {/* Manual entry fallback */}
          <div style={{ marginTop: 14, border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
              Or enter manually
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input
                type="number" inputMode="decimal" step="0.001" min="0"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder={`Weight in ${targetUnit}`}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, outline: 'none' }}
                autoFocus={!isSupported()}
              />
              <div style={{ fontSize: 12, color: '#6b7280' }}>{targetUnit}</div>
            </div>
            {manualTotal != null && (
              <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>
                Line total: <strong>{fmt(manualTotal, 'zwd')}</strong>
              </div>
            )}
            <button type="button" onClick={captureManual} style={{ ...captureBtn, marginTop: 10, background: '#334155' }}>
              Use this weight
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const captureBtn = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
  background: '#1a6b3a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const connectBtn = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: '#fff', border: '1px dashed #1a6b3a', color: '#1a6b3a',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const cancelBtn = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default promptWeight;
