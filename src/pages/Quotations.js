import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuotations, createQuotation, setQuotationStatus, deleteQuotation, getProducts } from '../api/retailApi';
import { fmt } from '../utils/format';
import { shopPrice } from '../utils/branchStock';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });
const miniBtn = { padding: '3px 8px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginLeft: 4 };

const STATUS_COLORS = {
  draft: { bg: '#f3f4f6', fg: '#6b7280' }, sent: { bg: '#EFF6FF', fg: '#1d4ed8' },
  accepted: { bg: '#e8f5ee', fg: '#1a6b3a' }, declined: { bg: '#fdecea', fg: '#c0392b' },
  expired: { bg: '#fef3e2', fg: '#c97d1a' }, converted: { bg: '#e8f5ee', fg: '#1a6b3a' },
};

export default function Quotations({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['quotations'], queryFn: () => getQuotations() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const quotes = arr(data);
  const products = arr(prodData);

  const empty = { customer_name: '', customer_phone: '', valid_until: '', notes: '' };
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState([{ product: '', name: '', qty: 1, unit_price: '' }]);
  const [formError, setFormError] = useState('');

  const create = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); setForm(empty); setLines([{ product: '', name: '', qty: 1, unit_price: '' }]); },
  });
  const setStatus = useMutation({ mutationFn: ({ id, status }) => setQuotationStatus(id, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });
  const del = useMutation({ mutationFn: deleteQuotation, onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });

  const setLine = (i, patch) => {
    setFormError('');
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    // Quote at the price the shop will actually charge when the quote is
    // accepted. `shopPrice` falls back to the chain price, so nothing moves
    // for a single-branch tenant — but on a chain, quoting the chain price and
    // then ringing up the branch price is an argument at the counter.
    if (patch.product) { const p = products.find((x) => String(x.id) === String(patch.product)); if (p) { next[i].name = p.name; if (!next[i].unit_price) next[i].unit_price = shopPrice(p); } }
    setLines(next);
  };
  const subtotal = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    const items = lines.filter((l) => l.product && Number(l.qty) > 0).map((l) => ({
      product: Number(l.product), name: l.name, qty: Number(l.qty),
      unit_price: Number(l.unit_price) || 0, total: (Number(l.qty) || 0) * (Number(l.unit_price) || 0),
    }));
    if (!form.customer_name || items.length === 0) {
      setFormError(items.length === 0 ? 'Add at least one line item.' : 'Enter a customer name.');
      return;
    }
    setFormError('');
    create.mutate({ ...form, items_data: items });
  };

  // A quote past its validity date that was never accepted/converted reads
  // as expired — display truth, without a background job mutating rows.
  const effectiveStatus = (q) => {
    if (q.status === 'converted' || q.status === 'declined') return q.status;
    if (q.valid_until && new Date(q.valid_until) < new Date(new Date().toDateString())) return 'expired';
    return q.status;
  };

  // Load into the till at the QUOTED prices; the POS picks this up on mount,
  // and converts the quote automatically when the sale confirms.
  const toTill = (q) => {
    try { localStorage.setItem('pewil_pending_quote', JSON.stringify(q)); } catch (_) {}
    if (onTabChange) onTabChange('POS');
  };

  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => '$' + (parseFloat(n) || 0).toFixed(2);

  const printQuote = (q) => {
    const store = localStorage.getItem('trading_name') || 'Your Store';
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) { alert('Allow pop-ups to print the quote.'); return; }
    const rows = (q.items_data || []).map((it) =>
      `<tr><td style="padding:8px 10px;border-bottom:1px solid #eef0f3">${esc(it.name)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right">${esc(it.qty)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right">${money(it.unit_price)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right;font-weight:600">${money(it.total)}</td></tr>`).join('');
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(q.quote_number)}</title></head>` +
      `<body style="margin:0;font-family:Inter,system-ui,Arial,sans-serif;color:#0f172a">` +
      `<div style="max-width:680px;margin:0 auto;padding:32px 28px">` +
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px">` +
      `<div><div style="font-size:22px;font-weight:800">${esc(store)}</div></div>` +
      `<div style="text-align:right"><div style="font-size:15px;font-weight:800;letter-spacing:.08em">QUOTATION</div>` +
      `<div style="font-size:11px;color:#64748b;margin-top:6px">No: <b>${esc(q.quote_number)}</b><br>` +
      `Date: ${esc(String(q.created_at || '').slice(0, 10))}<br>Valid until: <b>${esc(q.valid_until || '—')}</b></div></div></div>` +
      `<div style="border:1px solid #e6eaef;border-radius:10px;padding:12px 15px;margin-bottom:18px;max-width:320px">` +
      `<div style="font-size:9px;letter-spacing:.1em;color:#64748b;font-weight:800;margin-bottom:6px">QUOTED TO</div>` +
      `<div style="font-size:14px;font-weight:700">${esc(q.customer_name)}</div>` +
      (q.customer_phone ? `<div style="font-size:11px;color:#64748b;margin-top:3px">${esc(q.customer_phone)}</div>` : '') + `</div>` +
      `<table style="width:100%;border-collapse:collapse;font-size:12px">` +
      `<thead><tr style="background:#f8fafc"><th style="text-align:left;padding:9px 10px">Description</th>` +
      `<th style="text-align:right;padding:9px 10px">Qty</th><th style="text-align:right;padding:9px 10px">Unit</th>` +
      `<th style="text-align:right;padding:9px 10px">Amount</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<div style="display:flex;justify-content:flex-end;margin-top:14px"><div style="width:240px">` +
      (Number(q.tax) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;padding:4px 0"><span>VAT (included)</span><b style="color:#0f172a">${money(q.tax)}</b></div>` : '') +
      `<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #0f172a;padding-top:8px;margin-top:4px"><span>TOTAL</span><span>${money(q.total)}</span></div></div></div>` +
      `<div style="margin-top:26px;font-size:10px;color:#94a3b8">This is a quotation, not a fiscal tax invoice. Prices are valid to the date shown and subject to stock availability.</div>` +
      `</div><script>setTimeout(function(){window.focus();window.print();},250);<\/script></body></html>`);
    w.document.close();
  };

  const sendWhatsApp = (q) => {
    const phone = String(q.customer_phone || '').replace(/[^0-9]/g, '');
    const lines = (q.items_data || []).map((it) => `- ${it.name} x${it.qty} @ ${money(it.unit_price)} = ${money(it.total)}`).join('%0A');
    const msg = `*QUOTATION ${q.quote_number}*%0A${esc(localStorage.getItem('trading_name') || '')}%0A%0A${lines}%0A%0A*TOTAL: ${money(q.total)}*` +
      (Number(q.tax) > 0 ? ` (VAT incl. ${money(q.tax)})` : '') +
      (q.valid_until ? `%0AValid until ${q.valid_until}` : '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    setStatus.mutate({ id: q.id, status: 'sent' });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Quotations</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Quote a job, then mark it accepted or converted when the customer commits.</p>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Quote #</th><th style={th}>Customer</th><th style={th}>Total</th><th style={th}>Valid</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {quotes.length === 0 && <tr><td style={td} colSpan={6}>No quotes yet.</td></tr>}
            {quotes.map((q) => (
              <tr key={q.id}>
                <td style={{ ...td, fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600 }}>{q.quote_number}</td>
                <td style={td}>{q.customer_name}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(q.total || 0, 'zwd')}</td>
                <td style={td}>{q.valid_until || '—'}</td>
                <td style={td}><span style={pill(STATUS_COLORS[effectiveStatus(q)] || STATUS_COLORS.draft)}>{effectiveStatus(q)}</span></td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {q.status !== 'converted' && (
                    <button onClick={() => toTill(q)} title="Load this quote into the till at the quoted prices"
                      style={{ ...miniBtn, background: '#1a6b3a', color: '#fff', border: 'none' }}>To till</button>
                  )}
                  <button onClick={() => printQuote(q)} title="Print / save as PDF" style={miniBtn}>🖨</button>
                  {q.customer_phone && (
                    <button onClick={() => sendWhatsApp(q)} title="Send via WhatsApp" style={miniBtn}>📲</button>
                  )}
                  {q.status !== 'converted' && (
                    <select style={{ ...input, width: 'auto', padding: '3px 6px', fontSize: 10, marginLeft: 4 }} value="" onChange={(e) => e.target.value && setStatus.mutate({ id: q.id, status: e.target.value })}>
                      <option value="">Set…</option>
                      <option value="sent">Sent</option><option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </select>
                  )}
                  <button onClick={() => del.mutate(q.id)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New quote</h3>
        <form onSubmit={submit}>
          <label style={label}>Customer name *</label>
          <input style={input} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <label style={label}>Customer phone</label>
          <input style={input} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <label style={label}>Line items</label>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 56px 72px' : '1fr 46px 64px', gap: 4, marginBottom: 4 }}>
              <select style={{ ...input, padding: '6px 6px' }} value={l.product} onChange={(e) => setLine(i, { product: e.target.value })}>
                <option value="">Product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input style={{ ...input, padding: '6px 6px' }} type="number" min={0} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              <input style={{ ...input, padding: '6px 6px' }} type="number" min={0} step="0.01" placeholder="price" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { product: '', name: '', qty: 1, unit_price: '' }])} style={{ background: 'none', border: 'none', color: '#1a6b3a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add line</button>
          <label style={label}>Valid until</label>
          <input style={input} type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Total: {fmt(subtotal, 'zwd')}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>Prices are VAT-inclusive — the VAT slice is computed and shown on the printed quote automatically.</div>
          {formError && <div style={{ marginTop: 6, color: '#c0392b', fontSize: 12 }}>{formError}</div>}
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create quote'}</button>
        </form>
      </div>
    </div>
  );
}
