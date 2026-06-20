import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getControlledLog, createControlledLog, getProducts } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

export default function ControlledRegister() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['controlled-log'], queryFn: () => getControlledLog() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const entries = arr(data);
  const allProducts = arr(prodData);
  // Prefer products explicitly flagged controlled; fall back to all if none yet.
  const controlled = allProducts.filter((p) => p.is_controlled);
  const products = controlled.length ? controlled : allProducts;

  const empty = { product: '', quantity: '', balance_after: '', patient_name: '', prescriber_name: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({
    mutationFn: createControlledLog,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['controlled-log'] }); setForm(empty); },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.product || !form.quantity) return;
    create.mutate({
      product: form.product,
      quantity: form.quantity,
      balance_after: form.balance_after || 0,
      patient_name: form.patient_name,
      prescriber_name: form.prescriber_name,
    });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Controlled-substance register</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
          Append-only record of every controlled/scheduled drug dispensed, for audit and reconciliation.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>When</th><th style={th}>Drug</th><th style={th}>Qty</th><th style={th}>Balance</th><th style={th}>Patient</th><th style={th}>Prescriber</th></tr></thead>
          <tbody>
            {entries.length === 0 && <tr><td style={td} colSpan={6}>No entries yet.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={td}>{(e.dispensed_at || e.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                <td style={td}>{e.product_name || e.product}</td>
                <td style={td}>{e.quantity}</td>
                <td style={td}>{e.balance_after}</td>
                <td style={td}>{e.patient_name || '—'}</td>
                <td style={td}>{e.prescriber_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Record a dispense</h3>
        <form onSubmit={submit}>
          <label style={label}>Drug</label>
          <select style={input} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required>
            <option value="">Select…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.controlled_schedule ? ` (${p.controlled_schedule})` : ''}</option>)}
          </select>
          {controlled.length === 0 && (
            <p style={{ fontSize: 10.5, color: '#92400e', marginTop: 4 }}>
              Tip: mark drugs as controlled on the product to filter this list.
            </p>
          )}
          <label style={label}>Quantity dispensed</label>
          <input style={input} type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <label style={label}>Balance after</label>
          <input style={input} type="number" min={0} step="0.01" value={form.balance_after} onChange={(e) => setForm({ ...form, balance_after: e.target.value })} />
          <label style={label}>Patient name</label>
          <input style={input} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
          <label style={label}>Prescriber name</label>
          <input style={input} value={form.prescriber_name} onChange={(e) => setForm({ ...form, prescriber_name: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add to register'}</button>
        </form>
      </div>
    </div>
  );
}
