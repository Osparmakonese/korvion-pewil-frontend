import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRetailReport } from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import AIInsightCard from '../components/AIInsightCard';
import useIsMobile from '../hooks/useIsMobile';

/* ── Helpers ── */
const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = (v) => (parseFloat(v) || 0).toFixed(1) + '%';
const num = (v) => (parseInt(v) || 0).toLocaleString();

/* ── Design tokens (matching HTML prototype retail theme) ── */
const C = {
  blue1: '#1e3a5f', blue2: '#2563eb', blue3: '#eff6ff',
  green: '#1a6b3a', green2: '#2d9e58', green3: '#e8f5ee',
  amber: '#c97d1a', amber3: '#fef3e2',
  red: '#c0392b', red3: '#fdecea',
  purple: '#7c3aed',
  ink: '#111827', ink3: '#9ca3af', ink4: '#d1d5db',
  border: '#e5e7eb', surface: '#f9fafb', white: '#fff',
};

const PAYMENT_COLORS = { cash: C.green, card: C.blue2, mobile_money: C.amber, mixed: C.purple };

/* ── Tabs ── */
const TABS = [
  { key: 'overview', label: 'Overview', icon: '\u{1F4CA}' },
  { key: 'pl', label: 'P&L', icon: '\u{1F4B5}' },
  { key: 'inventory', label: 'Inventory', icon: '\u{1F4E6}' },
  { key: 'sales', label: 'Sales Analytics', icon: '\u{1F4C8}' },
  { key: 'cashiers', label: 'Cashiers', icon: '\u{1F9D1}' },
];

/* ──────────── STYLES ──────────── */
const S = {
  page: { maxWidth: 1140, margin: '0 auto' },
  /* Hero — retail blue gradient from HTML prototype */
  hero: {
    background: `linear-gradient(135deg, ${C.blue1}, ${C.blue2})`,
    borderRadius: 12, padding: '20px 24px', marginBottom: 14,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
  },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#fff' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroIcon: { fontSize: 36, opacity: 0.25 },
  dateRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dateInput: {
    padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600,
    outline: 'none', cursor: 'pointer',
  },
  dateLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 },
  applyBtn: {
    padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 700,
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '6px 14px', borderRadius: 6, border: 'none',
    background: 'rgba(255,255,255,0.9)', color: C.blue1, fontSize: 11, fontWeight: 700,
    cursor: 'pointer',
  },
  /* Tab bar */
  tabBar: {
    display: 'flex', gap: 2, marginBottom: 16, background: C.surface,
    borderRadius: 8, padding: 3, border: `1px solid ${C.border}`,
  },
  tab: (active) => ({
    padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
    background: active ? C.white : 'transparent',
    color: active ? C.blue2 : C.ink3,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    display: 'flex', alignItems: 'center', gap: 5,
  }),
  /* Metrics row (matching HTML prototype) */
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 },
  met: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px',
  },
  metLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.ink3, fontWeight: 600 },
  metIcon: (bg) => ({
    width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, background: bg,
  }),
  metVal: (color) => ({
    fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color, marginTop: 6,
  }),
  metChange: (pos) => ({
    fontSize: 10, color: pos ? C.green : C.red, fontWeight: 600, marginTop: 2,
  }),
  metBar: { height: 4, background: '#f3f4f6', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  metBarFill: (w, c) => ({ height: '100%', width: `${Math.min(w, 100)}%`, background: c, borderRadius: 2 }),
  /* Two-column */
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 },
  /* Cards */
  card: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '16px 18px', marginBottom: 14,
  },
  accentCard: (color) => ({
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '18px 20px', marginBottom: 14, borderLeft: `4px solid ${color}`,
  }),
  /* Section title */
  st: { fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  micro: { fontSize: 9, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  /* Rows */
  row: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid #f3f4f6`, fontSize: 12 },
  rowLabel: { color: '#6b7280' },
  rowVal: (c) => ({ fontWeight: 600, color: c }),
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 13, fontWeight: 700, borderTop: `2px solid ${C.border}`, marginTop: 4 },
  netBox: (pos) => ({
    background: pos ? C.green3 : C.red3, borderRadius: 8, padding: '14px 18px',
    textAlign: 'center', marginTop: 10,
  }),
  netVal: (pos) => ({
    fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700,
    color: pos ? C.green : C.red,
  }),
  netLabel: { fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 600 },
  /* Table */
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: {
    textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: C.ink3,
    textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, background: C.surface,
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  /* Bar */
  barOuter: { height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barInner: (w, c) => ({ height: '100%', width: `${Math.min(w, 100)}%`, background: c, borderRadius: 3, transition: 'width 0.4s ease' }),
  /* Chart bars */
  chartWrap: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, marginTop: 8 },
  chartBar: (h, c) => ({
    flex: 1, height: `${h}%`, background: c, borderRadius: '3px 3px 0 0',
    minHeight: 2, transition: 'height 0.3s ease', cursor: 'default',
  }),
  chartLabels: { display: 'flex', gap: 2, marginTop: 3 },
  chartLabel: { flex: 1, fontSize: 7, color: C.ink3, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  /* Badge / pill */
  badge: (bg) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
    fontSize: 9, fontWeight: 700, color: '#fff', background: bg,
  }),
  pill: (bg, color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
    fontSize: 9, fontWeight: 600, color, background: bg,
  }),
  /* KPI mini card */
  kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  kpiCard: {
    background: C.surface, borderRadius: 8, padding: '12px 14px',
    border: `1px solid ${C.border}`,
  },
  kpiLabel: { fontSize: 9, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.04em' },
  kpiVal: (color) => ({ fontSize: 18, fontWeight: 700, color, marginTop: 2, fontFamily: "'Playfair Display', serif" }),
  kpiDesc: { fontSize: 9, color: C.ink3, marginTop: 2 },
  /* Locked */
  locked: { textAlign: 'center', padding: 60, color: '#6b7280' },
};

