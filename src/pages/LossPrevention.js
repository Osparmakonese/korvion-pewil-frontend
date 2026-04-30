/**
 * Pewil Retail — Loss Prevention Dashboard
 *
 * Consolidated anti-theft workspace. Six tabs:
 *   Overview   — KPI summary + run-detectors button
 *   Events     — CCTV event stream (auto-logged + AI-scored)
 *   Flags      — Sweethearting flags (cashier+customer patterns)
 *   Trust      — Cashier trust score leaderboard (7-dimension)
 *   Shrinkage  — Stock-count vs system variance reports
 *   Alerts     — After-hours access + till-tamper events
 *
 * Backend — /api/retail/{cctv-events,sweethearting-flags,cashier-trust,
 *   shrinkage-counts,after-hours-alerts,till-tamper,loss-prevention}
 *
 * All data is tenant-scoped server-side. Owners & managers only.
 */
import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getLossPreventionSummary,
  runLossPreventionDetectors,
  getCCTVEvents,
  updateCCTVEvent,
  getSweetheartingFlags,
  updateSweetheartingFlag,
  getCashierTrustScores,
  getCashierTrustLeaderboard,
  recomputeCashierTrustScores,
  getShrinkageCounts,
  getShrinkageCount,
  createShrinkageCount,
  recordShrinkageLine,
  finalizeShrinkageCount,
  getAfterHoursAlerts,
  updateAfterHoursAlert,
  getTillTamperEvents,
  updateTillTamperEvent,
} from '../api/retailApi';
import { fmt } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import MobileLossPrevention from '../components/MobileLossPrevention';

// ── Design tokens ──
const GREEN = '#1a6b3a';
const GREEN_TINT = '#e8f5ee';
const AMBER = '#c97d1a';
const AMBER_TINT = '#fdeedd';
const RED = '#c0392b';
const RED_TINT = '#fde8e8';
const INK = '#111827';
const INK_3 = '#6b7280';
const BORDER = '#e5e7eb';
const SURFACE = '#f9fafb';

// Shared styles
const card = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: '16px 18px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: INK_3,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
};
const pill = (bg, fg) => ({
  background: bg, color: fg,
  padding: '3px 8px', borderRadius: 10,
  fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  display: 'inline-block',
});
const tdSty = {
  padding: '10px 12px', fontSize: 13,
  borderBottom: `1px solid ${BORDER}`, color: INK,
};
const thSty = {
  padding: '10px 12px', fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: INK_3, fontWeight: 700,
  textAlign: 'left', borderBottom: `1px solid ${BORDER}`,
  background: '#fafbfc',
};
const btnPri = {
  padding: '10px 18px', borderRadius: 8, border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
  background: GREEN, color: '#fff',
};
const btnSec = {
  padding: '8px 14px', borderRadius: 8, border: `1px solid ${BORDER}`,
  fontWeight: 600, fontSize: 12, cursor: 'pointer',
  background: '#fff', color: INK,
};

const SEVERITY_PILL = {
  critical: pill(RED_TINT, RED),
  high: pill(RED_TINT, RED),
  medium: pill(AMBER_TINT, AMBER),
  low: pill(GREEN_TINT, GREEN),
};
const STATUS_PILL = {
  open: pill(RED_TINT, RED),
  investigating: pill(AMBER_TINT, AMBER),
  resolved: pill(GREEN_TINT, GREEN),
  resolved_innocent: pill(GREEN_TINT, GREEN),
  resolved_theft: pill(RED_TINT, RED),
  dismissed: pill('#f1f5f9', INK_3),
  false_positive: pill('#f1f5f9', INK_3),
};

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'events',    label: 'Events' },
  { key: 'flags',     label: 'Flags' },
  { key: 'trust',     label: 'Trust' },
  { key: 'shrinkage', label: 'Shrinkage' },
  { key: 'alerts',    label: 'Alerts' },
];

