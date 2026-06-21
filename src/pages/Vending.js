import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVendingBillers, vend, getVendStatus, getVendingTransactions } from '../api/retailApi';
import { fmt } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 10, textTransform: 'uppercase' };
const input = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' };
const btn = { padding: '11px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: 14 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const KIND_META = {
  airtime: { emoji: '📶', label: 'Airtime' }, electricity: { emoji: '⚡', label: 'ZESA / electricity' },
  water: { emoji: '💧', label: 'Water' }, tv: { emoji: '📺', label: 'TV' }, other: { emoji: '🧾', label: 'Other bills' },
};
const SC = { paid: { bg: '#e8f5ee', fg: '#1a6b3a' }, pending: { bg: '#fef3e2', fg: '#c97d1a' }, failed: { bg: '#fdecea', fg: '#c0392b' }, reversed: { bg: '#fdecea', fg: '#c0392b' }, flagged: { bg: '#fef3e2', fg: '#c97d1a' } };
const TERMINAL = ['paid', 'failed', 'reversed'];

export default function Vending() {
  const qc = useQueryClient();
  const { data: billerData, isLoading, error } = useQuery({ queryKey: ['vending-billers'], queryFn: () => getVendingBillers(), retry: false });
  const { data: txData } = useQuery({ queryKey: ['vending-transactions'], queryFn: () => getVendingTransactions() });
  const billers = arr(billerData?.billers);
  const txns = arr(txData);
  const notSetUp = error?.response?.status === 400;

  const [biller, setBiller] = useState(null);
  const [product, setProduct] = useState(null);
  const [member, setMember] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const pollRef = useRef(null);
  const stop = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stop(), []);

  const pickBiller = (b) => { setBiller(b); setProduct(b.products?.length === 1 ? b.products[0] : null); setMember(''); setAmount(''); setErr(''); setResult(null); };

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!product) { setErr('Choose a product.'); return; }
    if (!member.trim()) { setErr(`Enter the ${biller.member_label || 'account number'}.`); return; }
    if (!(Number(amount) > 0)) { setErr('Enter an amount greater than zero.'); return; }
    setBusy(true);
    try {
      const t = await vend({
        biller_code: biller.code, biller_name: biller.name, product_code: product.code,
        account_number: member.trim(), amount: Number(amount),
        requires_forex: product.requires_forex === true ? true : undefined,
      });
      setResult(t);
      qc.invalidateQueries({ queryKey: ['vending-transactions'] });
      if (t.status === 'pending') beginPolling(t.id);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Vend failed. Try again.');
    } finally { setBusy(false); }
  };

  const beginPolling = (id) => {
    stop();
    pollRef.current = setInterval(async () => {
      try { const t = await getVendStatus(id); setResult(t); if (TERMINAL.includes(t.status)) { stop(); qc.invalidateQueries({ queryKey: ['vending-transactions'] }); } } catch (_) {}
    }, 5000);
  };

  const newVend = () => { stop(); setResult(null); setMember(''); setAmount(''); setErr(''); };

  if (notSetUp) {
    return (
      <div style={{ ...card, maxWidth: 560, margin: '24px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔌</div>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '8px 0' }}>Vending isn’t connected yet</h3>
        <p style={{ fontSize: 12.5, color: '#6b7280' }}>To sell airtime, ZESA and water tokens, connect your Paynow BillPay vendor account and fund your float in <b>Payments → Vending Setup</b>. Once connected, your billers appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="vtl-stack" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
      <div>
        {!result ? (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sell airtime / ZESA / water</h3>
            {isLoading && <p style={{ fontSize: 12, color: '#6b7280' }}>Loading billers…</p>}
            {!isLoading && billers.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No billers available on your account.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {billers.map((b) => (
                <button key={b.code} onClick={() => pickBiller(b)}
                  style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                           border: '1px solid ' + (biller?.code === b.code ? '#1a6b3a' : '#e5e7eb'),
                           background: biller?.code === b.code ? '#ecfdf5' : '#fff', color: biller?.code === b.code ? '#064e3b' : '#0f172a' }}>
                  {(KIND_META[b.kind] || KIND_META.other).emoji} {b.name}
                </button>
              ))}
            </div>

            {biller && (
              <form onSubmit={submit} style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                {biller.products?.length > 1 && (
                  <>
                    <label style={label}>Product</label>
                    <select style={input} value={product?.code || ''} onChange={(e) => { const p = biller.products.find((x) => x.code === e.target.value); setProduct(p); if (p?.price) setAmount(p.price); }}>
                      <option value="">Choose…</option>
                      {biller.products.map((p) => <option key={p.code} value={p.code}>{p.name}{p.price ? ` — ${fmt(p.price, 'usd')}` : ''}</option>)}
                    </select>
                  </>
                )}
                <label style={label}>{biller.member_label || 'Account number'}</label>
                <input style={input} value={member} onChange={(e) => setMember(e.target.value)} placeholder={biller.member_desc || ''} />
                <label style={label}>{product?.amount_label || 'Amount'}</label>
                <input style={input} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {(product?.min_amount || product?.max_amount) && <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>{product.min_amount ? `Min ${product.min_amount}` : ''}{product.max_amount ? ` · Max ${product.max_amount}` : ''}</p>}
                {err && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 8 }}>{err}</p>}
                <button style={btn} disabled={busy || !product}>{busy ? 'Processing…' : 'Vend'}</button>
              </form>
            )}
          </div>
        ) : (
          <div style={card}>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <span style={{ ...pill(SC[result.status] || SC.pending), fontSize: 11, padding: '4px 12px' }}>{result.status}</span>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{result.biller_name || result.biller_code} · {result.account_number}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{fmt(result.amount || 0, (result.currency || 'usd').toLowerCase())}</div>
            </div>
            {result.status === 'pending' && <p style={{ fontSize: 12, color: '#c97d1a', textAlign: 'center' }}>⏳ Processing… checking status.</p>}
            {result.status === 'paid' && result.token && (
              <div style={{ margin: '12px 0', padding: 14, background: '#ecfdf5', border: '1px dashed #1a6b3a', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Token — give this to the customer</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace', margin: '6px 0', wordBreak: 'break-all' }}>{result.token}</div>
                {result.serial && <div style={{ fontSize: 11, color: '#6b7280' }}>Serial {result.serial}</div>}
              </div>
            )}
            {result.status === 'paid' && !result.token && <p style={{ fontSize: 13, color: '#1a6b3a', fontWeight: 700, textAlign: 'center' }}>✓ Done{result.member_name ? ` — ${result.member_name}` : ''}</p>}
            {(result.status === 'failed' || result.status === 'reversed') && <p style={{ fontSize: 12.5, color: '#c0392b', textAlign: 'center' }}>{result.error_message || 'The vend was not completed.'}</p>}
            {Array.isArray(result.receipt_smses) && result.receipt_smses.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>{result.receipt_smses.map((s, i) => <div key={i} style={{ padding: '4px 0', borderTop: '1px solid #f3f4f6' }}>{s}</div>)}</div>
            )}
            <button onClick={newVend} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>New vend</button>
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent vends</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>When</th><th style={th}>Service</th><th style={th}>Amount</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {txns.length === 0 && <tr><td style={td} colSpan={4}>No vends yet.</td></tr>}
            {txns.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleTimeString() : '—'}</td>
                <td style={td}>{(KIND_META[t.kind] || KIND_META.other).emoji} {t.biller_name || t.kind}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(t.amount || 0, (t.currency || 'usd').toLowerCase())}</td>
                <td style={td}><span style={pill(SC[t.status] || SC.pending)}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
