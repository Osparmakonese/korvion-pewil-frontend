import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getRetailDashboard,
} from '../api/retailApi';
import { fmt } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import AIInsightCard from '../components/AIInsightCard';
import MobileRetailDashboard from '../components/MobileRetailDashboard';

/* ─── Skeleton Loader ─── */
function Skeleton({ w, h, r, mb }) {
  return (
    <div
      className="skeleton"
      style={{
        width: w || '100%',
        height: h || 16,
        borderRadius: r || 6,
        marginBottom: mb || 0,
      }}
    />
  );
}

/* ─── Styles ─── */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '20px' },
  /* ── Design 5: amber today's-revenue hero strip ── */
  banner: {
    borderRadius: 16,
    padding: '22px 24px',
    marginBottom: 16,
    background: 'linear-gradient(135deg, #c97d1a 0%, #e09a3f 100%)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(201, 125, 26, 0.18)',
  },
  bannerDecor: {
    position: 'absolute',
    top: -60, right: -60,
    width: 180, height: 180,
    background: 'rgba(255,255,255,0.10)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  bannerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    position: 'relative',
    zIndex: 1,
  },
  bannerGreet: {
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 2,
  },
  bannerTitle: {
    fontFamily: "'Playfair Display', 'Fraunces', serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  bannerTag: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    backdropFilter: 'blur(8px)',
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    opacity: 0.85,
    marginBottom: 6,
    position: 'relative',
    zIndex: 1,
  },
  bannerValue: {
    fontFamily: "'Playfair Display', 'Fraunces', serif",
    fontSize: 38,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    margin: '0 0 8px 0',
    position: 'relative',
    zIndex: 1,
    lineHeight: 1.05,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    margin: 0,
    display: 'flex',
    gap: 14,
    position: 'relative',
    zIndex: 1,
  },
  bannerSubItem: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  /* ── Design 5: quick-action 4-button row ── */
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  quickAction: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '14px 8px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  qaIcon: (bg, color) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    background: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  }),
  qaLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#374151',
    letterSpacing: '0.02em',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  metricCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  iconCircle: (bgColor) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    marginBottom: 12,
  }),
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    background: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 'auto',
  },
  progressFill: (percent, color) => ({
    height: '100%',
    width: `${percent}%`,
    background: color,
    borderRadius: 2,
  }),
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
    marginTop: 0,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 20,
  },
  chartBar: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    gap: 8,
    padding: '12px 0',
    position: 'relative',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bar: (h) => ({
    width: '100%',
    height: h,
    background: 'linear-gradient(180deg, #c97d1a 0%, #e09a3f 100%)',
    borderRadius: '4px 4px 0 0',
    position: 'relative',
    boxShadow: '0 -2px 8px rgba(201, 125, 26, 0.15)',
  }),
  barValue: {
    fontSize: 9,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
    minHeight: 12,
  },
  barLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: 500,
  },
  activityFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  activityItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottom: '1px solid #f3f4f6',
  },
  activityItem_last: {
    borderBottom: 'none',
  },
  activityDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    marginTop: 4,
  }),
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 2px 0',
  },
  activityDesc: {
    fontSize: 11,
    color: '#6b7280',
    margin: '0 0 4px 0',
  },
  activityTime: {
    fontSize: 9,
    color: '#9ca3af',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 9,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  badge: (color) => ({
    display: 'inline-block',
    fontSize: 8,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 10,
    textTransform: 'uppercase',
    background: color === 'red' ? '#fee2e2' : '#fef3c7',
    color: color === 'red' ? '#7f1d1d' : '#92400e',
  }),
};

