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
  { key: 'today',     label: 'Today'     },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: '7 days'    },
  { key: 'month',     label: '30 days'   },
  { key: 'all',       label: 'All'       },
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const isoDay = (d) => {
  // Local calendar day, not toISOString() — that converts to UTC first and
  // hands back yesterday's date for anyone east of Greenwich after 22:00.
  const x = new Date(d);
  const m = `${x.getMonth() + 1}`.padStart(2, '0');
  const day = `${x.getDate()}`.padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
};
const prettyDay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric' });
};

// WHEN THE SALE WAS RUNG, not when it reached the server. A sale taken while
// the till was offline keeps its real time in `sold_at` and only arrives
// later, so reading `created_at` filed a Saturday's trade under the Monday it
// synced. The desktop history has always read sold_at; this did not.
const saleStamp = (sale) => sale.sold_at || sale.created_at;

const chipStyle = (active) => ({
  flexShrink: 0,
  padding: '8px 14px', borderRadius: 999,
  border: `1px solid ${active ? T.ink : T.line}`,
  background: active ? T.ink : '#fff',
  color: active ? '#fff' : T.inkSoft,
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit',
});

const offlineTag = {
  fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
  background: T.amberT, color: T.amber, textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const dateLabel = {
  display: 'block', fontSize: 10, fontWeight: 700, color: T.muted,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
};

const dateInput = {
  width: '100%', padding: '9px 10px', borderRadius: 10,
  border: `1px solid ${T.line}`, fontSize: 13, fontFamily: 'inherit',
  color: T.ink, background: '#fff', boxSizing: 'border-box',
  // Safari on iPhone shrinks a date input to its content and then clips the
  // year; a minimum height keeps the native picker tappable.
  minHeight: 38,
};

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

function withinFilter(sale, filter, from, to) {
  if (filter === 'all') return true;
  const raw = saleStamp(sale);
  if (!raw) return false;
  const dt = new Date(raw);
  if (isNaN(dt.getTime())) return false;
  const now = new Date();

  if (filter === 'custom') {
    if (!from && !to) return true;
    const a = from || to;
    const b = to || from;
    // Either way round, so picking the second date first still works.
    const lo = startOfDay(new Date(`${a <= b ? a : b}T12:00:00`));
    const hi = endOfDay(new Date(`${a <= b ? b : a}T12:00:00`));
    return dt >= lo && dt <= hi;
  }
  if (filter === 'today') return dt.toDateString() === now.toDateString();
  if (filter === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return dt.toDateString() === y.toDateString();
  }
  // Calendar days, counting today as the first. "7 days" on a Sunday means
  // Monday to Sunday, not "since 3pm last Sunday" — a shopkeeper comparing
  // weeks should not get a part-day at each end.
  const days = filter === 'week' ? 7 : filter === 'month' ? 30 : 0;
  if (days === 0) return true;
  const cutoff = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  return dt >= cutoff;
}

export default function MobileSalesHistory() {
  const [filter, setFilter] = useState('today');
  const [selectedSale, setSelectedSale] = useState(null);
  // Pick any day, or any stretch of days. Leave "To" empty for a single day.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const todayISO = isoDay(new Date());

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-history-mobile'],
    queryFn: getSales,
    staleTime: 30000,
  });

  const filtered = useMemo(
    () => (Array.isArray(sales) ? sales : []).filter(s => withinFilter(s, filter, from, to)),
    [sales, filter, from, to]
  );

  const heading = filter === 'custom'
    ? (from || to
        ? (to && from && to !== from
            ? `${prettyDay(from)} — ${prettyDay(to)}`
            : prettyDay(from || to))
        : 'Pick a date')
    : (FILTERS.find(f => f.key === filter)?.label || '');

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
        }}>{heading}</div>
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
              onClick={() => { setFilter(f.key); setShowPicker(false); }}
              style={chipStyle(active)}
            >{f.label}</button>
          );
        })}
        {/* Any other day, or a stretch of them. */}
        <button
          type="button"
          onClick={() => {
            setShowPicker(v => !v);
            if (filter !== 'custom') setFilter('custom');
          }}
          style={chipStyle(filter === 'custom')}
        >
          {filter === 'custom' && (from || to) ? heading : 'Pick dates'}
        </button>
      </div>

      {showPicker && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
          background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14,
          padding: 12, marginBottom: 14,
        }}>
          <label style={{ flex: '1 1 130px' }}>
            <span style={dateLabel}>From</span>
            <input
              type="date"
              value={from}
              max={to || todayISO}
              onChange={(e) => { setFrom(e.target.value); setFilter('custom'); }}
              style={dateInput}
            />
          </label>
          <label style={{ flex: '1 1 130px' }}>
            <span style={dateLabel}>To <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={todayISO}
              onChange={(e) => { setTo(e.target.value); setFilter('custom'); }}
              style={dateInput}
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); setFilter('today'); setShowPicker(false); }}
              style={{
                padding: '9px 14px', borderRadius: 10, border: `1px solid ${T.line}`,
                background: '#fff', color: T.inkSoft, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Clear</button>
          )}
        </div>
      )}

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
            <div
              key={sale.id || idx}
              onClick={() => setSelectedSale(sale)}
              style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', cursor: 'pointer',
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
                    {saleStamp(sale) && new Date(saleStamp(sale)).toLocaleString(undefined, {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {sale.was_offline && <span style={offlineTag}>offline</span>}
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

      {/* Receipt sheet — slides up when a sale row is tapped */}
      {selectedSale && (
        <div
          onClick={() => setSelectedSale(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', width: '100%', maxWidth: 480,
              borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto',
              padding: '10px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ width: 40, height: 4, background: T.line, borderRadius: 999, margin: '6px auto 16px' }} />

            <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${T.line}` }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{'\u{1F9FE}'}</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 700, color: T.ink }}>
                Receipt #{selectedSale.receipt_number || selectedSale.id}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                {saleStamp(selectedSale) && new Date(saleStamp(selectedSale)).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              {selectedSale.was_offline && (
                <div style={{ fontSize: 10.5, color: T.amber, marginTop: 4, fontWeight: 700 }}>
                  Rung offline{selectedSale.created_at
                    ? ` — reached the system ${new Date(selectedSale.created_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </div>
              )}
              {selectedSale.customer_name && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{selectedSale.customer_name}</div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              {(selectedSale.items_data || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < (selectedSale.items_data.length - 1) ? `1px solid ${T.surface}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{it.product_name || it.name || 'Item'}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                      {(it.qty || it.quantity || 1)} &times; {fmt(parseFloat(it.unit_price) || 0, 'zwd')}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, flexShrink: 0, marginLeft: 10 }}>
                    {fmt(parseFloat(it.total) || 0, 'zwd')}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: `1px dashed ${T.line}`, paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted, padding: '3px 0' }}>
                <span>Subtotal</span><span>{fmt(parseFloat(selectedSale.subtotal) || 0, 'zwd')}</span>
              </div>
              {parseFloat(selectedSale.discount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.amber, padding: '3px 0' }}>
                  <span>Discount</span><span>-{fmt(parseFloat(selectedSale.discount), 'zwd')}</span>
                </div>
              )}
              {parseFloat(selectedSale.tax) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted, padding: '3px 0' }}>
                  <span>Tax</span><span>{fmt(parseFloat(selectedSale.tax), 'zwd')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 8, borderTop: `2px solid ${T.ink}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Total</span>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: T.green }}>
                  {fmt(parseFloat(selectedSale.total) || 0, 'zwd')}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: '10px 12px', background: T.surface, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Payment
              </div>
              {selectedSale.payment_method === 'mixed' && Array.isArray(selectedSale.payments_data) && selectedSale.payments_data.length > 0 ? (
                selectedSale.payments_data.map((leg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.inkSoft, padding: '2px 0' }}>
                    <span>{prettyMethod(leg.method)}{leg.reference ? ` \u00b7 ${leg.reference}` : ''}</span>
                    <span>{fmt(parseFloat(leg.amount) || 0, 'zwd')}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{prettyMethod(selectedSale.payment_method)}</div>
              )}
              {parseFloat(selectedSale.amount_tendered) > parseFloat(selectedSale.total) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.green, marginTop: 4, fontWeight: 600 }}>
                  <span>Change given</span>
                  <span>{fmt(parseFloat(selectedSale.amount_tendered) - parseFloat(selectedSale.total), 'zwd')}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              style={{
                width: '100%', marginTop: 16, padding: 12,
                background: T.ink, color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
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
