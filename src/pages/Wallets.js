import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWallets, lookupWallet, creditWallet, redeemWallet, topupWallet, getWalletStatement,
} from '../api/retailApi';
import { fmt } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

const TYPE_LABEL = { change_credit: 'Change kept', redeem: 'Redeemed', topup: 'Top-up', adjustment: 'Adjustment' };

export default function Wallets() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['wallets'], queryFn: () => getWallets() });
  const wallets = arr(data);

  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selected, setSelected] = useState(null);
  const [statement, setStatement] = useState([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['wallets'] });

  const loadStatement = async (id) => {
    try { const s = await getWalletStatement(id); setStatement(arr(s.transactions)); setSelected(s.wallet); }
    catch (_) { setStatement([]); }
  };

  const find = async (e) => {
    e.preventDefault(); setMsg('');
    if (!phone.trim()) { setMsg('Enter a phone number.'); return; }
    setBusy(true);
    try {
      const w = await lookupWallet({ phone: phone.trim(), currency });
      setSelected(w); await loadStatement(w.id); refresh();
    } catch (err) { setMsg(err?.response?.data?.detail || 'Could not look up the wallet.'); }
    finally { setBusy(false); }
  };

  const move = async (fn) => {
    if (!selected || !(Number(amount) > 0)) { setMsg('Enter an amount greater than zero.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fn(selected.id, { amount: Number(amount) });
      setSelected(res.wallet); setAmount(''); await loadStatement(res.wallet.id); refresh();
    } catch (err) { setMsg(err?.response?.data?.amount || err?.response?.data?.detail || 'Could not update the wallet.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 16 }}>
      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Customer wallet</h3>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 6 }}>Out of coins? Keep the change as store credit. Find a customer by phone, then add or spend their balance.</p>
          <form onSubmit={find}>
            <label style={label}>Customer phone</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
              <input style={input} placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <select style={input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option><option value="ZWG">ZWG</option>
              </select>
            </div>
            <button style={{ ...btn, marginTop: 10, width: '100%' }} disabled={busy}>{busy ? 'Working…' : 'Find / open wallet'}</button>
          </form>
        </div>

        {selected && (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{selected.phone} · {selected.currency}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a6b3a' }}>{fmt(selected.balance || 0, (selected.currency || 'usd').toLowerCase())}</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>current balance</div>
            </div>
            <label style={label}>Amount</label>
            <input style={input} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
              <button onClick={() => move(creditWallet)} disabled={busy} style={{ ...btn, fontSize: 11 }}>Keep change</button>
              <button onClick={() => move(topupWallet)} disabled={busy} style={{ ...btn, fontSize: 11, background: '#1d4ed8' }}>Top-up</button>
              <button onClick={() => move(redeemWallet)} disabled={busy} style={{ ...btn, fontSize: 11, background: '#c97d1a' }}>Redeem</button>
            </div>
            {msg && <p style={{ fontSize: 11.5, color: '#c0392b', marginTop: 8 }}>{msg}</p>}
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{selected ? 'Wallet history' : 'All wallets'}</h3>
        {selected ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>When</th><th style={th}>Type</th><th style={th}>Amount</th><th style={th}>Balance</th></tr></thead>
            <tbody>
              {statement.length === 0 && <tr><td style={td} colSpan={4}>No movements yet.</td></tr>}
              {statement.map((t) => (
                <tr key={t.id}>
                  <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                  <td style={td}>{TYPE_LABEL[t.txn_type] || t.txn_type}</td>
                  <td style={{ ...td, fontWeight: 600, color: Number(t.amount) < 0 ? '#c0392b' : '#1a6b3a' }}>{fmt(t.amount || 0, (selected.currency || 'usd').toLowerCase())}</td>
                  <td style={td}>{fmt(t.balance_after || 0, (selected.currency || 'usd').toLowerCase())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Phone</th><th style={th}>Name</th><th style={th}>Currency</th><th style={th}>Balance</th><th style={th}></th></tr></thead>
            <tbody>
              {wallets.length === 0 && <tr><td style={td} colSpan={5}>No wallets yet.</td></tr>}
              {wallets.map((w) => (
                <tr key={w.id}>
                  <td style={td}>{w.phone}</td>
                  <td style={td}>{w.customer_name || w.name || '—'}</td>
                  <td style={td}>{w.currency}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(w.balance || 0, (w.currency || 'usd').toLowerCase())}</td>
                  <td style={td}><button onClick={() => { setPhone(w.phone); setCurrency(w.currency); loadStatement(w.id); }} style={{ ...btn, padding: '3px 9px', fontSize: 10 }}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
