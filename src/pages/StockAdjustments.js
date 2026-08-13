import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStockAdjustments, createStockAdjustment, getProducts } from '../api/retailApi';
import { invalidateProductCaches } from '../utils/queryCache';
import { submitWithQueue } from '../utils/offlinePOS';
import { confirm } from '../utils/confirm';
import api from '../api/axios';
import usePrimaryAction from '../hooks/usePrimaryAction';

/* --- Add Adjustment Modal --- */
function AddAdjustmentModal({ isOpen, onClose, onSubmit, products, loading }) {
  const [form, setForm] = useState({ product: '', adjustment_type: 'damaged', quantity: '', notes: '', cost_price: '', selling_price: '' });
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);

  const selectedProduct = useMemo(() => products.find(p => String(p.id) === String(form.product)) || null, [products, form.product]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [products, productSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, quantity: parseInt(form.quantity) || 0 };
    // Cost price is optional and only relevant for restocks. Omit it
    // entirely unless the owner actually typed a new price -- nothing
    // on the product changes unless they explicitly choose to update it.
    if (form.adjustment_type !== 'restock' || !form.cost_price) {
      delete payload.cost_price;
    }
    if (form.adjustment_type !== 'restock' || !form.selling_price) {
      delete payload.selling_price;
    }
    onSubmit(payload);
    setForm({ product: '', adjustment_type: 'damaged', quantity: '', notes: '', cost_price: '', selling_price: '' });
    setProductSearch('');
    setShowProductList(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: '#111827' }}>
            {'\u{1F4E6}'} Log Stock Adjustment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Product</label>
            {selectedProduct ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #1a6b3a', background: '#f0fdf4', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#0f172a' }}>
                  <strong>{selectedProduct.name}</strong> ({selectedProduct.sku}) &mdash; Stock: {selectedProduct.quantity_in_stock}
                </span>
                <button
                  type="button"
                  onClick={() => { setForm(prev => ({ ...prev, product: '' })); setProductSearch(''); }}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}
                >&times;</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductList(true); }}
                  onFocus={() => setShowProductList(true)}
                  placeholder="Type product name, SKU, or barcode..."
                  autoComplete="off"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
                {showProductList && productSearch.trim() && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, marginTop: 4, maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}>
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setForm(prev => ({ ...prev, product: p.id })); setProductSearch(''); setShowProductList(false); }}
                        style={{ padding: '9px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f8f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      >
                        <strong>{p.name}</strong> <span style={{ color: '#9ca3af' }}>({p.sku})</span>
                        <span style={{ float: 'right', color: '#6b7280' }}>Stock: {p.quantity_in_stock}</span>
                      </div>
                    )) : (
                      <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>No products match &ldquo;{productSearch}&rdquo;</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Type</label>
              <select name="adjustment_type" value={form.adjustment_type} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                <option value="damaged">Damaged</option>
                <option value="stolen">Stolen</option>
                <option value="expired">Expired</option>
                <option value="broken">Broken</option>
                <option value="restock">Restock</option>
                <option value="correction">Correction</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min="1" placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {form.adjustment_type === 'restock' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                    New cost price (optional)
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={form.cost_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder={selectedProduct ? `Current: ${selectedProduct.cost_price ?? '0.00'}` : '0.00'}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                    New selling price (optional)
                  </label>
                  <input
                    type="number"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder={selectedProduct ? `Current: ${selectedProduct.selling_price ?? '0.00'}` : '0.00'}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 0' }}>
                Leave either blank to keep the current price unchanged. Only fill these in if the new stock came in at a different price.
              </p>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Notes (optional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Reason for adjustment..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Log Adjustment'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Styles --- */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", margin: 0 },
  addBtn: { padding: '10px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  controls: { display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginBottom: 20 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  badge: (type) => {
    const colors = {
      stolen: { bg: '#fdecea', fg: '#c0392b' },
      damaged: { bg: '#fef3e2', fg: '#92400e' },
      expired: { bg: '#f3f4f6', fg: '#6b7280' },
      broken: { bg: '#fdecea', fg: '#c0392b' },
      restock: { bg: '#e8f5ee', fg: '#1a6b3a' },
      correction: { bg: '#eff6ff', fg: '#1e40af' },
      other: { bg: '#f3f4f6', fg: '#374151' },
    };
    const c = colors[type] || colors.other;
    return { display: 'inline-block', fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase', background: c.bg, color: c.fg };
  },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9ca3af' },
};

export default function StockAdjustments() {
  // Top-bar primary action — see hooks/usePrimaryAction.js.
  usePrimaryAction(() => setShowModal(true));

  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['retail-stock-adjustments'],
    queryFn: getStockAdjustments,
    staleTime: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-adj'],
    queryFn: getProducts,
  });

  // Phase 2B.2 — routed through submitWithQueue so offline writes
  // queue with a client_key and replay safely on reconnect.
  const createMut = useMutation({
    mutationFn: (data) => submitWithQueue(api, 'stock_adjustments', data),
    onSuccess: (data) => {
      // A stock adjustment changes on-hand quantity for a product, so it
      // must reach POS, low-stock, dashboard, and every product list.
      invalidateProductCaches(qc);
      setShowModal(false);
      if (data && data._offline_pending) {
        confirm({
          title: 'Adjustment queued for sync',
          message:
            "You're offline — we saved this stock adjustment locally. " +
            "It'll sync automatically when the network comes back.",
          confirmText: 'OK',
          cancelText: null,
          danger: false,
        });
      }
    },
  });

  const filtered = useMemo(() => {
    return adjustments.filter(a => {
      const matchSearch = !search ||
        (a.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.product_sku || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || a.adjustment_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [adjustments, search, typeFilter]);

  const typeLabel = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : '';

  // Summary stats
  const totalLoss = filtered
    .filter(a => ['stolen', 'damaged', 'expired', 'broken'].includes(a.adjustment_type))
    .reduce((sum, a) => sum + (a.quantity || 0), 0);
  const totalRestock = filtered
    .filter(a => a.adjustment_type === 'restock')
    .reduce((sum, a) => sum + (a.quantity || 0), 0);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>{'\u{1F504}'} Stock Adjustments</h1>
        <button onClick={() => setShowModal(true)} style={S.addBtn}>
          {'\u{2795}'} Log Adjustment
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={S.card}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F4CB}'} Total Adjustments</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#374151' }}>{filtered.length}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F534}'} Units Lost</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#c0392b' }}>{totalLoss}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F7E2}'} Units Restocked</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#1a6b3a' }}>{totalRestock}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={S.controls}>
        <input type="text" placeholder="Search by product name or SKU..." value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={S.select}>
          <option value="">All Types</option>
          <option value="damaged">Damaged</option>
          <option value="stolen">Stolen</option>
          <option value="expired">Expired</option>
          <option value="broken">Broken</option>
          <option value="restock">Restock</option>
          <option value="correction">Correction</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Adjustments Table */}
      <div style={S.card}>
        {isLoading ? (
          <div style={S.emptyState}>Loading adjustments...</div>
        ) : filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}><table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Product</th>
                <th style={S.th}>SKU</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Quantity</th>
                <th style={S.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(adj => (
                <tr key={adj.id}>
                  <td style={S.td}>{adj.created_at ? new Date(adj.created_at).toLocaleDateString() : ''}</td>
                  <td style={S.td}><strong>{adj.product_name}</strong></td>
                  <td style={S.td}>{adj.product_sku}</td>
                  <td style={S.td}><span style={S.badge(adj.adjustment_type)}>{typeLabel(adj.adjustment_type)}</span></td>
                  <td style={S.td}>
                    <strong style={{ color: ['stolen', 'damaged', 'expired', 'broken'].includes(adj.adjustment_type) ? '#c0392b' : '#1a6b3a' }}>
                      {['stolen', 'damaged', 'expired', 'broken'].includes(adj.adjustment_type) ? '-' : '+'}{adj.quantity}
                    </strong>
                  </td>
                  <td style={S.td}><span style={{ color: '#6b7280', fontSize: 10 }}>{adj.notes || '\u2014'}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <div style={S.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>{'\u{1F4E6}'}</div>
            <p>No stock adjustments found</p>
            <p style={{ fontSize: 11, marginTop: 6 }}>Log adjustments when stock is damaged, stolen, or restocked</p>
          </div>
        )}
      </div>

      <AddAdjustmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={data => createMut.mutate(data)}
        products={products}
        loading={createMut.isPending}
      />
    </div>
  );
}
