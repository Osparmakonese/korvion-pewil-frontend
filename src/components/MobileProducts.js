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
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProducts, getCategories, getLowStockProducts, getExpiringProducts,
} from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import useViewBranch from '../hooks/useViewBranch';
import { fmt } from '../utils/format';
import { getProductIcon } from '../utils/productIcons';
import { shopPrice, shopStock, shopStockIsError, shopCarries } from '../utils/branchStock';

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
  // Same shop context the desktop table uses, so the two can never disagree
  // about whose stock a number is.
  const { isMultiBranch, inShop, branchName } = useViewBranch();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Owners/managers edit products from this screen, so it must show the whole
  // catalogue — including lines this shop has turned off. Without
  // include_unavailable a de-selected product disappears and there is no way
  // back in to switch it on. The till gets the filtered list instead.
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['retail-products', 'all'],
    queryFn: () => getProducts({ include_unavailable: 1 }),
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

  // id → name lookup so getProductIcon can match on category names
  // even when the API returns numeric category foreign keys only.
  const categoryNameById = useMemo(() => {
    const m = {};
    (categories || []).forEach((c) => { m[String(c.id)] = c.name; });
    return m;
  }, [categories]);

  // Only offer chips for categories this shop actually carries something in
  // — a liquor chip on a phone shop's screen is a filter that can only ever
  // return nothing. Chain-wide and single-shop keep the full set.
  const visibleCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    if (!isMultiBranch || !inShop) return categories;
    const here = new Set(
      products.filter((p) => shopCarries(p) && p.category != null)
              .map((p) => p.category)
    );
    return categories.filter((c) => here.has(c.id));
  }, [categories, products, isMultiBranch, inShop]);

  // Don't strand the list on a chip that no longer exists after a shop switch.
  useEffect(() => {
    if (!categoryFilter) return;
    if (!Array.isArray(visibleCategories) || visibleCategories.length === 0) return;
    if (!visibleCategories.some((c) => String(c.id) === String(categoryFilter))) {
      setCategoryFilter('');
    }
  }, [visibleCategories, categoryFilter]);

  const negativeCount = useMemo(
    () => products.filter((p) => shopStockIsError(p)).length,
    [products]
  );

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
      {visibleCategories.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, marginBottom: 12,
          WebkitOverflowScrolling: 'touch',
        }}>
          <Chip label="All" active={!categoryFilter} onClick={() => setCategoryFilter('')} />
          {visibleCategories.map((c) => (
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Name the shop, so "43 products / 2 low stock" is never read as
            the whole business's numbers while one shop is on screen. */}
        {inShop && <Stat label={branchName} tone="shop" />}
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
        {negativeCount > 0 && (
          <Stat
            label={`${negativeCount} below zero`}
            tone="error"
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
            : (inShop
                ? `${branchName} has no products yet. Add one, or switch existing lines on for this shop from All shops.`
                : 'No products yet. Add one to start ringing up sales.')}
        </div>
      ) : filtered.map((p) => {
        const icon = getProductIcon(p, categoryNameById[String(p.category)]);
        const stockHere = shopStock(p);
        const stockError = shopStockIsError(p);
        const notCarriedHere = inShop && !shopCarries(p);
        return (
        <button
          key={p.id}
          type="button"
          onClick={() => isOwnerOrManager && onEditProduct?.(p)}
          style={{
            width: '100%',
            background: '#fff',
            opacity: notCarriedHere ? 0.62 : 1,
            border: `1px solid ${stockError ? '#f5b7b1' : T.line}`,
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
            background: icon.bg, color: icon.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flex: '0 0 44px',
          }}>
            {icon.emoji}
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
              {/* Below zero is a book error, not a quantity — see
                  utils/branchStock.js. Shown red, never clamped. */}
              <span style={stockError ? { color: T.red, fontWeight: 700 } : undefined}>
                {stockHere} in stock{inShop ? ` at ${branchName}` : ''}
              </span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {notCarriedHere && <Badge tone="error">not sold here</Badge>}
              {stockError && <Badge tone="error">check count</Badge>}
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
            {fmt(shopPrice(p), 'zwd')}
          </div>
        </button>
        );
      })}

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
    error:   { bg: '#fdecea',          fg: T.red     },
    shop:    { bg: '#e8f5ee',          fg: T.green   },
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
    error: { bg: '#fdecea',     fg: T.red,     bd: '#f5b7b1' },
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
