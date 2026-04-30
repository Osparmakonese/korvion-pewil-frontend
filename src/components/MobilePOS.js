/**
 * MobilePOS.js — phone-first POS lane.
 *
 * Renders Frame 1 + Frame 2 of the locked mobile design (see
 * mobile-mockups/PEWIL_MOBILE_PREVIEW_2026-04-26.html). Used by
 * pages/POS.js when window.innerWidth <= 500. Reuses ALL state and
 * handlers from POS.js — no duplicated logic. Same backend payload,
 * same split-tender, same offline queue. Only the layout differs.
 *
 * Design tokens come from the mockup file. They live as plain JS
 * objects here rather than CSS variables so the component is fully
 * self-contained and doesn't need a stylesheet import.
 */
import React from 'react';
import { fmt } from '../utils/format';

/* Pewil mobile palette — sourced 1:1 from PEWIL_MOBILE_PREVIEW_2026-04-26.html */
const T = {
  cream:   '#ffffff',
  cream2:  '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange:  '#c77700',
  orange2: '#e09a2b',
  amber:   '#f5c518',
  red:     '#c0392b',
  shadow:  '0 4px 12px rgba(28,22,10,0.08)',
};

/* ─────────────────────────────────────────────────────────────────
   Frame 1 — main POS lane
   ───────────────────────────────────────────────────────────────── */
