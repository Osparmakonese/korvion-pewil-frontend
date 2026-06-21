import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { lookupWallet, creditWallet } from '../api/retailApi';
import { fmt } from './format';

/**
 * offerChangeOptions({ amount, currency }) → Promise<void>
 *
 * Shown after a CASH sale that has change due. Coins are scarce, so instead of
 * handing back physical change the cashier can keep it as the customer's store
 * credit (works today, via the customer wallet). Airtime / EcoCash payout /
 * ZESA are surfaced as next-up options that light up once the shop connects
 * the matching provider.
 *
 * Always resolves (never rejects) — "Give cash" / closing just resolves with no
 * side effect; the sale is already complete either way.
 */
export function offerChangeOptions({ amount, currency } = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    const done = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
      resolve();
    };
    root.render(
      <ChangeModal
        amount={amount}
        currency={(currency || localStorage.getItem('currency') || 'USD').toUpperCase()}
        onClose={done}
      />
    );
  });
}

// Provider-dependent options — flip `built: true` once the backend adapter +
// the shop's provider account are connected (mirrors core.payments registry).
const SOON = [
  { key: 'airtime', label: 'Send as airtime', emoji: '📶', need: 'an airtime-vending account' },
  { key: 'ecocash', label: 'Send to EcoCash', emoji: '📲', need: 'EcoCash payout onboarding' },
  { key: 'zesa', label: 'ZESA token', emoji: '⚡', need: 'a utility-vending account' },
];

function ChangeModal({ amount, currency, onClose }) {
  const cur = (currency || 'USD').toLowerCase();
  const [mode, setMode] = useState('menu');   // menu | credit
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const keepAsCredit = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!phone.trim()) { setErr('Enter the customer’s phone number.'); return; }
    setBusy(true);
    try {
      const wallet = await lookupWallet({ phone: phone.trim(), currency, name: name.trim() });
      const res = await creditWallet(wallet.id, { amount: Number(amount), reference: 'Change kept as credit' });
      const bal = res?.wallet?.balance ?? wallet.balance;
      setDoneMsg(`Kept ${fmt(amount, cur)} as credit. New balance ${fmt(bal || 0, cur)}.`);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.response?.data?.amount || 'Could not save the credit.');
    } finally {
      setBusy(false);
    }
  };

  const label = { display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 };
  const input = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' };
  const optBtn = (enabled) => ({
    width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, borderRadius: 10,
    border: '1px solid #e5e7eb', background: enabled ? '#fff' : '#f9fafb',
    color: enabled ? '#0f172a' : '#9ca3af', fontSize: 14, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 10,
  });

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10003,
               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '92%', maxWidth: 420,
                 boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                      background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Change due</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{fmt(amount || 0, cur)}</div>
          <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>Out of coins? Give it another way.</div>
        </div>

        <div style={{ padding: 16 }}>
          {doneMsg ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a6b3a' }}>✓ Done</div>
              <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{doneMsg}</div>
              <button onClick={onClose} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, border: 0, background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : mode === 'menu' ? (
            <>
              <button onClick={onClose} style={{ ...optBtn(true), border: '1px solid #1a6b3a', background: '#ecfdf5' }}>
                💵 <span>Give cash as usual</span>
              </button>
              <button onClick={() => setMode('credit')} style={optBtn(true)}>
                👛 <span>Keep as store credit</span>
              </button>
              {SOON.map((o) => (
                <button key={o.key} disabled title={`Needs ${o.need}`} style={optBtn(false)}>
                  {o.emoji} <span style={{ flex: 1 }}>{o.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#e5e7eb', color: '#6b7280' }}>SOON</span>
                </button>
              ))}
              <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>Airtime, EcoCash payout and ZESA light up once you connect each provider.</p>
            </>
          ) : (
            <form onSubmit={keepAsCredit}>
              <label style={{ ...label, marginTop: 0 }}>Customer phone</label>
              <input autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" style={input} />
              <label style={label}>Name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
              {err && <div style={{ marginTop: 10, padding: '8px 10px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => setMode('menu')}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Back</button>
                <button type="submit" disabled={busy}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {busy ? 'Saving…' : `Keep ${fmt(amount || 0, cur)} as credit`}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default offerChangeOptions;
