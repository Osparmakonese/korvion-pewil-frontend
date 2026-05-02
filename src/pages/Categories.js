import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory, getProducts } from '../api/retailApi';
import { confirm } from '../utils/confirm';
import { invalidateCategoryCaches } from '../utils/queryCache';

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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {editCategory ? '\u{270F}\uFE0F Edit Category' : '\u{2795} Add Category'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Category Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Beverages, Snacks, Household" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of the category..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : editCategory ? 'Update Category' : 'Add Category'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
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
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  addBtn: { padding: '10px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'border-color 0.15s' },
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
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

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

  const getProductCount = (catId) => products.filter(p => p.category === catId).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>{'\u{1F3F7}'} Categories</h1>
        <button onClick={() => { setEditCategory(null); setShowModal(true); }} style={S.addBtn}>
          {'\u{2795}'} Add Category
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F3F7}'} Total Categories</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1a6b3a' }}>{categories.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{'\u{1F4E6}'} Total Products</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#374151' }}>{products.length}</div>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div style={S.emptyState}>Loading categories...</div>
      ) : categories.length > 0 ? (
        <div style={S.grid}>
          {categories.map(cat => {
            const count = getProductCount(cat.id);
            return (
              <div
                key={cat.id}
                style={S.card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a6b3a'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <div style={S.cardTitle}>{cat.name}</div>
                <div style={S.cardDesc}>{cat.description || 'No description'}</div>
                <div style={S.cardFooter}>
                  <span style={S.productCount}>{count} product{count !== 1 ? 's' : ''}</span>
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
