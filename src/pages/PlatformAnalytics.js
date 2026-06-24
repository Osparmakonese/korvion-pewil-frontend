import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlatformAnalytics } from '../api/coreApi';

/**
 * Platform (founder) analytics — super-admin only.
 * Signups, paying customers, MRR/ARR, trials, breakdowns, recent activity.
 */
const G = '#1a6b3a';
const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: "'Inter', sans-serif" },
  h1: { fontSize: 22, fontWeight: 800, margin: '0 0 2px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12.5, color: '#64748b', margin: '0 0 18px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 },
  kpi: (accent) => ({ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: '14px 16px' }),
  kpiLabel: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' },
  kpiVal: { fontSize: 26, fontWeight: 800, color: '#0f172a', fontFamily: "'Playfair Display', serif", marginTop: 2 },
  kpiMeta: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardH: { fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '7px 8px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '7px 8px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg, display: 'inline-block' }),
  barsRow: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' },
  barWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  bar: (h) => ({ width: '70%', height: `${h}%`, minHeight: 2, background: G, borderRadius: '4px 4px 0 0' }),
  barLbl: { fontSize: 9, color: '#94a3b8' },
};

const money = (n) => '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (s) => s ? new Date(s).toLocaleDateString() : '—';
const statusPill = (st) => {
  const map = {
    active: ['#e8f5ee', G], trialing: ['#e0f2fe', '#0369a1'],
    past_due: ['#fef3c7', '#92400e'], cancelled: ['#fee2e2', '#b91c1c'], none: ['#f1f5f9', '#64748b'],
  };
  const [bg, fg] = map[st] || map.none;
  return <span style={S.pill(bg, fg)}>{st}</span>;
};

export default function PlatformAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platformAnalytics'],
    queryFn: getPlatformAnalytics,
    staleTime: 60000,
  });

  if (isLoading) return <div style={{ ...S.page, color: '#94a3b8' }}>Loading platform analytics…</div>;
  if (error) return <div style={{ ...S.page, color: '#b91c1c' }}>Could not load analytics. This page is for super-admins only.</div>;

  const sg = data.signups, sub = data.subscriptions, rev = data.revenue;
  const trend = sg.trend || [];
  const maxSignup = Math.max(1, ...trend.map((t) => t.signups));

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Platform Analytics</h1>
      <p style={S.sub}>Signups, paying customers and revenue across every Pewil tenant. Super-admin only.</p>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        <div style={S.kpi(G)}>
          <div style={S.kpiLabel}>MRR</div>
          <div style={S.kpiVal}>{money(rev.mrr)}</div>
          <div style={S.kpiMeta}>Plans {money(rev.plan_mrr)} · Add-ons {money(rev.addon_mrr)}</div>
        </div>
        <div style={S.kpi('#2d9e58')}>
          <div style={S.kpiLabel}>ARR (run-rate)</div>
          <div style={S.kpiVal}>{money(rev.arr)}</div>
          <div style={S.kpiMeta}>MRR × 12</div>
        </div>
        <div style={S.kpi('#0369a1')}>
          <div style={S.kpiLabel}>Paying</div>
          <div style={S.kpiVal}>{sub.active_paying}</div>
          <div style={S.kpiMeta}>{sub.conversion_pct}% of signups</div>
        </div>
        <div style={S.kpi('#c97d1a')}>
          <div style={S.kpiLabel}>In trial</div>
          <div style={S.kpiVal}>{sub.trialing}</div>
          <div style={S.kpiMeta}>{(data.trials_ending || []).length} ending ≤7 days</div>
        </div>
        <div style={S.kpi('#7c3aed')}>
          <div style={S.kpiLabel}>Total signups</div>
          <div style={S.kpiVal}>{sg.total}</div>
          <div style={S.kpiMeta}>+{sg.new_7d} this week · +{sg.new_30d} this month</div>
        </div>
        <div style={S.kpi('#b91c1c')}>
          <div style={S.kpiLabel}>Churned / Past-due</div>
          <div style={S.kpiVal}>{sub.churned}</div>
          <div style={S.kpiMeta}>{sub.past_due} past-due now</div>
        </div>
      </div>

      {/* Signups trend */}
      <div style={S.card}>
        <h3 style={S.cardH}>Signups — last 8 weeks</h3>
        <div style={S.barsRow}>
          {trend.map((t, i) => (
            <div key={i} style={S.barWrap}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{t.signups}</div>
              <div style={S.bar((t.signups / maxSignup) * 100)} />
              <div style={S.barLbl}>{new Date(t.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue collected + breakdowns */}
      <div style={S.row2}>
        <div style={S.card}>
          <h3 style={S.cardH}>By plan (paying)</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Tier</th><th style={S.th}>Customers</th><th style={S.th}>MRR</th></tr></thead>
            <tbody>
              {Object.keys(data.by_tier || {}).length === 0 && <tr><td style={S.td} colSpan={3}>No paying customers yet.</td></tr>}
              {Object.entries(data.by_tier || {}).map(([tier, v]) => (
                <tr key={tier}><td style={S.td}><b style={{ textTransform: 'capitalize' }}>{tier}</b></td><td style={S.td}>{v.count}</td><td style={S.td}>{money(v.mrr)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={S.cardH}>By module · payments (30d)</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Module</th><th style={S.th}>Customers</th><th style={S.th}>MRR</th></tr></thead>
            <tbody>
              {Object.entries(data.by_module || {}).map(([mod, v]) => (
                <tr key={mod}><td style={S.td}><b style={{ textTransform: 'capitalize' }}>{mod}</b></td><td style={S.td}>{v.count}</td><td style={S.td}>{money(v.mrr)}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#334155' }}>
            Collected last 30 days: <b style={{ color: G }}>{money(rev.paid_total_30d)}</b>
          </div>
        </div>
      </div>

      {/* Recent signups + payments */}
      <div style={S.row2}>
        <div style={S.card}>
          <h3 style={S.cardH}>Recent signups</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Plan</th><th style={S.th}>Status</th><th style={S.th}>Joined</th></tr></thead>
            <tbody>
              {(data.recent_signups || []).map((t, i) => (
                <tr key={i}>
                  <td style={S.td}><b>{t.name}</b>{t.module ? <span style={{ color: '#94a3b8' }}> · {t.module}</span> : null}</td>
                  <td style={S.td} title={t.plan}>{t.plan || '—'}</td>
                  <td style={S.td}>{statusPill(t.status)}</td>
                  <td style={S.td}>{fdate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={S.cardH}>Recent payments</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Amount</th><th style={S.th}>Date</th></tr></thead>
            <tbody>
              {(data.recent_payments || []).length === 0 && <tr><td style={S.td} colSpan={3}>No payments recorded yet.</td></tr>}
              {(data.recent_payments || []).map((p, i) => (
                <tr key={i}><td style={S.td}><b>{p.tenant}</b></td><td style={S.td}>{money(p.amount)}</td><td style={S.td}>{fdate(p.date)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trials ending */}
      {(data.trials_ending || []).length > 0 && (
        <div style={S.card}>
          <h3 style={S.cardH}>Trials ending in the next 7 days — follow up</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Plan</th><th style={S.th}>Days left</th><th style={S.th}>Ends</th></tr></thead>
            <tbody>
              {data.trials_ending.map((t, i) => (
                <tr key={i}><td style={S.td}><b>{t.tenant}</b></td><td style={S.td}>{t.plan}</td>
                  <td style={S.td}><span style={S.pill('#fef3c7', '#92400e')}>{t.days_left}d</span></td><td style={S.td}>{fdate(t.ends)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
