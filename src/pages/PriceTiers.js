import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPriceTiers, createPriceTier, deletePriceTier, getProducts } from '../api/retailApi';
import { fmt } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

export default function PriceTiers() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['price-tiers'], queryFn: () => getPriceTiers() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const tiers = arr(data);
  const products = arr(prodData);

  const empty = { product: '', min_qty: '', unit_price: '', label: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({ mutationFn: createPriceTier, onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-tiers'] }); setForm(empty); } });
  const del = useMutation({ mutationFn: deletePriceTier, onSuccess: () => qc.invalidateQueries({ queryKey: ['price-tiers'] }) });

  const submit = (e) => {
    e.preventDefault();
    if (!form.product || !form.min_qty || !form.unit_price) return;
    create.mutate({ product: Number(form.product), min_qty: Number(form.min_qty), unit_price: Number(form.unit_price), label: form.label });
  };

  // group by product
  const byProduct = {};
  tiers.forEach((t) => { (byProduct[t.product] = byProduct[t.product] || []).push(t); });

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Volume pricing tiers</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Buy more, pay less per unit. The till charges the best tier a quantity qualifies for.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Product</th><th style={th}>Buy ≥</th><th style={th}>Price each</th><th style={th}>Label</th><th style={th}></th></tr></thead>
          <tbody>
            {tiers.length === 0 && <tr><td style={td} colSpan={5}>No tiers yet.</td></tr>}
            {Object.keys(byProduct).map((pid) => byProduct[pid].sort((a, b) => a.min_qty - b.min_qty).map((t, idx) => (
              <tr key={t.id}>
                <td style={td}>{idx === 0 ? (t.product_name || t.product) : ''}</td>
                <td style={td}>{Number(t.min_qty)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(t.unit_price)}</td>
                <td style={td}>{t.label || '—'}</td>
                <td style={td}><button onClick={() => del.mutate(t.id)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Add a tier</h3>
        <form onSubmit={submit}>
          <label style={label}>Product *</label>
          <select style={input} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required>
            <option value="">Select…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={label}>Minimum quantity *</label>
          <input style={input} type="number" min={1} step="0.01" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} required />
          <label style={label}>Price per unit at this tier *</label>
          <input style={input} type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
          <label style={label}>Label (optional)</label>
          <input style={input} placeholder="e.g. Case price" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add tier'}</button>
        </form>
      </div>
    </div>
  );
}
