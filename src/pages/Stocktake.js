import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStocktakes, getStocktake, startStocktake, saveStocktakeCounts, finalizeStocktake,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

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
  // 96px, not 80: on mobile index.css forces inputs to 16px font with
  // 12px/14px padding, which left an 80px box showing barely two digits —
  // you could not read a count of 145 while typing it.
  input: { width: 96, minWidth: 96, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, textAlign: 'right' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color: fg }),
};

/* ── Mobile counting styles ──────────────────────────────────────────
   Stocktaking on a phone is one-handed work: the other hand is holding
   the stock. Everything below is sized for a thumb, not a mouse. */
const M = {
  stickyTop: {
    position: 'sticky', top: 0, zIndex: 30, background: '#fff',
    padding: '10px 0 12px', borderBottom: '1px solid #eef2f6', marginBottom: 12,
  },
  progressTrack: { height: 8, borderRadius: 8, background: '#eef2f6', overflow: 'hidden', marginTop: 8 },
  progressFill: (pct) => ({ height: 8, width: `${pct}%`, background: G, borderRadius: 8, transition: 'width .25s ease' }),
  chipRow: { display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 2 },
  chip: (on) => ({
    flex: '0 0 auto', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
    border: `1px solid ${on ? G : '#e2e8f0'}`, background: on ? G : '#fff',
    color: on ? '#fff' : '#475569', cursor: 'pointer', whiteSpace: 'nowrap',
  }),
  card: (edge) => ({
    background: '#fff', border: '1px solid #e5e7eb', borderLeft: `5px solid ${edge}`,
    borderRadius: 14, padding: '13px 14px', marginBottom: 10,
  }),
  name: { fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 },
  sku: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  sysChip: {
    fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9',
    borderRadius: 20, padding: '5px 11px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  stepRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 },
  step: {
    width: 54, height: 54, flexShrink: 0, borderRadius: 15, border: '1px solid #d7dee6',
    background: '#f8fafc', fontSize: 26, fontWeight: 700, color: '#334155',
    cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  footRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11 },
  sameBtn: {
    padding: '9px 13px', borderRadius: 10, border: '1px solid #d7dee6', background: '#fff',
    fontSize: 12.5, fontWeight: 700, color: '#475569', cursor: 'pointer',
  },
  varTag: (bg, fg) => ({ fontSize: 12.5, fontWeight: 800, color: fg, background: bg, borderRadius: 20, padding: '6px 12px', whiteSpace: 'nowrap' }),
  bottomBar: {
    position: 'fixed', left: 0, right: 0,
    bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', // clears the bottom nav
    zIndex: 400, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(12px)',
    borderTop: '1px solid #e5e7eb', padding: '10px 12px',
    display: 'flex', gap: 10,
  },
  barBtn: (primary) => ({
    flex: 1, padding: '14px 12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', border: primary ? 'none' : '1px solid #cbd5e1',
    background: primary ? G : '#fff', color: primary ? '#fff' : '#334155',
  }),
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
        <div style={{ overflowX: 'auto' }}><table style={S.table}>
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
        </table></div>
      </div>
    </div>
  );
}

