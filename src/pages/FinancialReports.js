import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProfitLoss, getVatReturn, getBalanceSheet, getDebtorsCreditors, getStockValuation,
  exportFinancialsExcel,
} from '../api/retailApi';

const G = '#1a6b3a';
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TABS = [
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'vat', label: 'VAT-7 Return' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'ar', label: 'Debtors & Creditors' },
  { id: 'stock', label: 'Stock Valuation' },
];

const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Playfair Display', serif" },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px' },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  tab: (on) => ({ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${on ? G : '#e2e8f0'}`, background: on ? G : '#fff', color: on ? '#fff' : '#475569' }),
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 14 },
  row: { display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  rowBold: { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: '2px solid #0f172a', fontSize: 15, fontWeight: 800, color: '#0f172a' },
  lbl: { color: '#475569' },
  val: { fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' },
  period: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  input: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 },
  note: { fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' },
  td: { padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg }),
};

function Line({ label, value, bold }) {
  return <div style={bold ? S.rowBold : S.row}><span style={bold ? {} : S.lbl}>{label}</span><span style={bold ? {} : S.val}>{money(value)}</span></div>;
}

export default function FinancialReports() {
  const [tab, setTab] = useState('pnl');
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const period = { start, end };

  const pnl = useQuery({ queryKey: ['fin-pnl', start, end], queryFn: () => getProfitLoss(period), enabled: tab === 'pnl' });
  const vat = useQuery({ queryKey: ['fin-vat', start, end], queryFn: () => getVatReturn(period), enabled: tab === 'vat' });
  const bs = useQuery({ queryKey: ['fin-bs'], queryFn: getBalanceSheet, enabled: tab === 'bs' });
  const ar = useQuery({ queryKey: ['fin-ar'], queryFn: getDebtorsCreditors, enabled: tab === 'ar' });
  const stock = useQuery({ queryKey: ['fin-stock'], queryFn: getStockValuation, enabled: tab === 'stock' });

  const PeriodPicker = (
    <div style={S.period}>
      <span style={{ fontSize: 12, color: '#64748b' }}>Period:</span>
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={S.input} />
      <span style={{ color: '#94a3b8' }}>→</span>
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={S.input} />
    </div>
  );

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportFinancialsExcel(period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `financial_reports_${end}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert('Could not export — please try again.'); }
    finally { setExporting(false); }
  };

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={S.h1}>Financial Reports</h1>
          <p style={S.sub}>Management accounts derived from your sales, purchases, stock and customer accounts.</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          style={{ padding: '9px 16px', background: G, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {exporting ? 'Preparing…' : '⬇ Export all to Excel'}
        </button>
      </div>
      <div style={S.tabs}>{TABS.map((t) => <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === 'pnl' && (
        <div style={S.card}>
          {PeriodPicker}
          {pnl.isLoading ? <Loading /> : pnl.data && (<>
            <Line label="Gross sales" value={pnl.data.gross_sales} />
            <Line label="Less: VAT" value={-pnl.data.vat} />
            <Line label="Less: discounts" value={-pnl.data.discounts} />
            <Line label="Net revenue" value={pnl.data.net_revenue} bold />
            <Line label="Cost of goods sold" value={-pnl.data.cost_of_goods_sold} />
            <Line label={`Gross profit (${pnl.data.gross_margin_pct}%)`} value={pnl.data.gross_profit} bold />
            <Line label="Operating expenses" value={-pnl.data.operating_expenses} />
            <Line label="Wages" value={-pnl.data.wages} />
            <Line label="Net profit" value={pnl.data.net_profit} bold />
          </>)}
        </div>
      )}

      {tab === 'vat' && (
        <div style={S.card}>
          {PeriodPicker}
          {vat.isLoading ? <Loading /> : vat.data && (<>
            <Line label="Output VAT (on sales)" value={vat.data.output_vat} />
            <Line label="Input VAT (on purchases)" value={vat.data.input_vat} />
            <Line label="Net VAT payable to ZIMRA" value={vat.data.net_vat_payable} bold />
            <div style={{ height: 12 }} />
            <Line label="Gross sales" value={vat.data.gross_sales} />
            <Line label="Standard-rated sales" value={vat.data.standard_rated_sales} />
            <Line label="Zero-rated / exempt sales" value={vat.data.zero_rated_or_exempt_sales} />
            <Line label="Total purchases" value={vat.data.total_purchases} />
            <p style={S.note}>{vat.data.note}</p>
          </>)}
        </div>
      )}

      {tab === 'bs' && (
        <div style={S.card}>
          {bs.isLoading ? <Loading /> : bs.data && (<>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Assets</div>
            <Line label="Inventory (at cost)" value={bs.data.assets.inventory_at_cost} />
            <Line label="Accounts receivable" value={bs.data.assets.accounts_receivable} />
            <Line label="Total assets" value={bs.data.assets.total} bold />
            <div style={{ height: 12 }} />
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Liabilities</div>
            <Line label="Accounts payable" value={bs.data.liabilities.accounts_payable} />
            <Line label="Net equity" value={bs.data.equity} bold />
            <p style={S.note}>{bs.data.note}</p>
          </>)}
        </div>
      )}

      {tab === 'ar' && (
        <div style={S.card}>
          {ar.isLoading ? <Loading /> : ar.data && (<>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <Stat label="Owed to us (debtors)" value={ar.data.total_owed_to_us} />
              <Stat label="We owe (creditors)" value={ar.data.total_we_owe} />
            </div>
            <h3 style={{ fontSize: 13, margin: '6px 0' }}>Debtors</h3>
            <table style={S.table}><thead><tr><th style={S.th}>Customer</th><th style={S.th}>Balance</th><th style={S.th}>Age</th><th style={S.th}>Bucket</th></tr></thead>
              <tbody>{(ar.data.debtors || []).map((d) => <tr key={d.id}><td style={S.td}>{d.name}</td><td style={S.td}>{money(d.balance)}</td><td style={S.td}>{d.days_since_last_activity}d</td><td style={S.td}><span style={S.pill(d.bucket === '0-30' ? '#e8f5ee' : '#fef3e2', d.bucket === '0-30' ? G : '#b45309')}>{d.bucket}</span></td></tr>)}
                {(!ar.data.debtors || !ar.data.debtors.length) && <tr><td style={S.td} colSpan={4}>No outstanding debtors.</td></tr>}</tbody></table>
            <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Creditors</h3>
            <table style={S.table}><thead><tr><th style={S.th}>Supplier</th><th style={S.th}>Amount</th><th style={S.th}>Order date</th><th style={S.th}>Status</th></tr></thead>
              <tbody>{(ar.data.creditors || []).map((c) => <tr key={c.id}><td style={S.td}>{c.supplier}</td><td style={S.td}>{money(c.amount)}</td><td style={S.td}>{c.order_date}</td><td style={S.td}>{c.status}</td></tr>)}
                {(!ar.data.creditors || !ar.data.creditors.length) && <tr><td style={S.td} colSpan={4}>No open purchase orders.</td></tr>}</tbody></table>
          </>)}
        </div>
      )}

      {tab === 'stock' && (
        <div style={S.card}>
          {stock.isLoading ? <Loading /> : stock.data && (<>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <Stat label="Cost value" value={stock.data.total_cost_value} />
              <Stat label="Retail value" value={stock.data.total_retail_value} />
              <Stat label="Potential margin" value={stock.data.potential_margin} />
              <Stat label="SKUs in stock" value={stock.data.sku_count} raw />
            </div>
            <table style={S.table}><thead><tr><th style={S.th}>Product</th><th style={S.th}>Cat</th><th style={S.th}>Qty</th><th style={S.th}>Cost val</th><th style={S.th}>Retail val</th></tr></thead>
              <tbody>{(stock.data.items || []).slice(0, 200).map((p) => <tr key={p.id}><td style={S.td}>{p.name}</td><td style={S.td}>{p.category}</td><td style={S.td}>{p.quantity}</td><td style={S.td}>{money(p.cost_value)}</td><td style={S.td}>{money(p.retail_value)}</td></tr>)}</tbody></table>
          </>)}
        </div>
      )}
    </div>
  );
}

function Loading() { return <div style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>Loading…</div>; }
function Stat({ label, value, raw }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', minWidth: 130 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{raw ? value : money(value)}</div>
    </div>
  );
}
