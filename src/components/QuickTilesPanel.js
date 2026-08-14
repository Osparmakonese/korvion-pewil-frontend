import React from 'react';
import { fmt } from '../utils/format';
import { shopPrice } from '../utils/branchStock';

/**
 * QuickTilesPanel — large tap-targets for unbarcoded items (produce, bread,
 * meat by weight, etc.). Products with `is_quick_tile = true` surface here.
 *
 * Contract:
 *   - Renders nothing if there are no quick-tile products.
 *   - Tapping a tile calls `onSelect(product)` which the POS routes through
 *     the same add-to-cart pipeline as a barcode scan, so the existing
 *     age-gate / weight-prompt logic applies uniformly.
 */
export default function QuickTilesPanel({ products = [], onSelect }) {
  const tiles = products.filter((p) => p.is_quick_tile && p.is_active !== false);
  if (tiles.length === 0) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#1a6b3a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quick tiles
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{tiles.length} item{tiles.length === 1 ? '' : 's'}</span>
      </div>
      <div style={styles.grid}>
        {tiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p)}
            style={styles.tile}
            title={p.name}
          >
            <div style={styles.tileName}>{p.name}</div>
            <div style={styles.tilePrice}>
              {fmt(shopPrice(p), 'zwd')}
              {p.is_weighable && <span style={styles.perUnit}> / {p.unit_of_weight || 'kg'}</span>}
            </div>
            {p.is_age_restricted && <div style={styles.badge}>18+</div>}
            {p.is_weighable && <div style={{ ...styles.badge, right: 34, background: '#1a6b3a' }}>⚖️</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: 10, marginBottom: 10,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: 8,
  },
  tile: {
    position: 'relative',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
    padding: '14px 10px', textAlign: 'left', cursor: 'pointer',
    minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  tileName: {
    fontSize: 13, fontWeight: 700, color: '#064e3b', lineHeight: 1.2,
    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  tilePrice: { fontSize: 14, fontWeight: 800, color: '#1a6b3a', marginTop: 6 },
  perUnit: { fontSize: 10, fontWeight: 600, color: '#6b7280' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    background: '#b45309', color: '#fff',
    fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
  },
};