function gradeColor(grade) {
  if (!grade) return INK_3;
  const letter = String(grade).charAt(0);
  if (letter === 'A') return GREEN;
  if (letter === 'B') return '#2d9e58';
  if (letter === 'C') return AMBER;
  if (letter === 'D') return '#e67e22';
  return RED;
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────
function OverviewTab({ isOwner }) {
  const qc = useQueryClient();
  const { data: summary, isLoading } = useQuery({
    queryKey: ['loss-prevention-summary'],
    queryFn: getLossPreventionSummary,
    staleTime: 60_000,
  });

  const runDet = useMutation({
    mutationFn: runLossPreventionDetectors,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
      qc.invalidateQueries({ queryKey: ['sweethearting-flags'] });
      qc.invalidateQueries({ queryKey: ['till-tamper-events'] });
      qc.invalidateQueries({ queryKey: ['cashier-trust-scores'] });
      qc.invalidateQueries({ queryKey: ['cashier-trust-leaderboard'] });
    },
  });

  if (isLoading) {
    return <div style={{ color: INK_3, padding: 24 }}>Loading loss-prevention summary...</div>;
  }
  const s = summary || {};

  const kpis = [
    { label: 'Events (24h)', value: s.cctv_events_last_24h ?? 0, fg: INK },
    { label: 'High-risk (24h)', value: s.high_risk_events_last_24h ?? 0, fg: RED },
    { label: 'Unreviewed', value: s.unreviewed_events ?? 0, fg: AMBER },
    { label: 'Open flags', value: s.open_sweethearting_flags ?? 0, fg: RED },
    { label: 'After-hours (7d)', value: s.after_hours_alerts_last_7d ?? 0, fg: AMBER },
    { label: 'Till tamper (7d)', value: s.till_tamper_last_7d ?? 0, fg: RED },
    { label: 'Shrinkage drafts', value: s.shrinkage_counts_draft ?? 0, fg: INK },
    { label: 'Shrinkage (7d)', value: fmt(s.shrinkage_value_last_7d ?? 0), fg: RED },
  ];

  return (
    <div>
      {/* Hero + action */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: INK }}>
            Loss-Prevention Overview
          </div>
          <div style={{ color: INK_3, fontSize: 13, marginTop: 4 }}>
            Signal-based anti-theft monitoring. Events are auto-captured and scored as they happen.
          </div>
        </div>
        {isOwner && (
          <button
            style={{ ...btnPri, opacity: runDet.isPending ? 0.6 : 1 }}
            onClick={() => runDet.mutate()}
            disabled={runDet.isPending}
          >
            {runDet.isPending ? 'Running detectors...' : 'Run detectors now'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={card}>
            <div style={sectionLabel}>{k.label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: k.fg }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Lowest-trust cashiers */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionLabel}>Lowest trust — action needed</div>
        {!s.lowest_trust_cashiers || s.lowest_trust_cashiers.length === 0 ? (
          <div style={{ color: INK_3, fontSize: 13 }}>
            No trust scores yet. Run detectors or wait for the nightly job.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {s.lowest_trust_cashiers.map(c => (
              <div key={c.cashier_id || c.cashier_name} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: INK }}>{c.cashier_name || 'Unknown'}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: gradeColor(c.grade) }}>
                    {c.grade || '—'}
                  </span>
                  <span style={{ color: INK_3, fontSize: 12 }}>{Number(c.score ?? 0).toFixed(1)} / 100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, fontSize: 12, color: INK_3 }}>
        Tip: high-risk events (score &gt;= 50) are auto-flagged for review.
        Sweethearting patterns require at least 3 incidents in 30 days before a flag is raised.
        Trust scores re-compute nightly and on demand via the button above.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EVENTS TAB
// ─────────────────────────────────────────────────────────────
function EventsTab() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [minRisk, setMinRisk] = useState('');
  const [reviewedOnly, setReviewedOnly] = useState('');

  const params = useMemo(() => {
    const p = {};
    if (filterType) p.event_type = filterType;
    if (minRisk) p.min_risk = minRisk;
    if (reviewedOnly === 'true') p.reviewed = 'true';
    if (reviewedOnly === 'false') p.reviewed = 'false';
    return p;
  }, [filterType, minRisk, reviewedOnly]);

  const { data, isLoading } = useQuery({
    queryKey: ['cctv-events', params],
    queryFn: () => getCCTVEvents(params),
    staleTime: 30_000,
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, data }) => updateCCTVEvent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cctv-events'] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });

  const rows = data?.results || data || [];

  return (
    <div>
      <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }}>
          <option value="">All event types</option>
          <option value="sale_large">Large sale</option>
          <option value="void">Void</option>
          <option value="refund">Refund</option>
          <option value="return_no_receipt">Return without receipt</option>
          <option value="manager_override">Manager override</option>
          <option value="cash_drop">Cash drop</option>
          <option value="no_sale_open">No-sale drawer open</option>
          <option value="price_override">Price override</option>
          <option value="discount_high">High discount</option>
          <option value="after_hours">After-hours activity</option>
          <option value="session_open">Session open</option>
          <option value="session_close">Session close</option>
          <option value="session_variance_large">Session variance (large)</option>
          <option value="stock_adjustment_negative">Negative stock adjustment</option>
        </select>
        <select value={minRisk} onChange={e => setMinRisk(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }}>
          <option value="">Any risk</option>
          <option value="50">Risk &gt;= 50 (high)</option>
          <option value="30">Risk &gt;= 30 (medium)</option>
        </select>
        <select value={reviewedOnly} onChange={e => setReviewedOnly(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }}>
          <option value="">Any review state</option>
          <option value="false">Unreviewed only</option>
          <option value="true">Reviewed only</option>
        </select>
        <div style={{ color: INK_3, fontSize: 12, marginLeft: 'auto' }}>
          {rows.length} event{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSty}>When</th>
              <th style={thSty}>Type</th>
              <th style={thSty}>Cashier</th>
              <th style={thSty}>Amount</th>
              <th style={thSty}>Risk</th>
              <th style={thSty}>Reviewed</th>
              <th style={thSty}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td style={tdSty} colSpan={7}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td style={tdSty} colSpan={7}>No events match these filters.</td></tr>
            ) : (
              rows.map(r => {
                const sev = (r.risk_score ?? 0) >= 50 ? 'high' : (r.risk_score ?? 0) >= 30 ? 'medium' : 'low';
                return (
                  <tr key={r.id}>
                    <td style={tdSty}>{r.occurred_at ? new Date(r.occurred_at).toLocaleString() : '—'}</td>
                    <td style={tdSty}>{r.event_type_display || r.event_type}</td>
                    <td style={tdSty}>{r.cashier_name || '—'}</td>
                    <td style={tdSty}>{r.amount != null ? fmt(r.amount) : '—'}</td>
                    <td style={tdSty}>
                      <span style={SEVERITY_PILL[sev]}>{Number(r.risk_score ?? 0).toFixed(0)}</span>
                    </td>
                    <td style={tdSty}>
                      {r.reviewed ? (
                        <span style={STATUS_PILL.resolved}>Reviewed</span>
                      ) : (
                        <span style={STATUS_PILL.open}>Unreviewed</span>
                      )}
                    </td>
                    <td style={tdSty}>
                      {!r.reviewed && (
                        <button
                          style={btnSec}
                          onClick={() => reviewMut.mutate({ id: r.id, data: { reviewed: true } })}
                          disabled={reviewMut.isPending}
                        >
                          Mark reviewed
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FLAGS TAB (Sweethearting)
// ─────────────────────────────────────────────────────────────
function FlagsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sweethearting-flags', statusFilter],
    queryFn: () => getSweetheartingFlags(statusFilter ? { status: statusFilter } : {}),
    staleTime: 30_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSweetheartingFlag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sweethearting-flags'] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });

  const rows = data?.results || data || [];

  return (
    <div>
      <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved_innocent">Resolved — innocent</option>
          <option value="resolved_theft">Resolved — theft</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <div style={{ color: INK_3, fontSize: 12, marginLeft: 'auto' }}>
          {rows.length} flag{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSty}>Cashier</th>
              <th style={thSty}>Pattern</th>
              <th style={thSty}>Incidents</th>
              <th style={thSty}>Last seen</th>
              <th style={thSty}>Status</th>
              <th style={thSty}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td style={tdSty} colSpan={6}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td style={tdSty} colSpan={6}>No flags match this filter.</td></tr>
            ) : (
              rows.map(f => (
                <tr key={f.id}>
                  <td style={tdSty}>{f.cashier_name || '—'}</td>
                  <td style={tdSty}>{f.pattern_type_display || f.pattern_type}</td>
                  <td style={tdSty}>{f.incident_count ?? 0}</td>
                  <td style={tdSty}>{f.last_seen_at ? new Date(f.last_seen_at).toLocaleString() : '—'}</td>
                  <td style={tdSty}>
                    <span style={STATUS_PILL[f.status] || STATUS_PILL.open}>
                      {f.status_display || f.status}
                    </span>
                  </td>
                  <td style={tdSty}>
                    {f.status === 'open' && (
                      <button style={btnSec} onClick={() => updateMut.mutate({ id: f.id, data: { status: 'investigating' } })}>
                        Investigate
                      </button>
                    )}
                    {['open', 'investigating'].includes(f.status) && (
                      <>
                        {' '}
                        <button style={btnSec} onClick={() => updateMut.mutate({ id: f.id, data: { status: 'resolved_innocent' } })}>
                          Clear (innocent)
                        </button>
                        {' '}
                        <button style={btnSec} onClick={() => updateMut.mutate({ id: f.id, data: { status: 'resolved_theft' } })}>
                          Confirm theft
                        </button>
                        {' '}
                        <button style={btnSec} onClick={() => updateMut.mutate({ id: f.id, data: { status: 'dismissed' } })}>
                          Dismiss
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRUST TAB
// ─────────────────────────────────────────────────────────────
function TrustTab({ isOwner }) {
  const qc = useQueryClient();

  const { data: scores, isLoading } = useQuery({
    queryKey: ['cashier-trust-scores'],
    queryFn: getCashierTrustScores,
    staleTime: 60_000,
  });
  const { data: lb } = useQuery({
    queryKey: ['cashier-trust-leaderboard'],
    queryFn: getCashierTrustLeaderboard,
    staleTime: 60_000,
  });

  const recMut = useMutation({
    mutationFn: recomputeCashierTrustScores,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier-trust-scores'] });
      qc.invalidateQueries({ queryKey: ['cashier-trust-leaderboard'] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });

  const rows = scores?.results || scores || [];

  return (
    <div>
      <div style={{ ...card, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Cashier Trust Scores</div>
          <div style={{ color: INK_3, fontSize: 12 }}>
            7-dimension weighted average (voids, discounts, variance, returns, speed, shrinkage, overrides)
          </div>
        </div>
        {isOwner && (
          <button style={btnPri} onClick={() => recMut.mutate()} disabled={recMut.isPending}>
            {recMut.isPending ? 'Recomputing...' : 'Recompute now'}
          </button>
        )}
      </div>

      {/* Leaderboard */}
      {lb && (lb.top || lb.bottom) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={card}>
            <div style={sectionLabel}>Top 5 — most trusted</div>
            {(lb.top || []).map(c => (
              <div key={c.id || c.cashier_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${BORDER}` }}>
                <span style={{ fontSize: 13, color: INK }}>{c.cashier_name || 'Unknown'}</span>
                <span style={{ fontWeight: 700, color: gradeColor(c.grade) }}>
                  {c.grade} · {Number(c.score ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            {(!lb.top || lb.top.length === 0) && <div style={{ color: INK_3, fontSize: 13 }}>No scores yet.</div>}
          </div>
          <div style={card}>
            <div style={sectionLabel}>Bottom 5 — watch list</div>
            {(lb.bottom || []).map(c => (
              <div key={c.id || c.cashier_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${BORDER}` }}>
                <span style={{ fontSize: 13, color: INK }}>{c.cashier_name || 'Unknown'}</span>
                <span style={{ fontWeight: 700, color: gradeColor(c.grade) }}>
                  {c.grade} · {Number(c.score ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
            {(!lb.bottom || lb.bottom.length === 0) && <div style={{ color: INK_3, fontSize: 13 }}>No scores yet.</div>}
          </div>
        </div>
      )}

      {/* Full table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSty}>Cashier</th>
              <th style={thSty}>Score</th>
              <th style={thSty}>Grade</th>
              <th style={thSty}>Incidents</th>
              <th style={thSty}>Computed</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td style={tdSty} colSpan={5}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td style={tdSty} colSpan={5}>No trust scores computed yet. Click Recompute.</td></tr>
            ) : (
              rows.map(s => (
                <tr key={s.id}>
                  <td style={tdSty}>{s.cashier_name || '—'}</td>
                  <td style={tdSty}>{Number(s.score ?? 0).toFixed(1)}</td>
                  <td style={tdSty}>
                    <span style={{ ...pill(GREEN_TINT, gradeColor(s.grade)), background: '#f1f5f9' }}>
                      {s.grade || '—'}
                    </span>
                  </td>
                  <td style={tdSty}>{s.incident_count ?? 0}</td>
                  <td style={tdSty}>{s.computed_at ? new Date(s.computed_at).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHRINKAGE TAB
// ─────────────────────────────────────────────────────────────
function ShrinkageTab() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: counts, isLoading } = useQuery({
    queryKey: ['shrinkage-counts'],
    queryFn: getShrinkageCounts,
    staleTime: 30_000,
  });
  const rows = counts?.results || counts || [];

  const createMut = useMutation({
    mutationFn: createShrinkageCount,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['shrinkage-counts'] });
      setShowCreate(false);
      if (c && c.id) setSelectedId(c.id);
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['shrinkage-count', selectedId],
    queryFn: () => getShrinkageCount(selectedId),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  const finalizeMut = useMutation({
    mutationFn: (id) => finalizeShrinkageCount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shrinkage-counts'] });
      qc.invalidateQueries({ queryKey: ['shrinkage-count', selectedId] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });

  const lineMut = useMutation({
    mutationFn: ({ id, data }) => recordShrinkageLine(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shrinkage-count', selectedId] });
    },
  });

  return (
    <div>
      <div style={{ ...card, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Shrinkage Counts</div>
          <div style={{ color: INK_3, fontSize: 12 }}>Record physical counts and surface variance vs system stock.</div>
        </div>
        <button style={btnPri} onClick={() => setShowCreate(true)}>+ New count</button>
      </div>

      {showCreate && (
        <div style={{ ...card, marginBottom: 12 }}>
          <CreateCountForm
            onCreate={(data) => createMut.mutate(data)}
            onCancel={() => setShowCreate(false)}
            isPending={createMut.isPending}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1.5fr' : '1fr', gap: 12 }}>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSty}>Count</th>
                <th style={thSty}>Status</th>
                <th style={thSty}>Variance</th>
                <th style={thSty}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td style={tdSty} colSpan={4}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td style={tdSty} colSpan={4}>No counts yet. Click "New count" to start.</td></tr>
              ) : (
                rows.map(c => (
                  <tr key={c.id} style={selectedId === c.id ? { background: GREEN_TINT } : {}}>
                    <td style={tdSty}>#{c.id} · {c.count_date || '—'}</td>
                    <td style={tdSty}>
                      <span style={pill(c.status === 'finalized' ? GREEN_TINT : AMBER_TINT, c.status === 'finalized' ? GREEN : AMBER)}>
                        {c.status_display || c.status}
                      </span>
                    </td>
                    <td style={tdSty}>{c.total_variance_value != null ? fmt(c.total_variance_value) : '—'}</td>
                    <td style={tdSty}>
                      <button style={btnSec} onClick={() => setSelectedId(c.id)}>Open</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedId && detail && (
          <div style={card}>
            <div style={sectionLabel}>Count #{detail.id} · {detail.count_date}</div>
            <div style={{ fontSize: 13, color: INK, marginBottom: 12 }}>
              Status: <span style={pill(detail.status === 'finalized' ? GREEN_TINT : AMBER_TINT, detail.status === 'finalized' ? GREEN : AMBER)}>{detail.status_display || detail.status}</span>
              {' · '}
              Variance: <strong>{detail.total_variance_value != null ? fmt(detail.total_variance_value) : '—'}</strong>
            </div>

            {detail.status !== 'finalized' && (
              <AddLineForm
                onAdd={(data) => lineMut.mutate({ id: detail.id, data })}
                isPending={lineMut.isPending}
              />
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={thSty}>Product</th>
                  <th style={thSty}>System</th>
                  <th style={thSty}>Counted</th>
                  <th style={thSty}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {(detail.lines || []).map(l => (
                  <tr key={l.id}>
                    <td style={tdSty}>{l.product_name || l.product || '—'}</td>
                    <td style={tdSty}>{l.system_qty ?? '—'}</td>
                    <td style={tdSty}>{l.counted_qty ?? '—'}</td>
                    <td style={{ ...tdSty, color: (l.variance_qty ?? 0) < 0 ? RED : (l.variance_qty ?? 0) > 0 ? AMBER : INK_3 }}>
                      {l.variance_qty ?? 0}
                    </td>
                  </tr>
                ))}
                {(!detail.lines || detail.lines.length === 0) && (
                  <tr><td style={tdSty} colSpan={4}>No lines yet.</td></tr>
                )}
              </tbody>
            </table>

            {detail.status !== 'finalized' && (
              <div style={{ marginTop: 12 }}>
                <button
                  style={btnPri}
                  onClick={() => finalizeMut.mutate(detail.id)}
                  disabled={finalizeMut.isPending || !(detail.lines && detail.lines.length > 0)}
                >
                  {finalizeMut.isPending ? 'Finalizing...' : 'Finalize count'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCountForm({ onCreate, onCancel, isPending }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  return (
    <div>
      <div style={sectionLabel}>New shrinkage count</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6 }} />
        <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, flex: 1, minWidth: 200 }} />
        <button style={btnPri} onClick={() => onCreate({ count_date: date, notes })} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create'}
        </button>
        <button style={btnSec} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AddLineForm({ onAdd, isPending }) {
  const [product, setProduct] = useState('');
  const [counted, setCounted] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="number" placeholder="Product ID" value={product} onChange={e => setProduct(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, width: 120 }} />
      <input type="number" step="0.01" placeholder="Counted qty" value={counted} onChange={e => setCounted(e.target.value)} style={{ padding: 8, border: `1px solid ${BORDER}`, borderRadius: 6, width: 140 }} />
      <button
        style={btnSec}
        onClick={() => {
          if (!product || counted === '') return;
          onAdd({ product: Number(product), counted_qty: Number(counted) });
          setProduct(''); setCounted('');
        }}
        disabled={isPending}
      >
        {isPending ? 'Adding...' : 'Add line'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ALERTS TAB (After-hours + Till-tamper)
// ─────────────────────────────────────────────────────────────
function AlertsTab() {
  const qc = useQueryClient();

  const { data: ah, isLoading: ahLoad } = useQuery({
    queryKey: ['after-hours-alerts'],
    queryFn: () => getAfterHoursAlerts({}),
    staleTime: 30_000,
  });
  const { data: tt, isLoading: ttLoad } = useQuery({
    queryKey: ['till-tamper-events'],
    queryFn: () => getTillTamperEvents({}),
    staleTime: 30_000,
  });

  const ahMut = useMutation({
    mutationFn: ({ id, data }) => updateAfterHoursAlert(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['after-hours-alerts'] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });
  const ttMut = useMutation({
    mutationFn: ({ id, data }) => updateTillTamperEvent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['till-tamper-events'] });
      qc.invalidateQueries({ queryKey: ['loss-prevention-summary'] });
    },
  });

  const ahRows = ah?.results || ah || [];
  const ttRows = tt?.results || tt || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>After-hours access</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSty}>When</th>
              <th style={thSty}>User</th>
              <th style={thSty}>Kind</th>
              <th style={thSty}>Reviewed</th>
              <th style={thSty}>Action</th>
            </tr>
          </thead>
          <tbody>
            {ahLoad ? (
              <tr><td style={tdSty} colSpan={5}>Loading...</td></tr>
            ) : ahRows.length === 0 ? (
              <tr><td style={tdSty} colSpan={5}>No after-hours alerts.</td></tr>
            ) : (
              ahRows.map(a => (
                <tr key={a.id}>
                  <td style={tdSty}>{a.occurred_at ? new Date(a.occurred_at).toLocaleString() : '—'}</td>
                  <td style={tdSty}>{a.user_name || '—'}</td>
                  <td style={tdSty}>{a.access_type_display || a.access_type}</td>
                  <td style={tdSty}>
                    {a.reviewed ? <span style={STATUS_PILL.resolved}>Reviewed</span> : <span style={STATUS_PILL.open}>Unreviewed</span>}
                  </td>
                  <td style={tdSty}>
                    {!a.reviewed && (
                      <button style={btnSec} onClick={() => ahMut.mutate({ id: a.id, data: { reviewed: true } })}>
                        Mark reviewed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>Till-tamper events</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSty}>When</th>
              <th style={thSty}>Cashier</th>
              <th style={thSty}>Pattern</th>
              <th style={thSty}>Severity</th>
              <th style={thSty}>Status</th>
              <th style={thSty}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ttLoad ? (
              <tr><td style={tdSty} colSpan={6}>Loading...</td></tr>
            ) : ttRows.length === 0 ? (
              <tr><td style={tdSty} colSpan={6}>No till-tamper events.</td></tr>
            ) : (
              ttRows.map(t => (
                <tr key={t.id}>
                  <td style={tdSty}>{t.detected_at ? new Date(t.detected_at).toLocaleString() : '—'}</td>
                  <td style={tdSty}>{t.cashier_name || '—'}</td>
                  <td style={tdSty}>{t.pattern_type_display || t.pattern_type}</td>
                  <td style={tdSty}>
                    <span style={SEVERITY_PILL[t.severity] || SEVERITY_PILL.low}>
                      {t.severity_display || t.severity}
                    </span>
                  </td>
                  <td style={tdSty}>
                    <span style={STATUS_PILL[t.status] || STATUS_PILL.open}>
                      {t.status_display || t.status}
                    </span>
                  </td>
                  <td style={tdSty}>
                    {t.status === 'open' && (
                      <button style={btnSec} onClick={() => ttMut.mutate({ id: t.id, data: { reviewed: true } })}>
                        Mark reviewed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function LossPrevention() {
  const { user } = useAuth();
  const role = user?.role;
  const isOwner = role === 'owner';
  const [tab, setTab] = useState('overview');

  // Mobile breakpoint — hooks declared above any early return.
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

  if (isMobile && (role === 'owner' || role === 'manager')) {
    return <MobileLossPrevention />;
  }

  if (role !== 'owner' && role !== 'manager') {
    return (
      <div style={{ padding: 24, background: SURFACE, minHeight: '100%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', ...card }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>Not available</div>
          <div style={{ color: INK_3, fontSize: 13, marginTop: 8 }}>
            Loss Prevention is visible to owners and managers only.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: SURFACE, minHeight: '100%' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, borderBottom: `2px solid ${BORDER}`, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.key ? `2px solid ${GREEN}` : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.01em',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active tab */}
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'events'    && <EventsTab />}
        {tab === 'flags'     && <FlagsTab />}
        {tab === 'trust'     && <TrustTab />}
        {tab === 'shrinkage' && <ShrinkageTab />}
        {tab === 'alerts'    && <AlertsTab />}
      </div>
    </div>
  );
}
