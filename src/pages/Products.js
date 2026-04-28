import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getLowStockProducts,
  getExpiringProducts,
  getStockAdjustments,
} from '../api/retailApi';
import MobileProducts from '../components/MobileProducts';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';

/* ─── Modal Component ─── */
function AddProductModal({ isOpen, onClose, onSubmit, categories, loading, initialData }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    cost_price: '',
    selling_price: '',
    quantity_in_stock: '',
    reorder_level: '',
    unit: 'piece',
    expiry_date: '',
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        sku: initialData.sku || '',
        category: initialData.category || '',
        cost_price: initialData.cost_price || '',
        selling_price: initialData.selling_price || '',
        quantity_in_stock: initialData.quantity_in_stock || '',
        reorder_level: initialData.reorder_level || '',
        unit: initialData.unit || 'piece',
        expiry_date: initialData.expiry_date || '',
        description: initialData.description || '',
      });
    } else {
      setForm({
        name: '',
        sku: '',
        category: '',
        cost_price: '',
        selling_price: '',
        quantity_in_stock: '',
        reorder_level: '',
        unit: 'piece',
        expiry_date: '',
        description: '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      name: '',
      sku: '',
      category: '',
      cost_price: '',
      selling_price: '',
      quantity_in_stock: '',
      reorder_level: '',
      unit: 'Piece',
      expiry_date: '',
      description: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '24px',
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#111827',
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {initialData ? '\u{270F}' : '\u{2795}'} {initialData ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#9ca3af',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Product Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: 7,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Cost Price
              </label>
              <input
                type="number"
                name="cost_price"
                value={form.cost_price}
                onChange={handleChange}
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Selling Price
              </label>
              <input
                type="number"
                name="selling_price"
                value={form.selling_price}
                onChange={handleChange}
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Stock Quantity
              </label>
              <input
                type="number"
                name="quantity_in_stock"
                value={form.quantity_in_stock}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Reorder Level
              </label>
              <input
                type="number"
                name="reorder_level"
                value={form.reorder_level}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Unit
              </label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="piece">Piece</option>
                <option value="kg">Kg</option>
                <option value="litre">Litre</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Expiry Date (optional)
              </label>
              <input
                type="date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: 7,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                background: '#1a6b3a',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : (initialData ? 'Update Product' : 'Add Product')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Products Page ─── */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '20px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    fontFamily: "'Playfair Display', serif",
    margin: 0,
  },
  addBtn: {
    padding: '10px 18px',
    background: '#1a6b3a',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: '1fr 200px',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 7,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 7,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 9,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  badge: (color) => ({
    display: 'inline-block',
    fontSize: 8,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 10,
    textTransform: 'uppercase',
    background: color === 'red' ? '#fdecea' : color === 'amber' ? '#fef3e2' : '#e8f5ee',
    color: color === 'red' ? '#c0392b' : color === 'amber' ? '#92400e' : '#1a6b3a',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
  lockBanner: {
    background: '#fef3e2',
    border: '1px solid #c97d1a',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#92400e',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    margin: '24px 0 4px 0',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 16,
    fontStyle: 'italic',
  },
};

export default function Products() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Mobile branch — phones get the locked-design product list. The
  // existing "Add Product" modal stays mounted under the desktop view
  // so we render it under MobileProducts too; FAB / row taps drive the
  // same setShowModal / setEditingProduct state.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 500
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const isWorker = user?.role === 'worker';

  const { data: products = [] } = useQuery({
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

  const { data: stockAdjustments = [] } = useQuery({
    queryKey: ['retail-stock-adjustments'],
    queryFn: getStockAdjustments,
  });

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-products'] });
      qc.invalidateQueries({ queryKey: ['retail-low-stock'] });
      setShowModal(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-products'] });
      qc.invalidateQueries({ queryKey: ['retail-low-stock'] });
      setShowModal(false);
      setEditingProduct(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-products'] });
      qc.invalidateQueries({ queryKey: ['retail-low-stock'] });
    },
  });

  const lowStockIds = new Set(lowStock.map((p) => p.id));
  const expiringIds = new Set(expiring.map((p) => p.id));

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(search.toLowerCase());
      const skuMatch = p.sku.toLowerCase().includes(search.toLowerCase());
      const catMatch = !categoryFilter || p.category === parseInt(categoryFilter);
      return (nameMatch || skuMatch) && catMatch;
    });
  }, [products, search, categoryFilter]);

  const handleAddProduct = (formData) => {
    if (editingProduct) {
      updateMut.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMut.mutate(formData);
    }
  };

  // Listen for topbar primary action event
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.tab === 'Products') setShowModal(true);
    };
    window.addEventListener('pewil-primary-action', handler);
    return () => window.removeEventListener('pewil-primary-action', handler);
  }, []);

  // Mobile branch returns AFTER all hooks above so React's hook-ordering
  // rule stays consistent across viewport flips. The existing desktop
  // <AddProductModal> is rendered alongside MobileProducts so the
  // owner/manager can tap a row or the FAB to edit/add products on
  // mobile too — same modal, same submit path, same data.
  if (isMobile) {
    return (
      <>
        <MobileProducts
          onAddProduct={() => { setEditingProduct(null); setShowModal(true); }}
          onEditProduct={(p) => { setEditingProduct(p); setShowModal(true); }}
        />
        {!isWorker && (
          <AddProductModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setEditingProduct(null);
            }}
            onSubmit={handleAddProduct}
            categories={categories}
            loading={createMut.isPending || updateMut.isPending}
            initialData={editingProduct}
          />
        )}
      </>
    );
  }

  return (
    <div style={S.page}>
      {isWorker && (
        <div style={S.lockBanner}>
          <span>🔒</span>
          <span>You have view-only access. Contact a manager to edit products.</span>
        </div>
      )}

      <div style={S.header}>
        <h1 style={S.title}>Products</h1>
        {!isWorker && (
          <button
            onClick={() => setShowModal(true)}
            style={S.addBtn}
          >
            {'\u{2795}'} Add Product
          </button>
        )}
      </div>

      <div style={S.controls}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={S.input}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={S.select}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div style={S.card}>
        {filtered.length > 0 ? (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>SKU</th>
                <th style={S.th}>Product</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Cost</th>
                <th style={S.th}>Sell</th>
                <th style={S.th}>Stock</th>
                <th style={S.th}>VAT</th>
                <th style={S.th}>Status</th>
                {!isWorker && <th style={S.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const isLowStock = lowStockIds.has(product.id);
                const isExpiring = expiringIds.has(product.id);
                const catName =
                  categories.find((c) => c.id === product.category)?.name || 'N/A';

                return (
                  <tr key={product.id}>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600 }}>
                      {product.sku}
                    </td>
                    <td style={{ ...S.td, fontWeight: 600 }}>
                      {product.name}
                    </td>
                    <td style={{ ...S.td, fontSize: 11, color: '#6b7280' }}>
                      {catName}
                    </td>
                    <td style={S.td}>
                      {fmt(product.cost_price, 'zwd')}
                    </td>
                    <td style={S.td}>
                      {fmt(product.selling_price, 'zwd')}
                    </td>
                    <td style={S.td}>
                      {product.quantity_in_stock} {product.unit}
                    </td>
                    <td style={S.td}>
                      {product.vat_percentage || '—'}
                    </td>
                    <td style={S.td}>
                      {isExpiring && (
                        <span style={{ ...S.badge('amber'), marginRight: 6 }}>
                          Expiring
                        </span>
                      )}
                      {isLowStock && (
                        <span style={S.badge('amber')}>
                          Low Stock
                        </span>
                      )}
                      {!isExpiring && !isLowStock && (
                        <span style={S.badge('green')}>
                          Active
                        </span>
                      )}
                    </td>
                    {!isWorker && (
                      <td style={S.td}>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowModal(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #1a6b3a',
                            background: 'transparent',
                            color: '#1a6b3a',
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginRight: 6,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm({ title: 'Delete product', message: `Delete ${product.name}?`, confirmText: 'Delete' })) {
                              deleteMut.mutate(product.id);
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #c0392b',
                            background: 'transparent',
                            color: '#c0392b',
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={S.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>
              {products.length === 0 ? '\u{1F6D2}' : '\u{1F50D}'}
            </div>
            <p>{products.length === 0 ? 'No products yet' : 'No products found'}</p>
            <p style={{ fontSize: 11, marginTop: 6 }}>
              {products.length === 0 ? 'Add your first product to get started' : 'Try adjusting your search or filters'}
            </p>
            {products.length === 0 && !isWorker && (
              <button onClick={() => setShowModal(true)} style={{ ...S.addBtn, marginTop: 12 }}>
                {'\u{2795}'} Add Product
              </button>
            )}
          </div>
        )}
      </div>

      {isOwnerOrManager && (
        <div>
          <h2 style={S.sectionTitle}>Stock Adjustments</h2>
          <p style={S.sectionSubtitle}>(Owner/Manager only)</p>

          <div style={S.card}>
            {stockAdjustments.length > 0 ? (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Product</th>
                    <th style={S.th}>Qty</th>
                    <th style={S.th}>Reason</th>
                    <th style={S.th}>Adjusted By</th>
                    <th style={S.th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAdjustments.map((adj) => {
                    const product = products.find((p) => p.id === adj.product_id);
                    const reasonColor =
                      adj.reason === 'Stolen'
                        ? 'red'
                        : adj.reason === 'Damaged'
                        ? 'amber'
                        : adj.reason === 'Expired'
                        ? 'gray'
                        : 'green';

                    return (
                      <tr key={adj.id}>
                        <td style={S.td}>
                          {new Date(adj.adjusted_at).toLocaleDateString()}
                        </td>
                        <td style={{ ...S.td, fontWeight: 600 }}>
                          {product?.name || 'N/A'}
                        </td>
                        <td style={{ ...S.td, color: adj.quantity < 0 ? '#c0392b' : '#374151', fontWeight: 700 }}>
                          {adj.quantity < 0 ? '' : '+'}{adj.quantity}
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              ...S.badge(reasonColor === 'gray' ? 'amber' : reasonColor),
                              background:
                                reasonColor === 'red'
                                  ? '#fdecea'
                                  : reasonColor === 'amber'
                                  ? '#fef3e2'
                                  : '#e8f5ee',
                            }}
                          >
                            {adj.reason}
                          </span>
                        </td>
                        <td style={S.td}>
                          {adj.adjusted_by_user?.name || 'N/A'}
                        </td>
                        <td style={{ ...S.td, fontSize: 10, color: '#9ca3af' }}>
                          {adj.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={S.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>
                  {'📋'}
                </div>
                <p>No stock adjustments</p>
                <p style={{ fontSize: 11, marginTop: 6 }}>
                  Stock adjustments will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isWorker && (
        <AddProductModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSubmit={handleAddProduct}
          categories={categories}
          loading={createMut.isPending || updateMut.isPending}
          initialData={editingProduct}
        />
      )}
    </div>
  );
}
