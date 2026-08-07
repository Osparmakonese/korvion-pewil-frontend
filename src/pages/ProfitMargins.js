import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getProfitMargins } from '../api/retailApi';
import AIInsightCard from '../components/AIInsightCard';
import { fmt } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

export default function ProfitMargins({ onTabChange }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const isMobile = useIsMobile();

  const { data: profitData, isLoading } = useQuery({
    queryKey: ['retail-profit-margins'],
    queryFn: getProfitMargins,
    staleTime: 30000
  });

  // DRF DecimalField serializes as string by default — coerce before .toFixed
  // to avoid "TypeError: x.toFixed is not a function" (Sentry MAKONESE-FARM-FRONTEND-4).
  const marginData = profitData?.products?.map(product => {
    const cost = Number(product.cost_price) || 0;
    const sell = Number(product.selling_price) || 0;
    const marginAmt = Number(product.margin_amount) || 0;
    const stock = Number(product.stock) || 0;
    return {
      sku: product.sku,
      product: product.name,
      cost: fmt(cost),
      sell: fmt(sell),
      margin: fmt(marginAmt),
      marginPercent: product.margin_percent,
      // The API field is `stock` — quantity ON HAND, not units sold. It was
      // labelled "Units Sold" with margin x stock as "Total Profit", so a
      // shop that had sold nothing still saw a profit figure. These are
      // stock on hand and the profit that stock WOULD make if it all sold.
      inStock: stock,
      potentialProfit: fmt(marginAmt * stock),
      // Three bands, matching the "Products by margin range" chart and the
      // "Below target" card. This used to be a two-way >50 ? Excellent :
      // Good, so an 8.7% margin was labelled "Good" on the same screen that
      // counted it as below target.
      status: Number(product.margin_percent) > 50 ? 'Excellent'
        : Number(product.margin_percent) >= 30 ? 'Good'
        : 'Below target'
    };
  }) || [];

  const getMarginColor = (percent) => {
    if (percent > 50) return '#1a6b3a';
    if (percent >= 30) return '#2563eb';
    return '#c0392b';
  };

  const getStatusColor = (status) =>
    status === 'Excellent' ? '#1a6b3a' : status === 'Good' ? '#2563eb' : '#c0392b';

  const getStatusBg = (status) =>
    status === 'Excellent' ? '#e8f5ee' : status === 'Good' ? '#EFF6FF' : '#fdecea';

  // NOTE: a hardcoded `insights` array used to sit here with invented copy
  // about "Lightning Cable" and "AudioTech SA" — demo text for products no
  // Pewil shop owns. It was never rendered. Real analysis comes from the
  // AI Pricing Insights card at the bottom of this page.

  const excellentCount = marginData.filter(p => p.marginPercent > 50).length;
  const goodCount = marginData.filter(p => p.marginPercent >= 30 && p.marginPercent <= 50).length;
  const belowTargetCount = marginData.filter(p => p.marginPercent < 30).length;

  const marginRanges = [
    { label: 'Excellent (>50%)', count: excellentCount, color: '#1a6b3a' },
    { label: 'Good (30-50%)', count: goodCount, color: '#2563eb' },
    { label: 'Below Target (<30%)', count: belowTargetCount, color: '#c0392b' }
  ];

  // The Export CSV button had no onClick at all — it looked live and did
  // nothing. Builds the file from what is on screen, no extra API call.
  const exportCsv = () => {
    const head = ['SKU', 'Product', 'Cost', 'Sell', 'Margin each', 'Margin %', 'In stock', 'Potential profit', 'Status'];
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = marginData.map((p) => [
      p.sku, p.product, p.cost, p.sell, p.margin,
      `${(Number(p.marginPercent) || 0).toFixed(1)}%`, p.inStock, p.potentialProfit, p.status,
    ].map(esc).join(','));
    const csv = [head.map(esc).join(','), ...rows].join('\r\n');
    // ﻿ so Excel opens UTF-8 currency symbols correctly.
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-margins-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalProducts = marginData.length;
  const highestMarginProduct = marginData.length > 0 ? marginData.reduce((max, p) => p.marginPercent > max.marginPercent ? p : max) : null;
  const lowestMarginProduct = marginData.length > 0 ? marginData.reduce((min, p) => p.marginPercent < min.marginPercent ? p : min) : null;

  return (
    <div style={{ padding: isMobile ? 0 : 24, fontFamily: "'Inter', sans-serif", backgroundColor: isMobile ? 'transparent' : '#f9fafb', minHeight: isMobile ? 0 : '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Profit Margins
        </h1>
        {isOwner && (
          <button
            onClick={exportCsv}
            disabled={isLoading || marginData.length === 0}
            style={{
              background: '#fff',
              color: '#1a6b3a',
              border: '2px solid #1a6b3a',
              padding: '8px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 24 }}>
        {/* Avg. Margin */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#e8f5ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                AVG. MARGIN
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#1a6b3a', marginBottom: 2 }}>
                {isLoading ? '—' : `${(Number(profitData?.summary?.avg_margin) || 0).toFixed(1)}%`}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>All products</div>
            </div>
          </div>
        </div>

        {/* Highest Margin */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#e8f5ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              ⬆️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                HIGHEST MARGIN
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3a', marginBottom: 2, lineHeight: 1.3 }}>
                {/* summary.highest_margin is the whole PRODUCT OBJECT, not a
                    number — Number({...}) is NaN, so this always printed 0.0%
                    while the product name underneath was right. Read the
                    percent off the row we already derived. */}
                {isLoading ? '—' : `${(Number(highestMarginProduct?.marginPercent) || 0).toFixed(1)}%`}
              </div>
              <div style={{ fontSize: 8, color: '#9ca3af' }}>{highestMarginProduct?.product || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Lowest Margin */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fdecea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              ⬇️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                LOWEST MARGIN
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c0392b', marginBottom: 2, lineHeight: 1.3 }}>
                {/* Same object-not-a-number bug as highest_margin above. */}
                {isLoading ? '—' : `${(Number(lowestMarginProduct?.marginPercent) || 0).toFixed(1)}%`}
              </div>
              <div style={{ fontSize: 8, color: '#9ca3af' }}>{lowestMarginProduct?.product || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Below Target */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fef3e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                BELOW TARGET (&lt;30%)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c97d1a', marginBottom: 2 }}>
                {isLoading ? '—' : belowTargetCount}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>products</div>
            </div>
          </div>
        </div>
      </div>

      {/* Margin Analysis Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
          Margin Analysis by Product
        </h3>
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>Loading margin data...</div>
        ) : marginData.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No products with a cost price yet. Set a cost price on your products and
            their profit shows up here.
          </div>
        ) : isMobile ? (
          /* Phone: a card per product. The desktop view is a 9-column table —
             readable at a desk, useless in your hand even with the scroll fix. */
          <div>
            {marginData.map((item, idx) => {
              const pct = Number(item.marginPercent) || 0;
              const colour = getMarginColor(pct);
              return (
                <div key={idx} style={{
                  border: '1px solid #e5e7eb', borderLeft: `5px solid ${colour}`,
                  borderRadius: 12, padding: '13px 14px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{item.product}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>{item.sku}</div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '4px 9px', borderRadius: 20,
                      textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                      background: getStatusBg(item.status), color: getStatusColor(item.status),
                    }}>{item.status}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 11 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: colour, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>margin</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: 6, width: `${Math.max(0, Math.min(100, pct))}%`, background: colour, borderRadius: 6 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 11, paddingTop: 10, borderTop: '1px dashed #eef2f6', fontSize: 12.5, color: '#64748b' }}>
                    <span>{item.cost} → <b style={{ color: '#0f172a' }}>{item.sell}</b> <span style={{ color: '#94a3b8' }}>({item.margin} each)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, fontSize: 12.5, color: '#64748b' }}>
                    <span>{item.inStock} in stock</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.potentialProfit} if it all sells</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>SKU</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Product</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Cost</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Sell</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Margin $</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Margin %</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>In Stock</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Potential Profit</th>
                  <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {marginData.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>
                      {item.product}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                      {item.cost}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                      {item.sell}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                      {item.margin}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: getMarginColor(item.marginPercent), fontWeight: 600, textAlign: 'right' }}>
                      {(Number(item.marginPercent) || 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                      {item.inStock}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 700, textAlign: 'right' }}>
                      {item.potentialProfit}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: getStatusBg(item.status), color: getStatusColor(item.status) }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {/* Margin Distribution */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Products by Margin Range
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {marginRanges.map((range, idx) => {
              // Guard the divide: a shop with no priced products yet gives
              // 0/0 = NaN, and width:"NaN%" is an invalid style the browser
              // drops, leaving the bar stuck at full width.
              const percentage = totalProducts > 0 ? (range.count / totalProducts) * 100 : 0;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 140, fontSize: 10, fontWeight: 600, color: '#374151' }}>
                    {range.label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: '#f3f4f6',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: range.color,
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 35, fontSize: 10, fontWeight: 700, color: '#111827', textAlign: 'right' }}>
                    {range.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Pricing Recommendations */}
        <AIInsightCard feature="retail_profit_advisor" title="AI Pricing Insights" />
      </div>
    </div>
  );
}
