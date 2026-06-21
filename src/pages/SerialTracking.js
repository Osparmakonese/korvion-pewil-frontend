import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductSerials, createProductSerial, markSerialSold, deleteProductSerial, getProducts } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });
const SC = { in_stock: { bg: '#e8f5ee', fg: '#1a6b3a' }, sold: { bg: '#f3f4f6', fg: '#6b7280' }, returned: { bg: '#EFF6FF', fg: '#1d4ed8' }, faulty: { bg: '#fdecea', fg: '#c0392b' } };

export default function SerialTracking() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['product-serials', q], queryFn: () => getProductSerials(q ? { q } : undefined) });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const serials = arr(data);
  const products = arr(prodData);

  const empty = { product: '', serial_number: '', notes: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({ mutationFn: createProductSerial, onSuccess: () => { qc.invalidateQueries({ queryKey: ['product-serials'] }); setForm({ ...empty, product: form.product }); } });
  const sold = useMutation({ mutationFn: (id) => markSerialSold(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['product-serials'] }) });
  const del = useMutation({ mutationFn: deleteProductSerial, onSuccess: () => qc.invalidateQueries({ queryKey: ['product-serials'] }) });

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Serial / IMEI register</h3>
          <input style={{ ...input, width: 180 }} placeholder="Search serial / IMEI…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Every phone or device by its unique serial — receive it, then mark it sold so you never sell the same unit twice.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Serial / IMEI</th><th style={th}>Product</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {serials.length === 0 && <tr><td style={td} colSpan={4}>No units recorded.</td></tr>}
            {serials.map((s) => (
              <tr key={s.id}>
                <td style={{ ...td, fontFamily: 'monospace' }}>{s.serial_number}</td>
                <td style={td}>{s.product_name || s.product}</td>
                <td style={td}><span style={pill(SC[s.status] || SC.in_stock)}>{s.status.replace('_', ' ')}</span></td>
                <td style={td}>
                  {s.status === 'in_stock' && <button onClick={() => sold.mutate(s.id)} style={{ background: '#EFF6FF', color: '#1d4ed8', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Mark sold</button>}
                  <button onClick={() => del.mutate(s.id)} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Add a unit</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (form.product && form.serial_number) create.mutate({ product: Number(form.product), serial_number: form.serial_number, notes: form.notes }); }}>
          <label style={label}>Product *</label>
          <select style={input} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required>
            <option value="">Select…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={label}>Serial number / IMEI *</label>
          <input style={input} value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} required />
          <label style={label}>Notes</label>
          <input style={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add unit'}</button>
        </form>
      </div>
    </div>
  );
}