export default function RetailDashboard() {
  const { user } = useAuth() || {};

  // Mobile breakpoint detection. Stays hook-ordering safe: declared
  // before any conditional return so React sees the same hook count
  // across renders even if the viewport flips between mobile/desktop.
  // The actual return-MobileRetailDashboard happens AFTER useQuery so
  // we never break the hook ordering rule.
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

  const { data: dashboard, isLoading: sumLoading, error: dashboardError } = useQuery({
    queryKey: ['retail-dashboard'],
    queryFn: getRetailDashboard,
    staleTime: 30000,
  });

  // Mobile branch — phones get the locked Frame 3 layout. Returns AFTER
  // the useQuery above so hooks fire in the same order every render.
  if (isMobile) return <MobileRetailDashboard />;

  // Safely extract data from dashboard API response
  const summary = dashboard ? {
    total_sales: dashboard.revenue_mtd || 0,
  } : {};

  const productCount = dashboard?.products_count || 0;
  const lowStock = dashboard?.low_stock_alerts || [];
  const recentActivityData = dashboard?.recent_activity || [];
  const revenueTrend = dashboard?.revenue_trend || [];

  const username = user?.first_name || user?.username || 'User';

  // Build weekly chart from dashboard revenue_trend
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = (() => {
    if (revenueTrend.length > 0) {
      return revenueTrend.map(item => {
        const d = new Date(item.date);
        return { day: dayNames[d.getDay()], amount: item.total || 0, date: item.date };
      });
    }
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ day: dayNames[d.getDay()], amount: 0, date: d.toISOString().split('T')[0] });
    }
    return days;
  })();
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

  // Build recent activity feed from API data
  const getActivityItems = () => {
    const items = [];

    // Add recent activity items from API. Prefer ISO `created_at` over the
    // legacy `time` (HH:MM) so timeAgo() can compute relative labels —
    // see backend retail/views.py recent_activity payload.
    recentActivityData.slice(0, 6).forEach((activity) => {
      items.push({
        id: `activity-${activity.id}`,
        type: 'activity',
        dot: '#2d9e58',
        title: activity.description || `Transaction #${activity.receipt}`,
        desc: `${fmt(activity.total, 'zwd')}`,
        time: activity.created_at || activity.time,
      });
    });

    // Add low stock alerts
    lowStock.slice(0, 2).forEach((product) => {
      items.push({
        id: `product-${product.id}`,
        type: 'product',
        dot: '#2563eb',
        title: `${product.name || 'Product'}`,
        desc: `Low stock: ${product.quantity_in_stock} units`,
        time: product.updated_at || new Date().toISOString(),
      });
    });

    // Sort by time, most recent first
    items.sort((a, b) => {
      const timeA = new Date(a.time || 0).getTime();
      const timeB = new Date(b.time || 0).getTime();
      return timeB - timeA;
    });

    return items.slice(0, 6);
  };

  const activityItems = getActivityItems();

  // Format time ago — defensive against the backend currently sending
  // recent_activity[].time as the bare 'HH:MM' string from
  // s.created_at.strftime('%H:%M'). new Date('14:23') returns Invalid
  // Date and (now - NaN)/1000 is NaN → 'NaNd ago' bug seen on prod
  // 2026-04-30. Fall back to displaying the string verbatim when parse
  // fails. When backend is updated to send ISO datetimes, this still
  // works.
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    // 'HH:MM' or 'HH:MM:SS' — backend sometimes ships clock-only strings
    // for today's events. Display them as 'at HH:MM'.
    if (typeof dateStr === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      return `at ${dateStr.slice(0, 5)}`;
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    const now = new Date();
    const secondsAgo = Math.floor((now - date) / 1000);
    if (secondsAgo < 60) return 'Just now';
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  };

  if (sumLoading) {
    return (
      <div style={S.page}>
        <Skeleton h={110} r={14} mb={20} />
        <div style={S.metricsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={90} r={12} mb={0} />
          ))}
        </div>
        <Skeleton h={200} r={12} mb={20} />
        <Skeleton h={250} r={12} mb={0} />
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div style={S.page}>
        <div style={{ padding: '20px', color: '#c0392b', textAlign: 'center' }}>
          Failed to load dashboard. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Design 5: amber today's-revenue hero strip */}
      <div style={S.banner}>
        <div style={S.bannerDecor} />
        <div style={S.bannerTop}>
          <div>
            <div style={S.bannerGreet}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
            </div>
            <h1 style={S.bannerTitle}>{username}</h1>
          </div>
          <div style={S.bannerTag}>
            {user?.tenant_name || 'Retail'}
          </div>
        </div>
        <div style={S.bannerLabel}>Today{'\u2019'}s revenue</div>
        <div style={S.bannerValue}>{fmt(dashboard?.today_revenue || 0, 'zwd')}</div>
        <div style={S.bannerSub}>
          <span style={S.bannerSubItem}>{productCount} products</span>
          <span style={S.bannerSubItem}>{'\u2022'}</span>
          <span style={S.bannerSubItem}>{lowStock.length} low-stock alerts</span>
          <span style={S.bannerSubItem}>{'\u2022'}</span>
          <span style={S.bannerSubItem}>{recentActivityData.length} tx today</span>
        </div>
      </div>

      {/* Design 5: Quick-action row */}
      <div style={S.quickActionsGrid}>
        <div
          style={S.quickAction}
          onClick={() => window.dispatchEvent(new CustomEvent('pewil:navigate', { detail: { tab: 'pos' } }))}
          role="button"
          tabIndex={0}
        >
          <div style={S.qaIcon('#fef3e2', '#c97d1a')}>{'\u{1F4B5}'}</div>
          <div style={S.qaLabel}>New sale</div>
        </div>
        <div
          style={S.quickAction}
          onClick={() => window.dispatchEvent(new CustomEvent('pewil:navigate', { detail: { tab: 'purchase-orders' } }))}
          role="button"
          tabIndex={0}
        >
          <div style={S.qaIcon('#e0f2fe', '#0369a1')}>{'\u{1F4E6}'}</div>
          <div style={S.qaLabel}>Receive</div>
        </div>
        <div
          style={S.quickAction}
          onClick={() => window.dispatchEvent(new CustomEvent('pewil:navigate', { detail: { tab: 'products' } }))}
          role="button"
          tabIndex={0}
        >
          <div style={S.qaIcon('#e8f5ee', '#1a6b3a')}>{'\u{1F3F7}'}</div>
          <div style={S.qaLabel}>Price</div>
        </div>
        <div
          style={S.quickAction}
          onClick={() => window.dispatchEvent(new CustomEvent('pewil:navigate', { detail: { tab: 'customers' } }))}
          role="button"
          tabIndex={0}
        >
          <div style={S.qaIcon('#f3e8ff', '#7c3aed')}>{'\u{1F465}'}</div>
          <div style={S.qaLabel}>Loyalty</div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={S.metricsGrid}>
        {/* Revenue Card */}
        <div style={S.metricCard}>
          <div style={S.iconCircle('#2d9e58')}>
            {'\u{1F4B5}'}
          </div>
          <div style={S.metricLabel}>Revenue</div>
          <div style={S.metricValue}>
            {fmt(summary?.total_sales || 0, 'zwd')}
          </div>
          <div style={S.metricTrend}>{(summary?.total_sales || 0) > 0 ? 'Month to date' : 'No sales yet'}</div>
          <div style={S.progressBar}>
            <div style={S.progressFill(summary?.total_sales ? 65 : 0, '#2d9e58')} />
          </div>
        </div>

        {/* Products Card */}
        <div style={S.metricCard}>
          <div style={S.iconCircle('#2563eb')}>
            {'\u{1F4E6}'}
          </div>
          <div style={S.metricLabel}>Products</div>
          <div style={S.metricValue}>{productCount}</div>
          <div style={S.metricTrend}>{productCount > 0 ? `${productCount} active SKUs` : 'No products added'}</div>
          <div style={S.progressBar}>
            <div style={S.progressFill(productCount > 0 ? 42 : 0, '#2563eb')} />
          </div>
        </div>

        {/* Transactions Card (Design 5 — today's revenue now lives in hero) */}
        <div style={S.metricCard}>
          <div style={S.iconCircle('#c97d1a')}>
            {'\u{1F9FE}'}
          </div>
          <div style={S.metricLabel}>Transactions</div>
          <div style={S.metricValue}>{recentActivityData.length}</div>
          <div style={S.metricTrend}>{recentActivityData.length > 0 ? 'Today so far' : 'None yet today'}</div>
          <div style={S.progressBar}>
            <div style={S.progressFill(recentActivityData.length > 0 ? Math.min(100, recentActivityData.length * 10) : 0, '#c97d1a')} />
          </div>
        </div>

        {/* Alerts Card */}
        <div style={S.metricCard}>
          <div style={S.iconCircle('#c0392b')}>
            {'\u{26A0}'}
          </div>
          <div style={S.metricLabel}>Alerts</div>
          <div style={S.metricValue}>{lowStock.length}</div>
          <div style={S.metricTrend}>{lowStock.length > 0 ? `${lowStock.length} items need attention` : 'All clear'}</div>
          <div style={S.progressBar}>
            <div style={S.progressFill(lowStock.length > 0 ? 28 : 0, '#c0392b')} />
          </div>
        </div>
      </div>

      {/* Two-column layout: Chart + Activity Feed */}
      <div style={S.twoCol}>
        {/* Revenue This Week Chart */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Revenue This Week</h3>
          <div style={S.chartBar}>
            {chartData.map((item, idx) => (
              <div key={idx} style={S.barColumn}>
                <div style={S.barValue}>
                  {item.amount > 0 ? fmt(item.amount, 'zwd').replace('ZWD', '').trim() : '-'}
                </div>
                <div style={S.bar((item.amount / maxAmount) * 140)} />
                <div style={S.barLabel}>{item.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sales feed — clarified label 2026-04-30 because users
            were expecting product additions to appear here. This panel
            only shows the last few completed sales (Sale records),
            not catalogue mutations. */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Recent sales</h3>
          <div style={S.activityFeed}>
            {activityItems.length > 0 ? (
              activityItems.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    ...S.activityItem,
                    ...(idx === activityItems.length - 1 ? S.activityItem_last : {}),
                  }}
                >
                  <div style={S.activityDot(item.dot)} />
                  <div style={S.activityContent}>
                    <h4 style={S.activityTitle}>{item.title}</h4>
                    <p style={S.activityDesc}>{item.desc}</p>
                    <p style={S.activityTime}>{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: 12,
                }}
              >
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={S.card}>
        <h3 style={S.sectionTitle}>Recent Transactions</h3>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Transaction ID</th>
              <th style={S.th}>Items</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Payment</th>
              <th style={S.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentActivityData.slice(0, 10).map((activity) => (
              <tr key={activity.id}>
                <td style={S.td}>
                  <strong>{activity.receipt || '-'}</strong>
                </td>
                <td style={S.td}>{activity.items_count || 0}</td>
                <td style={S.td}>
                  <strong>{fmt(activity.total, 'zwd')}</strong>
                </td>
                <td style={S.td}>
                  <span style={S.badge('amber')}>
                    {activity.method ? (activity.method.charAt(0).toUpperCase() + activity.method.slice(1)) : 'Unknown'}
                  </span>
                </td>
                <td style={S.td}>{activity.time ? new Date(activity.time).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Dashboard Summary */}
      <div style={{ marginTop: 16 }}>
        <AIInsightCard feature="retail_dashboard_summary" title="AI Daily Summary" />
      </div>
    </div>
  );
}
