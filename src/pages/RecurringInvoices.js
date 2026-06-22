import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecurringInvoices, createRecurringInvoice, generateRecurringInvoice, runDueRecurring,
} from '../api/retailApi';

const G = '#1a6b3a';
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px' },
  bar: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' },
  btn: { padding: '9px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', background: G, color: '#fff' },
  btnSm: { padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', color: '#334155' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  modalWrap: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 22, width: 460, maxWidth: '100%' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', margin: '10px 0 4px', textTransform: 'uppercase' },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
};

export default function RecurringInvoices() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: rows = [] } = useQuery({ queryKey: ['recurring'], queryFn: getRecurringInvoices });
  const refresh = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  const genMut = useMutation({ mutationFn: generateRecurringInvoice, onSuccess: refresh });
  const runMut = useMutation({ mutationFn: runDueRecurring, onSuccess: refresh });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Recurring Invoices</h1>
      <p style={S.sub}>Scheduled invoices for account customers — rent, monthly supply, retainers. Generate creates a fiscal invoice and (optionally) charges the customer's credit account.</p>
      <div style={S.bar}>
        <button style={S.btnSm} onClick={() => runMut.mutate()}>{runMut.isPending ? '…' : 'Run all due now'}</button>
        <button style={S.btn} onClick={() => setShowNew(true)}>+ New schedule</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Title</th><th style={S.th}>Customer</th><th style={S.th}>Amount</th><th style={S.th}>Frequency</th><th style={S.th}>Next run</th><th style={S.th}>Done</th><th style={S.th}></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={S.td} colSpan={7}>No recurring invoices.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>{r.title || '—'}</td>
                <td style={S.td}>{r.customer_name || '—'}</td>
                <td style={S.td}>{money(r.amount)}</td>
                <td style={S.td}>{r.frequency}</td>
                <td style={S.td}>{r.next_run}</td>
                <td style={S.td}>{r.occurrences}</td>
                <td style={S.td}><button style={S.btnSm} onClick={() => genMut.mutate(r.id)}>Generate now</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew && <NewModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refresh(); }} />}
    </div>
  );
}

function NewModal({ onClose, onSaved }) {
  const [f, setF] = useState({ title: '', customer_name: '', amount: '', frequency: 'monthly', next_run: new Date().toISOString().slice(0, 10), auto_charge_account: false });
  const mut = useMutation({ mutationFn: createRecurringInvoice, onSuccess: onSaved });
  const save = () => {
    const amt = Number(f.amount) || 0;
    mut.mutate({
      ...f, amount: amt,
      items_data: [{ product_name: f.title || 'Recurring charge', qty: 1, unit_price: amt, total: amt }],
    });
  };
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px' }}>New recurring invoice</h2>
        <label style={S.label}>Title</label>
        <input style={S.input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Monthly cleaning supply" />
        <label style={S.label}>Customer name</label>
        <input style={S.input} value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        <label style={S.label}>Amount</label>
        <input type="number" style={S.input} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <label style={S.label}>Frequency</label>
        <select style={S.input} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
          {['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label style={S.label}>First run date</label>
        <input type="date" style={S.input} value={f.next_run} onChange={(e) => setF({ ...f, next_run: e.target.value })} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#334155' }}>
          <input type="checkbox" checked={f.auto_charge_account} onChange={(e) => setF({ ...f, auto_charge_account: e.target.checked })} />
          Charge the customer's credit account automatically
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ ...S.btnSm, flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, flex: 2 }} disabled={!f.amount || mut.isPending} onClick={save}>{mut.isPending ? '…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
