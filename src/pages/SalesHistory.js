import React, { useState, useMemo } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query';
import { getSales, exportSalesExcel } from '../api/retailApi';
import { fmt } from '../utils/format';
import MobileSalesHistory from '../components/MobileSalesHistory';
import ReceiptDetailModal from '../components/ReceiptDetailModal';

/* --- Styles --- */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", margin: 0 },
  controls: { display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 20 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' },
  summaryLabel: { fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  summaryValue: { fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 20, fontWeight: 700, color: '#1a6b3a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  badge: (color) => ({
    display: 'inline-block', fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase',
    background: color === 'green' ? '#e8f5ee' : color === 'amber' ? '#fef3e2' : '#eff6ff',
    color: color === 'green' ? '#1a6b3a' : color === 'amber' ? '#92400e' : '#1e40af',
  }),
  viewBtn: { background: 'none', border: '1px solid #e3e8e4', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#1a6b3a', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9ca3af' },
};

export default function SalesHistory() {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportSalesExcel(dateFilter ? { start: dateFilter, end: dateFilter } : {});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_export_${(dateFilter || new Date().toISOString().slice(0, 10))}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not export — please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Mobile breakpoint — keep all hooks ABOVE the early return.
  const isMobile = useIsMobile();

  // Ask the SERVER for the window, rather than pulling every sale ever made
  // and filtering in the browser. Picking a date now fetches that day
  // specifically, so history older than the default window is still
  // reachable — it just is not all downloaded on every page load.
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['retail-sales-history', dateFilter || 'recent'],
    queryFn: () => getSales(
      dateFilter
        ? { start: dateFilter, end: dateFilter, limit: 5000 }
        : { days: 60, limit: 1000 }
    ),
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const matchSearch = !search || (s.receipt_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
      const matchPayment = !paymentFilter || s.payment_method === paymentFilter;
      // The date is applied server-side now; this stays as a belt-and-braces
      // filter for the moment a previous window's rows are still on screen
      // while the new one loads.
      const stamp = s.sold_at || s.created_at;
      const matchDate = !dateFilter || (stamp && String(stamp).startsWith(dateFilter));
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
      <div style={{ ...S.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={S.title}>{'\u{1F4CB}'} Sales History</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          title={dateFilter ? `Export ${dateFilter} to Excel` : 'Export everything sold to Excel'}
          style={{
            padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.6 : 1,
          }}
        >
          {exporting ? 'Preparing…' : `⬇ Export to Excel${dateFilter ? ' (this day)' : ''}`}
        </button>
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
          <div style={{ overflowX: 'auto' }}><table style={S.table}>
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
          </table></div>
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
