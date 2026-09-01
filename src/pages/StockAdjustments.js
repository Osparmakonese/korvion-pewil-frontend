import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStockAdjustments, getProducts } from '../api/retailApi';
import { invalidateProductCaches } from '../utils/queryCache';
import { submitWithQueue } from '../utils/offlinePOS';
import { confirm } from '../utils/confirm';
import api from '../api/axios';
import usePrimaryAction from '../hooks/usePrimaryAction';
import { shopStock } from '../utils/branchStock';
import useViewBranch from '../hooks/useViewBranch';
import { fmtQty } from '../utils/format';

/* --- Add Adjustment Modal --- */
function AddAdjustmentModal({ isOpen, onClose, onSubmit, products, loading, branches = [], showBranchPicker = false, branchId = '', onBranchChange, branchLabel = '' }) {
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
    const payload = { ...form, quantity: parseFloat(form.quantity) || 0 };
    // Name the shop the stock actually moves at. Left off, the server has
    // nothing to resolve from -- this POST goes through submitWithQueue, not
    // createStockAdjustment, so it never carried the switcher's ?branch=
    // either -- and require_branch_for_write() refuses the write outright on
    // any tenant with two or more shops. With one shop there is nothing to
    // choose and the server resolves it, so we deliberately send nothing.
    if (branchId) payload.branch = parseInt(branchId, 10) || undefined;
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
          {/* Which shop is this adjustment for?
              Hidden entirely for a single-shop tenant (nothing to choose --
              the server resolves it) and for staff pinned to a shop (the
              server re-pins them regardless, so a picker would be a lie).
              Otherwise required, and empty on "All shops": there is no
              honest default there, and guessing head office is how a
              write-off ends up on the wrong shop's books. */}
          {showBranchPicker && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Shop</label>
              <select
                value={branchId}
                onChange={e => onBranchChange && onBranchChange(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="" disabled>Select a shop{'\u2026'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.code} \u2014 ${b.name}` : b.name}{b.is_hq ? ' (HQ)' : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                The stock moves at this shop, and the figures below are this shop{'\u2019'}s.
              </div>
            </div>
          )}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Product</label>
            {selectedProduct ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #1a6b3a', background: '#f0fdf4', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#0f172a' }}>
                  {/* The adjustment moves THIS shop's stock (the server
                      resolves the branch from ?branch= / the user's own
                      shop), so the figure beside it has to be this shop's
                      too. It was the chain total, which meant an owner
                      standing in one shop wrote off against another shop's
                      number. */}
                  <strong>{selectedProduct.name}</strong> ({selectedProduct.sku}) &mdash; Stock{branchLabel ? ` at ${branchLabel}` : ''}: {shopStock(selectedProduct)}
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
                        <span style={{ float: 'right', color: '#6b7280' }}>Stock: {shopStock(p)}</span>
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
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min="0.001" step="any" placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
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

  // Which shop the adjustment lands on (2026-08-16).
  //
  // This page never asked. The backend's require_branch_for_write() is
  // right to refuse a stock movement that does not name a shop -- "All
  // shops" is a report, not a shop -- but the UI offered no way to answer
  // it, so on a multi-shop business "Log Adjustment" simply failed. Worse
  // than the "All shops" case: the POST goes through submitWithQueue, which
  // posts the body as-is, so it never picked up the switcher's ?branch=
  // either. Standing IN a shop with that shop selected in the header, the
  // write still failed.
  const { branchId: viewBranchId, branches, isMultiBranch, pinned } = useViewBranch();
  // One shop -> nothing to choose. Pinned staff -> perform_create() forces
  // their own shop whatever the payload says, so a picker would be a lie.
  const showBranchPicker = isMultiBranch && !pinned;
  const [adjBranchId, setAdjBranchId] = useState('');

  // Follow the switcher: if the header says Avenu, the modal says Avenu.
  // On "All shops" there is no honest default -- leave it empty and let
  // `required` make the owner say which shop, exactly as the Open Session
  // modal does. A previous choice is kept in that case so logging several
  // adjustments in a row does not mean re-picking each time.
  useEffect(() => {
    if (!showModal || !showBranchPicker) return;
    setAdjBranchId((prev) => viewBranchId || prev || '');
  }, [showModal, showBranchPicker, viewBranchId]);

  const adjBranchName = useMemo(() => {
    if (!showBranchPicker || !adjBranchId) return '';
    const b = branches.find((x) => String(x.id) === String(adjBranchId));
    return b ? b.name : '';
  }, [branches, adjBranchId, showBranchPicker]);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['retail-stock-adjustments'],
    queryFn: getStockAdjustments,
    staleTime: 30000,
  });

  // Scope the catalogue to the shop being adjusted, not the shop being
  // viewed. Otherwise an owner on "All shops" picks a product showing the
  // CHAIN total and writes six units off against one shop's shelf, having
  // read a number that belongs to the whole business.
  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-adj', adjBranchId || viewBranchId || 'all'],
    queryFn: () => getProducts(adjBranchId ? { branch: adjBranchId } : undefined),
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
    .reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const totalRestock = filtered
    .filter(a => a.adjustment_type === 'restock')
    .reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

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
                      {['stolen', 'damaged', 'expired', 'broken'].includes(adj.adjustment_type) ? '-' : '+'}{fmtQty(adj.quantity)}
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
        branches={branches}
        showBranchPicker={showBranchPicker}
        branchId={adjBranchId}
        onBranchChange={setAdjBranchId}
        branchLabel={adjBranchName}
      />
    </div>
  );
}
