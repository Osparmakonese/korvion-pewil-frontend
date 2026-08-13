import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlatformAnalytics } from '../api/coreApi';
import useIsMobile from '../hooks/useIsMobile';
import { fmt } from '../utils/format';

/**
 * Platform Analytics — the founder's control room. Super-admin only.
 *
 * Retail-first: tenants, activity, subscriptions, MRR, daily signups,
 * every tenant in a searchable table, and password-change requests.
 * Farm appears only as a number in the module split.
 */
const G = '#1a6b3a';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e3e8e4';

const S = {
  page: { maxWidth: 1180, margin: '0 auto', padding: 20, fontFamily: "'Inter', sans-serif" },
  headRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 800, margin: '0 0 2px', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: INK },
  sub: { fontSize: 12.5, color: MUTED, margin: 0 },
  refreshBtn: (busy) => ({
    padding: '9px 16px', borderRadius: 9, fontWeight: 700, fontSize: 12.5,
    cursor: busy ? 'default' : 'pointer', border: `1px solid ${G}`,
    background: busy ? '#f0fdf4' : G, color: busy ? G : '#fff',
  }),
  kpiGrid: (mobile) => ({
    display: 'grid',
    gridTemplateColumns: mobile ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(auto-fit, minmax(155px, 1fr))',
    gap: 12, marginBottom: 18,
  }),
  kpi: (accent) => ({ background: '#fff', border: `1px solid ${LINE}`, borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: '13px 15px' }),
  kpiLabel: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: INK, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", marginTop: 2 },
  kpiMeta: { fontSize: 11.5, color: MUTED, marginTop: 2 },
  card: { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 16 },
  cardH: { fontSize: 13, fontWeight: 800, color: INK, margin: '0 0 12px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 640 },
  th: { fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '7px 8px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' },
  td: { padding: '7px 8px', borderBottom: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg, display: 'inline-block' }),
  search: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12.5, width: 240, maxWidth: '100%', boxSizing: 'border-box' },
  barsRow: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 110, padding: '0 2px' },
  bar: (h, hot) => ({ flex: 1, height: `${h}%`, minHeight: 2, background: hot ? G : '#a7d3b9', borderRadius: '3px 3px 0 0' }),
  empty: { padding: '14px 8px', fontSize: 12.5, color: MUTED },
};

const fdate = (s) => (s ? new Date(s).toLocaleDateString() : '—');
const STATUS_PILL = {
  trial: ['#e0f2fe', '#0369a1'],
  active: ['#e8f5ee', G],
  lapsed: ['#fee2e2', '#b91c1c'],
  none: ['#f1f5f9', '#64748b'],
  pending: ['#fef3c7', '#92400e'],
  completed: ['#e8f5ee', G],
};
function StatusPill({ st }) {
  const [bg, fg] = STATUS_PILL[st] || STATUS_PILL.none;
  return <span style={S.pill(bg, fg)}>{st}</span>;
}

