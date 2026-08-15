import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory, getProducts } from '../api/retailApi';
import { confirm } from '../utils/confirm';
import { invalidateCategoryCaches } from '../utils/queryCache';
import usePrimaryAction from '../hooks/usePrimaryAction';
import useViewBranch from '../hooks/useViewBranch';

/* --- Category Modal --- */
function CategoryModal({ isOpen, onClose, onSubmit, loading, editCategory }) {
  const [name, setName] = useState(editCategory?.name || '');
  const [description, setDescription] = useState(editCategory?.description || '');

  React.useEffect(() => {
    if (editCategory) {
      setName(editCategory.name || '');
      setDescription(editCategory.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editCategory, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, description });
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: '#111827' }}>
            {editCategory ? '\u{270F}\uFE0F Edit Category' : '\u{2795} Add Category'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Category Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Beverages, Snacks, Household" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of the category..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : editCategory ? 'Update Category' : 'Add Category'}
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)', transition: 'border-color 0.15s' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#6b7280', marginBottom: 12, lineHeight: 1.5, minHeight: 16 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  productCount: { fontSize: 10, color: '#9ca3af', fontWeight: 600 },
  actionBtn: (color) => ({
    background: 'none', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    color: color === 'red' ? '#c0392b' : '#1a6b3a', padding: '4px 8px',
  }),
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#9ca3af' },
};

export default function Categories() {
  // Top-bar primary action — see hooks/usePrimaryAction.js.
  usePrimaryAction(() => { setEditCategory(null); setShowModal(true); });

  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  // A category is chain-wide ON PURPOSE and stays that way.
  //
  // The tempting change is to make Category belong to a branch, so a liquor
  // category cannot appear in a phone shop. It is the wrong trade: the same
  // word would then exist as several unrelated rows, "Beverages" at one shop
  // could not be compared with "Beverages" at another, every report that
  // groups by category would fragment, and a product — which IS chain-wide,
  // so that transfers and the rollup work — could only point at one of them.
  //
  // What is genuinely per-shop is whether a shop carries anything in a
  // category. That question is already answerable: `getProducts` is scoped
  // to the shop in context by the axios interceptor, so the counts below are
  // this shop's counts. All that was missing was saying so on screen.
  const { inShop, branchName } = useViewBranch();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['retail-categories-page'],
    queryFn: getCategories,
    staleTime: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-cats'],
    queryFn: getProducts,
  });

  const formatApiError = (err, fallback = 'Save failed') => {
    const data = err?.response?.data;
    if (typeof data === 'string') return data;
    if (data?.detail) return data.detail;
    if (data && typeof data === 'object') {
      const lines = Object.entries(data).map(([k, v]) =>
        `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      if (lines.length) return lines.join('\n');
    }
    return err?.message || fallback;
  };

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      // Categories list AND every product list (because product cards
      // show category names). Predicate-based — covers all variant keys.
      invalidateCategoryCaches(qc);
      setShowModal(false);
    },
    onError: (err) => alert('Could not create category:\n\n' + formatApiError(err)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: () => {
      invalidateCategoryCaches(qc);
      setShowModal(false);
      setEditCategory(null);
    },
    onError: (err) => alert('Could not update category:\n\n' + formatApiError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      invalidateCategoryCaches(qc);
    },
    onError: (err) => alert('Could not delete category:\n\n' + formatApiError(err)),
  });

  const handleSubmit = (data) => {
    if (editCategory) {
      updateMut.mutate({ id: editCategory.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const handleEdit = (cat) => {
    setEditCategory(cat);
    setShowModal(true);
  };

  const handleDelete = async (cat) => {
    if (await confirm({ title: 'Remove category', message: `Are you sure you want to remove "${cat.name}"? This will soft-delete the category.`, confirmText: 'Remove' })) {
      deleteMut.mutate(cat.id);
    }
  };

  const getProductCount = (catId) =>
    (Array.isArray(products) ? products : []).filter(p => p.category === catId).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>{'\u{1F3F7}'} Categories</h1>
        <button onClick={() => { setEditCategory(null); setShowModal(true); }} style={S.addBtn}>
          {'\u{2795}'} Add Category
        </button>
      </div>

      {/* Whose counts are these? Without this line, "0 products" under a
          category reads as "this category is empty" rather than "this shop
          does not carry anything in it" — two very different statements. */}
      {inShop && (
        <div style={{
          fontSize: 11.5, color: '#374151', background: '#e8f5ee',
          border: '1px solid #cfe8da', borderRadius: 10,
          padding: '9px 12px', marginBottom: 14, lineHeight: 1.5,
        }}>
          Categories are shared across the whole business. The counts below are
          for <strong>{branchName}</strong> — a category showing 0 simply
          isn{'’'}t stocked at this shop.
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F3F7}'} Total Categories</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#1a6b3a' }}>{categories.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F4E6}'} Total Products</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#374151' }}>{products.length}</div>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div style={S.emptyState}>Loading categories...</div>
      ) : categories.length > 0 ? (
        <div style={S.grid}>
          {categories.map(cat => {
            const count = getProductCount(cat.id);
            const emptyHere = inShop && count === 0;
            return (
              <div
                key={cat.id}
                style={emptyHere ? { ...S.card, opacity: 0.62 } : S.card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a6b3a'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e3e8e4'; }}
              >
                <div style={S.cardTitle}>{cat.name}</div>
                <div style={S.cardDesc}>{cat.description || 'No description'}</div>
                <div style={S.cardFooter}>
                  <span style={S.productCount}>
                    {emptyHere
                      ? `Not stocked at ${branchName}`
                      : `${count} product${count !== 1 ? 's' : ''}${inShop ? ` here` : ''}`}
                  </span>
                  <div>
                    <button onClick={() => handleEdit(cat)} style={S.actionBtn('green')}>Edit</button>
                    <button onClick={() => handleDelete(cat)} style={S.actionBtn('red')}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={S.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{'\u{1F3F7}'}</div>
          <p style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>No categories yet</p>
          <p style={{ fontSize: 11, marginTop: 6 }}>Create categories to organize your products</p>
        </div>
      )}

      <CategoryModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditCategory(null); }}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
        editCategory={editCategory}
      />
    </div>
  );
}
