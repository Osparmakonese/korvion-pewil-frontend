/**
 * MobilePOS.js — phone-first POS, theme-aware. Renders the mobile version of
 * the chosen cashier style:
 *   light → Counter (light): tap grid → cart sheet → pay sheet
 *   dark  → Counter (dark):  same layout, dark palette
 *   pnp   → Lane Terminal:    scan-first ledger → charge → pay sheet
 *
 * Reuses ALL state/handlers from POS.js — same payload, split-tender, offline
 * queue. Only the visual layer changes per theme.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { fmt } from '../utils/format';
import { M } from '../styles/mobileTokens';
import haptics from '../utils/haptics';
import BottomSheet from './mobile/BottomSheet';

const money = (v) => fmt(v, 'zwd');
const FONT = "'Inter', system-ui, sans-serif";

export default function MobilePOS({
  theme = 'light',
  cart, removeFromCart, updateCartQty, addToCart,
  products = [], search, setSearch,
  barcode, setBarcode, handleBarcodeSubmit, barcodeInputRef,
  subtotal, discountAmount, taxAmount, grandTotal, change,
  paymentMethod, setPaymentMethod,
  amountTendered, setAmountTendered,
  splitMode, setSplitMode, splitPayments, setSplitPayments,
  handleCompleteSale, handleSuspendSale, createSaleMutPending,
  offline, pendingCount, user,
}) {
  const dark = theme === 'dark';
  const lane = theme === 'pnp';
  const T = dark
    ? { surface: '#0b0f0d', card: '#192118', line: '#27322b', ink: '#e9efe9', ink2: '#b9c4bb', ink3: '#8b988f', green: '#34c172', green2: '#2aa862', green3: '#10301f', red: '#f87171', onGreen: '#06281a' }
    : { surface: M.surface, card: M.card, line: M.line, ink: M.ink, ink2: M.ink2, ink3: M.ink3, green: M.green, green2: M.green2, green3: M.green3, red: M.red, onGreen: '#fff' };

  const [sheet, setSheet] = useState(null); // null | 'cart' | 'pay'
  const [justAdded, setJustAdded] = useState(null);
  useEffect(() => { if (cart.length === 0) setSheet(null); }, [cart.length]);

  const cartCount = cart.reduce((s, l) => s + (l.quantity || 0), 0);
  const cashierInitial = (user?.username || '?').slice(0, 1).toUpperCase();

  const tap = (product) => {
    haptics.tap(); addToCart(product); setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 320);
  };
  const openCart = () => { if (cart.length) { haptics.select(); setSheet('cart'); } };
  const goPay = () => { haptics.select(); setSheet('pay'); };
  const complete = () => { haptics.success(); handleCompleteSale(); };
  const list = useMemo(() => products.slice(0, 120), [products]);
  const payDisabled = createSaleMutPending || cart.length === 0 || (splitMode && splitRemaining(grandTotal, splitPayments) > 0.001);

  const statusPill = (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: M.radius.pill, background: offline ? '#fde2e2' : T.green3, color: offline ? T.red : T.green }}>
      {offline ? 'Offline' : (pendingCount > 0 ? `Syncing · ${pendingCount}` : 'Synced')}
    </span>
  );

  /* ── shared bottom sheets (cart + pay) ── */
  const sheets = (
    <>
      <BottomSheet open={sheet === 'cart'} onClose={() => setSheet(null)} title={`Cart · ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.ink3, padding: 24 }}>Cart is empty.</div>
        ) : (
          <>
            <div style={{ maxHeight: '42vh', overflowY: 'auto', marginBottom: 8 }}>
              {cart.map((item) => (
                <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: T.ink3 }}>{money(item.unit_price)} each</div>
                  </div>
                  <Stepper t={T} value={item.quantity}
                    onDec={() => { haptics.tap(); item.quantity <= 1 ? removeFromCart(item.product_id) : updateCartQty(item.product_id, item.quantity - 1); }}
                    onInc={() => { haptics.tap(); updateCartQty(item.product_id, item.quantity + 1); }} />
                  <div style={{ width: 72, textAlign: 'right', fontWeight: 800, fontSize: 14, color: T.ink }}>{money(parseFloat(item.unit_price) * item.quantity)}</div>
                </div>
              ))}
            </div>
            <Totals t={T} subtotal={subtotal} discountAmount={discountAmount} taxAmount={taxAmount} grandTotal={grandTotal} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => { haptics.select(); handleSuspendSale(); setSheet(null); }}
                style={{ width: 56, height: 52, borderRadius: M.radius.md, background: T.card, border: `1px solid ${T.line}`, color: T.ink, fontSize: 18, cursor: 'pointer' }} title="Park sale">⏸</button>
              <button type="button" onClick={goPay} disabled={cart.length === 0}
                style={{ flex: 1, height: 52, borderRadius: M.radius.md, background: T.green, color: T.onGreen, border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: FONT }}>
                Charge {money(grandTotal)}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={sheet === 'pay'} onClose={() => setSheet(null)} title={`Charge ${money(grandTotal)}`}>
        {/* 2x2 on phones — 4-across gave ~92px buttons at 390px, too small to
            tap reliably at a busy till (2026-07-02). */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
          <Method t={T} icon="💵" label="Cash" active={!splitMode && paymentMethod === 'cash'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('cash'); }} />
          <Method t={T} icon="📱" label="EcoCash" active={!splitMode && paymentMethod === 'mobile_money'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('mobile_money'); }} />
          <Method t={T} icon="💳" label="Card" active={!splitMode && paymentMethod === 'card'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('card'); }} />
          <Method t={T} icon="🔀" label="Split" active={splitMode} onClick={() => { haptics.tap(); setSplitMode(!splitMode); }} />
        </div>
        {splitMode ? (
          <SplitEditor t={T} grandTotal={grandTotal} splitPayments={splitPayments} setSplitPayments={setSplitPayments} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: T.ink3 }}>Amount tendered</span>
              {change > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: T.green }}>Change {money(change)}</span>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, padding: '6px 14px', background: T.surface, borderRadius: M.radius.md, marginBottom: 10, minHeight: 30 }}>
              {amountTendered ? money(parseFloat(amountTendered) || 0) : <span style={{ color: T.ink3 }}>{money(0)}</span>}
            </div>
            <Keypad t={T} onKey={(k) => {
              haptics.tap();
              if (k === '⌫') setAmountTendered((s) => String(s || '').slice(0, -1));
              else if (k === 'exact') setAmountTendered(String(grandTotal));
              else setAmountTendered((s) => `${s || ''}${k}`);
            }} />
          </>
        )}
        <button type="button" onClick={complete} disabled={payDisabled}
          style={{ width: '100%', height: 56, marginTop: 14, borderRadius: M.radius.md, background: T.green, color: T.onGreen, border: 'none', fontWeight: 800, fontSize: 16, opacity: payDisabled ? 0.5 : 1, cursor: 'pointer', fontFamily: FONT }}>
          {createSaleMutPending ? 'Processing…' : `Charge ${money(grandTotal)}`}
        </button>
      </BottomSheet>
    </>
  );

  /* ════════════ LANE TERMINAL (mobile) ════════════ */
  if (lane) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: '#eef1f5', color: '#0b1220', fontFamily: FONT, display: 'flex', flexDirection: 'column', paddingTop: M.safeTop }}>
        <div style={{ background: '#1f2937', color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>🌱 {(user?.tenant_name || 'Pewil')} · Lane</div>
          {statusPill}
        </div>
        <div style={{ padding: '10px 12px', background: '#f3f6fa', borderBottom: '1px solid #d7dde6', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#1d4ed8', fontSize: 18 }}>▦</span>
          <input ref={barcodeInputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') haptics.tap(); handleBarcodeSubmit(e); }}
            placeholder="Scan or type code…" inputMode="search" autoComplete="off"
            style={{ flex: 1, border: '2px solid #1d4ed8', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontWeight: 600, outline: 'none', fontFamily: FONT }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff', paddingBottom: `calc(${M.bottomNavH}px + ${M.safeBottom} + 78px)` }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 20px' }}>
              <div style={{ fontSize: 36 }}>▦</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Ready to scan</div>
            </div>
          ) : cart.map((item, idx) => {
            const age = item.product?.is_age_restricted;
            return (
              <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #eef1f5' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13, width: 18 }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}{age && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: '#c2741a', borderRadius: 4, padding: '1px 5px', marginLeft: 6 }}>18+</span>}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{item.quantity} × ${fmt(item.unit_price)}</div>
                </div>
                <Stepper t={{ ...T, surface: '#f3f6fa', card: '#fff', ink: '#0b1220', line: '#d7dde6' }} value={item.quantity}
                  onDec={() => { haptics.tap(); item.quantity <= 1 ? removeFromCart(item.product_id) : updateCartQty(item.product_id, item.quantity - 1); }}
                  onInc={() => { haptics.tap(); updateCartQty(item.product_id, item.quantity + 1); }} />
                <div style={{ width: 64, textAlign: 'right', fontWeight: 800, fontSize: 14.5 }}>${fmt(item.unit_price * item.quantity)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '2px solid #1f2937', padding: `12px 14px calc(12px + ${M.safeBottom})`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Balance · {cartCount} items</div><div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{money(grandTotal)}</div></div>
          <button type="button" onClick={goPay} disabled={cart.length === 0}
            style={{ border: 'none', background: 'linear-gradient(180deg,#1ba053,#15803d)', color: '#fff', fontWeight: 800, fontSize: 16, borderRadius: 12, padding: '14px 22px', opacity: cart.length === 0 ? 0.5 : 1, cursor: 'pointer', fontFamily: FONT }}>Charge →</button>
        </div>
        {sheets}
      </div>
    );
  }

  /* ════════════ COUNTER (light / dark mobile) ════════════ */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: T.surface, color: T.ink, fontFamily: FONT, display: 'flex', flexDirection: 'column', WebkitFontSmoothing: 'antialiased', paddingTop: M.safeTop }}>
      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${T.green2}, ${T.green})`, color: T.onGreen, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cashierInitial}</div>
          <div>
            <div style={{ fontSize: 10.5, color: T.ink3 }}>Till</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{user?.username || 'Cashier'}</div>
          </div>
        </div>
        {statusPill}
      </div>

      <div style={{ margin: '4px 16px 10px', background: T.card, border: `1px solid ${T.line}`, borderRadius: M.radius.lg, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: dark ? 'none' : M.shadow.card }}>
        <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${T.green2}, ${T.green})`, borderRadius: M.radius.md, color: T.onGreen, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 38px' }}>📷</div>
        <input ref={barcodeInputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') haptics.tap(); handleBarcodeSubmit(e); }}
          placeholder="Scan or type barcode" inputMode="search" autoComplete="off"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: M.font.input, fontWeight: 600, color: T.ink, fontFamily: 'inherit' }} />
      </div>

      <div style={{ margin: '0 16px 8px' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" inputMode="search"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: M.font.input, border: `1px solid ${T.line}`, borderRadius: M.radius.md, outline: 'none', background: T.card, color: T.ink, fontFamily: 'inherit' }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: `2px 16px calc(${M.bottomNavH}px + ${M.safeBottom} + 84px)` }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.ink3, fontSize: 13, marginTop: 40 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔍</div>
            {search ? 'No products match.' : 'Scan an item or search to start.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {list.map((p) => {
              const added = justAdded === p.id;
              return (
                <button key={p.id} type="button" onClick={() => tap(p)}
                  style={{ textAlign: 'left', border: `1px solid ${added ? T.green : T.line}`, background: added ? T.green3 : T.card, borderRadius: M.radius.lg, padding: 12, cursor: 'pointer', fontFamily: 'inherit', transform: added ? 'scale(0.97)' : 'scale(1)', transition: `transform ${M.motion.fast}, background ${M.motion.fast}, border-color ${M.motion.fast}`, minHeight: 78, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.green }}>{money(p.selling_price)}</span>
                    <span style={{ fontSize: 16, color: added ? T.green : T.ink3, fontWeight: 700 }}>{added ? '✓' : '+'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button type="button" onClick={openCart}
        style={{ position: 'fixed', left: 12, right: 12, bottom: `calc(${M.bottomNavH}px + ${M.safeBottom} + 8px)`, zIndex: 450, height: 58, border: 'none', borderRadius: M.radius.lg, background: cart.length ? T.green : (dark ? '#2a352e' : '#cbd5d8'), color: T.onGreen, boxShadow: M.shadow.raised, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', fontFamily: 'inherit', cursor: cart.length ? 'pointer' : 'default', transition: `background ${M.motion.base}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: M.radius.pill, minWidth: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{cartCount}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{cart.length ? 'View cart' : 'Cart empty'}</span>
        </span>
        <span style={{ fontWeight: 800, fontSize: 17 }}>{money(grandTotal)}</span>
      </button>

      {sheets}
    </div>
  );
}

