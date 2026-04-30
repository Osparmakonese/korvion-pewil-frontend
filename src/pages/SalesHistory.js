import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSales } from '../api/retailApi';
import { fmt } from '../utils/format';
import MobileSalesHistory from '../components/MobileSalesHistory';

/* --- Receipt Detail Modal --- */
function ReceiptDetailModal({ isOpen, onClose, sale }) {
  if (!isOpen || !sale) return null;
  const items = sale.items_data || [];

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=400,height=600');
    const rows = items.map(i =>
      `<tr><td style="padding:4px 0;font-size:11px">${i.product_name || 'Item'} x${i.qty || 0}</td><td style="text-align:right;padding:4px 0;font-size:11px">$${(i.total || 0).toFixed(2)}</td></tr>`
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            Receipt #{sale.receipt_number}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
          {sale.created_at ? new Date(sale.created_at).toLocaleString() : ''}
          {sale.customer_name ? ` \u2022 ${sale.customer_name}` : ''}
        </div>

        {/* Items */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Items</div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: idx < items.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#1a6b3a', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
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
          <button onClick={handlePrint} style={{ flex: 1, padding: 10, background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {'\u{1F5A8}'} Print
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Styles --- */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  controls: { display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 20 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  summaryLabel: { fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  summaryValue: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1a6b3a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  badge: (color) => ({
    display: 'inline-block', fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase',
    background: color === 'green' ? '#e8f5ee' : color === 'amber' ? '#fef3e2' : '#eff6ff',
    color: color === 'green' ? '#1a6b3a' : color === 'amber' ? '#92400e' : '#1e40af',
  }),
  viewBtn: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#1a6b3a', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9ca3af' },
};

export default function SalesHistory() {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  // Mobile breakpoint — keep all hooks ABOVE the early return.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 500
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['retail-sales-history'],
    queryFn: getSales,
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const matchSearch = !search || (s.receipt_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
      const matchPayment = !paymentFilter || s.payment_method === paymentFilter;
      const matchDate = !dateFilter || (s.created_at && s.created_at.startsWith(dateFilter));
      return matchSearch && matchPayment && matchDate;
    });
  }, [sales, search, paymentFilter, dateFilter]);

  const totalRevenue = filtered.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
  const totalDiscount = filtered.reduce((sum, s) => sum + parseFloat(s.discount || 0), 0);
  const totalTax = filtered.reduce((sum, s) => sum + parseFloat(s.tax || 0), 0);

  // Mobile branch — every hook above runs unconditionally; this early-return
  // is safe because no hooks live below it.
  if (isMobile) return <MobileSalesHistory />;

  const paymentLabel = (method) => {
    if (method === 'cash') return 'Cash';
    if (method === 'card') return 'Card';
    if (method === 'mobile_money') return 'Mobile';
    if (method === 'mixed') return 'Mixed';
    return method;
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>{'\u{1F4CB}'} Sales History</h1>
      </div>

      {/* Summary Cards */}
      <div style={S.summaryGrid}>
        <div style={S.summaryCard}>
          <div style={S.summaryLabel}>{'\u{1F4B0}'} Total Revenue</div>
          <div style={S.summaryValue}>{fmt(totalRevenue, 'zwd')}</div>
        </div>
        <div style={S.summaryCard}>
          <div style={S.summaryLabel}>{'\u{1F4E6}'} Transactions</div>
          <div style={S.summaryValue}>{filtered.length}</div>
        </div>
        <div style={S.summaryCard}>
          <div style={S.summaryLabel}>{'\u{1F3F7}'} Discounts Given</div>
          <div style={{ ...S.summaryValue, color: '#c97d1a' }}>{fmt(totalDiscount, 'zwd')}</div>
        </div>
        <div style={S.summaryCard}>
          <div style={S.summaryLabel}>{'\u{1F4CA}'} Tax Collected</div>
          <div style={{ ...S.summaryValue, color: '#374151' }}>{fmt(totalTax, 'zwd')}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={S.controls}>
        <input type="text" placeholder="Search by receipt # or customer..." value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={S.select}>
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="mixed">Mixed</option>
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={S.input} />
      </div>

      {/* Sales Table */}
      <div style={S.card}>
        {isLoading ? (
          <div style={S.emptyState}>Loading sales...</div>
        ) : filtered.length > 0 ? (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Receipt #</th>
                <th style={S.th}>Date</th>
                <th style={S.th}>Items</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Payment</th>
                <th style={S.th}>Customer</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id}>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600 }}>{sale.receipt_number}</td>
                  <td style={S.td}>{sale.created_at ? new Date(sale.created_at).toLocaleString() : ''}</td>
                  <td style={S.td}>{(sale.items_data || []).length}</td>
                  <td style={S.td}><strong style={{ color: '#1a6b3a' }}>{fmt(sale.total, 'zwd')}</strong></td>
                  <td style={S.td}>
                    <span style={S.badge(sale.payment_method === 'cash' ? 'green' : sale.payment_method === 'card' ? 'amber' : 'blue')}>
                      {paymentLabel(sale.payment_method)}
                    </span>
                  </td>
                  <td style={S.td}>{sale.customer_name || '\u2014'}</td>
                  <td style={S.td}>
                    <button onClick={() => setSelectedSale(sale)} style={S.viewBtn}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={S.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>{'\u{1F4CB}'}</div>
            <p>No sales found</p>
            <p style={{ fontSize: 11, marginTop: 6 }}>Sales will appear here after completing transactions in POS</p>
          </div>
        )}
      </div>

      <ReceiptDetailModal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} sale={selectedSale} />
    </div>
  );
}