/* ──────────── COMPONENT ──────────── */
export default function RetailReport() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const role = user?.role || 'worker';

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [appliedStart, setAppliedStart] = useState(startDate);
  const [appliedEnd, setAppliedEnd] = useState(endDate);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: report, isLoading } = useQuery({
    queryKey: ['retailReport', appliedStart, appliedEnd],
    queryFn: () => getRetailReport({ start_date: appliedStart, end_date: appliedEnd }),
    staleTime: 60000,
  });

  const handleApply = () => { setAppliedStart(startDate); setAppliedEnd(endDate); };

  /* Owner-only gate */
  if (role !== 'owner') {
    return (
      <div style={S.locked}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F512}'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Owner Access Only</div>
        <div style={{ fontSize: 12 }}>The Retail Report is available to store owners only.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{'\u{1F4CA}'}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Generating retail report...</div>
      </div>
    );
  }

  const r = report || {};
  const rev = r.revenue || {};
  const pl = r.profit_loss || {};
  const inv = r.inventory || {};
  const sm = r.stock_movement || {};
  const kpis = r.advanced_kpis || {};
  const topProducts = r.top_products || [];
  const paymentBreakdown = r.payment_breakdown || [];
  const dailyTrend = r.daily_trend || [];
  const hourlyTrend = r.hourly_trend || [];
  const cashierPerf = r.cashier_performance || [];
  const categoryBreakdown = r.category_breakdown || [];
  const lossByType = r.loss_by_type || [];

  const maxDailyTotal = Math.max(...dailyTrend.map(d => d.total), 1);
  const maxProductRev = topProducts.length > 0 ? topProducts[0].revenue : 1;
  const maxCatRev = categoryBreakdown.length > 0 ? categoryBreakdown[0].revenue : 1;
  const maxHourlyTotal = Math.max(...hourlyTrend.map(h => h.total), 1);
  const netPositive = pl.net_profit >= 0;

  /* Export handler (print-friendly) */
  const handleExport = () => window.print();

  return (
    <div style={S.page}>
      {/* ── Hero Banner (Retail Blue — matching HTML prototype) ── */}
      <div style={S.hero}>
        <div>
          <div style={S.heroTitle}>{'\u{1F4CA}'} Retail Report</div>
          <div style={S.heroSub}>
            {new Date(appliedStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' \u2014 '}
            {new Date(appliedEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' \u2022 '}{num(rev.transaction_count)} transactions
          </div>
        </div>
        <div style={S.dateRow}>
          <div>
            <div style={S.dateLabel}>From</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={S.dateInput} />
          </div>
          <div>
            <div style={S.dateLabel}>To</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={S.dateInput} />
          </div>
          <button style={S.applyBtn} onClick={handleApply}>Apply</button>
          <button style={S.exportBtn} onClick={handleExport}>{'\u{1F4C4}'} Export</button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Metric cards (matching HTML prototype pattern) */}
          <div style={S.metrics}>
            <div style={S.met}>
              <div style={S.metLabel}><span style={S.metIcon(C.green3)}>{'\u{1F4B0}'}</span>Revenue (Period)</div>
              <div style={S.metVal(C.green)}>{fmt(rev.total_revenue)}</div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>{num(rev.transaction_count)} transactions</div>
              <div style={S.metBar}><div style={S.metBarFill(55, C.green)} /></div>
            </div>
            <div style={S.met}>
              <div style={S.metLabel}><span style={S.metIcon(C.blue3)}>{'\u{1F4C8}'}</span>Gross Profit</div>
              <div style={S.metVal(pl.gross_profit >= 0 ? C.green : C.red)}>{fmt(pl.gross_profit)}</div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>{pct(pl.gross_margin)} margin</div>
              <div style={S.metBar}><div style={S.metBarFill(pl.gross_margin || 0, C.blue2)} /></div>
            </div>
            <div style={S.met}>
              <div style={S.metLabel}><span style={S.metIcon(C.amber3)}>{'\u{1F4E6}'}</span>Inventory Value</div>
              <div style={S.metVal(C.amber)}>{fmt(inv.value_at_cost)}</div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>{num(inv.total_units)} units in stock</div>
              <div style={S.metBar}><div style={S.metBarFill(42, C.amber)} /></div>
            </div>
            <div style={S.met}>
              <div style={S.metLabel}><span style={S.metIcon(netPositive ? C.green3 : C.red3)}>{netPositive ? '\u2705' : '\u{1F534}'}</span>Net Profit</div>
              <div style={S.metVal(netPositive ? C.green : C.red)}>{fmt(pl.net_profit)}</div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 2 }}>After losses & shrinkage</div>
              <div style={S.metBar}><div style={S.metBarFill(netPositive ? 70 : 15, netPositive ? C.green : C.red)} /></div>
            </div>
          </div>

          <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : S.twoCol.gridTemplateColumns }}>
            {/* Left */}
            <div>
              {/* Revenue This Week chart (matching HTML prototype) */}
              {dailyTrend.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F4C5}'} Daily Sales Trend</div>
                  <div style={S.chartWrap}>
                    {dailyTrend.map((d, i) => (
                      <div
                        key={i}
                        style={S.chartBar(Math.max((d.total / maxDailyTotal) * 100, 3), `linear-gradient(180deg, ${C.blue1}, ${C.blue2})`)}
                        title={`${d.date}: ${fmt(d.total)} (${d.count} sales)`}
                      />
                    ))}
                  </div>
                  <div style={S.chartLabels}>
                    {dailyTrend.map((d, i) => (
                      <div key={i} style={S.chartLabel}>
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#6b7280' }}>
                    <span>Avg: {fmt(rev.avg_transaction)}/sale</span>
                    <span>Peak: {fmt(Math.max(...dailyTrend.map(d => d.total)))}</span>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {topProducts.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F3C6}'} Top Products by Revenue</div>
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>#</th><th style={S.th}>Product</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
                      <th style={{ ...S.th, width: 100 }}>Share</th>
                    </tr></thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, fontWeight: 700, color: C.ink3, width: 30 }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{num(p.qty)}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.green }}>{fmt(p.revenue)}</td>
                          <td style={S.td}>
                            <div style={S.barOuter}><div style={S.barInner((p.revenue / maxProductRev) * 100, C.green2)} /></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Category Breakdown */}
              {categoryBreakdown.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F5C2}'} Sales by Category</div>
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>Category</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Items</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
                      <th style={{ ...S.th, width: 100 }}>Share</th>
                    </tr></thead>
                    <tbody>
                      {categoryBreakdown.map((c, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{num(c.qty)}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.green }}>{fmt(c.revenue)}</td>
                          <td style={S.td}>
                            <div style={S.barOuter}><div style={S.barInner((c.revenue / maxCatRev) * 100, C.amber)} /></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right */}
            <div>
              {/* Recent Activity / Quick Stats matching HTML prototype */}
              <div style={S.card}>
                <div style={S.st}>{'\u26A1'} Key Performance Indicators</div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Avg Transaction Value</span>
                  <span style={S.rowVal(C.ink)}>{fmt(rev.avg_transaction)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Avg Basket Size</span>
                  <span style={S.rowVal(C.ink)}>{kpis.avg_basket_size || 0} items</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Revenue / Day</span>
                  <span style={S.rowVal(C.ink)}>{fmt(kpis.revenue_per_day)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Transactions / Day</span>
                  <span style={S.rowVal(C.ink)}>{kpis.transactions_per_day || 0}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Gross Margin</span>
                  <span style={S.rowVal(C.green)}>{pct(pl.gross_margin)}</span>
                </div>
                <div style={{ ...S.row, borderBottom: 'none' }}>
                  <span style={S.rowLabel}>Shrinkage Rate</span>
                  <span style={S.rowVal(kpis.shrinkage_rate > 2 ? C.red : C.ink)}>{pct(kpis.shrinkage_rate)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={S.card}>
                <div style={S.st}>{'\u{1F4B3}'} Payment Methods</div>
                {paymentBreakdown.length === 0 && (
                  <div style={{ textAlign: 'center', color: C.ink3, fontSize: 11, padding: 16 }}>No sales in this period</div>
                )}
                {paymentBreakdown.map((p, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={S.badge(PAYMENT_COLORS[p.method] || '#6b7280')}>{p.label}</span>
                        <span style={{ fontSize: 10, color: C.ink3 }}>{p.count} txns</span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{fmt(p.total)}</span>
                    </div>
                    <div style={S.barOuter}><div style={S.barInner(p.percentage, PAYMENT_COLORS[p.method] || '#6b7280')} /></div>
                    <div style={{ fontSize: 9, color: C.ink3, marginTop: 2, textAlign: 'right' }}>{pct(p.percentage)}</div>
                  </div>
                ))}
              </div>

              {/* Inventory alert */}
              {inv.low_stock_count > 0 && (
                <div style={{ background: C.amber3, borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: `1px solid #fcd34d` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                    {'\u26A0\uFE0F'} {inv.low_stock_count} product{inv.low_stock_count > 1 ? 's' : ''} below reorder level
                  </div>
                  <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>Review your inventory to avoid stockouts.</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ P&L TAB ══════════════ */}
      {activeTab === 'pl' && (
        <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : S.twoCol.gridTemplateColumns }}>
          <div>
            {/* Full P&L Statement */}
            <div style={S.accentCard(C.green)}>
              <div style={S.st}>{'\u{1F4B5}'} Profit & Loss Statement</div>
              <div style={S.micro}>Revenue</div>
              <div style={S.row}>
                <span style={S.rowLabel}>Gross Sales (Subtotal)</span>
                <span style={S.rowVal(C.green)}>{fmt(pl.revenue)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Less: Discounts Given</span>
                <span style={S.rowVal(C.red)}>-{fmt(pl.discounts)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Tax Collected</span>
                <span style={S.rowVal('#6b7280')}>{fmt(pl.tax_collected)}</span>
              </div>

              <div style={{ ...S.micro, marginTop: 14 }}>Cost of Goods Sold</div>
              <div style={S.row}>
                <span style={S.rowLabel}>COGS (Purchase Cost)</span>
                <span style={S.rowVal(C.red)}>-{fmt(pl.cogs)}</span>
              </div>
              <div style={S.totalRow}>
                <span>Gross Profit</span>
                <span style={{ color: pl.gross_profit >= 0 ? C.green : C.red }}>{fmt(pl.gross_profit)}</span>
              </div>

              <div style={{ ...S.micro, marginTop: 14 }}>Losses & Shrinkage</div>
              <div style={S.row}>
                <span style={S.rowLabel}>Stock Losses (Stolen/Damaged/Expired)</span>
                <span style={S.rowVal(C.red)}>-{fmt(pl.stock_losses)}</span>
              </div>

              {/* Net Profit Box */}
              <div style={S.netBox(netPositive)}>
                <div style={S.netLabel}>NET PROFIT</div>
                <div style={S.netVal(netPositive)}>{fmt(pl.net_profit)}</div>
              </div>
            </div>

            {/* Margin Analysis */}
            <div style={S.card}>
              <div style={S.st}>{'\u{1F4CA}'} Margin Analysis</div>
              <div style={S.row}>
                <span style={S.rowLabel}>Gross Margin</span>
                <span style={S.rowVal(C.green)}>{pct(pl.gross_margin)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Net Margin</span>
                <span style={S.rowVal(netPositive ? C.green : C.red)}>
                  {rev.total_revenue ? pct(pl.net_profit / rev.total_revenue * 100) : '0.0%'}
                </span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Markup on Cost</span>
                <span style={S.rowVal(C.blue2)}>
                  {pl.cogs ? pct(pl.gross_profit / pl.cogs * 100) : '0.0%'}
                </span>
              </div>
              <div style={{ ...S.row, borderBottom: 'none' }}>
                <span style={S.rowLabel}>GMROI</span>
                <span style={S.rowVal(C.blue2)}>{kpis.gmroi || 0}x</span>
              </div>
              <div style={{ fontSize: 9, color: C.ink3, marginTop: 6, fontStyle: 'italic' }}>
                GMROI: Gross profit earned for every $1 of inventory at cost. Above 1.0x is profitable.
              </div>
            </div>
          </div>

          {/* Right - Loss detail */}
          <div>
            <div style={S.accentCard(C.red)}>
              <div style={S.st}>{'\u{1F4C9}'} Stock Losses & Shrinkage</div>
              <div style={S.row}>
                <span style={S.rowLabel}>Loss Incidents</span>
                <span style={S.rowVal(C.red)}>{num(sm.loss_incidents)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Units Lost</span>
                <span style={S.rowVal(C.red)}>{num(sm.units_lost)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Loss Value (at Cost)</span>
                <span style={S.rowVal(C.red)}>{fmt(sm.loss_value)}</span>
              </div>
              <div style={S.row}>
                <span style={S.rowLabel}>Shrinkage Rate</span>
                <span style={S.rowVal(kpis.shrinkage_rate > 2 ? C.red : C.ink)}>{pct(kpis.shrinkage_rate)}</span>
              </div>
              <div style={{ ...S.row, borderBottom: 'none' }}>
                <span style={S.rowLabel}>Units Restocked</span>
                <span style={S.rowVal(C.green)}>+{num(sm.units_restocked)}</span>
              </div>
              {kpis.shrinkage_rate > 2 && (
                <div style={{ background: C.red3, borderRadius: 6, padding: '8px 12px', marginTop: 8, fontSize: 10, color: C.red }}>
                  {'\u26A0\uFE0F'} Shrinkage rate above 2% — industry average is 1.4%. Investigate loss causes.
                </div>
              )}
            </div>

            {/* Loss breakdown by type */}
            {lossByType.length > 0 && (
              <div style={S.card}>
                <div style={S.st}>{'\u{1F50D}'} Loss Breakdown by Type</div>
                <table style={S.table}>
                  <thead><tr>
                    <th style={S.th}>Type</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Units</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Value</th>
                  </tr></thead>
                  <tbody>
                    {lossByType.map((l, i) => (
                      <tr key={i}>
                        <td style={S.td}>
                          <span style={S.pill(
                            l.type === 'stolen' ? C.red3 : l.type === 'damaged' ? C.amber3 : '#f3f4f6',
                            l.type === 'stolen' ? C.red : l.type === 'damaged' ? '#92400e' : C.ink3
                          )}>
                            {l.type.charAt(0).toUpperCase() + l.type.slice(1)}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: C.red }}>{num(l.units)}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.red }}>{fmt(l.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Category revenue */}
            {categoryBreakdown.length > 0 && (
              <div style={S.card}>
                <div style={S.st}>{'\u{1F5C2}'} Revenue by Category</div>
                {categoryBreakdown.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: C.green }}>{fmt(c.revenue)}</span>
                    </div>
                    <div style={S.barOuter}><div style={S.barInner((c.revenue / maxCatRev) * 100, C.blue2)} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ INVENTORY TAB ══════════════ */}
      {activeTab === 'inventory' && (
        <>
          {/* KPI cards */}
          <div style={S.kpiGrid}>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F4E6}'} Total Products</div>
              <div style={S.kpiVal(C.blue2)}>{num(inv.total_products)}</div>
              <div style={S.kpiDesc}>{num(inv.total_units)} total units in stock</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F4B0}'} Value at Cost</div>
              <div style={S.kpiVal(C.amber)}>{fmt(inv.value_at_cost)}</div>
              <div style={S.kpiDesc}>Retail value: {fmt(inv.value_at_retail)}</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F504}'} Inventory Turnover</div>
              <div style={S.kpiVal(C.blue2)}>{kpis.inventory_turnover || 0}x</div>
              <div style={S.kpiDesc}>Times inventory sold in period</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F4C8}'} Sell-through Rate</div>
              <div style={S.kpiVal(C.green)}>{pct(kpis.sell_through_rate)}</div>
              <div style={S.kpiDesc}>% of stock sold in period</div>
            </div>
          </div>

          <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : S.twoCol.gridTemplateColumns }}>
            <div>
              {/* Inventory Detail */}
              <div style={S.accentCard(C.amber)}>
                <div style={S.st}>{'\u{1F4E6}'} Inventory Snapshot</div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Total Products</span>
                  <span style={S.rowVal(C.ink)}>{num(inv.total_products)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Total Units in Stock</span>
                  <span style={S.rowVal(C.ink)}>{num(inv.total_units)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Value at Cost</span>
                  <span style={S.rowVal(C.amber)}>{fmt(inv.value_at_cost)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Value at Retail</span>
                  <span style={S.rowVal(C.green)}>{fmt(inv.value_at_retail)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Potential Profit (if all sold)</span>
                  <span style={S.rowVal(C.green)}>{fmt(inv.potential_profit)}</span>
                </div>
                <div style={{ ...S.row, borderBottom: 'none' }}>
                  <span style={S.rowLabel}>Days of Inventory</span>
                  <span style={S.rowVal(C.blue2)}>{kpis.days_of_inventory || 0} days</span>
                </div>
                <div style={{ fontSize: 9, color: C.ink3, marginTop: 6, fontStyle: 'italic' }}>
                  Days of inventory: How long current stock lasts at the current sales rate.
                </div>
              </div>

              {/* Inventory Health */}
              <div style={S.card}>
                <div style={S.st}>{'\u{1F3AF}'} Inventory Health Indicators</div>
                <div style={S.row}>
                  <span style={S.rowLabel}>GMROI (Gross Margin ROI)</span>
                  <span style={S.rowVal(kpis.gmroi >= 1 ? C.green : C.red)}>{kpis.gmroi || 0}x</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Inventory Turnover</span>
                  <span style={S.rowVal(C.blue2)}>{kpis.inventory_turnover || 0}x</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Sell-through Rate</span>
                  <span style={S.rowVal(C.green)}>{pct(kpis.sell_through_rate)}</span>
                </div>
                <div style={{ ...S.row, borderBottom: 'none' }}>
                  <span style={S.rowLabel}>Low Stock Alerts</span>
                  <span style={S.rowVal(inv.low_stock_count > 0 ? C.red : C.green)}>
                    {inv.low_stock_count > 0 ? `${inv.low_stock_count} products` : 'All good'}
                  </span>
                </div>
                {kpis.inventory_turnover < 1 && (
                  <div style={{ background: C.amber3, borderRadius: 6, padding: '8px 12px', marginTop: 8, fontSize: 10, color: '#92400e' }}>
                    {'\u{1F4A1}'} Low turnover — stock is moving slowly. Consider promotions or markdowns on slow items.
                  </div>
                )}
              </div>
            </div>

            {/* Right - Stock movement */}
            <div>
              <div style={S.accentCard(C.red)}>
                <div style={S.st}>{'\u{1F4C9}'} Stock Movement</div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Loss Incidents</span>
                  <span style={S.rowVal(C.red)}>{num(sm.loss_incidents)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Units Lost</span>
                  <span style={S.rowVal(C.red)}>{num(sm.units_lost)}</span>
                </div>
                <div style={S.row}>
                  <span style={S.rowLabel}>Loss Value</span>
                  <span style={S.rowVal(C.red)}>{fmt(sm.loss_value)}</span>
                </div>
                <div style={{ ...S.row, borderBottom: 'none' }}>
                  <span style={S.rowLabel}>Restocked</span>
                  <span style={S.rowVal(C.green)}>+{num(sm.units_restocked)} units</span>
                </div>
              </div>

              {lossByType.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F50D}'} Loss by Type</div>
                  {lossByType.map((l, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={S.pill(
                          l.type === 'stolen' ? C.red3 : l.type === 'damaged' ? C.amber3 : '#f3f4f6',
                          l.type === 'stolen' ? C.red : l.type === 'damaged' ? '#92400e' : C.ink3
                        )}>{l.type.charAt(0).toUpperCase() + l.type.slice(1)}</span>
                        <span style={{ fontWeight: 700, color: C.red }}>{fmt(l.value)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.ink3 }}>{num(l.units)} units</div>
                    </div>
                  ))}
                </div>
              )}

              {inv.low_stock_count > 0 && (
                <div style={{ background: C.amber3, borderRadius: 8, padding: '12px 14px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#92400e', marginBottom: 4 }}>
                    {'\u26A0\uFE0F'} Low Stock Warning
                  </div>
                  <div style={{ fontSize: 10, color: '#92400e' }}>
                    {inv.low_stock_count} product{inv.low_stock_count > 1 ? 's' : ''} at or below reorder level. Restock soon to avoid lost sales.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ SALES ANALYTICS TAB ══════════════ */}
      {activeTab === 'sales' && (
        <>
          {/* KPI cards */}
          <div style={S.kpiGrid}>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F4B0}'} Total Revenue</div>
              <div style={S.kpiVal(C.green)}>{fmt(rev.total_revenue)}</div>
              <div style={S.kpiDesc}>{num(rev.transaction_count)} transactions</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F6D2}'} Avg Transaction</div>
              <div style={S.kpiVal(C.blue2)}>{fmt(rev.avg_transaction)}</div>
              <div style={S.kpiDesc}>{kpis.avg_basket_size || 0} items per basket</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F4C5}'} Revenue / Day</div>
              <div style={S.kpiVal(C.green)}>{fmt(kpis.revenue_per_day)}</div>
              <div style={S.kpiDesc}>{kpis.transactions_per_day || 0} txns/day</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{'\u{1F381}'} Discounts Given</div>
              <div style={S.kpiVal(C.red)}>{fmt(rev.total_discount)}</div>
              <div style={S.kpiDesc}>
                {rev.total_revenue ? pct(rev.total_discount / rev.total_revenue * 100) : '0%'} of revenue
              </div>
            </div>
          </div>

          <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : S.twoCol.gridTemplateColumns }}>
            <div>
              {/* Daily trend */}
              {dailyTrend.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F4C5}'} Daily Sales Trend</div>
                  <div style={S.chartWrap}>
                    {dailyTrend.map((d, i) => (
                      <div
                        key={i}
                        style={S.chartBar(Math.max((d.total / maxDailyTotal) * 100, 3), `linear-gradient(180deg, ${C.blue1}, ${C.blue2})`)}
                        title={`${d.date}: ${fmt(d.total)} (${d.count} sales)`}
                      />
                    ))}
                  </div>
                  <div style={S.chartLabels}>
                    {dailyTrend.map((d, i) => (
                      <div key={i} style={S.chartLabel}>
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Trend */}
              {hourlyTrend.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u23F0'} Sales by Hour of Day</div>
                  <div style={{ fontSize: 10, color: C.ink3, marginBottom: 8 }}>
                    Identify peak selling hours to optimize staffing
                  </div>
                  <div style={S.chartWrap}>
                    {hourlyTrend.map((h, i) => {
                      const isPeak = h.total === maxHourlyTotal && h.total > 0;
                      return (
                        <div
                          key={i}
                          style={S.chartBar(
                            Math.max((h.total / maxHourlyTotal) * 100, 2),
                            isPeak ? C.green : `linear-gradient(180deg, ${C.blue1}, ${C.blue2})`
                          )}
                          title={`${h.hour}:00 — ${fmt(h.total)} (${h.count} sales)`}
                        />
                      );
                    })}
                  </div>
                  <div style={S.chartLabels}>
                    {hourlyTrend.filter((_, i) => i % 3 === 0).map((h, i) => (
                      <div key={i} style={{ ...S.chartLabel, flex: 3 }}>
                        {h.hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const peak = hourlyTrend.reduce((a, b) => b.total > a.total ? b : a, { hour: 0, total: 0 });
                    return peak.total > 0 ? (
                      <div style={{ marginTop: 8, fontSize: 10, color: C.ink3 }}>
                        {'\u{1F525}'} Peak hour: <strong style={{ color: C.green }}>{peak.hour}:00</strong> — {fmt(peak.total)} revenue, {peak.count} sales
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Top products */}
              {topProducts.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F3C6}'} Top Products</div>
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>#</th><th style={S.th}>Product</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
                      <th style={{ ...S.th, width: 80 }}>Share</th>
                    </tr></thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, fontWeight: 700, color: C.ink3, width: 30 }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>{num(p.qty)}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.green }}>{fmt(p.revenue)}</td>
                          <td style={S.td}>
                            <div style={S.barOuter}><div style={S.barInner((p.revenue / maxProductRev) * 100, C.green2)} /></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right */}
            <div>
              {/* Payment Methods */}
              <div style={S.card}>
                <div style={S.st}>{'\u{1F4B3}'} Payment Methods</div>
                {paymentBreakdown.map((p, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={S.badge(PAYMENT_COLORS[p.method] || '#6b7280')}>{p.label}</span>
                        <span style={{ fontSize: 10, color: C.ink3 }}>{p.count} txns</span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{fmt(p.total)}</span>
                    </div>
                    <div style={S.barOuter}><div style={S.barInner(p.percentage, PAYMENT_COLORS[p.method] || '#6b7280')} /></div>
                    <div style={{ fontSize: 9, color: C.ink3, marginTop: 2, textAlign: 'right' }}>{pct(p.percentage)}</div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {categoryBreakdown.length > 0 && (
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F5C2}'} Category Performance</div>
                  {categoryBreakdown.map((c, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontWeight: 700, color: C.green }}>{fmt(c.revenue)}</span>
                      </div>
                      <div style={{ fontSize: 9, color: C.ink3 }}>{num(c.qty)} items sold</div>
                      <div style={S.barOuter}><div style={S.barInner((c.revenue / maxCatRev) * 100, C.amber)} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ CASHIERS TAB ══════════════ */}
      {activeTab === 'cashiers' && (
        <>
          {cashierPerf.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.ink3 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{'\u{1F9D1}'}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No Cashier Data</div>
              <div style={{ fontSize: 12 }}>No closed cashier sessions found in this period.</div>
            </div>
          ) : (
            <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : S.twoCol.gridTemplateColumns }}>
              <div>
                {/* Cashier Performance Table */}
                <div style={S.card}>
                  <div style={S.st}>{'\u{1F9D1}'} Cashier Performance</div>
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>Cashier</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Sessions</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Total Sales</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Avg / Session</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Variance</th>
                      <th style={S.th}>Status</th>
                    </tr></thead>
                    <tbody>
                      {cashierPerf.map((c, i) => {
                        const avgPerSession = c.sessions_count ? c.total_sales / c.sessions_count : 0;
                        const varOk = Math.abs(c.total_variance) < 5;
                        return (
                          <tr key={i}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{c.cashier}</td>
                            <td style={{ ...S.td, textAlign: 'right' }}>{c.sessions_count}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.green }}>{fmt(c.total_sales)}</td>
                            <td style={{ ...S.td, textAlign: 'right' }}>{fmt(avgPerSession)}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: c.total_variance >= 0 ? C.green : C.red }}>
                              {c.total_variance >= 0 ? '+' : ''}{fmt(c.total_variance)}
                            </td>
                            <td style={S.td}>
                              <span style={S.pill(varOk ? C.green3 : C.red3, varOk ? C.green : C.red)}>
                                {varOk ? 'Balanced' : 'Variance'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cashier detail cards */}
                {cashierPerf.map((c, i) => (
                  <div key={i} style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.cashier}</div>
                        <div style={{ fontSize: 10, color: C.ink3 }}>{c.sessions_count} session{c.sessions_count !== 1 ? 's' : ''} in period</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: C.green }}>{fmt(c.total_sales)}</div>
                        <div style={{ fontSize: 10, color: c.total_variance >= 0 ? C.green : C.red, fontWeight: 600 }}>
                          Variance: {c.total_variance >= 0 ? '+' : ''}{fmt(c.total_variance)}
                        </div>
                      </div>
                    </div>
                    <div style={S.barOuter}>
                      <div style={S.barInner(
                        (c.total_sales / Math.max(...cashierPerf.map(x => x.total_sales), 1)) * 100,
                        C.blue2
                      )} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right - Summary */}
              <div>
                <div style={S.accentCard(C.blue2)}>
                  <div style={S.st}>{'\u{1F4CA}'} Team Summary</div>
                  <div style={S.row}>
                    <span style={S.rowLabel}>Total Cashiers</span>
                    <span style={S.rowVal(C.ink)}>{cashierPerf.length}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.rowLabel}>Total Sessions</span>
                    <span style={S.rowVal(C.ink)}>{cashierPerf.reduce((s, c) => s + c.sessions_count, 0)}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.rowLabel}>Combined Sales</span>
                    <span style={S.rowVal(C.green)}>{fmt(cashierPerf.reduce((s, c) => s + c.total_sales, 0))}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.rowLabel}>Combined Variance</span>
                    <span style={S.rowVal(
                      cashierPerf.reduce((s, c) => s + c.total_variance, 0) >= 0 ? C.green : C.red
                    )}>
                      {fmt(cashierPerf.reduce((s, c) => s + c.total_variance, 0))}
                    </span>
                  </div>
                  <div style={{ ...S.row, borderBottom: 'none' }}>
                    <span style={S.rowLabel}>Avg Sales / Session</span>
                    <span style={S.rowVal(C.blue2)}>
                      {fmt(
                        cashierPerf.reduce((s, c) => s + c.total_sales, 0) /
                        Math.max(cashierPerf.reduce((s, c) => s + c.sessions_count, 0), 1)
                      )}
                    </span>
                  </div>
                </div>

                {/* Variance alerts */}
                {cashierPerf.filter(c => Math.abs(c.total_variance) >= 5).length > 0 && (
                  <div style={{ background: C.red3, borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.red}40` }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: C.red, marginBottom: 4 }}>
                      {'\u26A0\uFE0F'} Variance Alerts
                    </div>
                    {cashierPerf.filter(c => Math.abs(c.total_variance) >= 5).map((c, i) => (
                      <div key={i} style={{ fontSize: 10, color: C.red, marginBottom: 2 }}>
                        {c.cashier}: {c.total_variance >= 0 ? '+' : ''}{fmt(c.total_variance)} across {c.sessions_count} sessions
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Retail Summary */}
      <div style={{ marginTop: 16 }}>
        <AIInsightCard feature="retail_dashboard_summary" title="AI Retail Analysis" />
      </div>
    </div>
  );
}
