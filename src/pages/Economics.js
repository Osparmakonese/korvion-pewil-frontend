import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '../api/farmApi';
import { fmt, qty } from '../utils/format';

const S = {
  container: { padding: '0 0 40px 0' },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 18, marginBottom: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  /* Von Restorff: best field stands out with green accent */
  calloutCardBest: { background: '#f0faf4', border: '2px solid #1a6b3a', borderRadius: 10, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(26,107,58,0.12)' },
  /* Von Restorff: worst field stands out with red accent */
  calloutCardWorst: { background: '#fff5f5', border: '2px solid #c0392b', borderRadius: 10, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(192,57,43,0.12)' },
  calloutCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 16, marginBottom: 14 },
  calloutLabel: { fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  calloutValue: { fontSize: 24, fontWeight: 700, color: '#1a6b3a', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  calloutName: { fontSize: 12, color: '#374151', marginTop: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  tdProfit: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 },
  rowProfit: { background: '#e8f5ee' },
  rowLoss: { background: '#fdecea' },
  enterpriseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 },
  enterpriseCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 16 },
  enterpriseName: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 },
  enterpriseBadge: { display: 'inline-block', fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 4, marginBottom: 10 },
  enterpriseBadgeCrop: { background: '#e8f5ee', color: '#1a6b3a' },
  enterpriseBadgeLivestock: { background: '#eae5ff', color: '#6c5ce7' },
  enterpriseStat: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8, color: '#374151' },
  enterpriseStatLabel: { color: '#6b7280', fontWeight: 500 },
  enterpriseStatValue: { fontWeight: 700, textAlign: 'right' },
  enterpriseRevenue: { color: '#1a6b3a', fontWeight: 700 },
  enterpriseCost: { color: '#c0392b', fontWeight: 700 },
  enterpriseNet: { fontWeight: 700, fontSize: 12, paddingTop: 8, borderTop: '1px solid #e3e8e4', marginTop: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 14 },
  summaryLabel: { fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: '#111827' },
  loanSection: { marginTop: 14 },
  loanItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 11 },
  loanLender: { fontWeight: 600, color: '#374151' },
  loanAmount: { fontWeight: 700, color: '#374151' },
  loanOverdue: { color: '#c0392b', fontWeight: 600 },
  barChart: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: 11 },
  barLabel: { width: 140, fontWeight: 600, color: '#374151', flexShrink: 0 },
  barTrack: { flex: 1, height: 10, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  barFill: (color, pct) => ({ height: '100%', width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }),
  barValue: { width: 80, textAlign: 'right', fontWeight: 700, color: '#374151' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 12 },
};

