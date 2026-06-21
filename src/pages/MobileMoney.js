import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collectPayment, getPaymentStatus, getPaymentTransactions } from '../api/retailApi';
import { fmt } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '10px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 12, width: '100%' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const SC = {
  created: { bg: '#f3f4f6', fg: '#6b7280' }, pending: { bg: '#fef3e2', fg: '#c97d1a' },
  paid: { bg: '#e8f5ee', fg: '#1a6b3a' }, cancelled: { bg: '#fdecea', fg: '#c0392b' },
  failed: { bg: '#fdecea', fg: '#c0392b' },
};
const TERMINAL = ['paid', 'cancelled', 'failed'];

export default function MobileMoney() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['payment-transactions'], queryFn: () => getPaymentTransactions() });
  const txns = arr(data);

  const [form, setForm] = useState({ amount: '', currency: 'USD', method: 'ecocash', phone: '', customer_name: '' });
  const [active, setActive] = useState(null);   // current transaction being polled
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const pollRef = useRef(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPolling(), []);

  const beginPolling = (txnId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const t = await getPaymentStatus(txnId);
        setActive(t);
        if (TERMINAL.includes(t.status)) {
          stopPolling();
          qc.invalidateQueries({ queryKey: ['payment-transactions'] });
        }
      } catch (_) { /* keep trying */ }
    }, 4000);
  };

  const send = async (e) => {
    e.preventDefault();
    setError(''); setInstructions(''); setActive(null);
    if (!(Number(form.amount) > 0)) { setError('Enter an amount greater than zero.'); return; }
    if (!form.phone.trim()) { setError('Enter the customer’s phone number.'); return; }
    setSending(true);
    try {
      const txn = await collectPayment({
        amount: Number(form.amount), currency: form.currency, method: form.method,
        phone: form.phone.trim(), customer_name: form.customer_name.trim(),
      });
      setActive(txn);
      setInstructions(txn.instructions || 'Ask the customer to approve the prompt on their phone.');
      beginPolling(txn.id);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not start the payment. Check your payment setup.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => { stopPolling(); setActive(null); setInstructions(''); setError(''); setForm({ ...form, amount: '', phone: '', customer_name: '' }); };

  const isPending = active && !TERMINAL.includes(active.status);

  return (
    <div className="vtl-stack" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Request a mobile money payment</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 6 }}>The customer gets a prompt on their phone to approve with their EcoCash / OneMoney PIN.</p>

        {!active && (
          <form onSubmit={send}>
            <label style={label}>Amount</label>
            <input style={input} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={label}>Currency</label>
                <select style={input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option><option value="ZWG">ZWG</option>
                </select>
              </div>
              <div>
                <label style={label}>Wallet</label>
                <select style={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="ecocash">EcoCash</option><option value="onemoney">OneMoney</option>
                </select>
              </div>
            </div>
            <label style={label}>Customer phone</label>
            <input style={input} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <label style={label}>Customer name (optional)</label>
            <input style={input} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            {error && <p style={{ fontSize: 11.5, color: '#c0392b', marginTop: 8 }}>{error}</p>}
            <button style={btn} disabled={sending}>{sending ? 'Sending prompt…' : 'Send prompt to phone'}</button>
          </form>
        )}

        {active && (
          <div style={{ marginTop: 8 }}>
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(active.amount || 0, (active.currency || 'usd').toLowerCase())}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{active.method} · {active.phone}</div>
              <span style={{ ...pill(SC[active.status] || SC.pending), fontSize: 11, padding: '4px 12px' }}>{active.status}</span>
            </div>
            {isPending && (
              <p style={{ fontSize: 12, color: '#c97d1a', textAlign: 'center' }}>
                ⏳ Waiting for the customer to approve on their phone… (checking every few seconds)
              </p>
            )}
            {active.status === 'paid' && <p style={{ fontSize: 13, color: '#1a6b3a', fontWeight: 700, textAlign: 'center' }}>✓ Payment received</p>}
            {(active.status === 'cancelled' || active.status === 'failed') && (
              <p style={{ fontSize: 12.5, color: '#c0392b', textAlign: 'center' }}>{active.error_message || 'The payment was not completed.'}</p>
            )}
            {instructions && isPending && <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 8 }}>{instructions}</p>}
            <button onClick={reset} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>{TERMINAL.includes(active.status) ? 'New payment' : 'Cancel / new payment'}</button>
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent mobile money</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>When</th><th style={th}>Phone</th><th style={th}>Wallet</th><th style={th}>Amount</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {txns.length === 0 && <tr><td style={td} colSpan={5}>No payments yet.</td></tr>}
            {txns.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                <td style={td}>{t.phone}</td>
                <td style={td}>{t.method}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(t.amount || 0, (t.currency || 'usd').toLowerCase())}</td>
                <td style={td}><span style={pill(SC[t.status] || SC.created)}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
