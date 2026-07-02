import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPaymentReconciliation, getPaymentTransactions } from '../api/retailApi';
import { fmt } from '../utils/format';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const input = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const today = () => new Date().toISOString().slice(0, 10);
const TENDER_LABEL = { cash: '💵 Cash', mobile_money: '📲 Mobile money', card: '💳 Card', bank: '🏦 Bank' };
const METHOD_LABEL = { cash: 'Cash', mobile_money: 'Mobile money', card: 'Card', mixed: 'Split (mixed)' };
const VEND_LABEL = { airtime: '📶 Airtime', electricity: '⚡ ZESA', water: '💧 Water', tv: '📺 TV', other: '🧾 Other' };
const MM_COLORS = {
  paid: { bg: '#e8f5ee', fg: '#1a6b3a' }, pending: { bg: '#fef3e2', fg: '#c97d1a' },
  failed: { bg: '#fdecea', fg: '#c0392b' }, cancelled: { bg: '#fdecea', fg: '#c0392b' },
  created: { bg: '#f3f4f6', fg: '#6b7280' },
};

export default function Reconciliation() {
  const isMobile = useIsMobile();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation', from, to],
    queryFn: () => getPaymentReconciliation({ from, to }),
  });
  const { data: txData } = useQuery({
    queryKey: ['payment-transactions', from, to],
    queryFn: () => getPaymentTransactions({ from, to }),
  });
  const txns = arr(txData);

  const r = data || {};
  const byTender = r.by_tender || {};
  const byMethod = r.by_method || {};
  const mm = r.mobile_money || {};
  const vending = r.vending || {};
  const vendKeys = Object.keys(vending);

  const tenderKeys = Object.keys(byTender).sort((a, b) => Number(byTender[b]) - Number(byTender[a]));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Period</div>
        <label style={{ fontSize: 11, color: '#6b7280' }}>From <input type="date" style={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 11, color: '#6b7280' }}>To <input type="date" style={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
          {isLoading ? 'Loading…' : <>{r.sales_count || 0} sales · <b>{fmt(r.sales_total || 0, 'zwd')}</b> total</>}
        </div>
      </div>

      {/* Money received by tender */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Money received — by tender</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 12 }}>What you actually took in, split by how it was paid. Split sales are broken into their parts, so EcoCash vs cash is exact.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
          {tenderKeys.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>No sales in this period.</div>}
          {tenderKeys.map((k) => (
            <div key={k} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{TENDER_LABEL[k] || k}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{fmt(byTender[k] || 0, 'zwd')}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }} className="vtl-stack">
        {/* Sales by payment method */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sales by payment method</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Method</th><th style={th}>Sales</th><th style={th}>Total</th></tr></thead>
            <tbody>
              {Object.keys(byMethod).length === 0 && <tr><td style={td} colSpan={3}>No sales.</td></tr>}
              {Object.entries(byMethod).map(([k, v]) => (
                <tr key={k}>
                  <td style={td}>{METHOD_LABEL[k] || k}</td>
                  <td style={td}>{v.count}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(v.total || 0, 'zwd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile money settlement */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Mobile money settlement</h3>
            <div style={{ fontSize: 12 }}>Paid: <b style={{ color: '#1a6b3a' }}>{fmt(r.mobile_money_paid_total || 0, 'zwd')}</b></div>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 8 }}>EcoCash / OneMoney prompts and how they ended — reconcile "Paid" against what your provider settled.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Status</th><th style={th}>Count</th><th style={th}>Amount</th></tr></thead>
            <tbody>
              {Object.keys(mm).length === 0 && <tr><td style={td} colSpan={3}>No mobile money attempts.</td></tr>}
              {Object.entries(mm).map(([k, v]) => (
                <tr key={k}>
                  <td style={td}><span style={pill(MM_COLORS[k] || MM_COLORS.created)}>{k}</span></td>
                  <td style={td}>{v.count}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(v.total || 0, 'zwd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vending (airtime / ZESA / water) */}
      {vendKeys.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Vending (airtime / ZESA / water)</h3>
            <div style={{ fontSize: 12 }}>Sold: <b style={{ color: '#1a6b3a' }}>{fmt(r.vending_paid_total || 0, 'zwd')}</b></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Service</th><th style={th}>Vends</th><th style={th}>Paid</th><th style={th}>Sold</th></tr></thead>
            <tbody>
              {vendKeys.map((k) => (
                <tr key={k}>
                  <td style={td}>{VEND_LABEL[k] || k}</td>
                  <td style={td}>{vending[k].count}</td>
                  <td style={td}>{vending[k].paid_count}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(vending[k].paid_total || 0, 'zwd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-transaction settlement list */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Mobile money transactions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>When</th><th style={th}>Phone</th><th style={th}>Wallet</th>
            <th style={th}>Amount</th><th style={th}>Status</th><th style={th}>Sale</th>
          </tr></thead>
          <tbody>
            {txns.length === 0 && <tr><td style={td} colSpan={6}>No mobile money attempts in this period.</td></tr>}
            {txns.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                <td style={td}>{t.phone || '—'}</td>
                <td style={td}>{t.method}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(t.amount || 0, (t.currency || 'usd').toLowerCase())}</td>
                <td style={td}><span style={pill(MM_COLORS[t.status] || MM_COLORS.created)}>{t.status}</span></td>
                <td style={td}>{t.sale ? `#${t.sale}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
