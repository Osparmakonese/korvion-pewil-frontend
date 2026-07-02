import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuotations, createQuotation, setQuotationStatus, deleteQuotation, getProducts } from '../api/retailApi';
import { fmt } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const STATUS_COLORS = {
  draft: { bg: '#f3f4f6', fg: '#6b7280' }, sent: { bg: '#EFF6FF', fg: '#1d4ed8' },
  accepted: { bg: '#e8f5ee', fg: '#1a6b3a' }, declined: { bg: '#fdecea', fg: '#c0392b' },
  expired: { bg: '#fef3e2', fg: '#c97d1a' }, converted: { bg: '#e8f5ee', fg: '#1a6b3a' },
};

export default function Quotations() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['quotations'], queryFn: () => getQuotations() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const quotes = arr(data);
  const products = arr(prodData);

  const empty = { customer_name: '', customer_phone: '', valid_until: '', notes: '', tax: '' };
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState([{ product: '', name: '', qty: 1, unit_price: '' }]);
  const [formError, setFormError] = useState('');

  const create = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); setForm(empty); setLines([{ product: '', name: '', qty: 1, unit_price: '' }]); },
  });
  const setStatus = useMutation({ mutationFn: ({ id, status }) => setQuotationStatus(id, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });
  const del = useMutation({ mutationFn: deleteQuotation, onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });

  const setLine = (i, patch) => {
    setFormError('');
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    if (patch.product) { const p = products.find((x) => String(x.id) === String(patch.product)); if (p) { next[i].name = p.name; if (!next[i].unit_price) next[i].unit_price = p.selling_price; } }
    setLines(next);
  };
  const subtotal = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    const items = lines.filter((l) => l.product && Number(l.qty) > 0).map((l) => ({
      product: Number(l.product), name: l.name, qty: Number(l.qty),
      unit_price: Number(l.unit_price) || 0, total: (Number(l.qty) || 0) * (Number(l.unit_price) || 0),
    }));
    if (!form.customer_name || items.length === 0) {
      setFormError(items.length === 0 ? 'Add at least one line item.' : 'Enter a customer name.');
      return;
    }
    setFormError('');
    create.mutate({ ...form, tax: Number(form.tax) || 0, items_data: items });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Quotations</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Quote a job, then mark it accepted or converted when the customer commits.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Quote #</th><th style={th}>Customer</th><th style={th}>Total</th><th style={th}>Valid</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {quotes.length === 0 && <tr><td style={td} colSpan={6}>No quotes yet.</td></tr>}
            {quotes.map((q) => (
              <tr key={q.id}>
                <td style={{ ...td, fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600 }}>{q.quote_number}</td>
                <td style={td}>{q.customer_name}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(q.total || 0, 'zwd')}</td>
                <td style={td}>{q.valid_until || '—'}</td>
                <td style={td}><span style={pill(STATUS_COLORS[q.status] || STATUS_COLORS.draft)}>{q.status}</span></td>
                <td style={td}>
                  {q.status !== 'converted' && (
                    <select style={{ ...input, width: 'auto', padding: '3px 6px', fontSize: 10 }} value="" onChange={(e) => e.target.value && setStatus.mutate({ id: q.id, status: e.target.value })}>
                      <option value="">Set…</option>
                      <option value="sent">Sent</option><option value="accepted">Accepted</option>
                      <option value="declined">Declined</option><option value="converted">Converted</option>
                    </select>
                  )}
                  <button onClick={() => del.mutate(q.id)} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New quote</h3>
        <form onSubmit={submit}>
          <label style={label}>Customer name *</label>
          <input style={input} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <label style={label}>Customer phone</label>
          <input style={input} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <label style={label}>Line items</label>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 56px 72px' : '1fr 46px 64px', gap: 4, marginBottom: 4 }}>
              <select style={{ ...input, padding: '6px 6px' }} value={l.product} onChange={(e) => setLine(i, { product: e.target.value })}>
                <option value="">Product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input style={{ ...input, padding: '6px 6px' }} type="number" min={0} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              <input style={{ ...input, padding: '6px 6px' }} type="number" min={0} step="0.01" placeholder="price" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { product: '', name: '', qty: 1, unit_price: '' }])} style={{ background: 'none', border: 'none', color: '#1a6b3a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add line</button>
          <label style={label}>Tax</label>
          <input style={input} type="number" min={0} step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
          <label style={label}>Valid until</label>
          <input style={input} type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Subtotal: {fmt(subtotal, 'zwd')}</div>
          {formError && <div style={{ marginTop: 6, color: '#c0392b', fontSize: 12 }}>{formError}</div>}
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create quote'}</button>
        </form>
      </div>
    </div>
  );
}
