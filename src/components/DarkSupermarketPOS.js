/**
 * DarkSupermarketPOS.js — Counter (Dark): the Pewil "Design A" Counter layout
 * in an easy-on-the-eyes dark theme. Products grid on the left, an always-
 * visible Current sale panel on the right with big totals + tender + complete.
 *
 * Presentational only — every prop + handler is owned by POS.js and used as
 * received; this file only changes the look.
 */
import React, { useMemo, useState } from 'react';
import { fmt } from '../utils/format';

const C = {
  green: '#34c172', green2: '#2aa862', ink: '#e9efe9', muted: '#8b988f',
  line: '#27322b', bg: '#0e1411', panel: '#141b16', card: '#192118', card2: '#1d2620',
  amber: '#f0b35b', danger: '#f87171',
};

export default function DarkSupermarketPOS({
  products, filteredProducts, addToCart,
  cart, removeFromCart, updateCartQty,
  barcode, setBarcode, handleBarcodeSubmit, barcodeInputRef,
  search, setSearch,
  subtotal, discountAmount, taxAmount, grandTotal,
  paymentMethod, setPaymentMethod,
  handleCompleteSale, handleSuspendSale,
  offline, pendingCount,
  user, laneLabel, brandName,
}) {
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set(['All']);
    products.forEach((p) => set.add(p.category_name || p.category || 'Other'));
    return Array.from(set).slice(0, 8);
  }, [products]);

  const visible = useMemo(() => (
    category === 'All' ? filteredProducts
      : filteredProducts.filter((p) => (p.category_name || p.category || 'Other') === category)
  ), [filteredProducts, category]);

  const tenders = [
    { v: 'cash', l: '💵 Cash' }, { v: 'mobile_money', l: '📱 EcoCash' },
    { v: 'card', l: '💳 Card' }, { v: 'split', l: '⚯ Split' },
  ];

  return (
    <div style={S.screen}>
      <div style={S.top}>
        <div style={S.brand}><div style={S.sprout}>🌱</div> {brandName || 'Pewil'} <span style={S.crumb}>· Point of Sale</span></div>
        <div style={S.meta}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: offline ? C.danger : C.green }} />
            {offline ? 'Offline' : 'Online'}{pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </span>
          <span>{laneLabel || 'Till 1'} · {user?.username || 'Cashier'}</span>
        </div>
      </div>

      <div style={S.pos}>
        {/* LEFT — products */}
        <div style={S.left}>
          <div style={S.searchRow}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={S.search} />
            <input ref={barcodeInputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleBarcodeSubmit}
              placeholder="Scan barcode…" style={{ ...S.search, maxWidth: 170 }} autoFocus />
          </div>
          <div style={S.chips}>
            {categories.map((c) => (
              <div key={c} onClick={() => setCategory(c)} style={{ ...S.chip, ...(category === c ? S.chipOn : {}) }}>{c}</div>
            ))}
          </div>
          <div style={S.grid}>
            {visible.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, color: C.muted }}>No products match.</div>
            ) : visible.map((p) => {
              const out = (p.quantity_in_stock ?? p.stock ?? 1) <= 0;
              return (
                <div key={p.id} onClick={() => !out && addToCart(p)} style={{ ...S.prod, opacity: out ? 0.45 : 1, cursor: out ? 'not-allowed' : 'pointer' }}>
                  <div style={S.thumb}>{(p.name || '?')[0].toUpperCase()}</div>
                  <div style={S.pname}>{p.name}</div>
                  <div style={S.pprice}>${fmt(p.selling_price)}{p.is_weighable ? <span style={{ fontSize: 10, color: C.muted }}> /kg</span> : ''}</div>
                  <div style={S.pstk}>{out ? 'Out of stock' : `${p.quantity_in_stock ?? p.stock ?? ''} in stock`}</div>
                  {!out && <button type="button" style={S.add} onClick={(e) => { e.stopPropagation(); addToCart(p); }}>Add</button>}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — current sale */}
        <div style={S.cart}>
          <div style={S.cartHead}><h2 style={{ margin: 0, fontSize: 15 }}>Current sale</h2><span style={{ fontSize: 12, color: C.muted }}>{cart.reduce((n, i) => n + (i.quantity || 0), 0)} items</span></div>
          <div style={S.lines}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 50, color: C.muted }}><div style={{ fontSize: 38, opacity: .4 }}>🧾</div><div style={{ marginTop: 8, fontSize: 13 }}>Scan or tap a product to start</div></div>
            ) : cart.map((item) => {
              const weigh = item.product?.is_weighable;
              const age = item.product?.is_age_restricted;
              return (
                <div key={item.product_id} style={S.line}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.lnm}>{item.name}{age && <span style={S.age}>18+</span>}</div>
                    <div style={S.lea}>${fmt(item.unit_price)} each</div>
                  </div>
                  <div style={S.qty}>
                    <button type="button" style={S.qbtn} disabled={weigh} onClick={() => updateCartQty(item.product_id, Math.max(1, (item.quantity | 0) - 1))}>−</button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{weigh ? Number(item.quantity).toFixed(3) : item.quantity}</span>
                    <button type="button" style={S.qbtn} disabled={weigh} onClick={() => updateCartQty(item.product_id, (item.quantity | 0) + 1)}>+</button>
                  </div>
                  <div style={{ width: 56, textAlign: 'right', fontWeight: 800, fontSize: 13 }}>${fmt(item.unit_price * item.quantity)}</div>
                  <button type="button" style={S.rm} onClick={() => removeFromCart(item.product_id)}>×</button>
                </div>
              );
            })}
          </div>
          <div style={S.totals}>
            <div style={S.trow}><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
            {discountAmount > 0 && <div style={{ ...S.trow, color: C.amber }}><span>Discount</span><span>−${fmt(discountAmount)}</span></div>}
            <div style={S.trow}><span>VAT incl.</span><span>${fmt(taxAmount || 0)}</span></div>
            <div style={S.grand}><span style={{ fontSize: 13, fontWeight: 700 }}>Total</span><span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>${fmt(grandTotal)}</span></div>
          </div>
          <div style={S.pay}>
            <div style={S.seg}>
              {tenders.map((t) => (
                <button key={t.v} type="button" onClick={() => setPaymentMethod && setPaymentMethod(t.v)}
                  style={{ ...S.segBtn, ...(paymentMethod === t.v ? S.segOn : {}) }}>{t.l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" style={S.minor} onClick={handleSuspendSale}>⏸ Suspend</button>
              <button type="button" style={S.minor} onClick={() => window.dispatchEvent(new CustomEvent('pewil-pos-discount'))}>% Discount</button>
            </div>
            <button type="button" onClick={handleCompleteSale} disabled={cart.length === 0}
              style={{ ...S.complete, opacity: cart.length === 0 ? 0.5 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>
              Complete sale · ${fmt(grandTotal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial, sans-serif";
const S = {
  screen: { height: '100%', width: '100%', background: C.bg, color: C.ink, display: 'flex', flexDirection: 'column', fontFamily: font, overflow: 'hidden' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.panel, borderBottom: `1px solid ${C.line}`, padding: '11px 18px' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 },
  sprout: { width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#34c172,#2aa862)', display: 'grid', placeItems: 'center', color: '#06281a', fontSize: 16 },
  crumb: { fontSize: 13, color: C.muted, fontWeight: 400 },
  meta: { display: 'flex', gap: 14, fontSize: 12, color: C.muted, alignItems: 'center' },
  pos: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 380px' },

  left: { padding: '14px 16px', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 },
  searchRow: { display: 'flex', gap: 10, marginBottom: 12 },
  search: { flex: 1, border: `1px solid ${C.line}`, background: C.card, color: C.ink, borderRadius: 11, padding: '11px 13px', fontSize: 14, outline: 'none' },
  chips: { display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 12 },
  chip: { whiteSpace: 'nowrap', border: `1px solid ${C.line}`, background: C.card, borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#b9c4bb', cursor: 'pointer' },
  chipOn: { background: C.green, borderColor: C.green, color: '#06281a' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, overflow: 'auto', alignContent: 'start', flex: 1, minHeight: 0 },
  prod: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, textAlign: 'center' },
  thumb: { width: 44, height: 44, borderRadius: 11, background: '#222d24', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800, color: C.green, margin: '2px auto 8px' },
  pname: { fontSize: 13, fontWeight: 700, minHeight: 34, color: '#e8efe8' },
  pprice: { color: C.green, fontWeight: 800, fontSize: 15 },
  pstk: { fontSize: 10.5, color: '#74837a', marginTop: 2 },
  add: { marginTop: 9, width: '100%', border: 0, background: C.green, color: '#06281a', fontWeight: 800, fontSize: 12.5, borderRadius: 9, padding: 8, cursor: 'pointer' },

  cart: { background: C.panel, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 },
  cartHead: { padding: '14px 18px 8px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  lines: { flex: 1, overflow: 'auto', padding: '8px 14px', minHeight: 0 },
  line: { display: 'flex', alignItems: 'center', gap: 10, background: C.card2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 10px', marginBottom: 8 },
  lnm: { fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lea: { fontSize: 11, color: C.muted },
  age: { display: 'inline-block', fontSize: 9, fontWeight: 900, color: '#06281a', background: C.amber, borderRadius: 4, padding: '1px 5px', marginLeft: 6 },
  qty: { display: 'flex', alignItems: 'center', gap: 6 },
  qbtn: { width: 24, height: 24, borderRadius: 7, border: `1px solid ${C.line}`, background: '#222d24', color: '#cdd8cf', fontWeight: 800, cursor: 'pointer' },
  rm: { background: 'none', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer' },
  totals: { padding: '12px 18px', borderTop: `1px solid ${C.line}`, background: C.card },
  trow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, margin: '3px 0' },
  grand: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  pay: { padding: '12px 18px 16px', background: C.card },
  seg: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 },
  segBtn: { border: `1px solid ${C.line}`, background: C.card2, borderRadius: 10, padding: '9px 4px', fontSize: 12, fontWeight: 700, color: '#b9c4bb', cursor: 'pointer' },
  segOn: { background: '#10301f', borderColor: C.green, color: C.green },
  minor: { flex: 1, border: `1px solid ${C.line}`, background: C.card2, borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 700, color: '#b9c4bb', cursor: 'pointer' },
  complete: { width: '100%', border: 0, background: 'linear-gradient(180deg,#34c172,#2aa862)', color: '#06281a', fontWeight: 800, fontSize: 16, borderRadius: 12, padding: 15, boxShadow: '0 8px 20px rgba(52,193,114,.25)' },
};
