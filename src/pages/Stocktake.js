import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStocktakes, getStocktake, startStocktake, saveStocktakeCounts, finalizeStocktake,
} from '../api/retailApi';

const G = '#1a6b3a';
const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px' },
  btn: { padding: '9px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', background: G, color: '#fff' },
  btnO: { padding: '7px 12px', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', color: '#334155' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, marginBottom: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  input: { width: 80, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, textAlign: 'right' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color: fg }),
};

export default function Stocktake() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const { data: list = [] } = useQuery({ queryKey: ['stocktakes'], queryFn: getStocktakes });
  const startMut = useMutation({
    mutationFn: () => startStocktake({}),
    onSuccess: (st) => { qc.invalidateQueries({ queryKey: ['stocktakes'] }); setActiveId(st.id); },
  });

  if (activeId) return <CountScreen id={activeId} onBack={() => { setActiveId(null); qc.invalidateQueries({ queryKey: ['stocktakes'] }); }} />;

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={S.h1}>Stocktake</h1>
          <p style={S.sub}>Count your physical stock, see the variance against the system, and reconcile in one click.</p>
        </div>
        <button style={S.btn} disabled={startMut.isPending} onClick={() => startMut.mutate()}>
          {startMut.isPending ? 'Starting…' : '+ Start new stocktake'}
        </button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Reference</th><th style={S.th}>Started</th><th style={S.th}>Status</th><th style={S.th}>Counted</th><th style={S.th}></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td style={S.td} colSpan={5}>No stocktakes yet — start one to begin counting.</td></tr>}
            {list.map((s) => (
              <tr key={s.id}>
                <td style={S.td}><b>{s.reference}</b></td>
                <td style={S.td}>{s.started_at ? new Date(s.started_at).toLocaleString() : ''}</td>
                <td style={S.td}><span style={s.status === 'completed' ? S.pill('#e8f5ee', G) : S.pill('#e0f2fe', '#0369a1')}>{s.status}</span></td>
                <td style={S.td}>{s.counted} / {s.line_count}</td>
                <td style={S.td}><button style={S.btnO} onClick={() => setActiveId(s.id)}>{s.status === 'open' ? 'Continue' : 'View'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CountScreen({ id, onBack }) {
  const qc = useQueryClient();
  const { data: st } = useQuery({ queryKey: ['stocktake', id], queryFn: () => getStocktake(id) });
  const [counts, setCounts] = useState({});   // lineId -> value
  const [search, setSearch] = useState('');
  const [done, setDone] = useState(null);

  const saveMut = useMutation({
    mutationFn: () => saveStocktakeCounts(id, Object.entries(counts).map(([line_id, counted_qty]) => ({ line_id: Number(line_id), counted_qty }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktake', id] }),
  });
  const finMut = useMutation({
    mutationFn: () => finalizeStocktake(id),
    onSuccess: (r) => { setDone(r); qc.invalidateQueries({ queryKey: ['stocktake', id] }); },
  });

  if (!st) return <div style={{ ...S.page, color: '#94a3b8' }}>Loading…</div>;
  const open = st.status === 'open';
  const lines = (st.lines || []).filter((l) => !search || (l.product_name || '').toLowerCase().includes(search.toLowerCase()));

  const cval = (l) => counts[l.id] !== undefined ? counts[l.id] : (l.counted_qty != null ? l.counted_qty : '');
  const varOf = (l) => {
    const c = counts[l.id] !== undefined ? Number(counts[l.id]) : l.counted_qty;
    return (c == null || c === '') ? null : Number(c) - l.system_qty;
  };

  return (
    <div style={S.page}>
      <button style={{ ...S.btnO, marginBottom: 12 }} onClick={onBack}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={S.h1}>{st.reference}</h1>
          <p style={S.sub}>{open ? 'Enter the quantity you physically counted for each item, save, then finalize to reconcile stock.' : 'Completed stocktake — variances applied to stock.'}</p>
        </div>
        {open && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnO} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>{saveMut.isPending ? 'Saving…' : 'Save counts'}</button>
            <button style={S.btn} disabled={finMut.isPending} onClick={() => { saveMut.mutate(); finMut.mutate(); }}>{finMut.isPending ? 'Finalizing…' : 'Finalize & reconcile'}</button>
          </div>
        )}
      </div>

      {done && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: '#166534', fontWeight: 600 }}>✓ Stocktake completed — {done.adjusted} product(s) adjusted to the counted figures.</div>}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
        style={{ width: '100%', maxWidth: 320, padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Product</th><th style={S.th}>SKU</th><th style={S.th}>System</th><th style={S.th}>Counted</th><th style={S.th}>Variance</th></tr></thead>
          <tbody>
            {lines.map((l) => {
              const v = open ? varOf(l) : l.variance;
              return (
                <tr key={l.id}>
                  <td style={S.td}>{l.product_name}</td>
                  <td style={S.td}>{l.sku}</td>
                  <td style={S.td}>{l.system_qty}</td>
                  <td style={S.td}>
                    {open ? (
                      <input type="number" style={S.input} value={cval(l)}
                        onChange={(e) => setCounts((c) => ({ ...c, [l.id]: e.target.value }))} />
                    ) : (l.counted_qty != null ? l.counted_qty : '—')}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: v == null ? '#94a3b8' : v === 0 ? '#64748b' : v > 0 ? G : '#b91c1c' }}>
                    {v == null ? '—' : (v > 0 ? `+${v}` : v)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
