import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getEndOfDayReport, exportSalesExcel } from '../api/retailApi';
import AIInsightCard from '../components/AIInsightCard';
import MobileEndOfDay from '../components/MobileEndOfDay';

/* ─── Styles ─── */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '20px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    background: '#1a6b3a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dateInput: {
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: 11,
  },
  heroBar: {
    background: 'linear-gradient(135deg, #1a6b3a, #2d9e58)',
    borderRadius: 14,
    padding: '20px 24px',
    color: '#fff',
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 12px 0',
  },
  heroStats: {
    display: 'flex',
    gap: 24,
    fontSize: 11,
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
  },
  heroStatLabel: {
    fontSize: 10,
    opacity: 0.85,
  },
  heroStatValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 14,
    fontWeight: 700,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
  },
  greenValue: {
    color: '#1a6b3a',
  },
  redValue: {
    color: '#c0392b',
  },
  amberValue: {
    color: '#c97d1a',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
    marginTop: 0,
    marginBottom: 16,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#111827',
  },
  paymentMethodAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
  },
  paymentMethodPercent: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    background: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: (percent, color) => ({
    height: '100%',
    width: `${percent}%`,
    background: color,
    borderRadius: 3,
  }),
  cashDrawerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid #f3f4f6',
  },
  cashDrawerLabel: {
    color: '#6b7280',
  },
  cashDrawerValue: {
    fontWeight: 600,
    color: '#111827',
  },
  varianceNegative: {
    color: '#c0392b',
  },
  variancePositive: {
    color: '#1a6b3a',
  },
  varianceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: '1px solid #f3f4f6',
    fontWeight: 700,
  },
  pill: (bgColor, textColor) => ({
    display: 'inline-block',
    fontSize: 8,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 20,
    textTransform: 'uppercase',
    background: bgColor,
    color: textColor,
  }),
  hourlyChart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 4,
    paddingBottom: 12,
    position: 'relative',
  },
  hourlyBar: (height) => ({
    flex: 1,
    height: `${height}px`,
    background: height > 0 ? 'linear-gradient(180deg, #2563eb, #1e3a5f)' : '#e5e7eb',
    borderRadius: '2px 2px 0 0',
    minHeight: 2,
  }),
  peakInfo: {
    fontSize: 11,
    color: '#374151',
    marginTop: 12,
    fontWeight: 600,
  },
};

