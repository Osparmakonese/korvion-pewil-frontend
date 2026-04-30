/**
 * MobileSaleComplete.js — Frame 5 of the locked mobile design.
 *
 * Renders fullscreen on phones (≤500px) instead of the centered
 * ReceiptModal. Same data shape: takes a `receipt` object and an
 * `onClose` callback. Print is wired to the same window.print()
 * pattern the desktop modal uses, so cashier print-flow is intact.
 *
 * See mobile-mockups/PEWIL_MOBILE_PREVIEW_2026-04-26.html Frame 5
 * for the visual reference.
 */
import React from 'react';
import { fmt } from '../utils/format';

const T = {
  cream:   '#ffffff',
  cream2:  '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange2: '#e09a2b',
};

export default function MobileSaleComplete({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const total = parseFloat(receipt.total) || 0;
  const tendered = parseFloat(receipt.amount_tendered) || total;
  const change = Math.max(0, tendered - total);
  const isMixed = receipt.payment_method === 'mixed';
  const breakdown = Array.isArray(receipt.payments_data) ? receipt.payments_data : [];

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) return;
    const items = receipt.items_data || [];
    const rows = items.map((i) =>
      `<tr><td style="padding:4px 0;font-size:11px">${i.product_name || 'Item'} x${i.qty || 0}</td><td style="text-align:right;padding:4px 0;font-size:11px">$${(i.total || 0).toFixed(2)}</td></tr>`
    ).join('');
    const breakdownRows = isMixed && breakdown.length > 0
      ? '<table style="width:100%;font-size:10px;color:#666;margin-top:-6px">' +
          breakdown.map((leg) =>
            `<tr><td style="padding:1px 0">&nbsp;&nbsp;${leg.method === 'mobile_money' ? 'EcoCash' : (leg.method || '')}${leg.reference ? ' · ' + leg.reference : ''}</td><td style="text-align:right;padding:1px 0">$${(parseFloat(leg.amount) || 0).toFixed(2)}</td></tr>`
          ).join('') +
        '</table>'
      : '';
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
        <tr style="font-weight:bold;font-size:14px"><td>TOTAL</td><td style="text-align:right">$${total.toFixed(2)}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #ccc"/>
      <p style="text-align:center;font-size:10px;color:#666">Payment: ${
        receipt.payment_method === 'mobile_money' ? 'Mobile Money'
        : receipt.payment_method === 'mixed' ? 'Split'
        : receipt.payment_method
      }</p>
      ${breakdownRows}
      <p style="text-align:center;font-size:10px;color:#666">Thank you for shopping with us!</p>
    </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    try { return new Date(dt).toLocaleString(); } catch (_) { return ''; }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: `linear-gradient(180deg, ${T.cream}, #f4ead2)`,
        display: 'flex', flexDirection: 'column',
        padding: '24px 24px calc(28px + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: T.ink,
        WebkitFontSmoothing: 'antialiased',
        overflowY: 'auto',
      }}
    >
      {/* Confirmation hero */}
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: T.green, color: '#fff',
          margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44,
          boxShadow: '0 12px 30px rgba(26,107,58,0.30)',
        }}>✓</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 32, fontWeight: 700, margin: '0 0 6px',
        }}>Sale complete</h1>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 22 }}>
          Receipt #{receipt.receipt_number || '—'}
          {receipt.created_at ? ` · ${formatDate(receipt.created_at)}` : ''}
        </div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 56, fontWeight: 700, lineHeight: 1, color: T.ink,
        }}>
          {fmt(total, 'zwd')}
        </div>
        {change > 0 && (
          <div style={{ marginTop: 8, color: T.green2, fontWeight: 700, fontSize: 14 }}>
            Change: {fmt(change, 'zwd')}
          </div>
        )}
        {isMixed && (
          <div style={{ marginTop: 8, color: T.green2, fontWeight: 700, fontSize: 14 }}>
            Split payment · {breakdown.length} legs
          </div>
        )}
      </div>

      {/* Breakdown panel — only when split, otherwise show single-method line */}
      <div style={{
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        padding: 14,
        margin: '22px 0',
      }}>
        <div style={{
          fontSize: 11, color: T.muted, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>Payment</div>
        {isMixed && breakdown.length > 0 ? (
          breakdown.map((leg, idx) => (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 0', fontSize: 13, color: T.inkSoft,
            }}>
              <span style={{ textTransform: 'capitalize' }}>
                {leg.method === 'mobile_money' ? '📱 EcoCash' :
                 leg.method === 'cash'         ? '💵 Cash'    :
                 leg.method === 'card'         ? '💳 Card'    :
                 leg.method === 'bank_transfer'? '🏦 Bank Transfer' : leg.method}
                {leg.reference ? ` · ${leg.reference}` : ''}
              </span>
              <strong style={{ color: T.ink, fontWeight: 700 }}>
                {fmt(parseFloat(leg.amount) || 0, 'zwd')}
              </strong>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.inkSoft }}>
            <span>{
              receipt.payment_method === 'mobile_money' ? '📱 EcoCash' :
              receipt.payment_method === 'cash'         ? '💵 Cash'    :
              receipt.payment_method === 'card'         ? '💳 Card'    :
              (receipt.payment_method || '—')
            }</span>
            <strong style={{ color: T.ink, fontWeight: 700 }}>
              {fmt(total, 'zwd')}
            </strong>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Action row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={handlePrint}
          style={{
            flex: 1, padding: 14, borderRadius: 14, border: `1px solid ${T.line}`,
            background: '#fff', color: T.ink, fontWeight: 800, fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, padding: 14, borderRadius: 14, border: 'none',
            background: T.ink, color: T.cream, fontWeight: 800, fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          New sale
        </button>
      </div>
    </div>
  );
}