function CountScreen({ id, onBack }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { data: st } = useQuery({ queryKey: ['stocktake', id], queryFn: () => getStocktake(id) });
  const [counts, setCounts] = useState({});   // lineId -> value
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | todo | var
  const [done, setDone] = useState(null);

  const saveMut = useMutation({
    // Drop cleared/blank boxes — posting counted_qty:'' makes the API 400
    // and would lose the whole save, not just that one line.
    mutationFn: () => saveStocktakeCounts(id, Object.entries(counts)
      .filter(([, v]) => v !== '' && v != null && !isNaN(Number(v)))
      .map(([line_id, counted_qty]) => ({ line_id: Number(line_id), counted_qty }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktake', id] }),
  });
  const finMut = useMutation({
    mutationFn: () => finalizeStocktake(id),
    onSuccess: (r) => { setDone(r); qc.invalidateQueries({ queryKey: ['stocktake', id] }); },
  });

  if (!st) return <div style={{ ...S.page, color: '#94a3b8' }}>Loading…</div>;
  const open = st.status === 'open';
  const allLines = st.lines || [];

  const cval = (l) => counts[l.id] !== undefined ? counts[l.id] : (l.counted_qty != null ? l.counted_qty : '');
  const varOf = (l) => {
    // Read the RAW value before coercing. Number('') is 0, not '', so the
    // old `c === ''` guard never fired: clearing the box reported a
    // variance of 0 - system_qty (a big red "-45 short") on a line that
    // had simply not been counted.
    const raw = counts[l.id] !== undefined ? counts[l.id] : l.counted_qty;
    if (raw === '' || raw == null || isNaN(Number(raw))) return null;
    return Number(raw) - l.system_qty;
  };
  const isCounted = (l) => { const c = cval(l); return c !== '' && c != null; };

  // Search now matches SKU too — you often have the label in your hand.
  const q = search.trim().toLowerCase();
  const lines = allLines.filter((l) => {
    if (q && !(l.product_name || '').toLowerCase().includes(q)
           && !String(l.sku || '').toLowerCase().includes(q)) return false;
    if (filter === 'todo') return !isCounted(l);
    if (filter === 'var') { const v = open ? varOf(l) : l.variance; return v != null && v !== 0; }
    return true;
  });

  const nCounted = allLines.filter(isCounted).length;
  const nVar = allLines.filter((l) => { const v = open ? varOf(l) : l.variance; return v != null && v !== 0; }).length;
  const pct = allLines.length ? Math.round((nCounted / allLines.length) * 100) : 0;

  const setCount = (l, val) => setCounts((c) => ({ ...c, [l.id]: val }));
  const bump = (l, d) => {
    const cur = cval(l);
    const n = (cur === '' || cur == null || isNaN(Number(cur))) ? 0 : Number(cur);
    setCount(l, String(Math.max(0, n + d)));
  };

  /* ── Phone layout: a card per product ─────────────────────────────
     A 5-column table cannot be counted from on a phone — even scrolling
     properly you lose the row you are on. Cards keep the product, its
     system figure, the input and the variance in one glance. */
  if (isMobile) {
    return (
      <div style={{ ...S.page, padding: 0, paddingBottom: open ? 96 : 20 }}>
        <div style={M.stickyTop}>
          <button style={{ ...S.btnO, marginBottom: 10 }} onClick={onBack}>← All stocktakes</button>
          <h1 style={{ ...S.h1, fontSize: 18 }}>{st.reference}</h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {nCounted} of {allLines.length} counted
            </span>
            <span style={{ fontSize: 12, color: nVar ? '#b45309' : '#94a3b8', fontWeight: 700 }}>
              {nVar ? `${nVar} variance${nVar > 1 ? 's' : ''}` : 'No variances'}
            </span>
          </div>
          <div style={M.progressTrack}><div style={M.progressFill(pct)} /></div>

          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU…"
            style={{ width: '100%', marginTop: 12, boxSizing: 'border-box' }} />

          <div style={M.chipRow}>
            <button style={M.chip(filter === 'all')} onClick={() => setFilter('all')}>All {allLines.length}</button>
            <button style={M.chip(filter === 'todo')} onClick={() => setFilter('todo')}>To count {allLines.length - nCounted}</button>
            <button style={M.chip(filter === 'var')} onClick={() => setFilter('var')}>Variances {nVar}</button>
          </div>
        </div>

        {done && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: '#166534', fontWeight: 600 }}>
            ✓ Stocktake completed — {done.adjusted} product(s) adjusted to the counted figures.
          </div>
        )}

        {lines.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '40px 20px' }}>
            {filter === 'todo' ? 'Everything has been counted.'
              : filter === 'var' ? 'No variances — every count matches the system.'
              : 'Nothing matches that search.'}
          </div>
        )}

        {lines.map((l) => {
          const v = open ? varOf(l) : l.variance;
          const has = isCounted(l);
          const edge = !has ? '#cbd5e1' : v === 0 ? G : '#d97706';
          return (
            <div key={l.id} style={M.card(edge)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={M.name}>{l.product_name}</div>
                  {l.sku ? <div style={M.sku}>{l.sku}</div> : null}
                </div>
                <span style={M.sysChip}>System {l.system_qty}</span>
              </div>

              {open ? (
                <>
                  <div style={M.stepRow}>
                    <button type="button" style={M.step} aria-label="One less"
                      onClick={() => bump(l, -1)}>−</button>
                    <input className="stk-qty" type="number" inputMode="numeric" min="0"
                      placeholder="0" value={cval(l)}
                      onChange={(e) => setCount(l, e.target.value)}
                      style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} />
                    <button type="button" style={M.step} aria-label="One more"
                      onClick={() => bump(l, 1)}>+</button>
                  </div>
                  <div style={M.footRow}>
                    <button type="button" style={M.sameBtn}
                      onClick={() => setCount(l, String(l.system_qty))}>Matches system</button>
                    {v == null
                      ? <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Not counted</span>
                      : v === 0 ? <span style={M.varTag('#e8f5ee', G)}>✓ Matches</span>
                      : v > 0 ? <span style={M.varTag('#fef3e2', '#b45309')}>+{v} over</span>
                      : <span style={M.varTag('#fdecea', '#b91c1c')}>{v} short</span>}
                  </div>
                </>
              ) : (
                <div style={{ ...M.footRow, marginTop: 10 }}>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                    Counted {l.counted_qty != null ? l.counted_qty : '—'}
                  </span>
                  {v == null ? <span style={{ fontSize: 12.5, color: '#94a3b8' }}>—</span>
                    : v === 0 ? <span style={M.varTag('#e8f5ee', G)}>✓ Matched</span>
                    : v > 0 ? <span style={M.varTag('#fef3e2', '#b45309')}>+{v} over</span>
                    : <span style={M.varTag('#fdecea', '#b91c1c')}>{v} short</span>}
                </div>
              )}
            </div>
          );
        })}

        {open && (
          <div style={M.bottomBar}>
            <button style={M.barBtn(false)} disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}>{saveMut.isPending ? 'Saving…' : 'Save counts'}</button>
            <button style={M.barBtn(true)} disabled={finMut.isPending}
              onClick={() => { saveMut.mutate(); finMut.mutate(); }}>{finMut.isPending ? 'Finalizing…' : 'Finalize'}</button>
          </div>
        )}
      </div>
    );
  }

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
        <div style={{ overflowX: 'auto' }}><table style={S.table}>
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
        </table></div>
      </div>
    </div>
  );
}
