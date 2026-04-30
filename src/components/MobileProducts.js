/**
 * MobileProducts.js — phone-first product list.
 *
 * Used by pages/Products.js when window.innerWidth <= 500. Reuses the
 * same getProducts / getCategories / getLowStockProducts queries so
 * data is identical; only the layout differs.
 *
 * Visual style is the locked mobile language (cream + green). See
 * mobile-mockups/PEWIL_MOBILE_PREVIEW_2026-04-26.html for reference.
 *
 * Scope:
 *   - Search bar (name + SKU)
 *   - Category filter chips (horizontal scroll)
 *   - Product cards with low-stock / expiring badges
 *   - "Add product" FAB (owner/manager only) — opens the existing
 *     Products.js add modal via the prop callback.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProducts, getCategories, getLowStockProducts, getExpiringProducts,
} from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';

const T = {
  cream:   '#ffffff',
  cream2:  '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange:  '#c77700',
  orange2: '#e09a2b',
  amber:   '#f5c518',
  red:     '#c0392b',
};

export default function MobileProducts({ onAddProduct, onEditProduct }) {
  const { user } = useAuth() || {};
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['retail-products'],
    queryFn: getProducts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['retail-categories'],
    queryFn: getCategories,
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ['retail-low-stock'],
    queryFn: getLowStockProducts,
  });
  const { data: expiring = [] } = useQuery({
    queryKey: ['retail-expiring'],
    queryFn: getExpiringProducts,
  });

  const lowStockIds = useMemo(
    () => new Set((lowStock || []).map((p) => p.id)),
    [lowStock]
  );
  const expiringIds = useMemo(
    () => new Set((expiring || []).map((p) => p.id)),
    [expiring]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q
        || (p.name || '').toLowerCase().includes(q)
        || (p.sku || '').toLowerCase().includes(q);
      const matchesCat = !categoryFilter
        || String(p.category) === String(categoryFilter)
        || p.category_name === categoryFilter;
      return matchesQ && matchesCat;
    });
  }, [products, search, categoryFilter]);

  return (
    <div style={{
      padding: '12px 16px 0',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: T.ink,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Search */}
      <div style={{
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 16, color: T.muted }}>🔎</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or SKU"
          inputMode="search"
          style={{
            flex: 1,
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: T.ink, fontFamily: 'inherit',
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{
              border: 'none', background: T.cream2,
              borderRadius: 8, color: T.muted,
              width: 24, height: 24, fontSize: 14, cursor: 'pointer',
            }}
          >×</button>
        )}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, marginBottom: 12,
          WebkitOverflowScrolling: 'touch',
        }}>
          <Chip label="All" active={!categoryFilter} onClick={() => setCategoryFilter('')} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={String(categoryFilter) === String(c.id)}
              onClick={() => setCategoryFilter(c.id)}
            />
          ))}
        </div>
      )}

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Stat
          label={`${products.length} products`}
          tone="default"
        />
        {lowStockIds.size > 0 && (
          <Stat
            label={`${lowStockIds.size} low stock`}
            tone="warn"
          />
        )}
        {expiringIds.size > 0 && (
          <Stat
            label={`${expiringIds.size} expiring`}
            tone="warn"
          />
        )}
      </div>

      {/* Product list */}
      {isLoading ? (
        <Skeleton h={70} mb={10} />
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff',
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: 28, textAlign: 'center',
          color: T.muted, fontSize: 13,
        }}>
          {search || categoryFilter
            ? 'No products match your filter.'
            : 'No products yet. Add one to start ringing up sales.'}
        </div>
      ) : filtered.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => isOwnerOrManager && onEditProduct?.(p)}
          style={{
            width: '100%',
            background: '#fff',
            border: `1px solid ${T.line}`,
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 12,
            textAlign: 'left',
            fontFamily: 'inherit',
            cursor: isOwnerOrManager ? 'pointer' : 'default',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.cream2, color: T.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18, fontWeight: 700, flex: '0 0 44px',
          }}>
            {(p.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, color: T.ink,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {p.name}
            </div>
            <div style={{
              marginTop: 3,
              fontSize: 11, color: T.muted,
              display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
              <span>SKU {p.sku || '—'}</span>
              <span>·</span>
              <span>{p.quantity_in_stock ?? 0} in stock</span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {lowStockIds.has(p.id) && <Badge tone="warn">low stock</Badge>}
              {expiringIds.has(p.id) && <Badge tone="amber">expiring</Badge>}
              {p.is_age_restricted && <Badge tone="ink">18+</Badge>}
            </div>
          </div>
          <div style={{
            textAlign: 'right',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 16, fontWeight: 700, color: T.ink,
            flex: '0 0 auto',
          }}>
            {fmt(parseFloat(p.selling_price) || 0, 'zwd')}
          </div>
        </button>
      ))}

      {/* Owner/manager FAB to add a new product */}
      {isOwnerOrManager && (
        <button
          type="button"
          onClick={() => onAddProduct?.()}
          aria-label="Add product"
          style={{
            position: 'fixed',
            right: 18,
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            width: 56, height: 56,
            borderRadius: '50%',
            background: T.ink, color: T.cream,
            border: 'none',
            fontSize: 24, fontWeight: 700,
            boxShadow: '0 12px 30px rgba(28,22,10,0.30)',
            cursor: 'pointer',
            zIndex: 400,
          }}
        >+</button>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        padding: '6px 12px',
        borderRadius: 999,
        background: active ? T.green : '#fff',
        border: `1px solid ${active ? T.green : T.line}`,
        color: active ? '#fff' : T.ink,
        fontSize: 12, fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >{label}</button>
  );
}

function Stat({ label, tone }) {
  const palette = {
    default: { bg: 'rgba(0,0,0,0.04)', fg: T.inkSoft },
    warn:    { bg: '#fff7e6',          fg: '#b25c00' },
  }[tone] || { bg: 'rgba(0,0,0,0.04)', fg: T.inkSoft };
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
}

function Badge({ tone, children }) {
  const palette = {
    warn:  { bg: '#fff7e6',     fg: '#b25c00', bd: '#fde68a' },
    amber: { bg: '#fef3c7',     fg: '#92400e', bd: '#fde68a' },
    ink:   { bg: T.cream2,      fg: T.ink,     bd: T.line   },
  }[tone] || { bg: T.cream2, fg: T.ink, bd: T.line };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '2px 7px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.bd}`,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{children}</span>
  );
}

function Skeleton({ h, mb }) {
  return (
    <div style={{
      height: h, borderRadius: 16, marginBottom: mb,
      background: 'linear-gradient(90deg, #f1e8d4, #f9efd9, #f1e8d4)',
      backgroundSize: '200% 100%',
      animation: 'pulseShimmer 1.4s ease-in-out infinite',
    }} />
  );
}
