import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  getProducts,
} from '../api/retailApi';
import { invalidateSupplierCaches, invalidateProductCaches } from '../utils/queryCache';

/* ---------- Supplier form modal ---------- */
function SupplierModal({ open, onClose, onSubmit, initialData, submitting }) {
  const [form, setForm] = useState({
    name: '', contact_person: '', phone: '', email: '', payment_terms: 'Net 30',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        contact_person: initialData.contact_person || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        payment_terms: initialData.payment_terms || 'Net 30',
      });
    } else {
      setForm({ name: '', contact_person: '', phone: '', email: '', payment_terms: 'Net 30' });
    }
  }, [initialData, open]);

  if (!open) return null;

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handle = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handle} style={{ background: '#fff', borderRadius: 10, padding: 24, width: 440, maxWidth: '90vw' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
          {initialData ? 'Edit Supplier' : 'Add Supplier'}
        </h2>
        {[
          ['Name *', 'name', 'text', true],
          ['Contact Person', 'contact_person', 'text', false],
          ['Phone', 'phone', 'text', false],
          ['Email', 'email', 'email', false],
          ['Payment Terms', 'payment_terms', 'text', false],
        ].map(([label, key, type, required]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
            <input
              type={type}
              required={required}
              value={form[key]}
              onChange={up(key)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, fontFamily: 'inherit' }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Purchase Order form modal ---------- */
function POModal({ open, onClose, onSubmit, suppliers, products, submitting }) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [form, setForm] = useState({
    supplier: '',
    order_date: today,
    expected_date: nextWeek,
    items: [{ product: '', quantity: 1, unit_price: 0 }],
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        supplier: suppliers[0]?.id || '',
        order_date: today,
        expected_date: nextWeek,
        items: [{ product: products[0]?.id || '', quantity: 1, unit_price: Number(products[0]?.cost_price) || 0 }],
      });
      setFormError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const total = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const updateItem = (i, k, v) => {
    setFormError('');
    const items = [...form.items];
    items[i] = { ...items[i], [k]: v };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product: products[0]?.id || '', quantity: 1, unit_price: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const handle = (e) => {
    e.preventDefault();
    if (!form.supplier) { setFormError('Select a supplier.'); return; }
    const items_data = form.items
      .filter((it) => it.product && it.quantity > 0)
      .map((it) => ({ product: Number(it.product), quantity: Number(it.quantity), unit_price: Number(it.unit_price) }));
    if (items_data.length === 0) { setFormError('Add at least one line item.'); return; }
    setFormError('');
    onSubmit({
      supplier: Number(form.supplier),
      order_date: form.order_date,
      expected_date: form.expected_date,
      items_data,
      total,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handle} style={{ background: '#fff', borderRadius: 10, padding: 24, width: 640, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>New Purchase Order</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Supplier *</label>
            <select required value={form.supplier} onChange={(e) => { setFormError(''); setForm({ ...form, supplier: e.target.value }); }}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
              <option value="">-- Select --</option>
              {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Order Date</label>
            <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Expected Date</label>
            <input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Line Items</div>
        {form.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select value={it.product} onChange={(e) => {
              const p = products.find((x) => String(x.id) === e.target.value);
              updateItem(i, 'product', e.target.value);
              if (p && !it.unit_price) updateItem(i, 'unit_price', Number(p.cost_price) || 0);
            }} style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 5 }}>
              <option value="">-- Product --</option>
              {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)}
              placeholder="Qty" style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 5 }} />
            <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
              placeholder="Unit price" style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 5 }} />
            <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1}
              style={{ padding: '6px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addItem} style={{ marginTop: 4, padding: '6px 12px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Add line</button>

        <div style={{ marginTop: 16, padding: '10px 12px', background: '#f9fafb', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b3a' }}>${total.toFixed(2)}</span>
        </div>

        {formError && <div style={{ marginTop: 10, color: '#c0392b', fontSize: 12 }}>{formError}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating...' : 'Create PO'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Main component ---------- */
export default function Suppliers({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Suppliers');
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(null);

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  // Listen for topbar "+ New Purchase Order" click
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.tab === 'Suppliers') {
        setActiveTab('Purchase Orders');
        setPoModalOpen(true);
      }
    };
    window.addEventListener('pewil-primary-action', handler);
    return () => window.removeEventListener('pewil-primary-action', handler);
  }, []);

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['retail-suppliers'], queryFn: getSuppliers, staleTime: 30000,
  });
  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ['retail-purchase-orders'], queryFn: getPurchaseOrders, staleTime: 30000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-for-po'], queryFn: getProducts, staleTime: 30000,
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['retail-suppliers'] }); setSupplierModalOpen(false); setEditingSupplier(null); },
    onError: (err) => alert('Failed to create supplier: ' + (err?.response?.data?.detail || err?.message || 'Unknown error')),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['retail-suppliers'] }); setSupplierModalOpen(false); setEditingSupplier(null); },
    onError: (err) => alert('Failed to update supplier: ' + (err?.response?.data?.detail || err?.message || 'Unknown error')),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retail-suppliers'] }),
    onError: (err) => alert('Failed to delete supplier: ' + (err?.response?.data?.detail || err?.message || 'Unknown error')),
  });

  const createPOMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['retail-purchase-orders'] }); setPoModalOpen(false); },
    onError: (err) => alert('Failed to create PO: ' + (err?.response?.data?.detail || JSON.stringify(err?.response?.data) || err?.message || 'Unknown error')),
  });

  const receivePOMutation = useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => {
      // Receiving a PO bumps stock — fan-out to every product list cache
      // (POS, low-stock, dashboard) plus the supplier/PO caches.
      invalidateSupplierCaches(queryClient);
      invalidateProductCaches(queryClient);
    },
    onError: (err) => alert('Failed to receive PO: ' + (err?.response?.data?.detail || err?.message || 'Unknown error')),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return { bg: '#e8f5ee', color: '#1a6b3a' };
      case 'International': return { bg: '#EFF6FF', color: '#1e3a5f' };
      case 'Pending': return { bg: '#fef3e2', color: '#c97d1a' };
      case 'In Transit': return { bg: '#EFF6FF', color: '#1e3a5f' };
      case 'Received': return { bg: '#e8f5ee', color: '#1a6b3a' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const openNewSupplier = () => { setEditingSupplier(null); setSupplierModalOpen(true); };
  const openEditSupplier = (s) => { setEditingSupplier(s); setSupplierModalOpen(true); };

  const submitSupplier = (data) => {
    if (editingSupplier) updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    else createSupplierMutation.mutate(data);
  };

  const handleDeleteSupplier = (s) => {
    setDeletingSupplier(s);
  };
  const confirmDeleteSupplier = () => {
    if (deletingSupplier) {
      deleteSupplierMutation.mutate(deletingSupplier.id, {
        onSettled: () => setDeletingSupplier(null),
      });
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <SupplierModal
        open={supplierModalOpen}
        onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
        onSubmit={submitSupplier}
        initialData={editingSupplier}
        submitting={createSupplierMutation.isPending || updateSupplierMutation.isPending}
      />
      <POModal
        open={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        onSubmit={(data) => createPOMutation.mutate(data)}
        suppliers={suppliers}
        products={products}
        submitting={createPOMutation.isPending}
      />

      {/* Delete confirmation modal */}
      {deletingSupplier && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, width: '90%' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700 }}>Delete Supplier</h3>
            <p style={{ margin: '0 0 20px 0', color: '#4b5563' }}>
              Delete supplier <strong>"{deletingSupplier.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingSupplier(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteSupplier} disabled={deleteSupplierMutation.isPending} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {deleteSupplierMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Suppliers & Purchase Orders
        </h1>
        {isOwnerOrManager && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openNewSupplier}
              style={{ background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + Add Supplier
            </button>
            <button onClick={() => {
              if (suppliers.length === 0) { alert('Add a supplier first before creating a purchase order.'); return; }
              if (products.length === 0) { alert('Add at least one product first.'); return; }
              setPoModalOpen(true);
            }}
              style={{ background: '#1a6b3a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + New Purchase Order
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['Suppliers', 'Purchase Orders'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ background: activeTab === tab ? '#1a6b3a' : '#fff', color: activeTab === tab ? '#fff' : '#374151', border: activeTab === tab ? 'none' : '1px solid #e5e7eb', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Suppliers Tab */}
      {activeTab === 'Suppliers' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          {suppliersLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No suppliers found. Click "+ Add Supplier" to create one.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['ID', 'Name', 'Contact', 'Phone', 'Email', 'Terms', 'Actions'].map((h) => (
                    <th key={h} style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: h === 'Actions' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{s.id}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{s.contact_person || '-'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{s.phone || '-'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: 10 }}>{s.email || '-'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{s.payment_terms || '-'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                      {isOwnerOrManager && (
                        <>
                          <button onClick={() => openEditSupplier(s)}
                            style={{ marginRight: 4, padding: '3px 8px', background: '#EFF6FF', color: '#1e3a5f', border: 'none', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => handleDeleteSupplier(s)}
                            disabled={deleteSupplierMutation.isPending}
                            style={{ padding: '3px 8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'Purchase Orders' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            {posLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading purchase orders...</div>
            ) : purchaseOrders.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No purchase orders found. Click "+ New Purchase Order" to create one.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['ID', 'Order Date', 'Supplier', 'Total', 'Expected', 'Status', 'Action'].map((h, i) => (
                      <th key={h} style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: (i === 3 ? 'right' : (i === 6 ? 'center' : 'left')) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => {
                    const sc = getStatusColor(po.status);
                    return (
                      <tr key={po.id}>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{po.id}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{po.order_date}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 500 }}>{po.supplier_name || 'N/A'}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, textAlign: 'right' }}>${Number(po.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{po.expected_date}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: sc.bg, color: sc.color }}>{po.status}</span>
                        </td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                          {po.status !== 'Received' && (
                            <button onClick={() => receivePOMutation.mutate(po.id)}
                              disabled={receivePOMutation.isPending}
                              style={{ background: '#1a6b3a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: receivePOMutation.isPending ? 'not-allowed' : 'pointer', opacity: receivePOMutation.isPending ? 0.6 : 1 }}>
                              {receivePOMutation.isPending ? 'Receiving...' : 'Receive'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-around', fontSize: 12, fontWeight: 600, color: '#111827' }}>
            <div><span style={{ color: '#6b7280', fontWeight: 500 }}>Total POs:</span> <span style={{ color: '#111827', fontWeight: 700 }}>{purchaseOrders.length}</span></div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}><span style={{ color: '#6b7280', fontWeight: 500 }}>Pending:</span> <span style={{ color: '#111827', fontWeight: 700 }}>{purchaseOrders.filter((po) => po.status === 'Pending').length}</span></div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}><span style={{ color: '#6b7280', fontWeight: 500 }}>Total Value:</span> <span style={{ color: '#111827', fontWeight: 700 }}>${purchaseOrders.reduce((sum, po) => sum + Number(po.total || 0), 0).toFixed(2)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
