import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarranties, createWarranty, deleteWarranty, getProducts, getProductSerials } from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });
const SC = { active: { bg: '#e8f5ee', fg: '#1a6b3a' }, expired: { bg: '#fef3e2', fg: '#c97d1a' }, void: { bg: '#fdecea', fg: '#c0392b' } };
const today = () => new Date().toISOString().slice(0, 10);

export default function Warranties() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['warranties', q], queryFn: () => getWarranties(q ? { q } : undefined) });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: serialData } = useQuery({ queryKey: ['product-serials'], queryFn: () => getProductSerials() });
  const warranties = arr(data);
  const products = arr(prodData);
  const serials = arr(serialData);

  const empty = { product: '', serial: '', customer_name: '', customer_phone: '', start_date: today(), period_months: 12, notes: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({ mutationFn: createWarranty, onSuccess: () => { qc.invalidateQueries({ queryKey: ['warranties'] }); setForm(empty); } });
  const del = useMutation({ mutationFn: deleteWarranty, onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }) });

  return (
    <div className="vtl-stack" style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Warranties</h3>
          <input style={{ ...input, width: isMobile ? '100%' : 200 }} placeholder="Search customer / serial…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Look up whether a unit is still covered. Expiry is worked out from the start date and warranty length.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Product</th><th style={th}>Serial</th><th style={th}>Customer</th><th style={th}>Expires</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {warranties.length === 0 && <tr><td style={td} colSpan={6}>No warranties yet.</td></tr>}
            {warranties.map((w) => (
              <tr key={w.id}>
                <td style={td}>{w.product_name || w.product}</td>
                <td style={{ ...td, fontFamily: 'monospace' }}>{w.serial_number || '—'}</td>
                <td style={td}>{w.customer_name || '—'}</td>
                <td style={td}>{w.expiry_date || '—'}</td>
                <td style={td}><span style={pill(SC[w.status] || SC.active)}>{w.status}</span></td>
                <td style={td}><button onClick={() => del.mutate(w.id)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Register a warranty</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (form.product) create.mutate({ ...form, product: Number(form.product), serial: form.serial ? Number(form.serial) : null, period_months: Number(form.period_months) || 12 }); }}>
          <label style={label}>Product *</label>
          <select style={input} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required>
            <option value="">Select…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={label}>Serial / IMEI (optional)</label>
          <select style={input} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })}>
            <option value="">None</option>
            {serials.filter((s) => !form.product || String(s.product) === String(form.product)).map((s) => <option key={s.id} value={s.id}>{s.serial_number}</option>)}
          </select>
          <label style={label}>Customer name</label>
          <input style={input} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <label style={label}>Customer phone</label>
          <input style={input} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={label}>Start date</label><input style={input} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label style={label}>Months</label><input style={input} type="number" min={1} value={form.period_months} onChange={(e) => setForm({ ...form, period_months: e.target.value })} /></div>
          </div>
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Register warranty'}</button>
        </form>
      </div>
    </div>
  );
}
