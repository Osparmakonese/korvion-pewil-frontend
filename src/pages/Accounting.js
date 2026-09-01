// The Books — Phase 5 (2026-08-31).
//
// Everything is derived from what the tills already recorded — no
// bookkeeping asked of anyone. Pick a period, read the P&L, VAT7 figures,
// trial balance, ledgers and Z reconciliation, and hand the accountant the
// Sage journal CSV or the whole month-end pack in one download.
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getAccountingPnl, getAccountingVat7, getAccountingTrialBalance,
  getDebtors, getCreditors, getZReconciliation,
  downloadSageCsv, downloadAccountantPack,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const input = { padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12 };
const miniBtn = { padding: '7px 12px', background: '#fff', border: '1px solid #1a6b3a', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#1a6b3a' };
const th = { textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const num = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function todayStr() { return new Date().toISOString().slice(0, 10); }

const Row = ({ k, v, bold, red }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6',
                fontSize: 12, fontWeight: bold ? 800 : 400, color: red ? '#991b1b' : '#111827' }}>
    <span>{k}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
  </div>
);

export default function Accounting() {
  const isMobile = useIsMobile();
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(todayStr());
  const [tab, setTab] = useState('pnl');
  const params = { start, end };
  const opts = { staleTime: 60_000 };

  const { data: pnl } = useQuery({ queryKey: ['acc-pnl', start, end], queryFn: () => getAccountingPnl(params), ...opts });
  const { data: vat } = useQuery({ queryKey: ['acc-vat', start, end], queryFn: () => getAccountingVat7(params), ...opts, enabled: tab === 'vat7' });
  const { data: tb } = useQuery({ queryKey: ['acc-tb', start, end], queryFn: () => getAccountingTrialBalance(params), ...opts, enabled: tab === 'tb' });
  const { data: debtors } = useQuery({ queryKey: ['acc-debtors'], queryFn: getDebtors, ...opts, enabled: tab === 'ledgers' });
  const { data: creditors } = useQuery({ queryKey: ['acc-creditors', start, end], queryFn: () => getCreditors(params), ...opts, enabled: tab === 'ledgers' });
  const { data: zrec } = useQuery({ queryKey: ['acc-z', start, end], queryFn: () => getZReconciliation(params), ...opts, enabled: tab === 'z' });

  const save = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const sage = useMutation({ mutationFn: () => downloadSageCsv(params).then((b) => save(b, `pewil-journal-${start}-${end}.csv`)) });
  const pack = useMutation({ mutationFn: () => downloadAccountantPack(params).then((b) => save(b, `pewil-accountant-pack-${start}-${end}.zip`)) });

  const TABS = [['pnl', 'P&L'], ['vat7', 'VAT 7'], ['tb', 'Trial Balance'], ['ledgers', 'Debtors & Creditors'], ['z', 'Z Reconciliation']];

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ ...card, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>PERIOD</span>
        <input style={input} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <span style={{ fontSize: 12 }}>to</span>
        <input style={input} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button onClick={() => sage.mutate()} disabled={sage.isPending} style={miniBtn}>
          {sage.isPending ? '…' : '⬇ Sage journal CSV'}
        </button>
        <button onClick={() => pack.mutate()} disabled={pack.isPending}
                style={{ ...miniBtn, background: '#1a6b3a', color: '#fff' }}>
          {pack.isPending ? '…' : '📦 Accountant pack'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                           border: '1px solid ' + (tab === k ? '#1a6b3a' : '#d1d5db'),
                           background: tab === k ? '#1a6b3a' : '#fff', color: tab === k ? '#fff' : '#111827' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'pnl' && pnl && (
        <div style={{ ...card, maxWidth: 520 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Profit & Loss — {start} to {end}</h3>
          <Row k="Sales (excl. VAT)" v={pnl.sales} />
          <Row k="Less returns" v={pnl.returns} />
          <Row k="Revenue" v={pnl.revenue} bold />
          <Row k="Cost of sales" v={pnl.cost_of_sales} />
          <Row k={`Gross profit (${pnl.gross_margin_pct}%)`} v={pnl.gross_profit} bold />
          <Row k="Stock losses" v={pnl.stock_losses} red={Number(pnl.stock_losses) > 0} />
          <Row k="Wages" v={pnl.wages} />
          <Row k="Net profit before tax" v={pnl.net_profit_before_tax} bold />
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>{pnl.note}</p>
        </div>
      )}

      {tab === 'vat7' && vat && (
        <div style={{ ...card, maxWidth: 520 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>VAT summary (VAT7 shape) — {start} to {end}</h3>
          <Row k="Standard-rated supplies (excl. VAT)" v={vat.standard_rated_supplies_excl_vat} />
          <Row k="Zero-rated / exempt supplies" v={vat.zero_rated_or_exempt_supplies} />
          <Row k="Output tax" v={vat.output_tax} bold />
          <Row k="Input tax (see note)" v={vat.input_tax} />
          <Row k="VAT before input tax" v={vat.vat_payable_before_input_tax} bold />
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>{vat.note}</p>
        </div>
      )}

      {tab === 'tb' && tb && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Trial balance — {tb.balanced ? 'balances ✓' : 'DOES NOT BALANCE'}
          </h3>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Code</th><th style={th}>Account</th><th style={{ ...th, textAlign: 'right' }}>Debit</th><th style={{ ...th, textAlign: 'right' }}>Credit</th></tr></thead>
            <tbody>
              {(tb.rows || []).map((r) => (
                <tr key={r.account}>
                  <td style={td}>{r.account}</td><td style={td}>{r.name}</td>
                  <td style={num}>{r.debit}</td><td style={num}>{r.credit}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800 }}>
                <td style={td} colSpan={2}>Totals</td>
                <td style={num}>{tb.total_debit}</td><td style={num}>{tb.total_credit}</td>
              </tr>
            </tbody>
          </table></div>
        </div>
      )}

      {tab === 'ledgers' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Debtors — owed to you: {debtors?.total_owed_to_you ?? '—'}</h3>
            {(debtors?.rows || []).map((r) => <Row key={r.account} k={r.name} v={r.balance} />)}
            {!(debtors?.rows || []).length && <p style={{ fontSize: 12, color: '#6b7280' }}>No customer accounts owe anything.</p>}
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Creditors — received: {creditors?.total_received ?? '—'}</h3>
            {(creditors?.rows || []).map((r) => <Row key={r.supplier} k={r.supplier} v={r.received_in_period} />)}
            {!(creditors?.rows || []).length && <p style={{ fontSize: 12, color: '#6b7280' }}>No goods received this period.</p>}
            {creditors?.note && <p style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>{creditors.note}</p>}
          </div>
        </div>
      )}

      {tab === 'z' && zrec && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Z reconciliation — total variance {zrec.total_variance}
          </h3>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Closed</th><th style={th}>Cashier</th><th style={th}>Shop</th>
              <th style={{ ...th, textAlign: 'right' }}>Expected</th><th style={{ ...th, textAlign: 'right' }}>Counted</th>
              <th style={{ ...th, textAlign: 'right' }}>Variance</th></tr></thead>
            <tbody>
              {(zrec.rows || []).map((r) => (
                <tr key={r.session}>
                  <td style={td}>{(r.closed_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={td}>{r.cashier}</td><td style={td}>{r.branch}</td>
                  <td style={num}>{r.expected_cash}</td><td style={num}>{r.counted_cash}</td>
                  <td style={{ ...num, color: Number(r.variance) < 0 ? '#991b1b' : '#111827', fontWeight: 700 }}>{r.variance}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {!(zrec.rows || []).length && <p style={{ fontSize: 12, color: '#6b7280' }}>No closed tills in this period.</p>}
        </div>
      )}
    </div>
  );
}
