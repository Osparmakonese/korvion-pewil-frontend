/**
 * ScannerLanePOS.js — Supermarket Lane Terminal (Pewil "Pro B").
 *
 * A scan-first, information-dense grocery lane terminal in the spirit of
 * NCR Voyix / LS Central / GK: charcoal header band with store/lane/cashier,
 * a barcode-first scan bar, a readable itemised ledger (line #, name + barcode,
 * AGE flag), a giant balance-due figure, colour-coded function keys, and tender.
 *
 * Pure presentational layer — every prop + handler is owned by POS.js and is
 * used exactly as received; this file only changes the look.
 */
import React from 'react';
import { fmt } from '../utils/format';

const C = {
  chrome: '#1f2937', chrome2: '#111827',
  bg: '#eef1f5', panel: '#ffffff', soft: '#f3f6fa',
  line: '#d7dde6', line2: '#eef1f5',
  ink: '#0b1220', muted: '#64748b', faint: '#94a3b8',
  blue: '#1d4ed8', green: '#15803d', green2: '#166534',
  red: '#dc2626', amber: '#c2741a',
};

function Tn({ icon, label, on, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      border: `1.5px solid ${on ? C.green : C.line}`,
      background: on ? '#ecfdf3' : '#fff', color: on ? C.green : C.ink,
      borderRadius: 10, padding: '14px 8px', fontSize: 13, fontWeight: 800,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </button>
  );
}

function Fk({ label, hint, tone, onClick }) {
  const col = tone === 'danger' ? C.red : tone === 'warn' ? C.amber : '#334155';
  const bd = tone === 'danger' ? '#f3c2c2' : tone === 'warn' ? '#f0d9b8' : C.line;
  return (
    <button type="button" onClick={onClick} style={{
      border: `1px solid ${bd}`, background: '#fff', color: col, borderRadius: 10,
      padding: '13px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', justifyContent: 'center', minHeight: 58,
    }}>
      <span>{label}</span>
      {hint && <span style={{ fontWeight: 700, color: C.faint, fontSize: 10 }}>{hint}</span>}
    </button>
  );
}

