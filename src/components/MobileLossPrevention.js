/**
 * MobileLossPrevention.js — Frame 9 of locked Part 2 mockup.
 *
 * Drop-in replacement for the dense desktop LossPrevention overview at
 * viewport ≤ 500px. Reuses getLossPreventionSummary() + getCCTVEvents()
 * so data is identical; only the layout differs. See
 * mobile-mockups/PEWIL_MOBILE_PREVIEW_PART2_2026-04-28.html Frame 9.
 *
 * Summary fields used:
 *   cctv_events_last_24h, high_risk_events_last_24h, unreviewed_events,
 *   open_sweethearting_flags, after_hours_alerts_last_7d, till_tamper_last_7d,
 *   shrinkage_value_last_7d, lowest_trust_cashiers[]
 *
 * The mobile risk-score hero is computed from high-risk events ratio and
 * un-reviewed events count — a single number a manager can scan at a glance
 * (the desktop dashboard surfaces these as 8 separate KPIs which doesn't
 * survive the small viewport).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLossPreventionSummary, getCCTVEvents } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  surface: '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  greenT:  '#e8f5ee',
  amber:   '#c77700',
  amberT:  '#fdeedd',
  red:     '#c0392b',
  redT:    '#fde8e8',
};

function severityBucket(score) {
  const n = Number(score) || 0;
  if (n >= 50) return 'high';
  if (n >= 30) return 'medium';
  return 'low';
}

const SEVERITY_STYLE = {
  high:   { fg: T.red,   bg: T.redT,   label: 'HIGH' },
  medium: { fg: T.amber, bg: T.amberT, label: 'MED'  },
  low:    { fg: T.green, bg: T.greenT, label: 'LOW'  },
};

function riskScoreFromSummary(s) {
  // Composite 0–100 score: weight high-risk events + open flags + tamper.
  // Caps each component so a single noisy day can't push to 100.
  const high24 = Math.min(40, (s.high_risk_events_last_24h || 0) * 8);
  const flags  = Math.min(30, (s.open_sweethearting_flags || 0) * 6);
  const tamper = Math.min(20, (s.till_tamper_last_7d || 0) * 5);
  const after  = Math.min(10, (s.after_hours_alerts_last_7d || 0) * 2);
  return Math.min(100, high24 + flags + tamper + after);
}

export default function MobileLossPrevention() {
  const { data: summary, isLoading: lpLoading } = useQuery({
    queryKey: ['loss-prevention-summary'],
    queryFn: getLossPreventionSummary,
    staleTime: 60000,
  });

  const { data: events, isLoading: evLoading } = useQuery({
    queryKey: ['cctv-events', { limit: 8 }],
    queryFn: () => getCCTVEvents({ limit: 8 }),
    staleTime: 60000,
  });

  const s = summary || {};
  const eventList = Array.isArray(events?.results) ? events.results : (Array.isArray(events) ? events : []);
  const score = riskScoreFromSummary(s);
  const scoreBand = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const heroBg = scoreBand === 'high'   ? `linear-gradient(135deg, #b91c1c, ${T.red})`
                : scoreBand === 'medium' ? `linear-gradient(135deg, #b25c00, ${T.amber})`
                                          : `linear-gradient(135deg, ${T.green}, #2d9e58)`;
  const heroLabel = scoreBand === 'high' ? 'Action needed'
                    : scoreBand === 'medium' ? 'Watch closely'
                    : 'All clear';

  return (
    <div style={page}>
      {/* Risk score hero */}
      <div style={{
        background: heroBg,
        color: '#fff',
        borderRadius: 22,
        padding: '20px 22px',
        marginBottom: 14,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', top: -80, right: -60,
        }} />
        <div style={{
          fontSize: 11, opacity: 0.85, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Risk score · 24h composite</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 50, fontWeight: 700, lineHeight: 1,
          }}>{score}</div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>/ 100</div>
        </div>
        <div style={{
          marginTop: 10, fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.18)',
          padding: '4px 10px', borderRadius: 999, fontWeight: 700,
        }}>
          ● {heroLabel}
        </div>
      </div>

      {/* 4-tile grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 10, marginBottom: 14,
      }}>
        <Tile
          label="High-risk events (24h)"
          value={s.high_risk_events_last_24h ?? 0}
          fg={T.red}
          warn={(s.high_risk_events_last_24h ?? 0) > 0}
        />
        <Tile
          label="Open sweethearting"
          value={s.open_sweethearting_flags ?? 0}
          fg={T.red}
          warn={(s.open_sweethearting_flags ?? 0) > 0}
        />
        <Tile
          label="Unreviewed events"
          value={s.unreviewed_events ?? 0}
          fg={T.amber}
          warn={(s.unreviewed_events ?? 0) > 0}
        />
        <Tile
          label="Shrinkage (7d)"
          value={fmt(parseFloat(s.shrinkage_value_last_7d || 0), 'zwd')}
          fg={T.red}
          warn={(parseFloat(s.shrinkage_value_last_7d) || 0) > 0}
        />
      </div>

      {/* Event feed */}
      <div style={card}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 10,
        }}>
          <div style={cardLabel}>Recent events</div>
          {lpLoading || evLoading ? (
            <div style={{ fontSize: 11, color: T.muted }}>Loading…</div>
          ) : null}
        </div>
        {eventList.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
            No events captured yet. Detectors run nightly.
          </div>
        ) : eventList.slice(0, 8).map((e) => {
          const sev = severityBucket(e.risk_score);
          const style = SEVERITY_STYLE[sev];
          return (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: `1px solid ${T.surface}`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: style.bg,
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 800, color: style.fg,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>{Number(e.risk_score || 0).toFixed(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 13, color: T.ink,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {e.event_type ? String(e.event_type).replace(/_/g, ' ') : 'Event'}
                  {e.cashier_name ? ` · ${e.cashier_name}` : ''}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {e.location || e.till_id ? `Till ${e.till_id || e.location}` : ''}
                  {e.created_at ? ` · ${new Date(e.created_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}` : ''}
                </div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: 999,
                background: style.bg, color: style.fg,
              }}>{style.label}</div>
            </div>
          );
        })}
      </div>

      {/* Lowest-trust cashiers */}
      {s.lowest_trust_cashiers && s.lowest_trust_cashiers.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={cardLabel}>Lowest trust — review</div>
          {s.lowest_trust_cashiers.slice(0, 4).map((c, idx) => (
            <div key={c.cashier_id || idx} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 0',
              borderBottom: idx < Math.min(s.lowest_trust_cashiers.length, 4) - 1
                ? `1px solid ${T.surface}` : 'none',
            }}>
              <span style={{ color: T.ink, fontWeight: 600, fontSize: 13 }}>
                {c.cashier_name || 'Unknown'}
              </span>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, fontSize: 16,
                color: (c.grade === 'A' || c.grade === 'B') ? T.green
                       : c.grade === 'C' ? T.amber : T.red,
              }}>
                {c.grade || '—'} <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>
                  {Number(c.score ?? 0).toFixed(0)}/100
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

function Tile({ label, value, fg, warn }) {
  return (
    <div style={{
      background: warn ? '#fff' : T.surface,
      border: `1px solid ${warn ? 'rgba(192,57,43,0.18)' : T.line}`,
      borderRadius: 14, padding: 12,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 22, fontWeight: 700, marginTop: 4, lineHeight: 1.1,
        color: warn ? fg : T.ink,
      }}>{value}</div>
    </div>
  );
}

const page = {
  padding: '12px 16px 0',
  fontFamily: "'Inter', system-ui, sans-serif",
  background: 'transparent',
  minHeight: '100%',
  color: T.ink,
};

const card = {
  background: '#fff',
  border: `1px solid ${T.line}`,
  borderRadius: 16,
  padding: '14px 16px',
};

const cardLabel = {
  fontSize: 11, fontWeight: 700, color: T.inkSoft,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
