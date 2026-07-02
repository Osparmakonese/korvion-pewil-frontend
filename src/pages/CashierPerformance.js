import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getCashierPerformance } from '../api/retailApi';

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
  buttonGroup: {
    display: 'flex',
    gap: 6,
    background: '#f3f4f6',
    borderRadius: 6,
    padding: 4,
  },
  buttonGroupItem: (isActive) => ({
    padding: '6px 12px',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: isActive ? '#1a6b3a' : 'transparent',
    color: isActive ? '#fff' : '#6b7280',
    cursor: 'pointer',
  }),
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
  },
  redValue: {
    color: '#c0392b',
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
  leaderboardCard: (borderColor, rank) => ({
    background: '#fff',
    border: `1px solid #e5e7eb`,
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  }),
  leaderboardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankBadge: (bgColor) => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: bgColor,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  }),
  cashierName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
  },
  cashierRole: {
    fontSize: 8,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 20,
    textTransform: 'uppercase',
    background: '#fef3e2',
    color: '#b45309',
    marginLeft: 8,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    textAlign: 'center',
      },
  statValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    background: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: (percent, color) => ({
    height: '100%',
    width: `${percent}%`,
    background: color,
    borderRadius: 3,
  }),
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    textAlign: 'left',
    padding: '7px 8px',
    fontSize: 8,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  td: {
    padding: '7px 8px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
    fontSize: 11,
  },
  greenText: {
    color: '#1a6b3a',
    fontWeight: 600,
  },
  redText: {
    color: '#c0392b',
    fontWeight: 600,
  },
};

