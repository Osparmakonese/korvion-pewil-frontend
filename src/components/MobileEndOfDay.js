/**
 * MobileEndOfDay.js — Frame 6 of locked Part 2 mockup.
 *
 * Drop-in replacement for the dense desktop EndOfDayReport at viewport
 * ≤ 500px. Reuses getEndOfDayReport() so data is identical; only the
 * layout differs. See mobile-mockups/PEWIL_MOBILE_PREVIEW_PART2_2026-04-28.html
 * Frame 6 for the visual reference.
 *
 * Data shape (from /retail/analytics/end_of_day/):
 *   summary { gross_sales, returns_refunds, discounts_given, net_revenue,
 *             transaction_count, avg_transaction, returns_count }
 *   payment_breakdown [{ method, total }]
 *   cash_drawer { opening_float, cash_sales, cash_returns, expected_in_drawer }
 *   hourly_trend [{ hour, total }]
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEndOfDayReport } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  bg:      '#ffffff',
  surface: '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  greenT:  '#e8f5ee',
  amber:   '#c77700',
  amberT:  '#fdeedd',
  red:     '#c0392b',
  redT:    '#fde8e8',
  blue:    '#2563eb',
  purple:  '#7c3aed',
};

const PAY_COLORS = [T.green, T.blue, T.amber, T.purple, T.muted];

const prettyMethod = (m) => {
  if (!m) return '—';
  const s = String(m).toLowerCase();
  if (s === 'mobile_money' || s === 'ecocash') return 'EcoCash';
  if (s === 'cash') return 'Cash';
  if (s === 'card') return 'Card';
  if (s === 'bank_transfer') return 'Bank';
  if (s === 'mixed') return 'Split';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function MobileEndOfDay() {
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['end-of-day-report', reportDate],
    queryFn: () => getEndOfDayReport(reportDate),
    staleTime: 30000,
  });

  const data = report || {
    summary: {
      gross_sales: 0, returns_refunds: 0, discounts_given: 0, net_revenue: 0,
      transaction_count: 0, avg_transaction: 0, returns_count: 0,
    },
    payment_breakdown: [],
    cash_drawer: {
      opening_float: 0, cash_sales: 0, cash_returns: 0, expected_in_drawer: 0,
    },
    hourly_trend: [],
  };

  const summary = data.summary || {};
  const breakdown = data.payment_breakdown || [];
  const drawer = data.cash_drawer || {};
  const totalPay = breakdown.reduce((s, m) => s + (parseFloat(m.total) || 0), 0);

  const dateLabel = (() => {
    try {
      return new Date(reportDate).toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
      });
    } catch (_) { return reportDate; }
  })();

  return (
    <div style={page}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>End of day</div>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22, fontWeight: 700, color: T.ink, marginTop: 2,
          }}>{dateLabel}</div>
        </div>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          style={{
            padding: '8px 10px', border: `1px solid ${T.line}`,
            borderRadius: 10, fontSize: 12, color: T.ink, background: '#fff',
          }}
        />
      </div>

      {/* Net hero */}
      <div style={{
        background: `linear-gradient(135deg, ${T.green} 0%, ${T.green2} 100%)`,
        color: '#fff',
        borderRadius: 22,
        padding: '18px 20px',
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', top: -80, right: -60,
        }} />
        <div style={{
          fontSize: 11, opacity: 0.85, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Net revenue</div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 38, fontWeight: 700, lineHeight: 1.1, marginTop: 4,
        }}>
          {fmt(parseFloat(summary.net_revenue) || 0, 'zwd')}
        </div>
        <div style={{
          marginTop: 8, fontSize: 12,
          display: 'inline-flex', gap: 8, alignItems: 'center',
          background: 'rgba(255,255,255,0.15)',
          padding: '4px 10px', borderRadius: 999,
        }}>
          {summary.transaction_count || 0} sales · avg {fmt(parseFloat(summary.avg_transaction) || 0, 'zwd')}
        </div>
      </div>

      {/* 2x2 metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Tile
          label="Gross sales"
          value={fmt(parseFloat(summary.gross_sales) || 0, 'zwd')}
          tint={T.greenT}
          fg={T.green}
        />
        <Tile
          label="Returns"
          value={`-${fmt(parseFloat(summary.returns_refunds) || 0, 'zwd')}`}
          tint={T.redT}
          fg={T.red}
        />
        <Tile
          label="Discounts"
          value={`-${fmt(parseFloat(summary.discounts_given) || 0, 'zwd')}`}
          tint={T.amberT}
          fg={T.amber}
        />
        <Tile
          label="Returns count"
          value={String(summary.returns_count || 0)}
          tint={T.surface}
          fg={T.ink}
        />
      </div>

      {/* Payment breakdown */}
      <div style={card}>
        <div style={cardLabel}>Payment breakdown</div>
        {breakdown.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 13, padding: '8px 0' }}>
            No sales yet for this day.
          </div>
        ) : breakdown.map((m, idx) => {
          const total = parseFloat(m.total) || 0;
          const pct = totalPay > 0 ? (total / totalPay) * 100 : 0;
          const fg = PAY_COLORS[idx % PAY_COLORS.length];
          return (
            <div key={idx} style={{ marginBottom: idx < breakdown.length - 1 ? 12 : 0 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 4, fontSize: 13,
              }}>
                <span style={{ color: T.inkSoft, fontWeight: 600, textTransform: 'capitalize' }}>
                  {prettyMethod(m.method)}
                </span>
                <span>
                  <strong style={{ color: T.ink, fontWeight: 700 }}>
                    {fmt(total, 'zwd')}
                  </strong>
                  <span style={{ color: T.muted, fontSize: 11, marginLeft: 6 }}>
                    {Math.round(pct)}%
                  </span>
                </span>
              </div>
              <div style={{
                height: 6, borderRadius: 999, background: T.surface,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(100, pct)}%`,
                  height: '100%', background: fg, borderRadius: 999,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash drawer */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={cardLabel}>Cash drawer</div>
        <DrawerRow label="Opening float" value={fmt(parseFloat(drawer.opening_float) || 0, 'zwd')} />
        <DrawerRow label="+ Cash sales" value={fmt(parseFloat(drawer.cash_sales) || 0, 'zwd')} />
        <DrawerRow label="− Cash returns" value={`-${fmt(parseFloat(drawer.cash_returns) || 0, 'zwd')}`} />
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontWeight: 700, color: T.ink, fontSize: 13 }}>= Expected in drawer</span>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18, fontWeight: 700, color: T.green,
          }}>
            {fmt(parseFloat(drawer.expected_in_drawer) || 0, 'zwd')}
          </span>
        </div>
        <div style={{
          marginTop: 10,
          display: 'inline-block', padding: '4px 10px', borderRadius: 999,
          background: T.greenT, color: T.green,
          fontSize: 11, fontWeight: 700,
        }}>● Balanced</div>
      </div>

      <button
        onClick={() => refetch()}
        disabled={isLoading}
        style={{
          marginTop: 14, width: '100%',
          padding: 14, borderRadius: 14, border: 'none',
          background: T.ink, color: '#fff',
          fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
          opacity: isLoading ? 0.6 : 1, cursor: 'pointer',
        }}
      >
        {isLoading ? 'Loading…' : 'Refresh report'}
      </button>
      <div style={{ height: 24 }} />
    </div>
  );
}

function Tile({ label, value, tint, fg }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${T.line}`,
      borderRadius: 14, padding: 12,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 18, fontWeight: 700, color: fg, marginTop: 4, lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        marginTop: 8, height: 4, borderRadius: 999,
        background: tint,
      }} />
    </div>
  );
}

function DrawerRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '6px 0', fontSize: 13, color: T.inkSoft,
    }}>
      <span>{label}</span>
      <span style={{ color: T.ink, fontWeight: 600 }}>{value}</span>
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
  marginBottom: 10,
};