export default function ScannerLanePOS({
  cart, removeFromCart, updateCartQty,
  barcode, setBarcode, handleBarcodeSubmit, barcodeInputRef,
  subtotal, discountAmount, taxAmount, grandTotal,
  handleCompleteSale, handleSuspendSale,
  priceCheckMode, setPriceCheckMode,
  offline, pendingCount,
  user, laneLabel, brandName,
}) {
  const itemCount = cart.reduce((n, i) => n + (i.quantity || 0), 0);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const changeQty = () => {
    if (cart.length === 0) return;
    const last = cart[cart.length - 1];
    const raw = window.prompt(`Quantity for ${last.name}:`, String(last.quantity));
    if (raw == null) return;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) updateCartQty(last.product_id, n);
  };
  const voidLine = () => { if (cart.length > 0) removeFromCart(cart[cart.length - 1].product_id); };

  return (
    <div style={S.screen}>
      {/* charcoal header */}
      <div style={S.top}>
        <div style={S.brand}><div style={S.sprout}>🌱</div> {(brandName || 'PEWIL MARKET').toUpperCase()}</div>
        <div style={S.meta}>
          <span>Lane <b style={{ color: '#fff' }}>{(laneLabel || 'Lane 3').replace(/^lane\s*/i, '')}</b></span>
          <span>Cashier <b style={{ color: '#fff' }}>{user?.username || 'Ops'}</b></span>
          <span>{timeStr}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999,
            background: offline ? 'rgba(220,38,38,.18)' : 'rgba(34,197,94,.18)',
            color: offline ? '#fca5a5' : '#86efac', fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: offline ? '#f87171' : '#4ade80' }} />
            {offline ? 'Offline' : 'Online'}{pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </span>
        </div>
      </div>

      <div style={S.body}>
        {/* ledger */}
        <div style={S.ledger}>
          <div style={S.scanbar}>
            <span style={{ color: C.blue, fontSize: 20 }}>▦</span>
            <input
              ref={barcodeInputRef} value={barcode}
              onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleBarcodeSubmit}
              placeholder={priceCheckMode ? 'Price check — scan without adding…' : 'Scan barcode or type a code / PLU…'}
              autoFocus style={{ ...S.scanInput, borderColor: priceCheckMode ? C.amber : C.blue }}
            />
            <span style={S.scanHint}>F2 Qty · F4 Price · F8 Void</span>
          </div>

          <div style={S.colHead}>
            <span>#</span><span>Item</span><span style={{ textAlign: 'right' }}>Price</span>
            <span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Amount</span><span />
          </div>

          <div style={S.rows}>
            {cart.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 40 }}>▦</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>Ready to scan</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Scan a barcode to start the sale.</div>
              </div>
            ) : cart.map((item, idx) => {
              const lineTotal = item.unit_price * item.quantity;
              const weigh = item.product?.is_weighable;
              const age = item.product?.is_age_restricted;
              return (
                <div key={item.product_id} style={{ ...S.row, background: idx % 2 ? '#fff' : '#fbfcfe' }}>
                  <span style={S.ln}>{idx + 1}</span>
                  <span style={S.nm}>
                    {item.name}{age && <span style={S.age}>AGE 18+</span>}
                    <small>{item.product?.barcode || item.product?.sku || item.product_id}</small>
                  </span>
                  <span style={S.up}>${fmt(item.unit_price)}</span>
                  <span style={S.qy}>
                    <button type="button" style={S.qbtn} disabled={weigh}
                      onClick={() => updateCartQty(item.product_id, Math.max(1, (item.quantity | 0) - 1))}>−</button>
                    <b style={{ minWidth: 18, textAlign: 'center', display: 'inline-block' }}>
                      {weigh ? Number(item.quantity).toFixed(3) : item.quantity}
                    </b>
                    <button type="button" style={S.qbtn} disabled={weigh}
                      onClick={() => updateCartQty(item.product_id, (item.quantity | 0) + 1)}>+</button>
                  </span>
                  <span style={S.tot}>${fmt(lineTotal)}</span>
                  <button type="button" style={S.rm} title="Remove" onClick={() => removeFromCart(item.product_id)}>×</button>
                </div>
              );
            })}
          </div>

          <div style={S.totbar}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>
                Subtotal ${fmt(subtotal)}{discountAmount > 0 ? ` · Disc −$${fmt(discountAmount)}` : ''} · VAT incl. ${fmt(taxAmount || 0)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{cart.length} lines · {itemCount} items</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={S.dueL}>Balance due</div>
              <div style={S.dueV}>${fmt(grandTotal)}</div>
            </div>
          </div>
        </div>

        {/* right: function keys + tender */}
        <div style={S.side}>
          <div style={S.sideH}>Function keys</div>
          <div style={S.fkeys}>
            <Fk label="Change Qty" hint="F2" onClick={changeQty} />
            <Fk label={priceCheckMode ? 'Price ✓' : 'Price Check'} hint="F4" onClick={() => setPriceCheckMode((v) => !v)} />
            <Fk label="Discount" hint="F6" onClick={() => window.dispatchEvent(new CustomEvent('pewil-pos-discount'))} />
            <Fk label="Hold sale" hint="F7" onClick={handleSuspendSale} />
            <Fk label="Manager" hint="Ctrl+M" tone="warn" onClick={() => window.dispatchEvent(new CustomEvent('pewil-pos-manager'))} />
            <Fk label="Void line" hint="F8" tone="danger" onClick={voidLine} />
          </div>

          <div style={S.sideH}>Tender</div>
          <div style={S.tenders}>
            <Tn icon="💵" label="Cash" on onClick={handleCompleteSale} />
            <Tn icon="📱" label="EcoCash" onClick={handleCompleteSale} />
            <Tn icon="💳" label="Card" onClick={handleCompleteSale} />
            <Tn icon="⚯" label="Split" onClick={handleCompleteSale} />
          </div>

          <div style={{ flex: 1, minHeight: 8 }} />
          <button type="button" onClick={handleCompleteSale} disabled={cart.length === 0}
            style={{ ...S.cta, opacity: cart.length === 0 ? 0.5 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>
            TOTAL · Complete ${fmt(grandTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial, sans-serif";
const S = {
  screen: { height: '100%', width: '100%', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: font, color: C.ink, overflow: 'hidden' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.chrome, color: '#fff', padding: '10px 18px', fontSize: 12.5 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 14.5, letterSpacing: '.02em' },
  sprout: { width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#1a6b3a,#22844a)', display: 'grid', placeItems: 'center', fontSize: 15 },
  meta: { display: 'flex', gap: 16, alignItems: 'center', color: '#cbd5e1' },
  body: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, padding: 14 },

  ledger: { display: 'flex', flexDirection: 'column', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', minWidth: 0 },
  scanbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.soft, borderBottom: `1px solid ${C.line}` },
  scanInput: { flex: 1, border: '2px solid', borderRadius: 8, padding: '11px 14px', fontSize: 15, fontWeight: 600, outline: 'none', fontFamily: font },
  scanHint: { fontSize: 11, color: C.muted, fontWeight: 700 },
  colHead: { display: 'grid', gridTemplateColumns: '32px 1fr 78px 96px 96px 34px', gap: 8, padding: '9px 16px', fontSize: 10.5, fontWeight: 800, color: C.faint, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${C.line}` },
  rows: { flex: 1, overflow: 'auto' },
  row: { display: 'grid', gridTemplateColumns: '32px 1fr 78px 96px 96px 34px', gap: 8, alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.line2}`, fontSize: 14, fontVariantNumeric: 'tabular-nums' },
  ln: { color: C.faint, fontWeight: 700 },
  nm: { fontWeight: 700, minWidth: 0 },
  age: { display: 'inline-block', fontSize: 9, fontWeight: 900, color: '#fff', background: C.amber, borderRadius: 4, padding: '1px 5px', marginLeft: 6, verticalAlign: 'middle' },
  up: { textAlign: 'right', color: C.muted },
  qy: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  qbtn: { width: 26, height: 26, border: `1px solid ${C.line}`, background: '#fff', borderRadius: 7, fontWeight: 800, cursor: 'pointer', color: '#334155' },
  tot: { textAlign: 'right', fontWeight: 800 },
  rm: { width: 28, height: 28, border: 'none', background: 'transparent', color: C.faint, fontSize: 18, cursor: 'pointer' },

  empty: { textAlign: 'center', padding: '70px 20px', color: C.muted },
  totbar: { borderTop: `2px solid ${C.chrome}`, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  dueL: { fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' },
  dueV: { fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' },

  side: { display: 'flex', flexDirection: 'column', background: C.soft, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, overflow: 'auto' },
  sideH: { fontSize: 10.5, fontWeight: 800, color: C.faint, textTransform: 'uppercase', letterSpacing: '.05em', margin: '2px 0 8px' },
  fkeys: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 },
  tenders: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  cta: { border: 'none', background: 'linear-gradient(180deg,#1ba053,#15803d)', color: '#fff', fontWeight: 800, fontSize: 18, borderRadius: 11, padding: 16, boxShadow: '0 8px 18px rgba(21,128,61,.3)', letterSpacing: '.02em', fontFamily: font },
};
