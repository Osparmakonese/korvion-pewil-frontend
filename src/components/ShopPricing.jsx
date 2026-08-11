import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShopPricing, setShopPricing } from '../api/retailApi';
import { fmt } from '../utils/format';

/**
 * ShopPricing — set what each shop charges for one product.
 *
 * The idea in one line: the product is the same everywhere, but a shop may
 * sell it for its own price, or not carry it at all.
 *
 * Deliberately shows the chain price as the placeholder in every empty box,
 * so "inherits $5.20" is visible rather than implied. An owner should be
 * able to see at a glance which shops differ and which just follow the
 * chain — that is the whole question this panel answers.
 *
 * Only rendered for businesses with more than one shop. A single-shop owner
 * never sees it and never has to learn it exists.
 */
export default function ShopPricing({ productId, chainPriceFallback }) {
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
    if (data?.branches) {
      setRows(data.branches.map((b) => ({
        branch: b.branch,
        branch_name: b.branch_name,
        // Empty string in the box means "inherit"; null on the wire.
        selling_price: b.selling_price == null ? '' : String(b.selling_price),
        is_available: b.is_available !== false,
        quantity: b.quantity,
      })));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => setShopPricing(productId, rows.map((r) => ({
      branch: r.branch,
      selling_price: r.selling_price === '' ? null : r.selling_price,
      is_available: r.is_available,
    }))),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ['shop-pricing', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const chainPrice = data?.chain_price ?? chainPriceFallback;

  // Nothing to configure for a single-shop business.
  if (!productId) return null;
  if (isLoading) {
    return <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>Loading shops…</div>;
  }
  if (rows.length < 2) return null;

  const set = (branch, patch) =>
    setRows((prev) => prev.map((r) => (r.branch === branch ? { ...r, ...patch } : r)));

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid #eef2f6', paddingTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 2 }}>
        Price per shop
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.45 }}>
        Leave a shop empty to use the normal price of{' '}
        <strong>{fmt(chainPrice, 'zwd')}</strong>. Untick a shop that doesn{'’'}t sell this item.
      </div>

      {rows.map((r) => (
        <div
          key={r.branch}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
            opacity: r.is_available ? 1 : 0.55,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
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
            step="0.01"
            min="0"
            inputMode="decimal"
            value={r.selling_price}
            disabled={!r.is_available}
            placeholder={String(chainPrice ?? '')}
            onChange={(e) => set(r.branch, { selling_price: e.target.value })}
            style={{
              width: 96, padding: '7px 9px', border: '1px solid #e5e7eb',
              borderRadius: 7, fontSize: 13, textAlign: 'right',
              boxSizing: 'border-box', background: r.is_available ? '#fff' : '#f9fafb',
            }}
          />
          <span style={{ fontSize: 11, color: '#9ca3af', width: 62, textAlign: 'right' }}>
            {r.quantity} in stock
          </span>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
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
          {save.isPending ? 'Saving…' : 'Save shop prices'}
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