export default function Economics({ onTabChange }) {
  const { data: analytics = {}, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
  });

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading analytics...</div>;
  }

  if (error) {
    return <div style={S.emptyState}>Failed to load analytics. Please try again.</div>;
  }

  const fields = analytics.field_profitability || [];
  const enterprises = analytics.enterprises || [];
  const cashFlow = analytics.cash_flow || {};
  const budgetVsActual = analytics.budget_vs_actual || [];

  // Sort fields by net profit descending
  const sortedFields = [...fields].sort((a, b) => (b.net || 0) - (a.net || 0));
  const bestField = sortedFields.length > 0 ? sortedFields[0] : null;
  const worstField = sortedFields.length > 0 ? sortedFields[sortedFields.length - 1] : null;

  // Find most profitable enterprise
  const mostProfitable = [...enterprises].sort((a, b) => (b.net || 0) - (a.net || 0))[0];

  // Calculate totals
  const totalLivestockRevenue = enterprises.filter(e => e.type === 'livestock').reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalLivestockCosts = enterprises.filter(e => e.type === 'livestock').reduce((sum, e) => sum + (e.cost || 0), 0);
  const totalCropRevenue = enterprises.filter(e => e.type === 'crop').reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalCropCosts = enterprises.filter(e => e.type === 'crop').reduce((sum, e) => sum + (e.cost || 0), 0);
  const overallNet = (cashFlow.total_income || 0) - (cashFlow.total_expenses || 0);

  // Determine max net for bar chart scaling
  const maxNet = Math.max(...enterprises.map(e => Math.abs(e.net || 0)), 1);

  const upcomingLoans = (cashFlow.upcoming_loans || []).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div style={S.container}>
      {/* FIELD PROFITABILITY SECTION */}
      <div>
        <div style={S.sectionTitle}>Field-by-Field Profitability</div>

        {/* Callout cards: Best and Worst fields */}
        {bestField || worstField ? (
          <div style={S.twoCol}>
            {bestField && (
              <div style={S.calloutCardBest}>
                <div style={S.calloutLabel}>Best Performing Field</div>
                <div style={S.calloutValue}>{fmt(bestField.net || 0)}</div>
                <div style={S.calloutName}>{bestField.field_name || 'Field ' + bestField.field_id}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{bestField.crop} • {qty(bestField.size_ha || 0)} ha • {fmt(bestField.margin_per_ha || 0)}/ha</div>
              </div>
            )}
            {worstField && (
              <div style={S.calloutCardWorst}>
                <div style={S.calloutLabel}>Worst Performing Field</div>
                <div style={{ ...S.calloutValue, color: '#c0392b' }}>{fmt(worstField.net || 0)}</div>
                <div style={S.calloutName}>{worstField.field_name || 'Field ' + worstField.field_id}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{worstField.crop} • {qty(worstField.size_ha || 0)} ha • {fmt(worstField.margin_per_ha || 0)}/ha</div>
              </div>
            )}
          </div>
        ) : null}

        {/* Profitability table */}
        <div style={S.card}>
          {sortedFields.length > 0 ? (
            <div style={{ overflowX: 'auto' }}><table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Field</th>
                  <th style={S.th}>Crop</th>
                  <th style={S.th}>Size (ha)</th>
                  <th style={S.th}>Revenue</th>
                  <th style={S.th}>Costs</th>
                  <th style={S.th}>Net Profit</th>
                  <th style={S.th}>Margin/ha</th>
                  <th style={S.th}>Yield (kg)</th>
                  <th style={S.th}>Yield/ha</th>
                  <th style={S.th}>Cost/kg</th>
                </tr>
              </thead>
              <tbody>
                {sortedFields.map((field, idx) => {
                  const isProfit = (field.net || 0) >= 0;
                  const rowStyle = isProfit ? S.rowProfit : S.rowLoss;
                  return (
                    <tr key={field.field_id || idx} style={rowStyle}>
                      <td style={S.td}>{field.field_name || 'Field ' + field.field_id}</td>
                      <td style={S.td}>{field.crop || '—'}</td>
                      <td style={S.td}>{qty(field.size_ha || 0)}</td>
                      <td style={S.td}>{fmt(field.revenue || 0)}</td>
                      <td style={S.td}>{fmt(field.total_cost || 0)}</td>
                      <td style={{ ...S.tdProfit, color: isProfit ? '#1a6b3a' : '#c0392b' }}>{fmt(field.net || 0)}</td>
                      <td style={S.td}>{fmt(field.margin_per_ha || 0)}</td>
                      <td style={S.td}>{qty(field.total_yield_kg || 0)}</td>
                      <td style={S.td}>{qty(field.yield_per_ha || 0)}</td>
                      <td style={S.td}>{fmt(field.cost_per_kg || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          ) : (
            <div style={S.emptyState}>No field profitability data available yet.</div>
          )}
        </div>
      </div>

      {/* ENTERPRISE COMPARISON SECTION */}
      <div>
        <div style={S.sectionTitle}>Enterprise Comparison</div>

        {/* Most profitable callout */}
        {mostProfitable && (
          <div style={S.calloutCard}>
            <div style={S.calloutLabel}>Most Profitable Enterprise</div>
            <div style={S.calloutValue}>{fmt(mostProfitable.net || 0)}</div>
            <div style={S.calloutName}>{mostProfitable.enterprise}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
              Revenue: {fmt(mostProfitable.revenue || 0)} • Costs: {fmt(mostProfitable.cost || 0)}
            </div>
          </div>
        )}

        {/* Enterprise cards grid */}
        <div style={S.enterpriseGrid}>
          {enterprises.length > 0 ? (
            enterprises.map((ent, idx) => {
              const isCrop = ent.type === 'crop';
              const badgeStyle = isCrop ? S.enterpriseBadgeCrop : S.enterpriseBadgeLivestock;
              return (
                <div key={idx} style={S.enterpriseCard}>
                  <div style={S.enterpriseName}>{ent.enterprise}</div>
                  <div style={{ ...S.enterpriseBadge, ...badgeStyle }}>
                    {isCrop ? 'CROP' : 'LIVESTOCK'}
                  </div>
                  <div style={S.enterpriseStat}>
                    <span style={S.enterpriseStatLabel}>Revenue</span>
                    <span style={S.enterpriseRevenue}>{fmt(ent.revenue || 0)}</span>
                  </div>
                  <div style={S.enterpriseStat}>
                    <span style={S.enterpriseStatLabel}>Costs</span>
                    <span style={S.enterpriseCost}>{fmt(ent.cost || 0)}</span>
                  </div>
                  <div style={S.enterpriseStat}>
                    <span style={S.enterpriseStatLabel}>
                      {ent.yield_kg ? 'Yield (kg)' : ent.head_count ? 'Head Count' : ent.ha ? 'Area (ha)' : 'Info'}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {ent.yield_kg ? qty(ent.yield_kg) : ent.head_count ? ent.head_count : ent.ha ? qty(ent.ha) : '—'}
                    </span>
                  </div>
                  <div style={{ ...S.enterpriseNet, color: (ent.net || 0) >= 0 ? '#1a6b3a' : '#c0392b' }}>
                    Net: {fmt(ent.net || 0)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={S.emptyState}>No enterprise data available yet.</div>
          )}
        </div>

        {/* Bar chart of enterprise profits */}
        {enterprises.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Net Profit by Enterprise</div>
            {enterprises.map((ent, idx) => {
              const netValue = ent.net || 0;
              const color = netValue >= 0 ? '#1a6b3a' : '#c0392b';
              const pct = maxNet > 0 ? Math.abs(netValue) / maxNet * 100 : 0;
              return (
                <div key={idx} style={S.barChart}>
                  <div style={S.barLabel}>{ent.enterprise}</div>
                  <div style={S.barTrack}>
                    <div style={S.barFill(color, pct)} />
                  </div>
                  <div style={S.barValue}>{fmt(netValue)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CASH FLOW OVERVIEW SECTION */}
      <div>
        <div style={S.sectionTitle}>Cash Flow Position</div>

        {/* Summary cards */}
        <div style={S.summaryGrid}>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Total Income</div>
            <div style={{ ...S.summaryValue, color: '#1a6b3a' }}>{fmt(cashFlow.total_income || 0)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Total Expenses</div>
            <div style={{ ...S.summaryValue, color: '#c0392b' }}>{fmt(cashFlow.total_expenses || 0)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Wages Owed</div>
            <div style={{ ...S.summaryValue, color: '#c97d1a' }}>{fmt(cashFlow.wages_owed || 0)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Loan Balance</div>
            <div style={{ ...S.summaryValue, color: '#c0392b' }}>{fmt(cashFlow.loan_balance || 0)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Net Cash Position</div>
            <div style={{ ...S.summaryValue, color: overallNet >= 0 ? '#1a6b3a' : '#c0392b' }}>
              {fmt(overallNet)}
            </div>
          </div>
        </div>

        {/* Upcoming loans */}
        {upcomingLoans.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Upcoming Loan Payments</div>
            <div style={S.loanSection}>
              {upcomingLoans.map((loan, idx) => {
                const dueDate = new Date(loan.due_date);
                const today = new Date();
                const isOverdue = dueDate < today;
                return (
                  <div key={idx} style={S.loanItem}>
                    <div>
                      <div style={S.loanLender}>{loan.lender}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
                        Due: {dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {isOverdue && <span style={{ color: '#c0392b', fontWeight: 600 }}> (OVERDUE)</span>}
                      </div>
                    </div>
                    <div style={S.loanAmount}>{fmt(loan.balance || 0)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SEASON SUMMARY SECTION */}
      <div>
        <div style={S.sectionTitle}>Season Snapshot</div>

        <div style={S.summaryGrid}>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Crop Revenue</div>
            <div style={{ ...S.summaryValue, color: '#1a6b3a' }}>{fmt(totalCropRevenue)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Crop Costs</div>
            <div style={{ ...S.summaryValue, color: '#c0392b' }}>{fmt(totalCropCosts)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Livestock Revenue</div>
            <div style={{ ...S.summaryValue, color: '#6c5ce7' }}>{fmt(totalLivestockRevenue)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Livestock Costs</div>
            <div style={{ ...S.summaryValue, color: '#6c5ce7' }}>{fmt(totalLivestockCosts)}</div>
          </div>
          <div style={S.summaryCard}>
            <div style={S.summaryLabel}>Overall Net</div>
            <div style={{ ...S.summaryValue, color: (totalCropRevenue + totalLivestockRevenue - totalCropCosts - totalLivestockCosts) >= 0 ? '#1a6b3a' : '#c0392b' }}>
              {fmt(totalCropRevenue + totalLivestockRevenue - totalCropCosts - totalLivestockCosts)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
