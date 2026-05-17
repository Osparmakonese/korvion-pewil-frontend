/**
 * DarkSupermarketPOS.js — Toast × Lightspeed-style dark supermarket POS.
 *
 * Full v2 HTML mockup fidelity:
 *   - Left: dark category sidebar (220px) with cyan active border
 *   - Center: dark scan strip + product tile grid (cyan prices) + keypad
 *   - Right: dark receipt pane (360px) + payment buttons + green complete-sale bar
 *
 * All cart / product state flows through props so business logic stays in POS.js.
 */
import React, { useMemo, useState } from 'react';
import { fmt } from '../utils/format';

const C = {
  bg: '#0b1020',
  side: '#070b18',
  panel: '#111a2e',
  border: '#1e293b',
  border2: '#334155',
  text: '#e5e7eb',
  muted: '#64748b',
  accent: '#22d3ee',
  green: '#065f46',
  danger: '#7f1d1d',
  dangerText: '#fecaca',
};

export default function DarkSupermarketPOS({
  // data
  products, filteredProducts, addToCart,
  cart, removeFromCart, updateCartQty,
  // scan
  barcode, setBarcode, handleBarcodeSubmit, barcodeInputRef,
  // search
  search, setSearch,
  // totals
  subtotal, discountAmount, taxAmount, grandTotal,
  // payment
  paymentMethod, setPaymentMethod,
  handleCompleteSale, handleSuspendSale,
  // status
  offline, pendingCount,
  user, laneLabel, brandName,
  // receipt id hint
  lastReceiptId,
}) {
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const bag = { All: products.length };
    products.forEach((p) => {
      const c = p.category_name || p.category || 'Uncategorized';
      bag[c] = (bag[c] || 0) + 1;
    });
    return Object.entries(bag);
  }, [products]);

  const visible = useMemo(() => {
    if (category === 'All') return filteredProducts;
    return filteredProducts.filter(
      (p) => (p.category_name || p.category || 'Uncategorized') === category
    );
  }, [filteredProducts, category]);

  const itemCount = cart.reduce((n, i) => n + (i.quantity || 0), 0);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div style={styles.shell}>
      {/* ============ LEFT sidebar ============ */}
      <div style={styles.side}>
        <div style={styles.brand}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.03em' }}>
            {brandName || 'Pewil'}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
            {laneLabel || 'Lane 01'} · {user?.username || 'Cashier'} · {dateStr} {timeStr}
          </div>
        </div>
        <div style={styles.searchWrap}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search products…"
            style={styles.searchInput}
          />
        </div>
        <div style={styles.cats}>
          {categories.map(([name, count]) => (
            <div
              key={name}
              onClick={() => setCategory(name)}
              style={{
                ...styles.cat,
                ...(category === name ? styles.catActive : {}),
              }}
            >
              <span>{name}</span>
              <span style={styles.catCount}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============ CENTER ============ */}
      <div style={styles.center}>
        <div style={styles.topstrip}>
          <input
            ref={barcodeInputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            placeholder="Scan barcode or type SKU…"
            style={styles.scanInput}
            autoFocus
          />
          <span style={{
            ...styles.statusPill,
            background: offline ? '#b91c1c' : C.accent,
            color: offline ? '#fff' : C.bg,
          }}>
            ● {offline ? 'OFFLINE' : 'ONLINE'}{pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </span>
        </div>

        <div style={styles.tiles}>
          {visible.length === 0 ? (
            <div style={styles.emptyTiles}>
              <div style={{ fontSize: 48, opacity: 0.25 }}>🛒</div>
              <div style={{ marginTop: 10, color: C.muted, fontSize: 13 }}>No products match your filter</div>
            </div>
          ) : (
            visible.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={styles.tile}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
              >
                <div>
                  <div style={styles.tileName}>{p.name}</div>
                  <div style={styles.tileSku}>SKU {p.sku}</div>
                </div>
                <div style={styles.tilePrice}>
                  ${fmt(p.selling_price)}
                  {p.is_weighable && (
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>/ kg</span>
                  )}
                </div>
                {p.is_weighable && <span style={{ ...styles.badge, ...styles.badgeW }}>⚖️</span>}
                {p.is_age_restricted && <span style={styles.badge}>18+</span>}
              </div>
            ))
          )}
        </div>

        {/* Keypad */}
        <div style={styles.keypad}>
          {['7','8','9'].map((k) => (
            <Key key={k} label={k} onClick={() => setBarcode((b) => b + k)} />
          ))}
          <Key label="QTY" kind="fn" onClick={() => {
            if (cart.length === 0) return;
            const last = cart[cart.length - 1];
            const raw = window.prompt(`Qty for ${last.name}:`, String(last.quantity));
            if (raw == null) return;
            const n = parseInt(raw, 10);
            if (Number.isFinite(n) && n > 0) updateCartQty(last.product_id, n);
          }} />
          {['4','5','6'].map((k) => (
            <Key key={k} label={k} onClick={() => setBarcode((b) => b + k)} />
          ))}
          <Key label="%" kind="fn" onClick={() => window.dispatchEvent(new CustomEvent('pewil-pos-discount'))} />
          {['1','2','3'].map((k) => (
            <Key key={k} label={k} onClick={() => setBarcode((b) => b + k)} />
          ))}
          <Key label="PRICE" kind="fn" onClick={() => window.dispatchEvent(new CustomEvent('pewil-pos-pricecheck'))} />
          <Key label="0" onClick={() => setBarcode((b) => b + '0')} />
          <Key label="." onClick={() => setBarcode((b) => b + '.')} />
          <Key label="VOID" kind="danger" onClick={() => {
            if (cart.length > 0) removeFromCart(cart[cart.length - 1].product_id);
          }} />
          <Key label="CLEAR" kind="fn" onClick={() => setBarcode('')} />
        </div>
      </div>

      {/* ============ RIGHT receipt ============ */}
      <div style={styles.receipt}>
        <div style={styles.rhead}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>Current Sale</div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {lastReceiptId ? `#${lastReceiptId}` : '#new'}
          </div>
        </div>

        <div style={styles.rlines}>
          {cart.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>🧾</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>No items yet</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>Scan or tap a tile to start</div>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.unit_price * item.quantity;
              const weighTag = item.product?.is_weighable;
              const ageTag = item.product?.is_age_restricted;
              return (
                <div
                  key={item.product_id}
                  style={styles.line}
                  onDoubleClick={() => removeFromCart(item.product_id)}
                  title="Double-click to remove"
                >
                  <div style={styles.lineTop}>
                    <span>
                      {item.name}
                      {weighTag && (
                        <span style={{ ...styles.tag, ...styles.tagW }}>
                          {Number(item.quantity).toFixed(3)} kg
                        </span>
                      )}
                      {ageTag && <span style={styles.tag}>18+</span>}
                    </span>
                    <span>${fmt(lineTotal)}</span>
                  </div>
                  <div style={styles.lineSub}>
                    <span>{weighTag ? Number(item.quantity).toFixed(3) : item.quantity} × ${fmt(item.unit_price)}</span>
                    <span>{weighTag ? 'kg' : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.tot}>
          <div style={styles.totRow}><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          <div style={styles.totRow}><span>Discount</span><span>-${fmt(discountAmount || 0)}</span></div>
          <div style={styles.totRow}><span>VAT 15%</span><span>${fmt(taxAmount || 0)}</span></div>
          <div style={{ ...styles.totRow, ...styles.totGrand }}>
            <span>TOTAL</span>
            <span>${fmt(grandTotal)}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'right' }}>
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </div>
        </div>

        <div style={styles.pay}>
          {/* Payment-method keys must match the backend's allowlist:
              cash | card | mobile_money | bank_transfer. Display labels
              are tuned for the Zim cashier ("ECOCASH" reads better than
              "MOBILE MONEY" at the till), but the value sent to the API
              is the canonical key. We previously sent the literal
              "ecocash" and the backend rejected it. */}
          {[
            { value: 'cash', label: 'CASH' },
            { value: 'card', label: 'CARD' },
            { value: 'mobile_money', label: 'ECOCASH' },
          ].map((m) => (
            <div
              key={m.value}
              onClick={() => setPaymentMethod(m.value)}
              style={{
                ...styles.pb,
                ...(paymentMethod === m.value ? styles.pbActive : {}),
              }}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div style={styles.suspendRow}>
          <button style={styles.suspendBtn} onClick={handleSuspendSale}>⏸ SUSPEND</button>
        </div>

        <div style={styles.complete} onClick={handleCompleteSale}>
          ✓ COMPLETE SALE
        </div>
      </div>
    </div>
  );
}

function Key({ label, kind, onClick }) {
  const base = {
    padding: 12,
    background: C.border,
    border: `1px solid ${C.border2}`,
    borderRadius: 6,
    color: C.text,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center',
    letterSpacing: '0.04em',
  };
  const variant = kind === 'fn'
    ? { background: '#0f172a', color: C.accent }
    : kind === 'danger'
      ? { background: C.danger, color: C.dangerText, borderColor: '#991b1b' }
      : {};
  return <div style={{ ...base, ...variant }} onClick={onClick}>{label}</div>;
}

const styles = {
  shell: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr 380px',
    height: '100%',
    width: '100%',
    background: C.bg,
    color: C.text,
    overflow: 'hidden',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  side: {
    background: C.side,
    borderRight: `1px solid ${C.border}`,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  brand: {
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${C.border}`,
  },
  searchWrap: { padding: '12px 14px', borderBottom: `1px solid ${C.border}` },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    background: C.border,
    border: `1px solid ${C.border2}`,
    borderRadius: 6,
    color: C.text,
    fontSize: 13,
    outline: 'none',
  },
  cats: { flex: 1, overflow: 'auto', padding: '6px 0' },
  cat: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#cbd5e1',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catActive: {
    background: C.panel,
    borderLeftColor: C.accent,
    color: '#fff',
    fontWeight: 700,
  },
  catCount: {
    fontSize: 10,
    color: C.muted,
    background: C.border,
    padding: '2px 7px',
    borderRadius: 10,
    fontWeight: 700,
  },

  center: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  topstrip: {
    padding: '12px 16px',
    background: C.panel,
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  scanInput: {
    flex: 1,
    padding: '12px 14px',
    background: C.bg,
    border: `1px solid ${C.accent}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: "'Consolas', monospace",
    letterSpacing: '0.04em',
  },
  statusPill: {
    fontSize: 11,
    padding: '8px 12px',
    borderRadius: 6,
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  tiles: {
    padding: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
    overflow: 'auto',
    flex: 1,
    background: C.bg,
    alignContent: 'start',
  },
  emptyTiles: { gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' },
  tile: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '14px 12px',
    cursor: 'pointer',
    position: 'relative',
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'border-color 0.1s',
  },
  tileName: { fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.25 },
  tileSku: { fontSize: 10, color: C.muted, marginTop: 3, letterSpacing: '0.04em' },
  tilePrice: { fontSize: 16, fontWeight: 900, color: C.accent, marginTop: 8, letterSpacing: '0.02em' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#b45309',
    color: '#fff',
  },
  badgeW: { background: '#059669', right: 34 },

  keypad: {
    padding: '12px 14px',
    background: C.panel,
    borderTop: `1px solid ${C.border}`,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },

  receipt: {
    background: C.side,
    borderLeft: `1px solid ${C.border}`,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  rhead: {
    padding: '14px 16px',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rlines: { flex: 1, overflow: 'auto', padding: '10px 12px' },
  line: { padding: 10, borderBottom: `1px dashed ${C.border}`, fontSize: 13, cursor: 'pointer' },
  lineTop: { display: 'flex', justifyContent: 'space-between', color: C.text, fontWeight: 700 },
  lineSub: { display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 11, marginTop: 3 },
  tag: {
    display: 'inline-block',
    fontSize: 9,
    padding: '1px 6px',
    borderRadius: 3,
    background: '#7f1d1d',
    color: '#fecaca',
    marginLeft: 6,
    fontWeight: 800,
    letterSpacing: '0.04em',
  },
  tagW: { background: '#064e3b', color: '#a7f3d0' },

  tot: { padding: '14px 16px', borderTop: `1px solid ${C.border}` },
  totRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cbd5e1', marginBottom: 5 },
  totGrand: {
    fontSize: 22,
    fontWeight: 900,
    color: C.accent,
    borderTop: `1px solid ${C.border}`,
    paddingTop: 10,
    marginTop: 8,
    letterSpacing: '0.02em',
  },

  pay: {
    padding: '12px 16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    borderTop: `1px solid ${C.border}`,
  },
  pb: {
    padding: 12,
    textAlign: 'center',
    background: C.border,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 800,
    color: C.text,
    cursor: 'pointer',
    letterSpacing: '0.05em',
  },
  pbActive: { background: C.accent, color: C.bg },

  suspendRow: { padding: '0 16px 10px' },
  suspendBtn: {
    width: '100%',
    padding: 10,
    background: 'transparent',
    border: `1px solid ${C.border2}`,
    borderRadius: 6,
    color: C.muted,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },

  complete: {
    padding: '18px 16px',
    background: C.green,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 900,
    fontSize: 18,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  },
};
