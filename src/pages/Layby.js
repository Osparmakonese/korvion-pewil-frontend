import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLaybys, createLayby, addLaybyPayment, collectLayby, cancelLayby, getLaybySummary,
} from '../api/retailApi';

const G = '#1a6b3a';
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const S = {
  page: { maxWidth: 1080, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px' },
  stats: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  stat: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', minWidth: 140 },
  statL: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  statV: { fontSize: 20, fontWeight: 800, color: '#0f172a' },
  bar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' },
  btn: { padding: '9px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', background: G, color: '#fff' },
  btnSm: { padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', color: '#334155' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color: fg }),
  modalWrap: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 22, width: 540, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', margin: '10px 0 4px', textTransform: 'uppercase' },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
  lineRow: { display: 'flex', gap: 6, marginBottom: 6 },
};

const STATUS_PILL = {
  active: ['#e0f2fe', '#0369a1'], completed: ['#e8f5ee', G],
  cancelled: ['#f1f5f9', '#64748b'], forfeited: ['#fef2f2', '#b91c1c'],
};

export default function Layby() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [payFor, setPayFor] = useState(null);

  const { data: laybys = [] } = useQuery({ queryKey: ['laybys', filter], queryFn: () => getLaybys(filter) });
  const { data: summary } = useQuery({ queryKey: ['layby-summary'], queryFn: getLaybySummary });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['laybys'] }); qc.invalidateQueries({ queryKey: ['layby-summary'] }); };

  const collectMut = useMutation({ mutationFn: collectLayby, onSuccess: refresh });
  const cancelMut = useMutation({ mutationFn: cancelLayby, onSuccess: refresh });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Layby</h1>
      <p style={S.sub}>Let customers reserve goods and pay them off in instalments. Collect releases the goods as a fiscal sale.</p>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statL}>Active</div><div style={S.statV}>{summary?.active ?? 0}</div></div>
        <div style={S.stat}><div style={S.statL}>Outstanding</div><div style={S.statV}>{money(summary?.outstanding_balance)}</div></div>
        <div style={S.stat}><div style={S.statL}>Completed</div><div style={S.statV}>{summary?.completed ?? 0}</div></div>
      </div>

      <div style={S.bar}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...S.input, width: 180 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button style={S.btn} onClick={() => setShowNew(true)}>+ New layby</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Customer</th><th style={S.th}>Total</th><th style={S.th}>Paid</th>
            <th style={S.th}>Balance</th><th style={S.th}>Due</th><th style={S.th}>Status</th><th style={S.th}></th>
          </tr></thead>
          <tbody>
            {laybys.length === 0 && <tr><td style={S.td} colSpan={7}>No laybys yet.</td></tr>}
            {laybys.map((l) => (
              <tr key={l.id}>
                <td style={S.td}>{l.customer_display || l.customer_name || '—'}<div style={{ fontSize: 10, color: '#94a3b8' }}>{l.customer_phone}</div></td>
                <td style={S.td}>{money(l.total_amount)}</td>
                <td style={S.td}>{money(l.amount_paid)}</td>
                <td style={S.td}><b>{money(l.balance)}</b></td>
                <td style={S.td}>{l.due_date || '—'}</td>
                <td style={S.td}><span style={S.pill(...(STATUS_PILL[l.status] || ['#f1f5f9', '#64748b']))}>{l.status}</span></td>
                <td style={S.td}>
                  {l.status === 'active' && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={S.btnSm} onClick={() => setPayFor(l)}>Pay</button>
                      <button style={{ ...S.btnSm, color: G, borderColor: G }} onClick={() => collectMut.mutate(l.id)}>Collect</button>
                      <button style={{ ...S.btnSm, color: '#b91c1c' }} onClick={() => cancelMut.mutate(l.id)}>✕</button>
                    </div>
                  )}
                  {l.completed_sale && <span style={{ fontSize: 11, color: G }}>Sale #{l.completed_sale}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewLaybyModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refresh(); }} />}
      {payFor && <PaymentModal layby={payFor} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); refresh(); }} />}
    </div>
  );
}

function NewLaybyModal({ onClose, onSaved }) {
  const [f, setF] = useState({ customer_name: '', customer_phone: '', due_date: '', notes: '' });
  const [lines, setLines] = useState([{ product_name: '', qty: 1, unit_price: '' }]);
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);
  const mut = useMutation({
    mutationFn: createLayby,
    onSuccess: onSaved,
  });
  const save = () => {
    const items_data = lines.filter((l) => l.product_name && l.unit_price).map((l) => ({
      product_name: l.product_name, qty: Number(l.qty) || 1,
      unit_price: Number(l.unit_price) || 0, total: (Number(l.qty) || 1) * (Number(l.unit_price) || 0),
    }));
    mut.mutate({ ...f, items_data, total_amount: total, status: 'active' });
  };
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px' }}>New layby</h2>
        <label style={S.label}>Customer name</label>
        <input style={S.input} value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        <label style={S.label}>Phone</label>
        <input style={S.input} value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} />
        <label style={S.label}>Items</label>
        {lines.map((l, i) => (
          <div key={i} style={S.lineRow}>
            <input placeholder="Item" style={{ ...S.input, flex: 2 }} value={l.product_name} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, product_name: e.target.value } : x))} />
            <input placeholder="Qty" type="number" style={{ ...S.input, flex: 1 }} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
            <input placeholder="Price" type="number" style={{ ...S.input, flex: 1 }} value={l.unit_price} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} />
          </div>
        ))}
        <button style={S.btnSm} onClick={() => setLines([...lines, { product_name: '', qty: 1, unit_price: '' }])}>+ Add item</button>
        <label style={S.label}>Due date</label>
        <input type="date" style={S.input} value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 6px' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: G }}>{money(total)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={{ ...S.btnSm, flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, flex: 2, opacity: total > 0 ? 1 : 0.5 }} disabled={total <= 0 || mut.isPending} onClick={save}>{mut.isPending ? 'Saving…' : 'Create layby'}</button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ layby, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const mut = useMutation({ mutationFn: (data) => addLaybyPayment(layby.id, data), onSuccess: onSaved });
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modal, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>Add payment</h2>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>{layby.customer_display || layby.customer_name} · balance {money(layby.balance)}</p>
        <label style={S.label}>Amount</label>
        <input type="number" autoFocus style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label style={S.label}>Method</label>
        <select style={S.input} value={method} onChange={(e) => setMethod(e.target.value)}>
          {['cash', 'ecocash', 'onemoney', 'innbucks', 'card', 'bank_transfer'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ ...S.btnSm, flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, flex: 2 }} disabled={!amount || mut.isPending} onClick={() => mut.mutate({ amount: Number(amount), method })}>{mut.isPending ? '…' : 'Record payment'}</button>
        </div>
        {mut.data?.completed && <p style={{ color: G, fontSize: 12, marginTop: 10 }}>✓ Fully paid — goods released as a fiscal sale.</p>}
      </div>
    </div>
  );
}
