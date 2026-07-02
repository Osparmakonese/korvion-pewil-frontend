import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExciseReturns, generateExciseReturn, markExciseSubmitted } from '../api/retailApi';
import { fmt } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

export default function Excise() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['excise-returns'], queryFn: getExciseReturns });
  const returns = arr(data);
  const [period, setPeriod] = useState({ period_start: monthAgo(), period_end: today() });
  const [sel, setSel] = useState(null);
  // Inline "mark submitted" flow — which return's row is collecting a reference, and the typed value.
  const [submittingId, setSubmittingId] = useState(null);
  const [refInput, setRefInput] = useState('');

  const gen = useMutation({ mutationFn: generateExciseReturn, onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['excise-returns'] }); setSel(r); } });
  const submit = useMutation({ mutationFn: ({ id, reference }) => markExciseSubmitted(id, { reference }), onSuccess: () => { setSubmittingId(null); setRefInput(''); qc.invalidateQueries({ queryKey: ['excise-returns'] }); } });

  return (
    <div className="vtl-stack" style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Excise duty returns</h3>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>Roll up the excise duty owed on alcohol sold over a period. Set each product&apos;s duty per unit on the product (Excise rate).</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Period</th><th style={th}>Duty</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>
              {returns.length === 0 && <tr><td style={td} colSpan={4}>No returns generated yet.</td></tr>}
              {returns.map((r) => (
                <tr key={r.id} onClick={() => setSel(r)} style={{ cursor: 'pointer', background: sel && r.id === sel.id ? '#e8f5ee' : 'transparent' }}>
                  <td style={td}>{r.period_start} – {r.period_end}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(r.total_duty, 'zwd')}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td} onClick={(e) => e.stopPropagation()}>
                    {r.status === 'draft' && (submittingId === r.id ? (
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <input
                          autoFocus
                          value={refInput}
                          onChange={(e) => setRefInput(e.target.value)}
                          placeholder="Reference (optional)"
                          style={{ padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 10, width: 120 }}
                        />
                        <button onClick={() => submit.mutate({ id: r.id, reference: refInput })} disabled={submit.isPending} style={{ background: '#1a6b3a', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{submit.isPending ? '…' : 'Confirm'}</button>
                        <button onClick={() => { setSubmittingId(null); setRefInput(''); }} style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => { setSubmittingId(r.id); setRefInput(''); }} style={{ background: '#EFF6FF', color: '#1d4ed8', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Mark submitted</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sel && (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Return detail — {sel.period_start} to {sel.period_end}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Product</th><th style={th}>Units</th><th style={th}>Rate</th><th style={th}>Duty</th></tr></thead>
              <tbody>
                {arr(sel.summary).length === 0 && <tr><td style={td} colSpan={4}>No dutiable sales in this period.</td></tr>}
                {arr(sel.summary).map((s, i) => (
                  <tr key={i}><td style={td}>{s.name}</td><td style={td}>{s.units}</td><td style={td}>{s.rate}</td><td style={{ ...td, fontWeight: 600 }}>{fmt(s.duty, 'zwd')}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td style={{ ...td, fontWeight: 700 }} colSpan={3}>Total duty</td><td style={{ ...td, fontWeight: 700, color: '#1a6b3a' }}>{fmt(sel.total_duty, 'zwd')}</td></tr></tfoot>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Generate a return</h3>
        <form onSubmit={(e) => { e.preventDefault(); gen.mutate(period); }}>
          <label style={label}>Period start</label>
          <input style={input} type="date" value={period.period_start} onChange={(e) => setPeriod({ ...period, period_start: e.target.value })} required />
          <label style={label}>Period end</label>
          <input style={input} type="date" value={period.period_end} onChange={(e) => setPeriod({ ...period, period_end: e.target.value })} required />
          <button style={btn} disabled={gen.isPending}>{gen.isPending ? 'Calculating…' : 'Generate return'}</button>
        </form>
      </div>
    </div>
  );
}
