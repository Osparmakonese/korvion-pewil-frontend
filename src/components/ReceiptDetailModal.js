import React from 'react';
import { fmt } from '../utils/format';

// Lifted out of SalesHistory 2026-08-24 so the dashboard can open a receipt
// too. The dashboard's Recent Transactions rows had no click handler at all —
// there was simply no way to open a receipt from that screen, which is what
// "you can't even open the receipt" meant.
//
// `sale` must be a FULL sale row (it reads items_data, subtotal, tax). The
// dashboard's activity payload is a summary, so that screen fetches the sale
// by id before opening this.

export default function ReceiptDetailModal({ isOpen, onClose, sale }) {
  if (!isOpen || !sale) return null;
  const items = sale.items_data || [];

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=400,height=600');
    const rows = items.map(i =>
      // Line totals are serializer decimals, i.e. strings — the sibling
      // subtotal/tax lines below already use parseFloat for this reason.
      // Without it, reprinting a receipt throws "toFixed is not a function".
      `<tr><td style="padding:4px 0;font-size:11px">${i.product_name || 'Item'} x${i.qty || 0}</td><td style="text-align:right;padding:4px 0;font-size:11px">$${(Number(i.total) || 0).toFixed(2)}</td></tr>`
    ).join('');
    printWin.document.write(`<html><head><title>Receipt</title></head><body style="font-family:monospace;max-width:300px;margin:0 auto;padding:20px">
      <h2 style="text-align:center;margin:0 0 4px">PEWIL</h2>
      <p style="text-align:center;font-size:10px;color:#666;margin:0 0 16px">Receipt #${sale.receipt_number}</p>
      <hr style="border:none;border-top:1px dashed #ccc"/>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <hr style="border:none;border-top:1px dashed #ccc"/>
      <table style="width:100%;font-size:11px">
        <tr><td>Subtotal</td><td style="text-align:right">$${parseFloat(sale.subtotal || 0).toFixed(2)}</td></tr>
        ${sale.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-$${parseFloat(sale.discount).toFixed(2)}</td></tr>` : ''}
        <tr><td>Tax</td><td style="text-align:right">$${parseFloat(sale.tax || 0).toFixed(2)}</td></tr>
        <tr style="font-weight:bold;font-size:14px"><td>TOTAL</td><td style="text-align:right">$${parseFloat(sale.total || 0).toFixed(2)}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #ccc"/>
      <p style="text-align:center;font-size:10px;color:#666">Payment: ${sale.payment_method === 'mobile_money' ? 'Mobile Money' : sale.payment_method}</p>
      <p style="text-align:center;font-size:10px;color:#666">Thank you for shopping with us!</p>
    </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: '#111827' }}>
            Receipt #{sale.receipt_number}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
          {sale.created_at ? new Date(sale.created_at).toLocaleString() : ''}
          {sale.customer_name ? ` \u2022 ${sale.customer_name}` : ''}
        </div>

        {/* Items */}
        <div style={{ background: '#f6f8f6', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Items</div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: idx < items.length - 1 ? '1px solid #e3e8e4' : 'none' }}>
              <span>{item.product_name || 'Item'} {'\u00D7'} {item.qty || 0}</span>
              <strong>{fmt(item.total || 0, 'zwd')}</strong>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#374151' }}>
            <span>Subtotal</span><strong>{fmt(sale.subtotal, 'zwd')}</strong>
          </div>
          {parseFloat(sale.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#c0392b' }}>
              <span>Discount</span><strong>-{fmt(sale.discount, 'zwd')}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#374151' }}>
            <span>Tax</span><strong>{fmt(sale.tax, 'zwd')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#1a6b3a', paddingTop: 8, borderTop: '1px solid #e3e8e4' }}>
            <span>Total</span><strong>{fmt(sale.total, 'zwd')}</strong>
          </div>
        </div>

        {/* Payment info */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
          <span>Payment: <strong style={{ color: '#111827', textTransform: 'capitalize' }}>{sale.payment_method === 'mobile_money' ? 'Mobile Money' : sale.payment_method}</strong></span>
          {sale.amount_tendered && parseFloat(sale.amount_tendered) > parseFloat(sale.total) && (
            <span>Change: <strong style={{ color: '#1a6b3a' }}>{fmt(parseFloat(sale.amount_tendered) - parseFloat(sale.total), 'zwd')}</strong></span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ flex: 1, padding: 10, background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {'\u{1F5A8}'} Print
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