export default function EndOfDayReport({ onTabChange }) {
  useAuth();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Mobile breakpoint — keep all hooks ABOVE the early return below.
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

  // Fetch end of day report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['retail-end-of-day', reportDate],
    queryFn: () => getEndOfDayReport(reportDate),
    staleTime: 30000,
  });

  if (isMobile) return <MobileEndOfDay />;

  // Default data structure if not loaded
  const data = reportData || {
    summary: {
      gross_sales: 0,
      returns_refunds: 0,
      discounts_given: 0,
      net_revenue: 0,
      transaction_count: 0,
      avg_transaction: 0,
      returns_count: 0,
    },
    payment_breakdown: [],
    cash_drawer: {
      opening_float: 0,
      cash_sales: 0,
      cash_returns: 0,
      expected_in_drawer: 0,
    },
    hourly_trend: [],
  };

  // Build payment methods from breakdown
  const paymentMethods = data.payment_breakdown || [];

  // Build hourly sales array (24 hours)
  const hourlySales = Array(24).fill(0);
  if (data.hourly_trend) {
    data.hourly_trend.forEach((item) => {
      hourlySales[item.hour] = item.total;
    });
  }

  const maxHourly = Math.max(...hourlySales, 1);

  const handleExport = async () => {
    try {
      const blob = await exportSalesExcel({ start: reportDate, end: reportDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sales_export_${reportDate}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert('Could not export — please try again.'); }
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.headerTitle}>End of Day Report</h1>
        <div style={S.headerRight}>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => {
              setReportDate(e.target.value);
              refetch();
            }}
            style={S.dateInput}
          />
          <button style={S.button} onClick={() => refetch()}>Generate Report</button>
          <button style={{ ...S.button, background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a' }} onClick={handleExport}>⬇ Export to Excel</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ ...S.card, textAlign: 'center', color: '#6b7280', padding: 40 }}>
          Loading report...
        </div>
      ) : (
        <>
          {/* Green Hero Bar */}
          <div style={S.heroBar}>
            <div style={S.heroTitle}>Daily Summary — {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={S.heroStats}>
              <div style={S.heroStat}>
                <div style={S.heroStatLabel}>Total Sales</div>
                <div style={S.heroStatValue}>${data.summary.gross_sales.toFixed(2)}</div>
              </div>
              <div style={S.heroStat}>
                <div style={S.heroStatLabel}>Transactions</div>
                <div style={S.heroStatValue}>{data.summary.transaction_count}</div>
              </div>
              <div style={S.heroStat}>
                <div style={S.heroStatLabel}>Avg. Transaction</div>
                <div style={S.heroStatValue}>${data.summary.avg_transaction.toFixed(2)}</div>
              </div>
              <div style={S.heroStat}>
                <div style={S.heroStatLabel}>Returns</div>
                <div style={S.heroStatValue}>{data.summary.returns_count}</div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div style={S.metricsGrid}>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Gross Sales</div>
              <div style={{ ...S.metricValue, ...S.greenValue }}>
                ${data.summary.gross_sales.toFixed(2)}
              </div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Returns/Refunds</div>
              <div style={{ ...S.metricValue, ...S.redValue }}>
                -${data.summary.returns_refunds.toFixed(2)}
              </div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Discounts Given</div>
              <div style={{ ...S.metricValue, ...S.amberValue }}>
                -${data.summary.discounts_given.toFixed(2)}
              </div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Net Revenue</div>
              <div style={{ ...S.metricValue, ...S.greenValue }}>
                ${data.summary.net_revenue.toFixed(2)}
              </div>
            </div>
          </div>
        </>
      )}

      {!isLoading && (
        <>
          {/* Two-column Layout */}
          <div style={S.twoCol}>
            {/* Payment Method Breakdown */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Payment Method Breakdown</h3>
              {paymentMethods && paymentMethods.length > 0 ? (
                paymentMethods.map((method, idx) => {
                  const colors = ['#1a6b3a', '#2563eb', '#7c3aed', '#9ca3af'];
                  const totalAmount = paymentMethods.reduce((sum, m) => sum + (m.total || 0), 0);
                  const percent = totalAmount > 0 ? ((method.total || 0) / totalAmount) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div style={S.paymentMethodRow}>
                        <span style={S.paymentMethodLabel}>{method.method}</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={S.paymentMethodAmount}>
                            ${(method.total || 0).toFixed(2)}
                          </span>
                          <span style={S.paymentMethodPercent}>({Math.round(percent)}%)</span>
                        </div>
                      </div>
                      <div style={S.progressBar}>
                        <div style={S.progressFill(percent, colors[idx % colors.length])} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#6b7280', fontSize: 11 }}>No payment data available</div>
              )}
            </div>

            {/* Cash Drawer Reconciliation */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Cash Drawer</h3>
              <div style={S.cashDrawerRow}>
                <span style={S.cashDrawerLabel}>Opening Float</span>
                <span style={S.cashDrawerValue}>${data.cash_drawer.opening_float.toFixed(2)}</span>
              </div>
              <div style={S.cashDrawerRow}>
                <span style={S.cashDrawerLabel}>+ Cash Sales</span>
                <span style={S.cashDrawerValue}>${data.cash_drawer.cash_sales.toFixed(2)}</span>
              </div>
              <div style={S.cashDrawerRow}>
                <span style={S.cashDrawerLabel}>- Cash Returns</span>
                <span style={S.cashDrawerValue}>-${data.cash_drawer.cash_returns.toFixed(2)}</span>
              </div>
              <div style={S.varianceRow}>
                <span>= Expected</span>
                <span>${data.cash_drawer.expected_in_drawer.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={S.pill('#e8f5ee', '#1a6b3a')}>Balanced</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!isLoading && (
        <>
          {/* Hourly Sales Breakdown */}
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Hourly Sales Breakdown</h3>
            <div style={S.hourlyChart}>
              {hourlySales.map((amount, idx) => {
                const height = amount > 0 ? (amount / maxHourly) * 140 : 0;
                const active = idx >= 8 && idx <= 18;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: 160,
                      gap: 4,
                    }}
                  >
                    <div style={{ ...S.hourlyBar(height), opacity: active ? 1 : 0.4 }} />
                    <span style={{ fontSize: 8, color: '#6b7280' }}>
                      {idx.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
            {data.hourly_trend && data.hourly_trend.length > 0 && (
              <div style={S.peakInfo}>
                Peak: {Math.max(...data.hourly_trend.map(h => h.total)).toLocaleString()} - Highest sales during peak hours
              </div>
            )}
          </div>
        </>
      )}

      {/* AI End-of-Day Analysis */}
      <div style={{ marginTop: 16 }}>
        <AIInsightCard feature="retail_eod_analysis" params={{ date: reportDate }} title="AI End-of-Day Analysis" />
      </div>
    </div>
  );
}
