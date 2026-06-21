import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { collectPayment, getPaymentStatus } from '../api/retailApi';
import { fmt } from './format';

const TERMINAL = ['paid', 'cancelled', 'failed'];

/**
 * chargeMobileMoney({ amount, currency, customerName }) →
 *   Promise<txn|null>
 *
 * Opens a modal at the till that pushes an EcoCash / OneMoney prompt to the
 * customer's phone (via the shop's OWN Paynow account), polls until the
 * customer approves, and resolves with the PAID transaction. Resolves null if
 * the cashier cancels or the payment fails — the caller should then fall back
 * to another tender (e.g. cash) rather than completing the sale.
 */
export function chargeMobileMoney({ amount, currency, customerName } = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    const cleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    root.render(
      <MobileMoneyModal
        amount={amount}
        currency={(currency || localStorage.getItem('currency') || 'USD').toUpperCase()}
        customerName={customerName || ''}
        onPaid={(txn) => { cleanup(); resolve(txn); }}
        onCancel={() => { cleanup(); resolve(null); }}
      />
    );
  });
}

function MobileMoneyModal({ amount, currency, customerName, onPaid, onCancel }) {
  const cur = (currency || 'USD').toLowerCase();
  const [method, setMethod] = useState('ecocash');
  const [phone, setPhone] = useState('');
  const [txn, setTxn] = useState(null);     // active transaction once sent
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const pollRef = useRef(null);

  const stop = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stop(), []);

  const beginPolling = (id) => {
    stop();
    pollRef.current = setInterval(async () => {
      try {
        const t = await getPaymentStatus(id);
        setTxn(t);
        if (TERMINAL.includes(t.status)) {
          stop();
          if (t.status === 'paid') onPaid(t);
        }
      } catch (_) { /* keep trying */ }
    }, 3500);
  };

  const send = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!phone.trim()) { setErr('Enter the customer’s phone number.'); return; }
    setSending(true);
    try {
      const t = await collectPayment({
        amount: Number(amount), currency, method,
        phone: phone.trim(), customer_name: customerName || '',
      });
      setTxn(t);
      beginPolling(t.id);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Could not start the payment. Check Payment Setup.');
    } finally {
      setSending(false);
    }
  };

  const retry = () => { stop(); setTxn(null); setErr(''); };

  const isPending = txn && !TERMINAL.includes(txn.status);
  const failed = txn && (txn.status === 'cancelled' || txn.status === 'failed');

  const label = { display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginTop: 14, marginBottom: 4 };
  const input = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' };

  return (
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10002,
               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '92%', maxWidth: 420,
                 boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                      background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#064e3b', textTransform: 'uppercase' }}>
            Mobile money
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {fmt(amount || 0, cur)}
          </div>
          <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
            Charge to the customer’s phone
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {!txn && (
            <form onSubmit={send}>
              <label style={{ ...label, marginTop: 0 }}>Wallet</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[['ecocash', 'EcoCash'], ['onemoney', 'OneMoney']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setMethod(v)}
                    style={{ padding: '9px 10px', border: '1px solid ' + (method === v ? '#1a6b3a' : '#e5e7eb'),
                             background: method === v ? '#ecfdf5' : '#fff', color: method === v ? '#064e3b' : '#374151',
                             fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
              <label style={label}>Customer phone</label>
              <input autoFocus value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX" style={input} />
              {err && <div style={{ marginTop: 10, padding: '8px 10px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={onCancel}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={sending}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {sending ? 'Sending…' : 'Send prompt'}</button>
              </div>
            </form>
          )}

          {txn && (
            <div style={{ textAlign: 'center', paddingTop: 6 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{method} · {phone}</div>
              {isPending && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c97d1a' }}>⏳ Waiting for the customer…</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Ask them to approve the prompt with their PIN.</div>
                </div>
              )}
              {failed && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#b91c1c' }}>Payment {txn.status}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{txn.error_message || 'The customer did not complete the payment.'}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <button type="button" onClick={onCancel}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {failed ? 'Use another method' : 'Cancel'}</button>
                {failed && (
                  <button type="button" onClick={retry}
                    style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default chargeMobileMoney;
