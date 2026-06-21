import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCreditAccounts, createCreditAccount, chargeCreditAccount, payCreditAccount, getCreditStatement } from '../api/retailApi';
import { fmt } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

export default function CreditAccounts() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['credit-accounts'], queryFn: getCreditAccounts });
  const accounts = arr(data);
  const [selId, setSelId] = useState(null);
  const { data: stmt } = useQuery({ queryKey: ['credit-statement', selId], queryFn: () => getCreditStatement(selId), enabled: !!selId });

  const empty = { account_name: '', phone: '', credit_limit: '' };
  const [form, setForm] = useState(empty);
  const [amount, setAmount] = useState({ charge: '', payment: '', reference: '' });

  const create = useMutation({ mutationFn: createCreditAccount, onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-accounts'] }); setForm(empty); } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['credit-accounts'] }); qc.invalidateQueries({ queryKey: ['credit-statement', selId] }); };
  const charge = useMutation({ mutationFn: (d) => chargeCreditAccount(selId, d), onSuccess: () => { refresh(); setAmount({ ...amount, charge: '' }); } });
  const pay = useMutation({ mutationFn: (d) => payCreditAccount(selId, d), onSuccess: () => { refresh(); setAmount({ ...amount, payment: '' }); } });

  const sel = accounts.find((a) => a.id === selId);

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Customer credit accounts</h3>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Customers who buy on credit. Charges increase what they owe; payments clear it.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Account</th><th style={th}>Limit</th><th style={th}>Owes</th><th style={th}>Available</th></tr></thead>
            <tbody>
              {accounts.length === 0 && <tr><td style={td} colSpan={4}>No accounts yet.</td></tr>}
              {accounts.map((a) => (
                <tr key={a.id} onClick={() => setSelId(a.id)} style={{ cursor: 'pointer', background: a.id === selId ? '#e8f5ee' : 'transparent' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{a.account_name}</td>
                  <td style={td}>{fmt(a.credit_limit, 'zwd')}</td>
                  <td style={{ ...td, color: Number(a.current_balance) > 0 ? '#c0392b' : '#1a6b3a', fontWeight: 600 }}>{fmt(a.current_balance, 'zwd')}</td>
                  <td style={{ ...td, color: Number(a.available_credit) < 0 ? '#c0392b' : '#6b7280' }}>{fmt(a.available_credit, 'zwd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sel && (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{sel.account_name} — statement</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>When</th><th style={th}>Type</th><th style={th}>Amount</th><th style={th}>Balance</th><th style={th}>Ref</th></tr></thead>
              <tbody>
                {arr(stmt?.transactions).length === 0 && <tr><td style={td} colSpan={5}>No transactions yet.</td></tr>}
                {arr(stmt?.transactions).map((t) => (
                  <tr key={t.id}>
                    <td style={td}>{(t.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                    <td style={td}>{t.txn_type}</td>
                    <td style={{ ...td, color: t.txn_type === 'payment' ? '#1a6b3a' : '#c0392b', fontWeight: 600 }}>{t.txn_type === 'payment' ? '-' : '+'}{fmt(t.amount, 'zwd')}</td>
                    <td style={td}>{fmt(t.balance_after, 'zwd')}</td>
                    <td style={td}>{t.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        {sel && (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Record on {sel.account_name}</h3>
            <label style={label}>Reference (optional)</label>
            <input style={input} value={amount.reference} onChange={(e) => setAmount({ ...amount, reference: e.target.value })} />
            <label style={label}>Charge (buy on credit)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={input} type="number" min={0} step="0.01" value={amount.charge} onChange={(e) => setAmount({ ...amount, charge: e.target.value })} />
              <button onClick={() => Number(amount.charge) > 0 && charge.mutate({ amount: Number(amount.charge), reference: amount.reference })} style={{ ...btn, marginTop: 0, background: '#c97d1a' }}>Charge</button>
            </div>
            <label style={label}>Payment received</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={input} type="number" min={0} step="0.01" value={amount.payment} onChange={(e) => setAmount({ ...amount, payment: e.target.value })} />
              <button onClick={() => Number(amount.payment) > 0 && pay.mutate({ amount: Number(amount.payment), reference: amount.reference })} style={{ ...btn, marginTop: 0 }}>Pay</button>
            </div>
          </div>
        )}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New account</h3>
          <form onSubmit={(e) => { e.preventDefault(); if (form.account_name) create.mutate({ ...form, credit_limit: Number(form.credit_limit) || 0 }); }}>
            <label style={label}>Account name *</label>
            <input style={input} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required />
            <label style={label}>Phone</label>
            <input style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label style={label}>Credit limit</label>
            <input style={input} type="number" min={0} step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
            <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create account'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
