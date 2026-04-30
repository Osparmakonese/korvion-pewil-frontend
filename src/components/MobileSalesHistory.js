/**
 * MobileSalesHistory.js — Frame 5 of locked Part 2 mockup.
 *
 * Receipt-style sale feed with gross-revenue hero for viewport ≤ 500px.
 * Reuses getSales() so data is identical; only the layout differs.
 *
 * Sale shape (from /retail/sales/):
 *   id, receipt_number, items_data[], subtotal, discount, tax, total,
 *   payment_method, created_at, customer_name, payments_data (mixed)
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSales } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
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
};

const FILTERS = [
  { key: 'today',  label: 'Today'  },
  { key: 'week',   label: '7 days' },
  { key: 'month',  label: '30 days'},
  { key: 'all',    label: 'All'    },
];

const prettyMethod = (m) => {
  const s = String(m || '').toLowerCase();
  if (s === 'mobile_money' || s === 'ecocash') return 'EcoCash';
  if (s === 'cash') return 'Cash';
  if (s === 'card') return 'Card';
  if (s === 'bank_transfer') return 'Bank';
  if (s === 'mixed') return 'Split';
  return m || '—';
};

const methodPillStyle = (m) => {
  const s = String(m || '').toLowerCase();
  if (s === 'mobile_money' || s === 'ecocash') return { bg: T.amberT, fg: T.amber };
  if (s === 'mixed')                            return { bg: '#eef2ff', fg: '#4338ca' };
  if (s === 'card')                             return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (s === 'bank_transfer')                    return { bg: '#f3e8ff', fg: '#6b21a8' };
  return { bg: T.greenT, fg: T.green }; // cash default
};

function withinFilter(sale, filter) {
  if (filter === 'all') return true;
  if (!sale.created_at) return false;
  const dt = new Date(sale.created_at);
  const now = new Date();
  if (filter === 'today') {
    return dt.toDateString() === now.toDateString();
  }
  const days = filter === 'week' ? 7 : filter === 'month' ? 30 : 0;
  if (days === 0) return true;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return dt >= cutoff;
}

export default function MobileSalesHistory() {
  const [filter, setFilter] = useState('today');

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-history-mobile'],
    queryFn: getSales,
    staleTime: 30000,
  });

  const filtered = useMemo(
    () => (Array.isArray(sales) ? sales : []).filter(s => withinFilter(s, filter)),
    [sales, filter]
  );

  const gross = filtered.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
  const count = filtered.length;
  const avg = count > 0 ? gross / count : 0;

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sales history</div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: T.ink, marginTop: 2,
        }}>{FILTERS.find(f => f.key === filter)?.label}</div>
      </div>

      {/* Gross revenue hero */}
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
        }}>Gross revenue</div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 38, fontWeight: 700, lineHeight: 1.1, marginTop: 4,
        }}>
          {fmt(gross, 'zwd')}
        </div>
        <div style={{
          marginTop: 8, fontSize: 12,
          display: 'inline-flex', gap: 8, alignItems: 'center',
          background: 'rgba(255,255,255,0.15)',
          padding: '4px 10px', borderRadius: 999,
        }}>
          {count} {count === 1 ? 'sale' : 'sales'} · avg {fmt(avg, 'zwd')}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        marginBottom: 14, paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
      }}>
        {FILTERS.map(f => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0,
                padding: '8px 14px', borderRadius: 999,
                border: `1px solid ${active ? T.ink : T.line}`,
                background: active ? T.ink : '#fff',
                color: active ? '#fff' : T.inkSoft,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >{f.label}</button>
          );
        })}
      </div>

      {/* Receipt feed */}
      <div style={{
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>
            Loading sales…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No sales in this window. Open a cashier session to start ringing them up.
          </div>
        ) : filtered.map((sale, idx) => {
          const pill = methodPillStyle(sale.payment_method);
          return (
            <div key={sale.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: idx < filtered.length - 1 ? `1px solid ${T.surface}` : 'none',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: T.surface,
                display: 'grid', placeItems: 'center', fontSize: 18,
                flexShrink: 0,
              }}>🧾</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 13, color: T.ink,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  Receipt #{sale.receipt_number || sale.id} · {sale.customer_name || 'Walk-in'}
                </div>
                <div style={{
                  fontSize: 11, color: T.muted, marginTop: 3,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 7px',
                    borderRadius: 999, background: pill.bg, color: pill.fg,
                  }}>{prettyMethod(sale.payment_method)}</span>
                  <span>
                    {sale.created_at && new Date(sale.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {(sale.items_data?.length || 0) > 0 && (
                    <span>· {sale.items_data.length} items</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700, fontSize: 16, color: T.ink, lineHeight: 1.1,
                }}>
                  {fmt(parseFloat(sale.total) || 0, 'zwd')}
                </div>
                {parseFloat(sale.discount) > 0 && (
                  <div style={{ fontSize: 10, color: T.amber, marginTop: 2 }}>
                    -{fmt(parseFloat(sale.discount), 'zwd')} disc
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 24 }} />
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