export default function PlatformAnalytics() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['platformAnalytics'],
    queryFn: getPlatformAnalytics,
    staleTime: 60000,
  });

  const tenants = useMemo(() => {
    const rows = (data && data.tenants) || [];
    const q = search.trim().toLowerCase();
    const filtered = !q ? rows : rows.filter((t) =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.owner_email || '').toLowerCase().includes(q) ||
      (t.country || '').toLowerCase().includes(q) ||
      (t.module || '').toLowerCase().includes(q) ||
      (t.plan || '').toLowerCase().includes(q) ||
      (t.status || '').toLowerCase().includes(q)
    );
    // Newest signups first (backend already sends created desc; keep it stable)
    return [...filtered].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [data, search]);

  if (isLoading) return <div style={{ ...S.page, color: '#94a3b8' }}>Loading platform analytics…</div>;
  if (error) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, color: '#b91c1c' }}>
          Could not load platform analytics — this page is for super-admins only.
          <div style={{ marginTop: 10 }}>
            <button style={S.refreshBtn(false)} onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const sg = data.signups || {};
  const sub = data.subscriptions || {};
  const rev = data.revenue || {};
  const daily = sg.daily || [];
  const maxDaily = Math.max(1, ...daily.map((d) => d.signups));
  const split = data.module_split || {};
  const retailCount = split.retail || 0;
  const farmCount = split.farm || 0;
  const resets = data.password_resets || [];
  const pendingResets = resets.filter((r) => r.status === 'pending').length;

  return (
    <div style={S.page}>
      <div style={S.headRow}>
        <div>
          <h1 style={S.h1}>Platform Analytics</h1>
          <p style={S.sub}>Every Pewil tenant — signups, activity, subscriptions and password-change requests. Super-admin only.</p>
        </div>
        <button style={S.refreshBtn(isFetching)} disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI cards */}
      <div style={S.kpiGrid(isMobile)}>
        <div style={S.kpi(G)}>
          <div style={S.kpiLabel}>Total tenants</div>
          <div style={S.kpiVal}>{sg.total ?? 0}</div>
          <div style={S.kpiMeta}>Retail {retailCount} · Farm {farmCount}</div>
        </div>
        <div style={S.kpi('#0369a1')}>
          <div style={S.kpiLabel}>Active (7d)</div>
          <div style={S.kpiVal}>{data.active_tenants_7d ?? 0}</div>
          <div style={S.kpiMeta}>tenants with a login this week</div>
        </div>
        <div style={S.kpi('#2d9e58')}>
          <div style={S.kpiLabel}>Paying</div>
          <div style={S.kpiVal}>{sub.active_paying ?? 0}</div>
          <div style={S.kpiMeta}>{sub.conversion_pct ?? 0}% of signups</div>
        </div>
        <div style={S.kpi('#c97d1a')}>
          <div style={S.kpiLabel}>Trials running</div>
          <div style={S.kpiVal}>{sub.trialing ?? 0}</div>
          <div style={S.kpiMeta}>{data.trials_expiring_3d ?? 0} expiring ≤3 days</div>
        </div>
        <div style={S.kpi('#7c3aed')}>
          <div style={S.kpiLabel}>Est. MRR</div>
          <div style={S.kpiVal}>{fmt(rev.mrr || 0, 'USD')}</div>
          <div style={S.kpiMeta}>Plans {fmt(rev.plan_mrr || 0, 'USD')} · Add-ons {fmt(rev.addon_mrr || 0, 'USD')}</div>
        </div>
        <div style={S.kpi('#0f766e')}>
          <div style={S.kpiLabel}>Signups 7 / 30d</div>
          <div style={S.kpiVal}>{sg.new_7d ?? 0} / {sg.new_30d ?? 0}</div>
          <div style={S.kpiMeta}>new tenants this week / month</div>
        </div>
      </div>

      {/* Daily signups — last 30 days */}
      <div style={S.card}>
        <h3 style={S.cardH}>Signups — last 30 days</h3>
        {daily.length === 0 ? (
          <div style={S.empty}>No signup data yet.</div>
        ) : (
          <>
            <div style={S.barsRow}>
              {daily.map((d, i) => (
                <div
                  key={d.date || i}
                  title={`${d.date}: ${d.signups} signup${d.signups === 1 ? '' : 's'}`}
                  style={S.bar((d.signups / maxDaily) * 100, d.signups > 0)}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
              <span>{fdate(daily[0] && daily[0].date)}</span>
              <span>{fdate(daily[daily.length - 1] && daily[daily.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>

      {/* Every tenant — searchable */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ ...S.cardH, margin: 0 }}>
            All signups <span style={{ color: '#94a3b8', fontWeight: 700 }}>· {tenants.length} shown</span>
          </h3>
          <input
            style={S.search}
            placeholder="Search name, email, country, plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={S.tableWrap}>
          <div style={{ overflowX: 'auto' }}><table style={S.table}>
            <thead><tr>
              <th style={S.th}>Tenant</th><th style={S.th}>Owner email</th><th style={S.th}>Country</th>
              <th style={S.th}>Module</th><th style={S.th}>Plan</th><th style={S.th}>Status</th>
              <th style={S.th}>Created</th><th style={S.th}>Last active</th>
            </tr></thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td style={S.td} colSpan={8}>
                  {search ? 'No tenants match your search.' : 'No tenants yet.'}
                </td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td style={S.td}><b>{t.name}</b></td>
                  <td style={S.td}>{t.owner_email || '—'}</td>
                  <td style={S.td}>{t.country || '—'}</td>
                  <td style={S.td} title={t.module}><span style={{ textTransform: 'capitalize' }}>{t.module || '—'}</span></td>
                  <td style={S.td}><span style={{ textTransform: 'capitalize' }}>{t.plan || '—'}</span></td>
                  <td style={S.td}><StatusPill st={t.status || 'none'} /></td>
                  <td style={S.td}>{fdate(t.created_at)}</td>
                  <td style={S.td}>{fdate(t.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      {/* Password-change requests + module split */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16 }}>
        <div style={{ ...S.card, marginBottom: 16 }}>
          <h3 style={S.cardH}>
            Password-change requests
            {pendingResets > 0 && (
              <span style={{ ...S.pill('#fef3c7', '#92400e'), marginLeft: 8 }}>{pendingResets} pending</span>
            )}
          </h3>
          <div style={S.tableWrap}>
            <div style={{ overflowX: 'auto' }}><table style={{ ...S.table, minWidth: 420 }}>
              <thead><tr>
                <th style={S.th}>Email</th><th style={S.th}>Tenant</th>
                <th style={S.th}>Requested</th><th style={S.th}>Status</th>
              </tr></thead>
              <tbody>
                {resets.length === 0 && (
                  <tr><td style={S.td} colSpan={4}>No password-reset requests yet.</td></tr>
                )}
                {resets.map((r, i) => (
                  <tr key={i}>
                    <td style={S.td}>{r.email}</td>
                    <td style={S.td}>{r.tenant || '—'}</td>
                    <td style={S.td}>{r.requested_at ? new Date(r.requested_at).toLocaleString() : '—'}</td>
                    <td style={S.td}><StatusPill st={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <h3 style={S.cardH}>Module split</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: '#f0fdf4', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={S.kpiLabel}>Retail</div>
              <div style={{ ...S.kpiVal, color: G }}>{retailCount}</div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={S.kpiLabel}>Farm</div>
              <div style={S.kpiVal}>{farmCount}</div>
            </div>
          </div>
          {Object.entries(split).filter(([m]) => m !== 'retail' && m !== 'farm').map(([m, c]) => (
            <div key={m} style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>
              {m}: <b>{c}</b>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
            Tenant counts by module across the whole platform.
          </div>
        </div>
      </div>
    </div>
  );
}
