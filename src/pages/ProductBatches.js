import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductBatches, createProductBatch, deleteProductBatch, getProducts } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

function daysTo(d) {
  if (!d) return null;
  return Math.round((new Date(d) - new Date()) / 86400000);
}

export default function ProductBatches() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['product-batches'], queryFn: () => getProductBatches() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const batches = arr(data);
  const products = arr(prodData);
  const empty = { product: '', batch_number: '', expiry_date: '', quantity_received: '', cost_price: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({
    mutationFn: createProductBatch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-batches'] }); setForm(empty); },
  });
  const del = useMutation({
    mutationFn: deleteProductBatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-batches'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.product || !form.batch_number) return;
    create.mutate({
      ...form,
      quantity_received: form.quantity_received || 0,
      quantity_remaining: form.quantity_received || 0,
      cost_price: form.cost_price || 0,
    });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Batches & expiry</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Product</th><th style={th}>Batch</th><th style={th}>Expiry</th><th style={th}>Qty left</th><th style={th}></th></tr></thead>
          <tbody>
            {batches.length === 0 && <tr><td style={td} colSpan={5}>No batches yet. Add one on the right.</td></tr>}
            {batches.map((b) => {
              const d = daysTo(b.expiry_date);
              const warn = d !== null && d <= 90;
              return (
                <tr key={b.id}>
                  <td style={td}>{b.product_name || b.product}</td>
                  <td style={td}>{b.batch_number}</td>
                  <td style={{ ...td, color: warn ? '#991b1b' : '#111827', fontWeight: warn ? 700 : 400 }}>
                    {b.expiry_date || '—'}{d !== null && ` (${d}d)`}
                  </td>
                  <td style={td}>{b.quantity_remaining}</td>
                  <td style={td}><button onClick={() => del.mutate(b.id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}>Remove</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Add batch</h3>
        <form onSubmit={submit}>
          <label style={label}>Product</label>
          <select style={input} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={label}>Batch / lot number</label>
          <input style={input} value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} required />
          <label style={label}>Expiry date</label>
          <input style={input} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          <label style={label}>Quantity received</label>
          <input style={input} type="number" min={0} value={form.quantity_received} onChange={(e) => setForm({ ...form, quantity_received: e.target.value })} />
          <label style={label}>Cost price (each)</label>
          <input style={input} type="number" min={0} step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add batch'}</button>
        </form>
      </div>
    </div>
  );
}
