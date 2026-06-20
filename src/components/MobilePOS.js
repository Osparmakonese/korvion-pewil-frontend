/**
 * MobilePOS.js — phone-first POS lane (rebuilt 2026-06 on the mobile design
 * system). Scan-first AND tap-to-add, with a sticky cart bar in the thumb
 * zone and cart + payment as slide-up sheets. Reuses ALL state/handlers from
 * POS.js — same payload, same split-tender, same offline queue.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { fmt } from '../utils/format';
import { M } from '../styles/mobileTokens';
import haptics from '../utils/haptics';
import BottomSheet from './mobile/BottomSheet';

const money = (v) => fmt(v, 'zwd');

export default function MobilePOS({
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
  const [sheet, setSheet] = useState(null); // null | 'cart' | 'pay'
  const [justAdded, setJustAdded] = useState(null);

  // When a sale completes the parent clears the cart — close any open sheet.
  useEffect(() => { if (cart.length === 0) setSheet(null); }, [cart.length]);

  const cartCount = cart.reduce((s, l) => s + (l.quantity || 0), 0);
  const cashierInitial = (user?.username || '?').slice(0, 1).toUpperCase();

  const tap = (product) => {
    haptics.tap();
    addToCart(product);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 320);
  };

  const openCart = () => { if (cart.length) { haptics.select(); setSheet('cart'); } };
  const goPay = () => { haptics.select(); setSheet('pay'); };
  const complete = () => { haptics.success(); handleCompleteSale(); };

  const list = useMemo(() => products.slice(0, 120), [products]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 30,
      background: M.surface, color: M.ink,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
      WebkitFontSmoothing: 'antialiased',
      paddingTop: M.safeTop,
    }}>
      {/* App bar */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${M.green2}, ${M.green})`, color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cashierInitial}</div>
          <div>
            <div style={{ fontSize: 10.5, color: M.ink3 }}>Till</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{user?.username || 'Cashier'}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: M.radius.pill, background: offline ? '#fde2e2' : M.green3, color: offline ? M.red : M.green }}>
          {offline ? 'Offline' : (pendingCount > 0 ? `Syncing · ${pendingCount}` : 'Synced')}
        </span>
      </div>

      {/* Scan field */}
      <div style={{ margin: '4px 16px 10px', background: M.card, border: `1px solid ${M.line}`, borderRadius: M.radius.lg, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: M.shadow.card }}>
        <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${M.green2}, ${M.green})`, borderRadius: M.radius.md, color: '#fff', fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 38px' }}>📷</div>
        <input
          ref={barcodeInputRef} value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') haptics.tap(); handleBarcodeSubmit(e); }}
          placeholder="Scan or type barcode" inputMode="search" autoComplete="off"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: M.font.input, fontWeight: 600, color: M.ink, fontFamily: 'inherit' }}
        />
      </div>

      {/* Search */}
      <div style={{ margin: '0 16px 8px' }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…" inputMode="search"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: M.font.input, border: `1px solid ${M.line}`, borderRadius: M.radius.md, outline: 'none', background: M.card, fontFamily: 'inherit' }}
        />
      </div>

      {/* Product grid — tap to add */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: `2px 16px calc(${M.bottomNavH}px + ${M.safeBottom} + 84px)` }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: M.ink3, fontSize: 13, marginTop: 40 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔍</div>
            {search ? 'No products match.' : 'Scan an item or search to start.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {list.map((p) => {
              const added = justAdded === p.id;
              return (
                <button key={p.id} type="button" onClick={() => tap(p)}
                  style={{
                    textAlign: 'left', border: `1px solid ${added ? M.green : M.line}`,
                    background: added ? M.green3 : M.card, borderRadius: M.radius.lg,
                    padding: 12, cursor: 'pointer', fontFamily: 'inherit',
                    transform: added ? 'scale(0.97)' : 'scale(1)',
                    transition: `transform ${M.motion.fast}, background ${M.motion.fast}, border-color ${M.motion.fast}`,
                    minHeight: 78, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: M.ink, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: M.green }}>{money(p.selling_price)}</span>
                    <span style={{ fontSize: 16, color: added ? M.green : M.ink3, fontWeight: 700 }}>{added ? '✓' : '+'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky cart bar — thumb zone */}
      <button type="button" onClick={openCart}
        style={{
          position: 'fixed', left: 12, right: 12,
          bottom: `calc(${M.bottomNavH}px + ${M.safeBottom} + 8px)`, zIndex: 450,
          height: 58, border: 'none', borderRadius: M.radius.lg,
          background: cart.length ? M.green : '#cbd5d8',
          color: '#fff', boxShadow: M.shadow.raised,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 18px', fontFamily: 'inherit',
          cursor: cart.length ? 'pointer' : 'default',
          transition: `background ${M.motion.base}`,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: M.radius.pill, minWidth: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{cartCount}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{cart.length ? 'View cart' : 'Cart empty'}</span>
        </span>
        <span style={{ fontWeight: 800, fontSize: 17 }}>{money(grandTotal)}</span>
      </button>

      {/* Cart sheet */}
      <BottomSheet open={sheet === 'cart'} onClose={() => setSheet(null)} title={`Cart · ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', color: M.ink3, padding: 24 }}>Cart is empty.</div>
        ) : (
          <>
            <div style={{ maxHeight: '42vh', overflowY: 'auto', marginBottom: 8 }}>
              {cart.map((item) => (
                <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: `1px solid ${M.line}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: M.ink3 }}>{money(item.unit_price)} each</div>
                  </div>
                  <Stepper
                    value={item.quantity}
                    onDec={() => { haptics.tap(); item.quantity <= 1 ? removeFromCart(item.product_id) : updateCartQty(item.product_id, item.quantity - 1); }}
                    onInc={() => { haptics.tap(); updateCartQty(item.product_id, item.quantity + 1); }}
                  />
                  <div style={{ width: 72, textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{money(parseFloat(item.unit_price) * item.quantity)}</div>
                </div>
              ))}
            </div>
            <Totals subtotal={subtotal} discountAmount={discountAmount} taxAmount={taxAmount} grandTotal={grandTotal} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => { haptics.select(); handleSuspendSale(); setSheet(null); }}
                style={{ width: 56, height: 52, borderRadius: M.radius.md, background: '#fff', border: `1px solid ${M.line}`, fontSize: 18, cursor: 'pointer' }} title="Park sale">⏸</button>
              <button type="button" onClick={goPay} disabled={cart.length === 0}
                style={{ flex: 1, height: 52, borderRadius: M.radius.md, background: M.green, color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Charge {money(grandTotal)}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Payment sheet */}
      <BottomSheet open={sheet === 'pay'} onClose={() => setSheet(null)} title={`Charge ${money(grandTotal)}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          <Method icon="💵" label="Cash" active={!splitMode && paymentMethod === 'cash'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('cash'); }} />
          <Method icon="📱" label="EcoCash" active={!splitMode && paymentMethod === 'mobile_money'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('mobile_money'); }} />
          <Method icon="💳" label="Card" active={!splitMode && paymentMethod === 'card'} onClick={() => { haptics.tap(); setSplitMode(false); setPaymentMethod('card'); }} />
          <Method icon="🔀" label="Split" active={splitMode} onClick={() => { haptics.tap(); setSplitMode(!splitMode); }} />
        </div>

        {splitMode ? (
          <SplitEditor grandTotal={grandTotal} splitPayments={splitPayments} setSplitPayments={setSplitPayments} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: M.ink3 }}>Amount tendered</span>
              {change > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: M.green }}>Change {money(change)}</span>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: M.ink, padding: '6px 14px', background: M.surface, borderRadius: M.radius.md, marginBottom: 10, minHeight: 30 }}>
              {amountTendered ? money(parseFloat(amountTendered) || 0) : <span style={{ color: '#cbd5d8' }}>{money(0)}</span>}
            </div>
            <Keypad
              onKey={(k) => {
                haptics.tap();
                if (k === '⌫') setAmountTendered((s) => String(s || '').slice(0, -1));
                else if (k === 'exact') setAmountTendered(String(grandTotal));
                else setAmountTendered((s) => `${s || ''}${k}`);
              }}
            />
          </>
        )}

        <button type="button" onClick={complete}
          disabled={createSaleMutPending || cart.length === 0 || (splitMode && splitRemaining(grandTotal, splitPayments) > 0.001)}
          style={{
            width: '100%', height: 56, marginTop: 14, borderRadius: M.radius.md,
            background: M.green, color: '#fff', border: 'none', fontWeight: 800, fontSize: 16,
            opacity: (createSaleMutPending || cart.length === 0 || (splitMode && splitRemaining(grandTotal, splitPayments) > 0.001)) ? 0.5 : 1,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {createSaleMutPending ? 'Processing…' : `Charge ${money(grandTotal)}`}
        </button>
      </BottomSheet>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────── */

function Stepper({ value, onDec, onInc }) {
  const btn = { width: 30, height: 30, border: 'none', background: '#fff', borderRadius: '50%', fontSize: 16, fontWeight: 700, color: M.ink, boxShadow: M.shadow.card, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: M.surface, borderRadius: M.radius.pill, padding: 3 }}>
      <button type="button" onClick={onDec} style={btn} aria-label="Decrease">−</button>
      <span style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: 'center' }}>{value}</span>
      <button type="button" onClick={onInc} style={btn} aria-label="Increase">+</button>
    </div>
  );
}

function Totals({ subtotal, discountAmount, taxAmount, grandTotal }) {
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: M.ink2, padding: '3px 0' };
  return (
    <div style={{ padding: '10px 0', borderTop: `1px dashed ${M.line}` }}>
      <div style={row}><span>Subtotal</span><span>{money(subtotal)}</span></div>
      {discountAmount > 0 && <div style={row}><span>Discount</span><span>− {money(discountAmount)}</span></div>}
      <div style={row}><span>Tax</span><span>{money(taxAmount)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 800, marginTop: 6, paddingTop: 8, borderTop: `1px dashed ${M.line}` }}>
        <span>Total</span><span>{money(grandTotal)}</span>
      </div>
    </div>
  );
}

function Method({ icon, label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: active ? M.green : '#fff', border: `1px solid ${active ? M.green : M.line}`, color: active ? '#fff' : M.ink, borderRadius: M.radius.md, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{label}
    </button>
  );
}

function Keypad({ onKey }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {keys.map((k) => (
          <button key={k} type="button" onClick={() => onKey(k)}
            style={{ height: 52, borderRadius: M.radius.md, border: `1px solid ${M.line}`, background: '#fff', fontSize: 20, fontWeight: 700, color: M.ink, cursor: 'pointer', fontFamily: 'inherit' }}>{k}</button>
        ))}
      </div>
      <button type="button" onClick={() => onKey('exact')}
        style={{ width: '100%', height: 44, marginTop: 8, borderRadius: M.radius.md, border: `1px dashed ${M.green}`, background: M.green3, color: M.green, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Exact amount</button>
    </div>
  );
}

function splitRemaining(grandTotal, legs) {
  const t = (legs || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  return grandTotal - t;
}

function SplitEditor({ grandTotal, splitPayments, setSplitPayments }) {
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

  return (
    <div>
      {splitPayments.map((leg, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select value={leg.method} onChange={(e) => update(idx, { method: e.target.value })}
            style={{ flex: 1, padding: '11px 8px', background: '#fff', border: `1px solid ${M.line}`, borderRadius: M.radius.md, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            <option value="cash">💵 Cash</option>
            <option value="mobile_money">📱 EcoCash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank</option>
          </select>
          <input type="number" inputMode="decimal" step="0.01" placeholder="Amount" value={leg.amount}
            onChange={(e) => update(idx, { amount: e.target.value })}
            style={{ width: 100, padding: '11px 10px', background: '#fff', border: `1px solid ${M.line}`, borderRadius: M.radius.md, fontSize: M.font.input, fontWeight: 700, textAlign: 'right', fontFamily: 'inherit', outline: 'none' }} />
          <button type="button" onClick={() => remove(idx)} disabled={splitPayments.length <= 1}
            style={{ width: 40, borderRadius: M.radius.md, background: 'rgba(192,57,43,0.08)', color: splitPayments.length <= 1 ? '#fca5a5' : M.red, border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add}
        style={{ width: '100%', padding: 11, border: `1.5px dashed rgba(26,107,58,0.4)`, color: M.green, background: 'transparent', borderRadius: M.radius.md, fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>+ Add method</button>
      <div style={{ margin: '12px 0 0', padding: '11px 14px', background: tracker.bg, color: tracker.fg, borderRadius: M.radius.md, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
        <span>Tendered {money(tendered)}</span><span>{tracker.label}</span>
      </div>
    </div>
  );
}