/* ─── sub-components (theme via `t`) ─────────────────────────── */
function Stepper({ t = M, value, onDec, onInc }) {
  const btn = { width: 30, height: 30, border: `1px solid ${t.line}`, background: t.card, borderRadius: '50%', fontSize: 16, fontWeight: 700, color: t.ink, cursor: 'pointer', fontFamily: FONT };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.surface, borderRadius: M.radius.pill, padding: 3 }}>
      <button type="button" onClick={onDec} style={btn} aria-label="Decrease">−</button>
      <span style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: 'center', color: t.ink }}>{value}</span>
      <button type="button" onClick={onInc} style={btn} aria-label="Increase">+</button>
    </div>
  );
}

function Totals({ t = M, subtotal, discountAmount, taxAmount, grandTotal }) {
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: t.ink2, padding: '3px 0' };
  return (
    <div style={{ padding: '10px 0', borderTop: `1px dashed ${t.line}` }}>
      <div style={row}><span>Subtotal</span><span>{money(subtotal)}</span></div>
      {discountAmount > 0 && <div style={row}><span>Discount</span><span>− {money(discountAmount)}</span></div>}
      <div style={row}><span>Tax</span><span>{money(taxAmount)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 800, marginTop: 6, paddingTop: 8, borderTop: `1px dashed ${t.line}`, color: t.ink }}>
        <span>Total</span><span>{money(grandTotal)}</span>
      </div>
    </div>
  );
}

