import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMarginAnalysis } from '../api/retailApi';
import { fmt } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

/**
 * MarginAnalysis — what the shop ACTUALLY earned.
 *
 * The distinction from "Profit Margins" matters and is stated on the page,
 * because confusing the two is how an owner draws the wrong conclusion:
 *
 *   Profit Margins  — reads the catalogue. "If I sold my stock at today's
 *                     prices, what would I make?" Forward-looking.
 *   This page       — reads the SALES, each costed at the price that was
 *                     true when it happened. Historic and fixed.
 *
 * Every figure here is reproducible: run it again next year and it gives
 * the same answer, because each sale carries its own cost. That is the
 * property that makes it usable for tax or for a lender.
 */

const G = '#1a6b3a';
const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, marginBottom: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' },
  thR: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', padding: '9px 10px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  tdR: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155', textAlign: 'right' },
  tile: { flex: '1 1 160px', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' },
  tileLabel: { fontSize: 11, color: '#64748b', fontWeight: 600 },
  tileVal: (c) => ({ fontSize: 19, fontWeight: 800, color: c || '#0f172a', fontFamily: "'Playfair Display', serif", lineHeight: 1.15, marginTop: 2 }),
  chip: (on) => ({
    padding: '7px 13px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
    border: `1px solid ${on ? G : '#e2e8f0'}`, background: on ? G : '#fff',
    color: on ? '#fff' : '#475569', cursor: 'pointer', whiteSpace: 'nowrap',
  }),
  note: { background: '#fef3e2', border: '1px solid #fbd9a5', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#92400e', marginBottom: 12, lineHeight: 1.45 },
};

const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const marginColour = (pct) => (pct >= 30 ? G : pct >= 15 ? '#2563eb' : '#c0392b');

export default function MarginAnalysis() {
  const isMobile = useIsMobile();
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['margin-analysis', days],
    queryFn: () => getMarginAnalysis({ days }),
    staleTime: 60_000,
  });

  const summary = data?.summary || {};
  const products = Array.isArray(data?.products) ? data.products : [];
  const movements = Array.isArray(data?.cost_movements) ? data.cost_movements : [];
  const estimated = num(summary.products_with_estimated_cost);

  return (
    <div style={{ ...S.page, padding: isMobile ? 0 : 20 }}>
      <h1 style={S.h1}>Profit analysis</h1>
      <p style={S.sub}>
        What you actually earned, from real sales — each costed at the price you paid
        <strong> at the time of that sale</strong>. Re-pricing a product later does not
        change these figures.
        {data?.branch ? <> Showing <strong>{data.branch}</strong>.</> : null}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} type="button" style={S.chip(days === d)} onClick={() => setDays(d)}>
            {d === 7 ? 'Last 7 days' : d === 30 ? 'Last 30 days' : d === 90 ? 'Last 3 months' : 'Last year'}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ color: '#94a3b8', fontSize: 13, padding: 20 }}>Working out your profit…</div>}
      {error && (
        <div style={{ ...S.note, background: '#fdecea', borderColor: '#fecaca', color: '#b91c1c' }}>
          Could not load the analysis. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={S.tile}>
              <div style={S.tileLabel}>Revenue</div>
              <div style={S.tileVal()}>{fmt(summary.revenue, 'zwd')}</div>
            </div>
            <div style={S.tile}>
              <div style={S.tileLabel}>Cost of goods sold</div>
              <div style={S.tileVal()}>{fmt(summary.cost_of_goods_sold, 'zwd')}</div>
            </div>
            <div style={S.tile}>
              <div style={S.tileLabel}>Gross profit</div>
              <div style={S.tileVal(num(summary.gross_profit) < 0 ? '#c0392b' : G)}>
                {fmt(summary.gross_profit, 'zwd')}
              </div>
            </div>
            <div style={S.tile}>
              <div style={S.tileLabel}>Margin</div>
              <div style={S.tileVal(marginColour(num(summary.margin_percent)))}>
                {num(summary.margin_percent).toFixed(1)}%
              </div>
            </div>
          </div>

          {estimated > 0 && (
            <div style={S.note}>
              {estimated} product{estimated > 1 ? 's were' : ' was'} sold before Pewil started
              recording the cost at the time of sale, so {estimated > 1 ? 'their' : 'its'} figures
              use today{'’'}s cost and are an estimate. Everything sold from now on is exact.
            </div>
          )}

          {movements.length > 0 && (
            <div style={{ ...S.card, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                What changed your margin
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 10 }}>
                Cost prices that moved during this period.
              </div>
              {movements.map((m) => (
                <div key={m.product_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: '1px dashed #eef2f6', fontSize: 12.5 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{m.name || `#${m.product_id}`}</span>
                  <span style={{ color: '#64748b', textAlign: 'right' }}>
                    cost {fmt(m.from, 'zwd')} → <strong style={{ color: num(m.to) > num(m.from) ? '#b45309' : G }}>{fmt(m.to, 'zwd')}</strong>
                    {m.margin_before != null && m.margin_after != null && (
                      <> · margin {num(m.margin_before).toFixed(1)}% → <strong style={{ color: marginColour(num(m.margin_after)) }}>{num(m.margin_after).toFixed(1)}%</strong></>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 ? (
            <div style={{ ...S.card, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No sales in this period.
            </div>
          ) : isMobile ? (
            <div>
              {products.map((p) => (
                <div key={p.product_id} style={{ border: '1px solid #e5e7eb', borderLeft: `5px solid ${marginColour(num(p.margin_percent))}`, borderRadius: 12, padding: '13px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{p.name || `#${p.product_id}`}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {num(p.units_sold)} sold{p.is_estimated ? ' · cost estimated' : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: marginColour(num(p.margin_percent)), fontFamily: "'Playfair Display', serif" }}>
                      {fmt(p.gross_profit, 'zwd')}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>profit · {num(p.margin_percent).toFixed(1)}%</span>
                  </div>
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px dashed #eef2f6', fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sold {fmt(p.revenue, 'zwd')}</span>
                    <span>Cost {fmt(p.cost_of_goods_sold, 'zwd')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={S.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Product</th>
                      <th style={S.thR}>Sold</th>
                      <th style={S.thR}>Revenue</th>
                      <th style={S.thR}>Cost of goods</th>
                      <th style={S.thR}>Gross profit</th>
                      <th style={S.thR}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.product_id}>
                        <td style={S.td}>
                          {p.name || `#${p.product_id}`}
                          {p.is_estimated && (
                            <span title="Some sales predate cost tracking — this is an estimate."
                                  style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#92400e', background: '#fef3e2', padding: '2px 6px', borderRadius: 10 }}>
                              EST
                            </span>
                          )}
                        </td>
                        <td style={S.tdR}>{num(p.units_sold)}</td>
                        <td style={S.tdR}>{fmt(p.revenue, 'zwd')}</td>
                        <td style={S.tdR}>{fmt(p.cost_of_goods_sold, 'zwd')}</td>
                        <td style={{ ...S.tdR, fontWeight: 700, color: num(p.gross_profit) < 0 ? '#c0392b' : '#0f172a' }}>
                          {fmt(p.gross_profit, 'zwd')}
                        </td>
                        <td style={{ ...S.tdR, fontWeight: 700, color: marginColour(num(p.margin_percent)) }}>
                          {num(p.margin_percent).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary.basis && (
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
              {summary.basis}
            </p>
          )}
        </>
      )}
    </div>
  );
}
