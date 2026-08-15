import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShopPricing, setShopPricing } from '../api/retailApi';
import { invalidateProductCaches } from '../utils/queryCache';
import { fmt } from '../utils/format';

/**
 * ShopPricing — what each shop charges, carries, and is holding.
 *
 * The idea in one line: the product is the same everywhere, but a shop may
 * sell it for its own price, hold its own amount of it, or not carry it at
 * all.
 *
 * Why the STOCK column is editable (2026-08-15)
 * ---------------------------------------------
 * It was not, and that was the hole under the whole per-branch product
 * screen. Stock could only ever arrive at a shop through a sale, a return,
 * an adjustment, a purchase-order receipt or a transfer — so a shop whose
 * opening count had never been recorded sat at zero, went NEGATIVE on its
 * first sale, and there was nowhere to type in what was actually on the
 * shelf. "-20 in stock" was the visible symptom of a missing input.
 *
 * A number typed here is a COUNT, not an edit. The server books the
 * difference as a stock adjustment at that shop, so it appears in the audit
 * trail and the shrinkage report like every other stock movement, with the
 * before and after on the record.
 *
 * Only rendered for businesses with more than one shop. A single-shop owner
 * never sees it and never has to learn it exists.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ShopPricing({ productId, chainPriceFallback, chainStockFallback }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['shop-pricing', productId],
    queryFn: () => getShopPricing(productId),
    enabled: !!productId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (Array.isArray(data?.branches)) {
      setRows(data.branches.map((b) => ({
        branch: b.branch,
        branch_name: b.branch_name,
        // Empty string in the box means "inherit"; null on the wire.
        selling_price: b.selling_price == null ? '' : String(b.selling_price),
        is_available: b.is_available !== false,
        quantity: String(b.quantity ?? 0),
        // What the shop was holding when this panel loaded. Kept so the
        // panel can show "was -20, counting 130" and only send the shops
        // whose figure the owner actually touched.
        opening_quantity: num(b.quantity),
        reorder_level: String(b.reorder_level ?? ''),
        never_stocked: b.never_stocked === true,
        last_counted_at: b.last_counted_at || null,
      })));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => setShopPricing(productId, rows.map((r) => ({
      branch: r.branch,
      selling_price: r.selling_price === '' ? null : r.selling_price,
      is_available: r.is_available,
      // Only send a count for a shop whose number was actually changed.
      // Re-sending an unchanged figure would be harmless (the server skips
      // a zero delta) but it would also mark every shop as "counted today",
      // which is a claim nobody made.
      ...(String(r.quantity) !== String(r.opening_quantity)
        ? { quantity: r.quantity === '' ? null : r.quantity }
        : {}),
      ...(r.reorder_level === '' ? {} : { reorder_level: r.reorder_level }),
    }))),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ['shop-pricing', productId] });
      // A count changes real stock, so every product list, low-stock list
      // and dashboard tile is now stale — not just this panel.
      invalidateProductCaches(qc);
    },
  });

  const chainPrice = data?.chain_price ?? chainPriceFallback;
  const syncsChainTotal = data?.syncs_chain_total !== false;

  // What the chain total becomes when this is saved: the sum of the shops.
  // Shown BEFORE saving, because the alternative is an owner discovering
  // afterwards that a number they never touched has moved.
  const projectedChain = useMemo(
    () => rows.reduce((t, r) => t + num(r.quantity), 0),
    [rows]
  );
  const currentChain = data?.chain_quantity ?? chainStockFallback;
  const anyCountChanged = rows.some(
    (r) => String(r.quantity) !== String(r.opening_quantity)
  );

  if (!productId) return null;
  if (isLoading) {
    return <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>Loading shops…</div>;
  }
  // Nothing to configure for a single-shop business.
  if (rows.length < 2) return null;

  const set = (branch, patch) =>
    setRows((prev) => prev.map((r) => (r.branch === branch ? { ...r, ...patch } : r)));

  const headCell = {
    fontSize: 9, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid #eef2f6', paddingTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 2 }}>
        Stock and price per shop
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.45 }}>
        Type what each shop actually has on the shelf — that is recorded as a
        stock count, so it shows in your adjustments and reports. Leave a
        price empty to use the normal price of{' '}
        <strong>{fmt(chainPrice, 'zwd')}</strong>. Untick a shop that doesn{'’'}t
        sell this item.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px,1fr) 84px 84px 96px',
          gap: 8, alignItems: 'center', marginBottom: 6, minWidth: 400,
        }}>
          <span style={headCell}>Shop</span>
          <span style={{ ...headCell, textAlign: 'right' }}>On shelf</span>
          <span style={{ ...headCell, textAlign: 'right' }}>Reorder at</span>
          <span style={{ ...headCell, textAlign: 'right' }}>Price</span>
        </div>

        {rows.map((r) => {
          const wasNegative = r.opening_quantity < 0;
          const changed = String(r.quantity) !== String(r.opening_quantity);
          return (
            <div key={r.branch} style={{ minWidth: 400, marginBottom: 8 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px,1fr) 84px 84px 96px',
                gap: 8, alignItems: 'center',
                opacity: r.is_available ? 1 : 0.55,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={r.is_available}
                    onChange={(e) => set(r.branch, { is_available: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13, color: '#111827', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.branch_name}
                  </span>
                </label>

                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={r.quantity}
                  onChange={(e) => set(r.branch, { quantity: e.target.value })}
                  title="How many of these are on this shop's shelf right now"
                  style={{
                    width: '100%', padding: '7px 9px', borderRadius: 7,
                    fontSize: 13, textAlign: 'right', boxSizing: 'border-box',
                    border: `1px solid ${wasNegative && !changed ? '#c0392b' : '#e5e7eb'}`,
                    background: wasNegative && !changed ? '#fdecea' : '#fff',
                    color: wasNegative && !changed ? '#c0392b' : '#111827',
                    fontWeight: wasNegative && !changed ? 700 : 400,
                  }}
                />

                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={r.reorder_level}
                  onChange={(e) => set(r.branch, { reorder_level: e.target.value })}
                  title="Warn me when this shop drops to this level"
                  style={{
                    width: '100%', padding: '7px 9px', border: '1px solid #e5e7eb',
                    borderRadius: 7, fontSize: 13, textAlign: 'right',
                    boxSizing: 'border-box',
                  }}
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={r.selling_price}
                  disabled={!r.is_available}
                  placeholder={String(chainPrice ?? '')}
                  onChange={(e) => set(r.branch, { selling_price: e.target.value })}
                  style={{
                    width: '100%', padding: '7px 9px', border: '1px solid #e5e7eb',
                    borderRadius: 7, fontSize: 13, textAlign: 'right',
                    boxSizing: 'border-box',
                    background: r.is_available ? '#fff' : '#f9fafb',
                  }}
                />
              </div>

              {/* Say WHY a figure looks wrong, on the row it is wrong on. */}
              {wasNegative && (
                <div style={{ fontSize: 10.5, color: '#c0392b', marginTop: 3, lineHeight: 1.4 }}>
                  Below zero ({r.opening_quantity}) — more was sold here than this
                  shop was ever recorded as having. Type the real shelf count to fix it.
                </div>
              )}
              {!wasNegative && r.never_stocked && (
                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>
                  Never stocked here.
                </div>
              )}
              {!wasNegative && !r.never_stocked && !r.last_counted_at && (
                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>
                  Never counted — this figure came from sales and deliveries only.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* An owner must not learn after the fact that the business-wide total
          moved. Show what it becomes, before they commit to it. */}
      {anyCountChanged && syncsChainTotal && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 8,
          background: '#f6f8f6', border: '1px solid #e3e8e4',
          fontSize: 11, color: '#374151', lineHeight: 1.5,
        }}>
          Total across all shops will become <strong>{projectedChain}</strong>
          {currentChain != null && num(currentChain) !== projectedChain && (
            <span style={{ color: '#6b7280' }}> (was {currentChain})</span>
          )}
          . The business-wide figure is the sum of the shops.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{
            padding: '8px 15px', borderRadius: 8, border: 'none',
            background: '#1a6b3a', color: '#fff', fontSize: 12.5,
            fontWeight: 700, cursor: save.isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {save.isPending ? 'Saving…' : 'Save stock and prices'}
        </button>
        {saved && <span style={{ fontSize: 12, color: '#1a6b3a', fontWeight: 600 }}>Saved</span>}
        {save.isError && (
          <span style={{ fontSize: 12, color: '#b91c1c' }}>
            {save.error?.response?.data?.detail || 'Could not save. Please try again.'}
          </span>
        )}
      </div>
    </div>
  );
}