export default function CashierPerformance({ onTabChange }) {
  useAuth();
  const [period, setPeriod] = useState('7');

  // Map period UI to days
  const dayMap = { 'week': '7', 'month': '30', 'quarter': '90' };
  const days = dayMap[period] || period;

  // Fetch cashier performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['retail-cashier-performance', days],
    queryFn: () => getCashierPerformance(parseInt(days)),
    staleTime: 30000,
  });

  // Transform API data to component format
  const leaderboard = performanceData?.leaderboard || [];

  // Get badge colors for ranks
  const rankColors = ['#c97d1a', '#9ca3af', '#b45309'];
  const cashiers = leaderboard.map((cashier, idx) => ({
    rank: idx + 1,
    name: cashier.cashier,
    borderColor: rankColors[idx % rankColors.length],
    rankColor: rankColors[idx % rankColors.length],
    sales: cashier.transactions || 0,
    revenue: cashier.total_sales || 0,
    avgValue: cashier.avg_per_session || 0,
    itemsPerSale: 0,
    variance: cashier.total_variance || 0,
    percent: idx === 0 ? 100 : Math.round(((cashier.total_sales || 0) / (leaderboard[0]?.total_sales || 1)) * 100),
  }));

  // Create sessions data from leaderboard
  const sessionsData = leaderboard.map((cashier) => ({
    cashier: cashier.cashier,
    sessions: cashier.sessions || 0,
    hours: '0h',
    salesPerHour: cashier.avg_per_session || 0,
    variance: cashier.total_variance || 0,
    isVariancePositive: (cashier.total_variance || 0) >= 0,
  }));

  // Calculate aggregates
  const totalCashiers = leaderboard.length;
  const totalSales = leaderboard.reduce((sum, c) => sum + (c.total_sales || 0), 0);
  const avgTransaction = totalCashiers > 0 ? totalSales / leaderboard.reduce((sum, c) => sum + (c.transactions || 1), 1) : 0;
  const totalVariance = leaderboard.reduce((sum, c) => sum + Math.abs(c.total_variance || 0), 0);
  const varianceRate = totalSales > 0 ? ((totalVariance / totalSales) * 100).toFixed(1) : '0';

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.headerTitle}>Cashier Performance</h1>
        <div style={S.buttonGroup}>
          {[
            { key: '7', label: 'This Week' },
            { key: '30', label: 'This Month' },
            { key: '90', label: 'This Quarter' },
          ].map((p) => (
            <button
              key={p.key}
              style={S.buttonGroupItem(days === p.key)}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      {isLoading ? (
        <div style={{ ...S.card, textAlign: 'center', color: '#6b7280', padding: 40 }}>
          Loading performance data...
        </div>
      ) : (
        <>
          <div style={S.metricsGrid}>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Total Cashiers</div>
              <div style={S.metricValue}>{totalCashiers}</div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Total Sales</div>
              <div style={S.metricValue}>${totalSales.toFixed(2)}</div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Avg Transaction</div>
              <div style={S.metricValue}>${avgTransaction.toFixed(2)}</div>
            </div>
            <div style={S.metricCard}>
              <div style={S.metricLabel}>Variance Rate</div>
              <div style={{ ...S.metricValue, ...S.redValue }}>{varianceRate}%</div>
            </div>
          </div>
        </>
      )}

      {!isLoading && (
        <>
          {/* Cashier Leaderboard */}
          <h3 style={S.sectionTitle}>Cashier Leaderboard</h3>
          {cashiers.length > 0 ? (
            cashiers.map((cashier) => (
              <div
                key={cashier.rank}
                style={S.leaderboardCard(cashier.borderColor, cashier.rank)}
              >
                <div style={S.leaderboardHeader}>
                  <div style={S.rankBadge(cashier.rankColor)}>#{cashier.rank}</div>
                  <div style={S.cashierName}>{cashier.name}</div>
                  <div style={S.cashierRole}>Cashier</div>
                </div>

                <div style={S.statsGrid}>
                  <div style={S.statItem}>
                    <div style={S.statValue}>{cashier.sales}</div>
                    <div style={S.statLabel}>Trans.</div>
                  </div>
                  <div style={S.statItem}>
                    <div style={S.statValue}>${cashier.revenue.toFixed(2)}</div>
                    <div style={S.statLabel}>Revenue</div>
                  </div>
                  <div style={S.statItem}>
                    <div style={S.statValue}>${cashier.avgValue.toFixed(2)}</div>
                    <div style={S.statLabel}>Avg/Session</div>
                  </div>
                  <div style={S.statItem}>
                    <div
                      style={{
                        ...S.statValue,
                        ...(cashier.variance === 0 ? S.greenText : S.redText),
                      }}
                    >
                      ${cashier.variance.toFixed(2)}
                    </div>
                    <div style={S.statLabel}>Variance</div>
                  </div>
                  <div style={S.statItem}>
                    <div style={S.statValue}>{cashier.percent}%</div>
                    <div style={S.statLabel}>of Top</div>
                  </div>
                </div>

                <div style={S.progressBar}>
                  <div
                    style={S.progressFill(
                      cashier.percent,
                      '#2563eb'
                    )}
                  />
                </div>
              </div>
            ))
          ) : (
            <div style={{ ...S.card, textAlign: 'center', color: '#6b7280' }}>
              No cashier performance data available for this period.
            </div>
          )}
        </>
      )}

      {!isLoading && (
        <>
          {/* Two-column Layout */}
          <h3 style={S.sectionTitle}>Analytics</h3>
          <div style={S.twoCol}>
            {/* Sessions Data */}
            <div style={S.card}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: 12 }}>
                Sessions Data
              </h4>
              {sessionsData.length > 0 ? (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Cashier</th>
                      <th style={S.th}>Sessions</th>
                      <th style={S.th}>Avg/Session</th>
                      <th style={S.th}>Variance Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={S.td}>{row.cashier}</td>
                        <td style={S.td}>{row.sessions}</td>
                        <td style={S.td}>${row.salesPerHour.toFixed(2)}</td>
                        <td
                          style={{
                            ...S.td,
                            ...(row.isVariancePositive ? S.greenText : S.redText),
                          }}
                        >
                          ${row.variance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 11 }}>No session data available</div>
              )}
            </div>

            {/* Summary Stats */}
            <div style={S.card}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: 12 }}>
                Performance Summary
              </h4>
              {cashiers.length > 0 ? (
                <div style={{ fontSize: 11 }}>
                  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ color: '#6b7280', marginBottom: 4 }}>Top Performer</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>
                      {cashiers[0]?.name || 'N/A'} - ${cashiers[0]?.revenue.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ color: '#6b7280', marginBottom: 4 }}>Total Transactions</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>
                      {cashiers.reduce((sum, c) => sum + c.sales, 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', marginBottom: 4 }}>Avg Sale Value</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>
                      ${(totalSales / (cashiers.reduce((sum, c) => sum + c.sales, 1))).toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 11 }}>No data available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