export default function MobilePOS({
  // Cart state + handlers
  cart, removeFromCart, updateCartQty,
  // Scan input
  barcode, setBarcode, handleBarcodeSubmit, barcodeInputRef,
  // Totals
  subtotal, discountAmount, taxAmount, grandTotal, change,
  // Payment + tender
  paymentMethod, setPaymentMethod,
  amountTendered, setAmountTendered,
  // Split-tender state
  splitMode, setSplitMode, splitPayments, setSplitPayments,
  // Submit + park + state
  handleCompleteSale, handleSuspendSale,
  createSaleMutPending,
  // Status
  offline, pendingCount,
  user, activeSessionDurationLabel, syncStateLabel,
}) {
  const cartCount = cart.reduce((s, l) => s + (l.quantity || 0), 0);
  const cashierInitial = (user?.username || '?').slice(0, 1).toUpperCase();
  const cashierName = user?.username || 'Cashier';

  return (
    <div
      className="pewil-mobile-pos"
      style={{
        position: 'fixed',
        inset: 0,
        background: `linear-gradient(180deg, ${T.cream}, #f1e8d4)`,
        color: T.ink,
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* App bar — avatar + cashier + settings icon */}
      <div style={{
        padding: '12px 18px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
            color: '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{cashierInitial}</div>
          <div>
            <div style={{ fontSize: 11, color: T.muted }}>Cashier</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{cashierName}</div>
          </div>
        </div>
        {/* Right-side: offline / pending pill */}
        <div style={{
          fontSize: 11, fontWeight: 700,
          padding: '4px 10px', borderRadius: 999,
          background: offline ? '#fde2e2' : 'rgba(26,107,58,0.10)',
          color: offline ? T.red : T.green,
        }}>
          {offline ? 'Offline' : (pendingCount > 0 ? `Syncing · ${pendingCount}` : 'Synced')}
        </div>
      </div>

      {/* Session pill row */}
      <div style={{
        padding: '4px 18px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          background: 'rgba(26,107,58,0.10)', color: T.green,
          padding: '5px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: T.green,
            boxShadow: '0 0 0 4px rgba(26,107,58,0.18)',
          }} />
          Session open · {activeSessionDurationLabel || 'live'}
        </span>
        <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>
          {syncStateLabel || (offline ? 'Will sync when back online' : 'All synced')}
        </span>
      </div>

      {/* Scan input */}
      <div style={{
        margin: '0 18px 12px',
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 6px rgba(28,22,10,0.04)',
      }}>
        <div style={{
          width: 40, height: 40,
          background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
          borderRadius: 12, color: '#fff', fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flex: '0 0 40px',
        }}>📷</div>
        <input
          ref={barcodeInputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleBarcodeSubmit}
          placeholder="Scan or type barcode"
          inputMode="search"
          autoComplete="off"
          style={{
            flex: 1,
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, fontWeight: 600, color: T.ink,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Cart card — scrollable */}
      <div style={{
        flex: 1, minHeight: 0,
        margin: '0 18px',
        borderRadius: 16,
        background: '#fff',
        border: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px 10px',
          borderBottom: `1px dashed ${T.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, fontWeight: 700, color: T.inkSoft,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Cart · {cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
          {cart.length > 0 && (
            <span style={{ color: T.orange, fontStyle: 'normal' }}>swipe to remove</span>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {cart.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: 24,
              color: T.muted, textAlign: 'center', fontSize: 13,
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
              Scan an item to start a sale.
            </div>
          ) : cart.map((item) => (
            <div key={item.product_id} style={{
              padding: '10px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              columnGap: 8,
              borderBottom: `1px solid #f3ecdc`,
            }}>
              <div style={{ gridColumn: 1, fontWeight: 700, fontSize: 14 }}>
                {item.name}
              </div>
              <div style={{
                gridColumn: 2, gridRow: '1 / 3', alignSelf: 'center',
                fontWeight: 700, fontSize: 15,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                {fmt(parseFloat(item.unit_price) * item.quantity, 'zwd')}
              </div>
              <div style={{ gridColumn: 1, fontSize: 11, color: T.muted, marginTop: 2 }}>
                {fmt(parseFloat(item.unit_price), 'zwd')} each
              </div>
              <div style={{ gridColumn: 1, marginTop: 4 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: T.cream2, borderRadius: 999, padding: '2px 4px',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.quantity <= 1) removeFromCart(item.product_id);
                      else updateCartQty(item.product_id, item.quantity - 1);
                    }}
                    style={qtyBtnStyle}
                    aria-label="Decrease quantity"
                  >−</button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                    style={qtyBtnStyle}
                    aria-label="Increase quantity"
                  >+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals card */}
      <div style={{
        margin: '12px 18px 0',
        padding: '12px 14px',
        background: '#fff',
        borderRadius: 16,
        border: `1px solid ${T.line}`,
      }}>
        <Line label="Subtotal" value={fmt(subtotal, 'zwd')} />
        {discountAmount > 0 && (
          <Line label="Discount" value={`− ${fmt(discountAmount, 'zwd')}`} />
        )}
        <Line label="Tax" value={fmt(taxAmount, 'zwd')} />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22, color: T.ink, fontWeight: 700,
          marginTop: 6, paddingTop: 8,
          borderTop: `1px dashed ${T.line}`,
        }}>
          <span>Total</span>
          <span>{fmt(grandTotal, 'zwd')}</span>
        </div>
      </div>

      {/* 4-button payment row */}
      <div style={{
        margin: '10px 18px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
      }}>
        <PayBtn icon="💵" label="Cash"
          active={!splitMode && paymentMethod === 'cash'}
          onClick={() => { setSplitMode(false); setPaymentMethod('cash'); }} />
        <PayBtn icon="📱" label="EcoCash"
          active={!splitMode && paymentMethod === 'mobile_money'}
          onClick={() => { setSplitMode(false); setPaymentMethod('mobile_money'); }} />
        <PayBtn icon="💳" label="Card"
          active={!splitMode && paymentMethod === 'card'}
          onClick={() => { setSplitMode(false); setPaymentMethod('card'); }} />
        <PayBtn icon="🔀" label="Split"
          active={splitMode}
          onClick={() => setSplitMode(!splitMode)} />
      </div>

      {/* Tendered input — only when not split mode */}
      {!splitMode && (
        <div style={{ margin: '8px 18px 0', display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount tendered"
            value={amountTendered}
            onChange={(e) => setAmountTendered(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 14, fontWeight: 600, color: T.ink,
              background: '#fff',
              border: `1px solid ${T.line}`,
              borderRadius: 12,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {change > 0 && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(26,107,58,0.10)',
              color: T.green, fontWeight: 700,
              borderRadius: 12, fontSize: 13,
              display: 'inline-flex', alignItems: 'center',
            }}>
              Change {fmt(change, 'zwd')}
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA row — Complete + Park */}
      <div style={{
        margin: '12px 18px 14px',
        display: 'flex', gap: 8,
      }}>
        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={createSaleMutPending || cart.length === 0}
          style={{
            flex: 1,
            background: T.ink,
            color: T.cream,
            padding: 14,
            borderRadius: 14,
            border: 'none',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.03em',
            opacity: (createSaleMutPending || cart.length === 0) ? 0.55 : 1,
            cursor: (createSaleMutPending || cart.length === 0) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {createSaleMutPending ? 'Processing…' : 'Complete sale'}
          <span style={{
            display: 'block', fontSize: 11, color: T.orange2,
            fontWeight: 600, marginTop: 2, letterSpacing: 0,
          }}>
            {fmt(grandTotal, 'zwd')} ·{' '}
            {splitMode ? 'Split' : (paymentMethod === 'mobile_money' ? 'EcoCash' : capitalize(paymentMethod))}
          </span>
        </button>
        <button
          type="button"
          onClick={handleSuspendSale}
          aria-label="Park sale"
          title="Park this sale (suspend)"
          style={{
            width: 56,
            background: 'rgba(0,0,0,0.05)',
            color: T.ink,
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            fontSize: 18,
          }}
        >⏸</button>
      </div>

      {/* Bottom 5-tab nav — for now POS is active and only "More"
          is wired (rest are placeholders until Phase 3 lands the
          full nav routes). */}
      <BottomNav active="pos" />

      {/* Frame 2 — split-tender slide-up sheet */}
      {splitMode && (
        <SplitSheet
          grandTotal={grandTotal}
          splitPayments={splitPayments}
          setSplitPayments={setSplitPayments}
          onCancel={() => setSplitMode(false)}
          onComplete={handleCompleteSale}
          processing={createSaleMutPending}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function Line({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 12, color: T.inkSoft, padding: '2px 0',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PayBtn({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? T.green : '#fff',
        border: `1px solid ${active ? T.green : T.line}`,
        color: active ? '#fff' : T.ink,
        borderRadius: 12,
        padding: '10px 4px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontSize: 10, fontWeight: 700,
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function BottomNav({ active }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'pos',  icon: '🛒', label: 'POS'  },
    { id: 'sales',icon: '📈', label: 'Sales'},
    { id: 'people',icon:'👥', label: 'People'},
    { id: 'more', icon: '⋯', label: 'More' },
  ];
  return (
    <nav style={{
      flex: '0 0 76px',
      background: 'rgba(255,253,245,0.92)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderTop: `1px solid ${T.line}`,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      alignItems: 'center',
      padding: '6px 8px 18px',
    }}>
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <div key={it.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
            color: isActive ? T.green : T.muted,
            fontSize: 10, fontWeight: 600,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              background: isActive ? 'rgba(26,107,58,0.10)' : 'transparent',
            }}>{it.icon}</div>
            <span>{it.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Frame 2 — Split-tender slide-up sheet
   Renders over the POS lane when splitMode is true. Same backend
   payload as the desktop Split UI; only the layout is mobile-first.
   ───────────────────────────────────────────────────────────────── */
function SplitSheet({
  grandTotal, splitPayments, setSplitPayments,
  onCancel, onComplete, processing,
}) {
  const tendered = splitPayments.reduce(
    (s, p) => s + (parseFloat(p.amount) || 0), 0
  );
  const remaining = grandTotal - tendered;
  const over = tendered - grandTotal;

  const trackerColors = remaining > 0
    ? { bg: '#fef3c7', fg: '#92400e', label: `Need ${fmt(remaining, 'zwd')}` }
    : over > 0.001
    ? { bg: '#dbeafe', fg: '#1e40af', label: `Change ${fmt(over, 'zwd')}` }
    : { bg: '#dcfce7', fg: '#166534', label: 'Exact' };

  const updateLeg = (idx, patch) => setSplitPayments((legs) =>
    legs.map((l, i) => i === idx ? { ...l, ...patch } : l)
  );
  const removeLeg = (idx) => setSplitPayments((legs) =>
    legs.length > 1 ? legs.filter((_, i) => i !== idx) : legs
  );
  const addLeg = () => setSplitPayments((legs) => [
    ...legs, { method: 'cash', amount: '', reference: '' },
  ]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,16,8,0.55)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        WebkitFontSmoothing: 'antialiased',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cream,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '14px 20px 24px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
          maxHeight: '85vh', overflow: 'auto',
        }}
      >
        <div style={{
          width: 44, height: 4, background: T.line,
          borderRadius: 999, margin: '4px auto 14px',
        }} />
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          margin: '0 0 4px', fontSize: 22, letterSpacing: '-0.01em',
        }}>
          Split this {fmt(grandTotal, 'zwd')} ticket
        </h3>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
          Customer is paying with more than one method.
        </div>

        {splitPayments.map((leg, idx) => (
          <div key={idx} style={{
            display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center',
          }}>
            <select
              value={leg.method}
              onChange={(e) => updateLeg(idx, { method: e.target.value })}
              style={{
                flex: '1 1 110px',
                padding: '12px 10px',
                background: '#fff',
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                fontSize: 13, fontWeight: 600, color: T.ink,
                fontFamily: 'inherit',
              }}
            >
              <option value="cash">💵 Cash</option>
              <option value="mobile_money">📱 EcoCash / Mobile</option>
              <option value="card">💳 Card</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
            </select>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Amount"
              value={leg.amount}
              onChange={(e) => updateLeg(idx, { amount: e.target.value })}
              style={{
                width: 110,
                padding: '12px 10px',
                background: '#fff',
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                fontSize: 14, fontWeight: 700, textAlign: 'right',
                color: T.ink, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => removeLeg(idx)}
              disabled={splitPayments.length <= 1}
              aria-label="Remove leg"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(192,57,43,0.08)',
                color: splitPayments.length <= 1 ? '#fca5a5' : T.red,
                border: 'none', fontSize: 18,
                cursor: splitPayments.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >×</button>
          </div>
        ))}

        <button
          type="button"
          onClick={addLeg}
          style={{
            width: '100%', marginTop: 6, padding: 12,
            border: `1.5px dashed rgba(26,107,58,0.4)`,
            color: T.green,
            background: 'transparent',
            borderRadius: 12,
            fontWeight: 700, fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          + Add another method
        </button>

        <div style={{
          margin: '14px 0 12px',
          padding: '12px 14px',
          background: trackerColors.bg, color: trackerColors.fg,
          borderRadius: 12,
          display: 'flex', justifyContent: 'space-between',
          fontWeight: 700, fontSize: 13,
        }}>
          <span>Tendered: {fmt(tendered, 'zwd')}</span>
          <span>{trackerColors.label}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: '0 0 90px',
              background: '#fff',
              color: T.ink,
              border: `1px solid ${T.line}`,
              borderRadius: 14, padding: 14,
              fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            type="button"
            onClick={onComplete}
            disabled={processing || remaining > 0.001}
            style={{
              flex: 1,
              background: T.ink, color: T.cream,
              border: 'none', borderRadius: 14, padding: 16,
              fontWeight: 800, fontSize: 14,
              opacity: (processing || remaining > 0.001) ? 0.55 : 1,
              cursor: (processing || remaining > 0.001) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {processing ? 'Processing…' : 'Complete split sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const qtyBtnStyle = {
  width: 24, height: 24, border: 'none',
  background: '#fff', borderRadius: '50%',
  fontSize: 14, fontWeight: 700, color: T.ink,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