function Method({ t = M, icon, label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: active ? t.green : t.card, border: `1px solid ${active ? t.green : t.line}`, color: active ? t.onGreen : t.ink, borderRadius: M.radius.md, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, fontFamily: FONT, cursor: 'pointer' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{label}
    </button>
  );
}

function Keypad({ t = M, onKey }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {keys.map((k) => (
          <button key={k} type="button" onClick={() => onKey(k)}
            style={{ height: 52, borderRadius: M.radius.md, border: `1px solid ${t.line}`, background: t.card, fontSize: 20, fontWeight: 700, color: t.ink, cursor: 'pointer', fontFamily: FONT }}>{k}</button>
        ))}
      </div>
      <button type="button" onClick={() => onKey('exact')}
        style={{ width: '100%', height: 44, marginTop: 8, borderRadius: M.radius.md, border: `1px dashed ${t.green}`, background: t.green3, color: t.green, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Exact amount</button>
    </div>
  );
}

function splitRemaining(grandTotal, legs) {
  const total = (legs || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  return grandTotal - total;
}

function SplitEditor({ t = M, grandTotal, splitPayments, setSplitPayments }) {
  const tendered = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = grandTotal - tendered;
  const over = tendered - grandTotal;
  const tracker = remaining > 0
    ? { bg: '#fef3c7', fg: '#92400e', label: `Need ${money(remaining)}` }
    : over > 0.001 ? { bg: '#dbeafe', fg: '#1e40af', label: `Change ${money(over)}` }
      : { bg: '#dcfce7', fg: '#166534', label: 'Exact' };
  const update = (idx, patch) => setSplitPayments((legs) => legs.map((l, i) => i === idx ? { ...l, ...patch } : l));
  const remove = (idx) => setSplitPayments((legs) => legs.length > 1 ? legs.filter((_, i) => i !== idx) : legs);
  const add = () => { haptics.tap(); setSplitPayments((legs) => [...legs, { method: 'cash', amount: '', reference: '' }]); };
  const fld = { background: t.card, border: `1px solid ${t.line}`, borderRadius: M.radius.md, color: t.ink, fontFamily: FONT };
  return (
    <div>
      {splitPayments.map((leg, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select value={leg.method} onChange={(e) => update(idx, { method: e.target.value })} style={{ ...fld, flex: 1, padding: '11px 8px', fontSize: 13, fontWeight: 600 }}>
            <option value="cash">💵 Cash</option>
            <option value="mobile_money">📱 EcoCash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank</option>
          </select>
          <input type="number" inputMode="decimal" step="0.01" placeholder="Amount" value={leg.amount} onChange={(e) => update(idx, { amount: e.target.value })}
            style={{ ...fld, width: 100, padding: '11px 10px', fontSize: M.font.input, fontWeight: 700, textAlign: 'right', outline: 'none' }} />
          <button type="button" onClick={() => remove(idx)} disabled={splitPayments.length <= 1}
            style={{ width: 40, borderRadius: M.radius.md, background: 'rgba(192,57,43,0.08)', color: splitPayments.length <= 1 ? '#fca5a5' : t.red, border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ width: '100%', padding: 11, border: `1.5px dashed ${t.green}`, color: t.green, background: 'transparent', borderRadius: M.radius.md, fontWeight: 700, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>+ Add method</button>
      <div style={{ margin: '12px 0 0', padding: '11px 14px', background: tracker.bg, color: tracker.fg, borderRadius: M.radius.md, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
        <span>Tendered {money(tendered)}</span><span>{tracker.label}</span>
      </div>
    </div>
  );
}
