import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  barcodeLookup,
  getCashierSessions,
  getPOSSettings,
} from '../api/retailApi';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';
import { requireManagerApproval } from '../utils/managerApproval';
import { promptLoyaltyMember } from '../utils/loyaltyLookup';
import { promptDiscountReason } from '../utils/discountReason';
import { promptCashDrop, submitCashDrop } from '../utils/cashDrop';
import { claimSessionLock } from '../utils/posSessionLock';
import {
  submitSaleOnline, installOfflineSync, getPendingCount,
  onPendingChange, isOffline as posIsOffline,
} from '../utils/offlinePOS';
import { promptWeight } from '../utils/weightPrompt';
import { requireAgeVerification } from '../utils/ageVerify';
import QuickTilesPanel from '../components/QuickTilesPanel';
import ScannerLanePOS from '../components/ScannerLanePOS';
import DarkSupermarketPOS from '../components/DarkSupermarketPOS';
import POSImmersiveControls from '../components/POSImmersiveControls';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/* ─── Receipt Modal ─── */
function ReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '24px',
          maxWidth: 400,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>
            {'✔'}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#1a6b3a',
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Sale Complete
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Receipt #{receipt.receipt_number}
          </p>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {receipt._offline_pending && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                background: '#fee2e2', color: '#b91c1c', letterSpacing: '0.05em',
              }}>
                {'\u{1F4F5}'} OFFLINE — WILL SYNC ON RECONNECT
              </span>
            )}
            {receipt.fiscal_submitted ? (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                background: '#d1fae5', color: '#064e3b', letterSpacing: '0.05em',
              }}>
                {'\u2713'} FISCAL: SUBMITTED
                {receipt.fiscal_receipt_number ? ` · ${receipt.fiscal_receipt_number}` : ''}
              </span>
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                background: '#fef3c7', color: '#92400e', letterSpacing: '0.05em',
              }}>
                {'\u23F3'} FISCAL: PENDING — WILL SYNC TO ZIMRA
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span style={{ color: '#6b7280' }}>Subtotal:</span>
            <strong>{fmt(receipt.subtotal, 'zwd')}</strong>
          </div>

          {receipt.discount > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <span style={{ color: '#6b7280' }}>Discount:</span>
              <strong>-{fmt(receipt.discount, 'zwd')}</strong>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span style={{ color: '#6b7280' }}>Tax:</span>
            <strong>{fmt(receipt.tax, 'zwd')}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 700,
              color: '#1a6b3a',
            }}
          >
            <span>Total:</span>
            <strong>{fmt(receipt.total, 'zwd')}</strong>
          </div>
        </div>

        <div
          style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: '12px',
            marginBottom: 16,
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>Payment Method:</span>
            <strong style={{ textTransform: 'capitalize' }}>
              {receipt.payment_method === 'mobile_money'
                ? 'Mobile Money'
                : receipt.payment_method === 'mixed'
                ? 'Split (mixed)'
                : receipt.payment_method}
            </strong>
          </div>
          {/* Split-tender breakdown — only shown when the sale was paid via
              multiple methods. Mirrors what we send to the printed receipt
              below so the customer can see e.g. "Cash $10 / EcoCash $15". */}
          {receipt.payment_method === 'mixed' && Array.isArray(receipt.payments_data) && receipt.payments_data.length > 0 && (
            <div
              style={{
                marginBottom: 6,
                paddingLeft: 8,
                borderLeft: '3px solid #1a6b3a',
              }}
            >
              {receipt.payments_data.map((leg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#374151',
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>
                    {leg.method === 'mobile_money' ? 'EcoCash' : leg.method}
                    {leg.reference ? ` · ${leg.reference}` : ''}
                  </span>
                  <span>{fmt(parseFloat(leg.amount) || 0, 'zwd')}</span>
                </div>
              ))}
            </div>
          )}
          {receipt.amount_tendered > receipt.total && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Change:</span>
              <strong style={{ color: '#1a6b3a' }}>
                {fmt(receipt.amount_tendered - receipt.total, 'zwd')}
              </strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const printWin = window.open('', '_blank', 'width=400,height=600');
              const items = receipt.items_data || [];
              const rows = items.map(i =>
                `<tr><td style="padding:4px 0;font-size:11px">${i.product_name || 'Item'} x${i.qty || 0}</td><td style="text-align:right;padding:4px 0;font-size:11px">$${(i.total || 0).toFixed(2)}</td></tr>`
              ).join('');
              printWin.document.write(`<html><head><title>Receipt</title></head><body style="font-family:monospace;max-width:300px;margin:0 auto;padding:20px">
                <h2 style="text-align:center;margin:0 0 4px">PEWIL</h2>
                <p style="text-align:center;font-size:10px;color:#666;margin:0 0 16px">Receipt #${receipt.receipt_number}</p>
                <hr style="border:none;border-top:1px dashed #ccc"/>
                <table style="width:100%;border-collapse:collapse">${rows}</table>
                <hr style="border:none;border-top:1px dashed #ccc"/>
                <table style="width:100%;font-size:11px">
                  <tr><td>Subtotal</td><td style="text-align:right">$${parseFloat(receipt.subtotal || 0).toFixed(2)}</td></tr>
                  ${receipt.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-$${parseFloat(receipt.discount).toFixed(2)}</td></tr>` : ''}
                  <tr><td>Tax</td><td style="text-align:right">$${parseFloat(receipt.tax || 0).toFixed(2)}</td></tr>
                  <tr style="font-weight:bold;font-size:14px"><td>TOTAL</td><td style="text-align:right">$${parseFloat(receipt.total || 0).toFixed(2)}</td></tr>
                </table>
                <hr style="border:none;border-top:1px dashed #ccc"/>
                <p style="text-align:center;font-size:10px;color:#666">Payment: ${receipt.payment_method === 'mobile_money' ? 'Mobile Money' : receipt.payment_method === 'mixed' ? 'Split' : receipt.payment_method}</p>
                ${receipt.payment_method === 'mixed' && Array.isArray(receipt.payments_data) && receipt.payments_data.length > 0
                  ? '<table style="width:100%;font-size:10px;color:#666;margin-top:-6px">' +
                      receipt.payments_data.map((leg) =>
                        `<tr><td style="padding:1px 0">&nbsp;&nbsp;${leg.method === 'mobile_money' ? 'EcoCash' : (leg.method || '')}${leg.reference ? ' · ' + leg.reference : ''}</td><td style="text-align:right;padding:1px 0">$${(parseFloat(leg.amount) || 0).toFixed(2)}</td></tr>`
                      ).join('') +
                    '</table>'
                  : ''}
                <p style="text-align:center;font-size:10px;color:#666">Thank you for shopping with us!</p>
              </body></html>`);
              printWin.document.close();
              printWin.print();
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: '#fff',
              color: '#1a6b3a',
              border: '1px solid #1a6b3a',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {'\u{1F5A8}'} Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper: Get emoji icon by category ─── */
const getCategoryEmoji = (category) => {
  const emojiMap = {
    produce: '🥬',
    dairy: '🥛',
    meat: '🥩',
    bakery: '🍞',
    drinks: '🥤',
    snacks: '🍿',
    beverages: '🍷',
    household: '🧹',
    personal_care: '🧴',
    frozen: '🧊',
    canned: '🥫',
    default: '📦',
  };
  // Sentry MAKONESE-FARM-FRONTEND-2: category came back as something other
  // than a string (null, number, or object) so ?.toLowerCase() blew up.
  // Coerce defensively — optional-chaining only guards null/undefined.
  const key = typeof category === 'string'
    ? category.toLowerCase()
    : (category == null ? '' : String(category).toLowerCase());
  return emojiMap[key] || emojiMap.default;
};

/* ─── Styles ─── */
const S = {
  page: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '12px',
    height: 'calc(100vh - 110px)',
    background: '#f9fafb',
    padding: '12px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  leftHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
  },
  leftTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: '#f9fafb',
    boxSizing: 'border-box',
    width: '100%',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '12px',
    padding: '12px',
    overflow: 'auto',
    flex: 1,
  },
  productCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  productCardDisabled: {
    opacity: '0.5',
    cursor: 'not-allowed',
  },
  productCardHover: {
    boxShadow: '0 4px 12px rgba(26,107,58,0.15)',
    borderColor: '#1a6b3a',
    transform: 'translateY(-2px)',
  },
  productEmoji: {
    fontSize: '32px',
  },
  productName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    minHeight: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1a6b3a',
    marginBottom: '4px',
  },
  productStock: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '8px',
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    background: '#1a6b3a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  addBtnHover: {
    background: '#2d9e58',
  },
  rightHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
  },
  rightTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  cartContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    padding: '12px',
    gap: '12px',
  },
  cartItems: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px',
    background: '#f9fafb',
    borderRadius: '6px',
    fontSize: '11px',
    border: '1px solid #e5e7eb',
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
  },
  cartItemPrice: {
    color: '#6b7280',
    marginBottom: '4px',
    fontSize: '10px',
  },
  cartItemRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  cartItemTotal: {
    fontWeight: '700',
    color: '#1a6b3a',
  },
  qtyControl: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  qtyBtn: {
    width: '20px',
    height: '20px',
    padding: 0,
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '700',
    transition: 'background 0.2s',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 8px',
    background: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  totalLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a6b3a',
  },
  paymentBtns: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
    fontWeight: '600',
  },
  paymentBtn: {
    flex: 1,
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paymentBtnActive: {
    background: '#1a6b3a',
    color: '#fff',
    borderColor: '#1a6b3a',
  },
  completeSaleBtn: {
    width: '100%',
    padding: '12px',
    background: '#1a6b3a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  completeSaleBtnHover: {
    background: '#2d9e58',
  },
  emptyCart: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '12px',
    gap: '8px',
  },
  emptyCartIcon: {
    fontSize: '40px',
  },
  section: {
    marginBottom: '8px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: '4px',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '11px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '11px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  changeDisplay: {
    marginTop: '4px',
    fontSize: '10px',
    color: '#1a6b3a',
    fontWeight: '600',
  },
};

export default function POS() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const barcodeInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  // Split-tender ("mixed") payments: customer pays e.g. $10 cash + $15 EcoCash
  // on one ticket. When `splitMode` is on, the cashier maintains a list of
  // legs (method + amount) instead of choosing a single method, and we send
  // `payments_data` to the backend. Backend auto-flips payment_method to
  // 'mixed' when the array contains 2+ distinct methods.
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: 'cash', amount: '', reference: '' },
    { method: 'mobile_money', amount: '', reference: '' },
  ]);
  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Batch 1: usability pack
  const [priceCheckMode, setPriceCheckMode] = useState(false);
  const [lastPriceCheck, setLastPriceCheck] = useState(null); // { name, price, stock, ts }
  const [loyaltyMember, setLoyaltyMember] = useState(null);
  const [discountReason, setDiscountReason] = useState('');
  const [discountNotes, setDiscountNotes] = useState('');
  const [suspendedSales, setSuspendedSales] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pewil_pos_suspended') || '[]'); }
    catch (_) { return []; }
  });
  const [suspendDrawerOpen, setSuspendDrawerOpen] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState(null);

  // Batch 2a: tab-level session lock
  const sessionLockRef = useRef(null);
  const [isLockOwner, setIsLockOwner] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Batch 2b: offline queue state
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());
  const [offline, setOffline] = useState(() => posIsOffline());

  // BroadcastChannel for the customer-facing display at /customer-display.
  const displayCh = useRef(null);
  useEffect(() => {
    try { displayCh.current = new BroadcastChannel('pewil-pos'); } catch (_) {}
    return () => { try { displayCh.current?.close(); } catch (_) {} };
  }, []);

  // Persist suspended sales across refreshes.
  useEffect(() => {
    try { localStorage.setItem('pewil_pos_suspended', JSON.stringify(suspendedSales)); } catch (_) {}
  }, [suspendedSales]);

  // Toggle body class so CSS hides Pewil chrome in focus mode. Auto-clean on unmount.
  // The "pnp" and "dark" themes are full-viewport immersive layouts, so we
  // force focus mode on whenever either is active — no cashier should see the
  // Pewil sidebar/topbar while they're ringing up sales at the lane.
  useEffect(() => {
    if (focusMode) document.body.classList.add('pewil-pos-focus');
    else document.body.classList.remove('pewil-pos-focus');
    return () => document.body.classList.remove('pewil-pos-focus');
  }, [focusMode]);

  // Track native fullscreen state so the button reflects reality if user hits ESC.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-pos'],
    queryFn: getProducts,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['retail-sessions-pos'],
    queryFn: getCashierSessions,
  });

  // POS look-and-feel settings — per-tenant singleton.
  // Fetched once; falls back to sane defaults so the POS still renders
  // even if the endpoint is unreachable.
  const { data: posSettings } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: getPOSSettings,
    staleTime: 60000,
  });
  const settings = {
    theme: 'light',
    show_product_tiles: true,
    show_category_sidebar: true,
    show_quick_tiles: true,
    show_keypad: false,
    show_receipt_preview: true,
    enable_hotkeys: true,
    customer_display_enabled: true,
    auto_focus_scan: true,
    ...(posSettings || {}),
  };

  // Claim a tab-level lock on the active session. If another tab is already
  // running POS for the same session, this tab flips to read-only so we can't
  // double-ring sales or race stock deductions.
  useEffect(() => {
    const active = sessions.find((s) => !s.closed_at);
    const sid = active?.id || null;
    if (sid === activeSessionId) return;

    // Release any prior lock on session change.
    if (sessionLockRef.current) {
      try { sessionLockRef.current.release(); } catch (_) {}
      sessionLockRef.current = null;
    }
    setActiveSessionId(sid);
    if (!sid) { setIsLockOwner(true); return; }

    const ctrl = claimSessionLock(sid);
    sessionLockRef.current = ctrl;
    setIsLockOwner(ctrl.isOwner());
    const unsub = ctrl.onChange((owner) => setIsLockOwner(owner));
    return () => {
      try { unsub(); } catch (_) {}
      try { ctrl.release(); } catch (_) {}
      if (sessionLockRef.current === ctrl) sessionLockRef.current = null;
    };
  }, [sessions, activeSessionId]);

  // Batch 2b: wraps createSale with an offline queue. On network failure
  // (or pre-detected offline), the sale gets an idempotent client key,
  // goes to the queue, and we show an optimistic receipt immediately. The
  // reconnect sync (installOfflineSync below) drains the queue on recovery.
  const createSaleMut = useMutation({
    mutationFn: (saleData) => submitSaleOnline(api, saleData),
    onSuccess: ({ sale, source }) => {
      setReceipt(sale);
      setLastReceiptId(sale?.id || null);
      setShowReceipt(true);
      // Award loyalty points only when the sale is confirmed server-side.
      // For queued offline sales we defer until drain (simpler than queuing
      // a second endpoint — re-award on reconnect is a 2b-follow-up).
      if (loyaltyMember && source === 'online') {
        const pts = Math.floor(parseFloat(sale?.total || grandTotal) || 0);
        if (pts > 0) {
          api.post('/retail/loyalty-transactions/', {
            member: loyaltyMember.id,
            points: pts,
            transaction_type: 'earn',
            notes: `Sale #${sale?.id || ''}`,
          }).catch(() => {});
        }
      }
      resetCart();
      qc.invalidateQueries({ queryKey: ['retail-products-pos'] });
      setPendingCount(getPendingCount());
    },
  });

  // Keep offline + pending state live. installOfflineSync also runs a
  // periodic drain and drains on the 'online' event.
  useEffect(() => {
    const stop = installOfflineSync(api, {
      onDrain: ({ sent, failed, remaining }) => {
        setPendingCount(remaining);
        if (sent > 0) {
          qc.invalidateQueries({ queryKey: ['retail-sessions-pos'] });
          qc.invalidateQueries({ queryKey: ['retail-products-pos'] });
        }
      },
    });
    const unsubPending = onPendingChange((n) => setPendingCount(n));
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      try { stop(); } catch (_) {}
      try { unsubPending(); } catch (_) {}
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [qc]);

  const barcodeLookupMut = useMutation({
    mutationFn: barcodeLookup,
    onSuccess: (data) => {
      if (!data) return;
      if (priceCheckMode) {
        setLastPriceCheck({
          name: data.name, price: data.selling_price,
          stock: data.quantity_in_stock, ts: Date.now(),
        });
      } else {
        addToCart(data);
      }
      setBarcode('');
      barcodeInputRef.current?.focus();
    },
  });

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const filteredProducts = products.filter((p) => {
    const match =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return match && p.quantity_in_stock > 0;
  });

  // Low-level: add a single product line with a known quantity. Used after
  // the weight modal resolves, or for ordinary piece-based items.
  const addLineToCart = (product, quantity) => {
    setCart((prev) => {
      // For weighable items every capture is a new line — cashier might weigh
      // two bunches of bananas separately and should see both.
      if (product.is_weighable) {
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            quantity,
            product,
          },
        ];
      }
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
              ...item,
              quantity: Math.min(
                item.quantity + quantity,
                product.quantity_in_stock
              ),
            }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.selling_price,
          quantity,
          product,
        },
      ];
    });
  };

  // Public entry point. Handles weighable items by popping the weight modal
  // first. Age-verification is deferred to checkout so the cashier isn't
  // prompted per bottle — one prompt per sale, with all age-gated items.
  const addToCart = async (product) => {
    if (product.is_weighable) {
      try {
        const { weight } = await promptWeight({ product });
        addLineToCart(product, weight);
      } catch (_) {
        // cashier cancelled weighing — nothing added, nothing to clean up.
      }
      return;
    }
    addLineToCart(product, 1);
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
    } else {
      const product = products.find((p) => p.id === productId);
      setCart((prev) =>
        prev.map((item) =>
          item.product_id === productId
            ? {
              ...item,
              quantity: Math.min(qty, product.quantity_in_stock),
            }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = parseFloat(tax) || 0;
  const grandTotal = subtotal - discountAmount + taxAmount;
  const change = (parseFloat(amountTendered) || 0) - grandTotal;

  const resetCart = () => {
    setCart([]);
    setDiscount('');
    setTax('');
    setPaymentMethod('cash');
    setAmountTendered('');
    setLoyaltyMember(null);
    setDiscountReason('');
    setDiscountNotes('');
    // Reset split-tender mode so the next ticket starts on a single method.
    setSplitMode(false);
    setSplitPayments([
      { method: 'cash', amount: '', reference: '' },
      { method: 'mobile_money', amount: '', reference: '' },
    ]);
  };

  // Broadcast current state to customer-facing display every render.
  // Gated by the POSSettings.customer_display_enabled flag so managers can
  // switch off the second screen at stores that don't have one.
  useEffect(() => {
    if (settings.customer_display_enabled === false) return;
    try {
      displayCh.current?.postMessage({
        type: 'state',
        payload: {
          items: cart, subtotal, discount: discountAmount, tax: taxAmount,
          total: grandTotal, tendered: parseFloat(amountTendered) || 0,
          change: change > 0 ? change : 0,
          member: loyaltyMember ? {
            name: loyaltyMember.customer_name, phone: loyaltyMember.customer_phone,
            points_balance: loyaltyMember.points_balance,
          } : null,
          message: priceCheckMode ? 'Price check mode' : '',
        },
      });
    } catch (_) {}
  }, [cart, subtotal, discountAmount, taxAmount, grandTotal, amountTendered, change, loyaltyMember, priceCheckMode]);

  // Manager-override: void the current cart (supermarket convention —
  // cashier summons manager, manager authenticates, cart clears with audit).
  const handleVoidCart = async () => {
    if (cart.length === 0) return;
    if (!(await confirm({
      title: 'Void current sale',
      message: 'This will clear the cart. A manager must authorize this action. Continue?',
      confirmText: 'Summon manager',
      danger: true,
    }))) return;
    try {
      await requireManagerApproval('void_sale', {
        resourceType: 'cart',
        notes: `${cart.length} item(s), subtotal ${subtotal}`,
      });
      resetCart();
    } catch (e) {
      if (e.message !== 'cancelled') {
        alert('Void failed: ' + (e.message || 'unknown error'));
      }
    }
  };

  // Manager-override: applying a manual discount requires reason + manager approval.
  const openDiscountDialog = async () => {
    const picked = await promptDiscountReason({ current: discount, max: subtotal });
    if (!picked) return;
    try {
      await requireManagerApproval('price_override', {
        resourceType: 'cart',
        notes: `Discount ${picked.amount} (${picked.reason})${picked.notes ? ' — ' + picked.notes : ''}`,
      });
      setDiscount(String(picked.amount));
      setDiscountReason(picked.reason);
      setDiscountNotes(picked.notes);
    } catch (_) { /* cancelled */ }
  };
  const clearDiscount = () => {
    setDiscount(''); setDiscountReason(''); setDiscountNotes('');
  };

  // Suspend / resume park-sale (supermarket convention: pause for a forgotten item).
  const handleSuspendSale = async () => {
    if (cart.length === 0) return;
    const ticket = {
      id: `s-${Date.now()}`,
      label: loyaltyMember
        ? `${loyaltyMember.customer_name || loyaltyMember.customer_phone || 'Member'} · ${cart.length} item${cart.length > 1 ? 's' : ''}`
        : `${cart.length} item${cart.length > 1 ? 's' : ''} · ${fmt(grandTotal, 'zwd')}`,
      ts: Date.now(),
      cart, discount, tax, paymentMethod, amountTendered,
      loyaltyMember, discountReason, discountNotes,
    };
    setSuspendedSales((prev) => [ticket, ...prev].slice(0, 20));
    resetCart();
  };
  const handleResumeSale = (ticket) => {
    setCart(ticket.cart || []);
    setDiscount(ticket.discount || '');
    setTax(ticket.tax || '');
    setPaymentMethod(ticket.paymentMethod || 'cash');
    setAmountTendered(ticket.amountTendered || '');
    setLoyaltyMember(ticket.loyaltyMember || null);
    setDiscountReason(ticket.discountReason || '');
    setDiscountNotes(ticket.discountNotes || '');
    setSuspendedSales((prev) => prev.filter((s) => s.id !== ticket.id));
    setSuspendDrawerOpen(false);
    barcodeInputRef.current?.focus();
  };
  const handleDeleteSuspended = async (ticket) => {
    if (!(await confirm({ title: 'Delete suspended sale',
      message: 'This cannot be recovered.', confirmText: 'Delete', danger: true }))) return;
    setSuspendedSales((prev) => prev.filter((s) => s.id !== ticket.id));
  };

  // Loyalty — lookup and auto-apply at start of sale
  const handleLoyaltyLookup = async () => {
    const m = await promptLoyaltyMember();
    if (m) setLoyaltyMember(m);
  };

  // Reprint last receipt (manager-gated)
  const handleReprint = async () => {
    if (!lastReceiptId && !receipt) {
      alert('No recent receipt to reprint.');
      return;
    }
    try {
      await requireManagerApproval('reprint_receipt', {
        resourceType: 'sale',
        resourceId: String(lastReceiptId || receipt?.id || ''),
      });
      setShowReceipt(true);
    } catch (_) { /* cancelled */ }
  };

  const handleCashDrop = async () => {
    if (!isLockOwner) {
      alert('This tab is read-only — POS is already active in another tab. Cash drop not allowed here.');
      return;
    }
    const activeSessions = sessions.filter((s) => !s.closed_at);
    if (activeSessions.length === 0) {
      alert('No active cashier session.');
      return;
    }
    const sessionId = activeSessions[0].id;
    const dropData = await promptCashDrop({ sessionId });
    if (!dropData) return;
    try {
      const saved = await submitCashDrop({ sessionId, ...dropData });
      alert(`Cash drop of ${fmt(saved.amount, 'zwd')} recorded (#${saved.id}).`);
      qc.invalidateQueries({ queryKey: ['retail-sessions-pos'] });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Cash drop failed.';
      alert('Cash drop failed: ' + msg);
    }
  };

  const handleCompleteSale = async () => {
    if (!isLockOwner) {
      alert('This tab is read-only — POS is already active in another tab. Complete the sale there, or close the other tab and retry.');
      return;
    }
    const activeSessions = sessions.filter((s) => !s.closed_at);
    if (activeSessions.length === 0) {
      alert('No active cashier session. Please open a session first.');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    // Batch 3: age gate. Scan the cart once; if any line item has an
    // age-restricted product, run the verification modal. One prompt covers
    // the whole sale so cashiers don't get nagged per bottle.
    const ageRestrictedProducts = cart
      .map((item) => item.product)
      .filter((p) => p && p.is_age_restricted);

    let ageVerification = null;
    if (ageRestrictedProducts.length > 0) {
      try {
        // We don't have the authenticated user's username on hand, so the
        // backend will fall back to request.user.username via AuditMixin;
        // we pass a hint in `age_verified_by` for the receipt/audit row.
        ageVerification = await requireAgeVerification({
          products: ageRestrictedProducts,
          cashierUsername: '', // filled server-side
        });
      } catch (_) {
        // Cashier cancelled / manager declined → abort the sale.
        return;
      }
    }

    // Split-tender validation. We must collect at least the grand total
    // across the legs before submitting; backend will reject otherwise. The
    // last leg can be cash with overage (change given), but at minimum the
    // sum needs to cover the bill so the cashier can't accidentally
    // undercharge by a few cents.
    let payments_data_payload = null;
    let effective_payment_method = paymentMethod;
    let effective_amount_tendered = parseFloat(amountTendered) || grandTotal;
    if (splitMode) {
      const cleanedLegs = splitPayments
        .map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          reference: (p.reference || '').trim(),
        }))
        .filter((p) => p.amount > 0 && p.method);
      if (cleanedLegs.length === 0) {
        alert('Add at least one payment leg with an amount greater than zero, or switch off split mode.');
        return;
      }
      const tenderedSum = cleanedLegs.reduce((s, p) => s + p.amount, 0);
      if (tenderedSum + 0.0001 < grandTotal) {
        alert(
          `Split payments total ${tenderedSum.toFixed(2)} but the sale is ${grandTotal.toFixed(2)}. Add the remaining ${(grandTotal - tenderedSum).toFixed(2)} before completing.`
        );
        return;
      }
      payments_data_payload = cleanedLegs.map((p) => {
        const leg = { method: p.method, amount: p.amount };
        if (p.reference) leg.reference = p.reference;
        return leg;
      });
      // Distinct methods → backend will auto-set 'mixed'. We pre-set it here
      // so optimistic receipt rendering shows the right label even before
      // the response lands.
      const distinctMethods = new Set(cleanedLegs.map((p) => p.method));
      effective_payment_method = distinctMethods.size > 1 ? 'mixed' : cleanedLegs[0].method;
      effective_amount_tendered = tenderedSum;
    }

    const saleData = {
      session: activeSessions[0].id,
      customer_name: loyaltyMember
        ? (loyaltyMember.customer_name || loyaltyMember.customer_phone || `Member #${loyaltyMember.id}`)
        : undefined,
      items_data: cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.name,
        qty: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total: parseFloat(item.unit_price) * item.quantity,
      })),
      subtotal: subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      payment_method: effective_payment_method,
      amount_tendered: effective_amount_tendered,
      change_given: Math.max(0, effective_amount_tendered - grandTotal),
    };
    if (payments_data_payload) {
      saleData.payments_data = payments_data_payload;
    }

    if (ageVerification && !ageVerification.skipped) {
      saleData.age_verified_by = ageVerification.verifiedBy || null;
      saleData.age_verified_method = ageVerification.method || null;
      // If manager approval was required, the approve endpoint already
      // recorded a signed audit row server-side. The token itself doesn't
      // need to be persisted on the sale — age_verified_method='manager'
      // plus the approval row is enough for audit.
    }

    createSaleMut.mutate(saleData);
  };

  const handleBarcodeSubmit = (e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      barcodeLookupMut.mutate(barcode);
    }
  };

  // Global hotkeys for cashier keyboards.
  //   F2  — prompt quantity for last item
  //   F3  — loyalty lookup
  //   F4  — toggle price check mode
  //   F6  — suspend sale
  //   F7  — remove last line
  //   F8  — reprint last receipt (manager)
  //   F9  — complete sale
  //   F10 — void cart (manager)
  //   F12 — focus barcode scanner
  //   ?   — show hotkey cheatsheet
  //   Esc — cancel price check / close drawers
  useEffect(() => {
    // Respect the manager's "Enable F-key hotkeys" POS setting — some
    // stores use keyboards for other reasons and don't want F-keys trapped.
    if (settings.enable_hotkeys === false) return undefined;
    const onKey = (e) => {
      // Let modals / text fields handle their own keys where reasonable
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      const inBarcode = e.target === barcodeInputRef.current;

      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length === 0) return;
        const last = cart[cart.length - 1];
        const raw = window.prompt(`Quantity for ${last.name}:`, String(last.quantity));
        if (raw == null) return;
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) updateCartQty(last.product_id, n);
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleLoyaltyLookup();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPriceCheckMode((v) => !v);
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleSuspendSale();
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (cart.length > 0) removeFromCart(cart[cart.length - 1].product_id);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleReprint();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCompleteSale();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleVoidCart();
      } else if (e.key === 'F12') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === '?' && !inField) {
        e.preventDefault();
        setShowHotkeys(true);
      } else if (e.key === 'Escape') {
        if (priceCheckMode) { setPriceCheckMode(false); setLastPriceCheck(null); }
        if (suspendDrawerOpen) setSuspendDrawerOpen(false);
        if (showHotkeys) setShowHotkeys(false);
      }
      // Suppress unused-var warning
      void inBarcode;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, priceCheckMode, suspendDrawerOpen, showHotkeys, discount, tax, loyaltyMember]);

  // Theme overrides — applied when the manager picks Dark or Pick n Pay.
  // Light theme is the default (keeps existing styles untouched).
  const themeBg = settings.theme === 'dark' ? '#0b1020'
                : settings.theme === 'pnp'  ? '#f1f5f9'
                : '#f9fafb';
  const themeCls = `pos-theme-${settings.theme}`;

  // Immersive themes (pnp + dark) DEFAULT to focus mode on, so the cashier
  // sees an edge-to-edge lane layout — but the user can toggle chrome back
  // via the floating POSImmersiveControls cluster in the top-right.
  const immersive = settings.theme === 'pnp' || settings.theme === 'dark';
  const [hasAutoFocused, setHasAutoFocused] = useState(false);

  useEffect(() => {
    if (immersive && !hasAutoFocused) {
      setFocusMode(true);
      setHasAutoFocused(true);
    }
    if (!immersive) setHasAutoFocused(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersive]);

  // ──────────────────────────────────────────────────────────────────
  // Pick n Pay / SAP CAR scanner-lane render branch.
  // Selected when the manager picks "Scanner lane" in POS Settings.
  // Reuses the same cart state and handlers as the default view.
  // ──────────────────────────────────────────────────────────────────
  if (settings.theme === 'pnp') {
    const laneLabel = sessions.find((s) => !s.closed_at)
      ? `Lane #${sessions.find((s) => !s.closed_at).id}`
      : 'No session';
    return (
      <div
        className={themeCls}
        data-pos-theme="pnp"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isLockOwner && activeSessionId && (
          <div style={{
            background: '#b91c1c', color: '#fff', padding: '10px 16px', textAlign: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            🔒 POS is already open in another tab on this register (session #{activeSessionId}).
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <ScannerLanePOS
            cart={cart}
            removeFromCart={removeFromCart}
            updateCartQty={updateCartQty}
            barcode={barcode}
            setBarcode={setBarcode}
            handleBarcodeSubmit={handleBarcodeSubmit}
            barcodeInputRef={barcodeInputRef}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            handleCompleteSale={handleCompleteSale}
            handleSuspendSale={handleSuspendSale}
            priceCheckMode={priceCheckMode}
            setPriceCheckMode={setPriceCheckMode}
            offline={offline}
            pendingCount={pendingCount}
            user={user}
            laneLabel={laneLabel}
            brandName={user?.tenant_name || 'Pewil'}
          />
        </div>

        <POSImmersiveControls
          variant="light"
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />

        {/* Receipt Modal — shared across all themes */}
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            barcodeInputRef.current?.focus();
          }}
          receipt={receipt}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Dark Supermarket (Toast × Lightspeed) render branch.
  // Selected when the manager picks "Dark supermarket" in POS Settings.
  // ──────────────────────────────────────────────────────────────────
  if (settings.theme === 'dark') {
    const laneLabel = sessions.find((s) => !s.closed_at)
      ? `Lane #${sessions.find((s) => !s.closed_at).id}`
      : 'No session';
    return (
      <div
        className={themeCls}
        data-pos-theme="dark"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: '#0b1020',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isLockOwner && activeSessionId && (
          <div style={{
            background: '#b91c1c', color: '#fff', padding: '10px 16px', textAlign: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            🔒 POS is already open in another tab on this register (session #{activeSessionId}).
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <DarkSupermarketPOS
            products={products}
            filteredProducts={filteredProducts}
            addToCart={addToCart}
            cart={cart}
            removeFromCart={removeFromCart}
            updateCartQty={updateCartQty}
            barcode={barcode}
            setBarcode={setBarcode}
            handleBarcodeSubmit={handleBarcodeSubmit}
            barcodeInputRef={barcodeInputRef}
            search={search}
            setSearch={setSearch}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            handleCompleteSale={handleCompleteSale}
            handleSuspendSale={handleSuspendSale}
            offline={offline}
            pendingCount={pendingCount}
            user={user}
            laneLabel={laneLabel}
            brandName={user?.tenant_name || 'Pewil'}
            lastReceiptId={lastReceiptId}
          />
        </div>

        <POSImmersiveControls
          variant="dark"
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />

        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            barcodeInputRef.current?.focus();
          }}
          receipt={receipt}
        />
      </div>
    );
  }

  return (
    <div
      className={themeCls}
      data-pos-theme={settings.theme}
      style={{ ...S.page, background: themeBg, height: focusMode ? '100vh' : 'calc(100vh - 110px)' }}
    >
      {!isLockOwner && activeSessionId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001,
          background: '#b91c1c', color: '#fff', padding: '10px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          🔒 POS is already open in another tab on this register (session #{activeSessionId}).
          This tab is read-only — close the other tab to take over.
        </div>
      )}
      {/* POS Control Bar — Focus mode + Fullscreen */}
      <div
        style={{
          position: focusMode ? 'fixed' : 'absolute',
          top: focusMode ? 8 : 8,
          right: 8,
          zIndex: 50,
          display: 'flex',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setFocusMode((v) => !v)}
          title={focusMode ? 'Exit focus mode (show app chrome)' : 'Focus mode — hide sidebar and topbar'}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: focusMode ? '#1a6b3a' : '#fff',
            color: focusMode ? '#fff' : '#111827',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {focusMode ? '✕ Exit Focus' : '◱ Focus Mode'}
        </button>
        <button type="button" onClick={() => setPriceCheckMode((v) => !v)}
          title="Price check mode (F4) — scan without adding to cart"
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                   background: priceCheckMode ? '#f59e0b' : '#fff',
                   color: priceCheckMode ? '#fff' : '#111827',
                   fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          🔍 Price Check
        </button>
        <button type="button" onClick={handleLoyaltyLookup}
          title="Loyalty lookup (F3)"
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                   background: loyaltyMember ? '#1a6b3a' : '#fff',
                   color: loyaltyMember ? '#fff' : '#111827',
                   fontSize: 11, fontWeight: 600, cursor: 'pointer', maxWidth: 200, overflow: 'hidden',
                   textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loyaltyMember
            ? `👤 ${loyaltyMember.customer_name || loyaltyMember.customer_phone || 'Member'} · ${loyaltyMember.points_balance ?? 0} pts`
            : '👤 Loyalty'}
        </button>
        <button type="button" onClick={() => setSuspendDrawerOpen(true)}
          title="Suspended sales"
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                   background: '#fff', color: '#111827', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          ⏸ Parked ({suspendedSales.length})
        </button>
        <button type="button" onClick={handleReprint}
          title="Reprint last receipt (F8) — manager approval required"
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                   background: '#fff', color: '#111827', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          🖨 Reprint
        </button>
        <button type="button" onClick={handleCashDrop}
          title="Cash drop / pay-out — manager approval required"
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fde68a',
                   background: '#fffbeb', color: '#92400e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          💵 Cash Drop
        </button>
        {(offline || pendingCount > 0) && (
          <div
            title={offline
              ? `Offline — ${pendingCount} sale${pendingCount === 1 ? '' : 's'} queued. Will sync on reconnect.`
              : `Syncing ${pendingCount} queued sale${pendingCount === 1 ? '' : 's'}…`}
            style={{ padding: '6px 12px', borderRadius: 8,
                     border: '1px solid ' + (offline ? '#fecaca' : '#fed7aa'),
                     background: offline ? '#fee2e2' : '#fff7ed',
                     color: offline ? '#b91c1c' : '#9a3412',
                     fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
            {offline ? '📵 Offline' : '🔄 Syncing'}
            {pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </div>
        )}
        <button type="button" onClick={() => setShowHotkeys(true)}
          title="Keyboard shortcuts"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db',
                   background: '#fff', color: '#111827', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          ?
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Go fullscreen'}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: isFullscreen ? '#1a6b3a' : '#fff',
            color: isFullscreen ? '#fff' : '#111827',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {isFullscreen ? '⤡ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>

      {/* LEFT PANEL: Products Grid */}
      <div style={S.left}>
        {/* Header with title and search bar */}
        <div style={S.leftHeader}>
          <h1 style={S.leftTitle}>Products</h1>
        </div>

        <div style={{ padding: '0 12px 8px 12px' }}>
          <input
            type="text"
            placeholder="Search or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={S.searchInput}
          />
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder={priceCheckMode ? '🔍 Scan for price (no add to cart)' : 'Scan barcode (auto-focus)'}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            style={{
              ...S.searchInput,
              marginTop: '4px',
              border: priceCheckMode ? '2px solid #f59e0b' : S.searchInput.border,
              background: priceCheckMode ? '#fffbeb' : '#fff',
            }}
          />
          {priceCheckMode && lastPriceCheck && (
            <div style={{ marginTop: 6, padding: 10, background: '#fffbeb',
                          border: '1px solid #fde68a', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                Price check
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {lastPriceCheck.name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a6b3a', marginTop: 2 }}>
                {fmt(lastPriceCheck.price, 'zwd')}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Stock: {lastPriceCheck.stock}</div>
            </div>
          )}
        </div>

        {/* Batch 3: Quick tiles for produce / unbarcoded items. */}
        {settings.show_quick_tiles && (
          <QuickTilesPanel products={products} onSelect={addToCart} />
        )}

        {/* Product Grid — hidden for scan-only lanes (manager setting). */}
        {settings.show_product_tiles && (
        <div style={S.productGrid}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isOutOfStock = product.quantity_in_stock === 0;
              return (
                <div
                  key={product.id}
                  style={{
                    ...S.productCard,
                    ...(isOutOfStock ? S.productCardDisabled : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isOutOfStock) {
                      Object.assign(e.currentTarget.style, S.productCardHover);
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <div style={S.productEmoji}>
                    {getCategoryEmoji(product.category)}
                  </div>
                  <div style={S.productName}>{product.name}</div>
                  <div style={S.productPrice}>{fmt(product.selling_price, 'zwd')}</div>
                  <div style={S.productStock}>
                    {product.quantity_in_stock} in stock
                  </div>
                  <button
                    onClick={() => !isOutOfStock && addToCart(product)}
                    style={{
                      ...S.addBtn,
                      opacity: isOutOfStock ? 0.5 : 1,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    }}
                    disabled={isOutOfStock}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) {
                        Object.assign(e.currentTarget.style, S.addBtnHover);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a6b3a';
                    }}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Add'}
                  </button>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
              No products available
            </div>
          )}
        </div>
        )}
        {/* Scan-only hint — shown when product tiles are hidden. */}
        {!settings.show_product_tiles && (
          <div style={{
            margin: '16px 0 0', padding: '18px 20px',
            background: settings.theme === 'dark' ? '#111a2e' : settings.theme === 'pnp' ? '#fff7ed' : '#f8fafc',
            border: settings.theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
            borderRadius: 10, textAlign: 'center',
            color: settings.theme === 'dark' ? '#94a3b8' : '#64748b',
            fontSize: 13, lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
            <b style={{ color: settings.theme === 'dark' ? '#e5e7eb' : '#0f172a', fontSize: 14 }}>Scan-only lane</b>
            <div style={{ marginTop: 4 }}>
              Product tiles are hidden. Scan a barcode, or use Quick Tiles / hotkeys to add items.
              The live receipt appears on the right as you scan.
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Current Sale / Cart */}
      <div style={S.right}>
        {/* Header */}
        <div style={S.rightHeader}>
          <h2 style={S.rightTitle}>Current Sale</h2>
        </div>

        {/* Cart Content */}
        <div style={S.cartContainer}>
          {cart.length > 0 ? (
            <>
              {/* Cart Items List */}
              <div style={S.cartItems}>
                {cart.map((item) => (
                  <div key={item.product_id} style={S.cartItem}>
                    <div style={S.cartItemLeft}>
                      <div style={S.cartItemName}>{item.name}</div>
                      <div style={S.cartItemPrice}>
                        {fmt(item.unit_price, 'zwd')} each
                      </div>
                    </div>
                    <div style={S.cartItemRight}>
                      <div style={S.cartItemTotal}>
                        {fmt(item.unit_price * item.quantity, 'zwd')}
                      </div>
                      <div style={S.qtyControl}>
                        <button
                          onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                          style={S.qtyBtn}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        >
                          −
                        </button>
                        <span style={{ width: 20, textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                          style={S.qtyBtn}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#e5e7eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          style={{
                            ...S.qtyBtn,
                            background: '#fee2e2',
                            color: '#c0392b',
                            fontSize: '12px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div style={S.totalRow}>
                <span style={S.totalLabel}>Total</span>
                <span style={S.totalAmount}>{fmt(grandTotal, 'zwd')}</span>
              </div>

              {/* Payment Method Buttons */}
              <div style={S.paymentBtns}>
                <button
                  onClick={() => { setSplitMode(false); setPaymentMethod('cash'); }}
                  style={{
                    ...S.paymentBtn,
                    ...(!splitMode && paymentMethod === 'cash' ? S.paymentBtnActive : {}),
                  }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => { setSplitMode(false); setPaymentMethod('mobile_money'); }}
                  style={{
                    ...S.paymentBtn,
                    ...(!splitMode && paymentMethod === 'mobile_money' ? S.paymentBtnActive : {}),
                  }}
                >
                  📱 EcoCash
                </button>
                <button
                  onClick={() => { setSplitMode(false); setPaymentMethod('card'); }}
                  style={{
                    ...S.paymentBtn,
                    ...(!splitMode && paymentMethod === 'card' ? S.paymentBtnActive : {}),
                  }}
                >
                  💳 Card
                </button>
                <button
                  onClick={() => setSplitMode((v) => !v)}
                  title="Split payment across multiple methods (e.g. cash + EcoCash)"
                  style={{
                    ...S.paymentBtn,
                    ...(splitMode ? S.paymentBtnActive : {}),
                  }}
                >
                  🔀 Split
                </button>
              </div>

              {/* Split-tender editor — only visible when Split mode is on. */}
              {splitMode ? (
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>Payment Legs</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSplitPayments((legs) => [
                          ...legs,
                          { method: 'cash', amount: '', reference: '' },
                        ])
                      }
                      style={{
                        padding: '2px 8px',
                        background: '#fff',
                        border: '1px dashed #1a6b3a',
                        color: '#1a6b3a',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Add leg
                    </button>
                  </div>
                  {splitPayments.map((leg, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', gap: 6, marginBottom: 6 }}
                    >
                      <select
                        value={leg.method}
                        onChange={(e) =>
                          setSplitPayments((legs) =>
                            legs.map((l, i) =>
                              i === idx ? { ...l, method: e.target.value } : l
                            )
                          )
                        }
                        style={{
                          flex: '1 1 110px',
                          padding: '6px 4px',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          fontSize: 12,
                          background: '#fff',
                        }}
                      >
                        <option value="cash">Cash</option>
                        <option value="mobile_money">EcoCash / Mobile</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={leg.amount}
                        onChange={(e) =>
                          setSplitPayments((legs) =>
                            legs.map((l, i) =>
                              i === idx ? { ...l, amount: e.target.value } : l
                            )
                          )
                        }
                        style={{
                          flex: '1 1 90px',
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSplitPayments((legs) =>
                            legs.length > 1
                              ? legs.filter((_, i) => i !== idx)
                              : legs
                          )
                        }
                        title={
                          splitPayments.length > 1
                            ? 'Remove this leg'
                            : 'Need at least one leg'
                        }
                        disabled={splitPayments.length <= 1}
                        style={{
                          padding: '0 8px',
                          background: '#fff',
                          border: '1px solid #fecaca',
                          color:
                            splitPayments.length <= 1 ? '#fca5a5' : '#dc2626',
                          borderRadius: 6,
                          fontSize: 14,
                          cursor:
                            splitPayments.length <= 1
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Live tender vs total tracker */}
                  {(() => {
                    const tendered = splitPayments.reduce(
                      (s, p) => s + (parseFloat(p.amount) || 0),
                      0
                    );
                    const remaining = grandTotal - tendered;
                    const over = tendered - grandTotal;
                    return (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '6px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            remaining > 0
                              ? '#fef3c7'
                              : over > 0
                              ? '#dbeafe'
                              : '#dcfce7',
                          color:
                            remaining > 0
                              ? '#92400e'
                              : over > 0
                              ? '#1e40af'
                              : '#166534',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Tendered: {fmt(tendered, 'zwd')}</span>
                        <span>
                          {remaining > 0
                            ? `Need ${fmt(remaining, 'zwd')}`
                            : over > 0
                            ? `Change ${fmt(over, 'zwd')}`
                            : 'Exact'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Amount Tendered (single-method mode only) */
                <div style={S.section}>
                  <div style={S.sectionLabel}>Amount Tendered</div>
                  <input
                    type="number"
                    placeholder="0"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    style={S.input}
                  />
                  {change > 0 && (
                    <div style={S.changeDisplay}>
                      Change: {fmt(change, 'zwd')}
                    </div>
                  )}
                </div>
              )}

              {/* Discount — reason required, manager-gated */}
              <div style={S.section}>
                <div style={S.sectionLabel}>Discount</div>
                {discountAmount > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 10px', background: '#fffbeb',
                                border: '1px solid #fde68a', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        − {fmt(discountAmount, 'zwd')}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {discountReason || 'manual'}{discountNotes ? ` · ${discountNotes}` : ''}
                      </div>
                    </div>
                    <button type="button" onClick={clearDiscount}
                      style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e5e7eb',
                               borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={openDiscountDialog}
                    style={{ width: '100%', padding: '10px', background: '#fff',
                             border: '1px dashed #d1d5db', borderRadius: 8, color: '#4b5563',
                             fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    + Add discount (manager)
                  </button>
                )}
              </div>

              {/* Tax */}
              <div style={S.section}>
                <div style={S.sectionLabel}>Tax</div>
                <input
                  type="number"
                  placeholder="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  style={S.input}
                />
              </div>

              {/* Suspend sale */}
              <button
                onClick={handleSuspendSale}
                style={{
                  width: '100%', padding: '10px', marginBottom: '8px',
                  background: '#fff', color: '#1f2937',
                  border: '1px solid #e5e7eb', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
                title="Park this sale (F6) — come back to it later"
              >
                ⏸ Suspend Sale
              </button>

              {/* Void Cart (manager approval) */}
              <button
                onClick={handleVoidCart}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '8px',
                  background: '#fff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
                title="Requires manager approval"
              >
                ✕ Void Sale (Manager)
              </button>

              {/* Complete Sale Button */}
              <button
                onClick={handleCompleteSale}
                disabled={createSaleMut.isPending}
                style={{
                  ...S.completeSaleBtn,
                  opacity: createSaleMut.isPending ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!createSaleMut.isPending) {
                    Object.assign(e.currentTarget.style, S.completeSaleBtnHover);
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a6b3a';
                }}
              >
                {createSaleMut.isPending ? 'Processing...' : 'Complete Sale'}
              </button>
            </>
          ) : (
            <div style={S.emptyCart}>
              <div style={S.emptyCartIcon}>🛒</div>
              <p style={{ margin: 0 }}>Cart is empty</p>
              <p style={{ margin: 0, fontSize: '10px' }}>
                Add items from products
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Suspended sales drawer */}
      {suspendDrawerOpen && (
        <div onClick={() => setSuspendDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
                   zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, width: '92%', maxWidth: 520,
                     maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                     boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Parked
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Suspended sales ({suspendedSales.length})</div>
              </div>
              <button onClick={() => setSuspendDrawerOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: 16 }}>
              {suspendedSales.length === 0 ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: 30, fontSize: 13 }}>
                  No parked sales.
                </div>
              ) : suspendedSales.map((s) => (
                <div key={s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8,
                           padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb',
                           borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {new Date(s.ts).toLocaleTimeString()}
                    </div>
                  </div>
                  <button onClick={() => handleResumeSale(s)}
                    style={{ padding: '6px 12px', background: '#1a6b3a', color: '#fff',
                             border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Resume
                  </button>
                  <button onClick={() => handleDeleteSuspended(s)}
                    style={{ padding: '6px 10px', background: '#fff', color: '#dc2626',
                             border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hotkey cheatsheet */}
      {showHotkeys && (
        <div onClick={() => setShowHotkeys(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
                   zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, width: '92%', maxWidth: 460,
                     padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Keyboard shortcuts</div>
            {[
              ['F2', 'Change quantity of last item'],
              ['F3', 'Loyalty lookup'],
              ['F4', 'Toggle price check mode'],
              ['F6', 'Suspend current sale'],
              ['F7', 'Remove last line'],
              ['F8', 'Reprint last receipt (manager)'],
              ['F9', 'Complete sale'],
              ['F10', 'Void sale (manager)'],
              ['F12', 'Focus barcode scanner'],
              ['Esc', 'Close modals / exit price check'],
            ].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                                     padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <div style={{ color: '#374151' }}>{label}</div>
                <div style={{ fontFamily: 'monospace', background: '#f3f4f6',
                               padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                  {k}
                </div>
              </div>
            ))}
            <button onClick={() => setShowHotkeys(false)}
              style={{ marginTop: 16, width: '100%', padding: 10, background: '#1a6b3a',
                       color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          // Note: do NOT wipe `receipt` here — we need it for F8 reprint.
          barcodeInputRef.current?.focus();
        }}
        receipt={receipt}
      />
    </div>
  );
}
