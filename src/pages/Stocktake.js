import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStocktakes, getStocktake, startStocktake, saveStocktakeCounts, finalizeStocktake,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';
import { fmt } from '../utils/format';

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
  mathLine: {
    marginTop: 9, paddingTop: 9, borderTop: '1px dashed #eef2f6',
    fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', gap: 8,
  },
  metricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  metric: { background: '#f8fafc', borderRadius: 12, padding: '12px 13px' },
  metricLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 },
  metricValue: (color) => ({
    fontSize: 19, fontWeight: 800, color: color || '#0f172a',
    fontFamily: "'Playfair Display', serif", lineHeight: 1.1,
  }),
  warn: {
    background: '#fef3e2', border: '1px solid #fbd9a5', borderRadius: 12,
    padding: '10px 12px', fontSize: 12.5, color: '#92400e', marginBottom: 12, lineHeight: 1.45,
  },
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
          <thead><tr><th style={S.th}>Reference</th><th style={S.th}>Started</th><th style={S.th}>Status</th><th style={S.th}>Counted</th><th style={S.th}>Value counted</th><th style={S.th}>Difference</th><th style={S.th}></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td style={S.td} colSpan={7}>No stocktakes yet — start one to begin counting.</td></tr>}
            {list.map((s) => {
              // Server-computed, at each line's snapshotted selling price.
              const diff = Number(s.variance_value);
              const hasDiff = !isNaN(diff) && diff !== 0;
              return (
                <tr key={s.id}>
                  <td style={S.td}><b>{s.reference}</b></td>
                  <td style={S.td}>{s.started_at ? new Date(s.started_at).toLocaleString() : ''}</td>
                  <td style={S.td}><span style={s.status === 'completed' ? S.pill('#e8f5ee', G) : S.pill('#e0f2fe', '#0369a1')}>{s.status}</span></td>
                  <td style={S.td}>{s.counted} / {s.line_count}</td>
                  <td style={S.td}>{fmt(s.counted_value, 'zwd')}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: !hasDiff ? '#64748b' : diff > 0 ? '#b45309' : '#b91c1c' }}>
                    {isNaN(diff) ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff, 'zwd')}`}
                  </td>
                  <td style={S.td}><button style={S.btnO} onClick={() => setActiveId(s.id)}>{s.status === 'open' ? 'Continue' : 'View'}</button></td>
                </tr>
              );
            })}
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

  // A finished stocktake opens on the differences — that is the whole point
  // of reading the report. `filter` stays null until the user picks a chip.
  const f = filter || (open ? 'all' : 'var');

  // Search now matches SKU too — you often have the label in your hand.
  const q = search.trim().toLowerCase();
  const lines = allLines.filter((l) => {
    if (q && !(l.product_name || '').toLowerCase().includes(q)
           && !String(l.sku || '').toLowerCase().includes(q)) return false;
    if (f === 'todo') return !isCounted(l);
    if (f === 'var') { const v = varOf(l); return v != null && v !== 0; }
    return true;
  });

  const nCounted = allLines.filter(isCounted).length;
  const nVar = allLines.filter((l) => { const v = varOf(l); return v != null && v !== 0; }).length;
  const nMissed = allLines.length - nCounted;
  const pct = allLines.length ? Math.round((nCounted / allLines.length) * 100) : 0;

  /* ── Money ────────────────────────────────────────────────────────
     unit_price is the selling price snapshotted when the count started,
     so a finished report keeps the value it had on the day. It arrives
     as a string (DRF COERCE_DECIMAL_TO_STRING), hence Number().
     Totals are computed here rather than read from the server's
     system_value/counted_value because while counting, the typed
     figures have not been saved yet — the server number would lag. */
  const priceOf = (l) => { const p = Number(l.unit_price); return isNaN(p) ? 0 : p; };
  const qtyOf = (l) => { const v = varOf(l); return v == null ? null : Number(cval(l)); };

  let systemValue = 0, countedValue = 0, varianceValue = 0;
  allLines.forEach((l) => {
    const p = priceOf(l);
    systemValue += (l.system_qty || 0) * p;
    const c = qtyOf(l);
    if (c != null) {
      countedValue += c * p;
      varianceValue += (c - (l.system_qty || 0)) * p;
    }
  });

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
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
            {open
              ? `Started ${st.started_at ? new Date(st.started_at).toLocaleDateString() : ''}`
              : `Completed ${st.completed_at ? new Date(st.completed_at).toLocaleString() : ''}`}
            {st.branch_name ? ` · ${st.branch_name}` : ''}
          </div>

          {open ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {nCounted} of {allLines.length} counted
                </span>
                <span style={{ fontSize: 12, color: nVar ? '#b45309' : '#94a3b8', fontWeight: 700 }}>
                  {nVar ? `${nVar} variance${nVar > 1 ? 's' : ''}` : 'No variances'}
                </span>
              </div>
              <div style={M.progressTrack}><div style={M.progressFill(pct)} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 12.5 }}>
                <span style={{ color: '#64748b' }}>
                  Counted so far <b style={{ color: '#0f172a' }}>{fmt(countedValue, 'zwd')}</b>
                </span>
                <span style={{ fontWeight: 700, color: varianceValue < 0 ? '#b91c1c' : varianceValue > 0 ? '#b45309' : G }}>
                  {varianceValue > 0 ? '+' : ''}{fmt(varianceValue, 'zwd')}
                </span>
              </div>
            </>
          ) : null}

          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU…"
            style={{ width: '100%', marginTop: 12, boxSizing: 'border-box' }} />

          <div style={M.chipRow}>
            <button style={M.chip(f === 'all')} onClick={() => setFilter('all')}>All {allLines.length}</button>
            {open && <button style={M.chip(f === 'todo')} onClick={() => setFilter('todo')}>To count {nMissed}</button>}
            <button style={M.chip(f === 'var')} onClick={() => setFilter('var')}>Differences {nVar}</button>
            {!open && <button style={M.chip(f === 'todo')} onClick={() => setFilter('todo')}>Not counted {nMissed}</button>}
          </div>
        </div>

        {/* Report summary — the four numbers an owner actually reads. */}
        {!open && (
          <>
            <div style={M.metricGrid}>
              <div style={M.metric}>
                <div style={M.metricLabel}>Value counted</div>
                <div style={M.metricValue()}>{fmt(countedValue, 'zwd')}</div>
              </div>
              <div style={M.metric}>
                <div style={M.metricLabel}>Difference</div>
                <div style={M.metricValue(varianceValue < 0 ? '#b91c1c' : varianceValue > 0 ? '#b45309' : G)}>
                  {varianceValue > 0 ? '+' : ''}{fmt(varianceValue, 'zwd')}
                </div>
              </div>
              <div style={M.metric}>
                <div style={M.metricLabel}>Products counted</div>
                <div style={M.metricValue()}>{nCounted} <span style={{ fontSize: 13, color: '#94a3b8' }}>of {allLines.length}</span></div>
              </div>
              <div style={M.metric}>
                <div style={M.metricLabel}>With a difference</div>
                <div style={M.metricValue(nVar ? '#b45309' : G)}>{nVar}</div>
              </div>
            </div>
            {nMissed > 0 && (
              <div style={M.warn}>
                {nMissed} product{nMissed > 1 ? 's were' : ' was'} never counted, so {nMissed > 1 ? 'their' : 'its'} stock
                was left untouched — worth {fmt(systemValue - countedValue, 'zwd')} at selling price. They are not part of
                the difference above.
              </div>
            )}
          </>
        )}

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
          const v = varOf(l);
          const has = isCounted(l);
          const edge = !has ? '#cbd5e1' : v === 0 ? G : '#d97706';
          const price = priceOf(l);
          const c = qtyOf(l);
          return (
            <div key={l.id} style={M.card(edge)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={M.name}>{l.product_name}</div>
                  <div style={M.sku}>
                    {l.sku ? `${l.sku} · ` : ''}{fmt(price, 'zwd')} each
                  </div>
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
                  {c != null && (
                    <div style={M.mathLine}>
                      <span>{c} × {fmt(price, 'zwd')}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(c * price, 'zwd')}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ ...M.footRow, marginTop: 10 }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                      System {l.system_qty} → counted {l.counted_qty != null ? l.counted_qty : '—'}
                    </span>
                    {v == null ? <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Not counted</span>
                      : v === 0 ? <span style={M.varTag('#e8f5ee', G)}>✓ Matched</span>
                      : v > 0 ? <span style={M.varTag('#fef3e2', '#b45309')}>+{v} over</span>
                      : <span style={M.varTag('#fdecea', '#b91c1c')}>{v} short</span>}
                  </div>
                  <div style={M.mathLine}>
                    <span>{c != null ? `${c} × ${fmt(price, 'zwd')}` : `Still ${l.system_qty} × ${fmt(price, 'zwd')}`}</span>
                    {v ? (
                      <span style={{ fontWeight: 700, color: v < 0 ? '#b91c1c' : '#b45309' }}>
                        {v > 0 ? '+' : ''}{fmt(v * price, 'zwd')}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {fmt((c != null ? c : l.system_qty) * price, 'zwd')}
                      </span>
                    )}
                  </div>
                </>
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

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['Stock on system', fmt(systemValue, 'zwd'), null],
          ['Value counted', fmt(countedValue, 'zwd'), null],
          ['Difference', `${varianceValue > 0 ? '+' : ''}${fmt(varianceValue, 'zwd')}`,
            varianceValue < 0 ? '#b91c1c' : varianceValue > 0 ? '#b45309' : G],
          ['Products counted', `${nCounted} of ${allLines.length}`, null],
        ].map(([label, value, color]) => (
          <div key={label} style={{ flex: '1 1 150px', background: '#f8fafc', borderRadius: 10, padding: '10px 13px' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: color || '#0f172a', fontFamily: "'Playfair Display', serif" }}>{value}</div>
          </div>
        ))}
      </div>

      {!open && nMissed > 0 && (
        <div style={{ background: '#fef3e2', border: '1px solid #fbd9a5', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#92400e', marginBottom: 12 }}>
          {nMissed} product{nMissed > 1 ? 's were' : ' was'} never counted — stock left untouched, and not included in the difference.
        </div>
      )}

      <div style={S.card}>
        <div style={{ overflowX: 'auto' }}><table style={S.table}>
          <thead><tr>
            <th style={S.th}>Product</th><th style={S.th}>SKU</th>
            <th style={S.th}>Price</th><th style={S.th}>System</th><th style={S.th}>Counted</th>
            <th style={S.th}>Variance</th><th style={S.th}>Value</th><th style={S.th}>Difference</th>
          </tr></thead>
          <tbody>
            {lines.map((l) => {
              const v = varOf(l);
              const price = priceOf(l);
              const c = qtyOf(l);
              return (
                <tr key={l.id}>
                  <td style={S.td}>{l.product_name}</td>
                  <td style={S.td}>{l.sku}</td>
                  <td style={S.td}>{fmt(price, 'zwd')}</td>
                  <td style={S.td}>{l.system_qty}</td>
                  <td style={S.td}>
                    {open ? (
                      <input type="number" style={S.input} value={cval(l)}
                        onChange={(e) => setCounts((cs) => ({ ...cs, [l.id]: e.target.value }))} />
                    ) : (l.counted_qty != null ? l.counted_qty : '—')}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: v == null ? '#94a3b8' : v === 0 ? '#64748b' : v > 0 ? G : '#b91c1c' }}>
                    {v == null ? '—' : (v > 0 ? `+${v}` : v)}
                  </td>
                  <td style={S.td}>{c == null ? '—' : fmt(c * price, 'zwd')}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: !v ? '#64748b' : v > 0 ? '#b45309' : '#b91c1c' }}>
                    {v == null ? '—' : v === 0 ? fmt(0, 'zwd') : `${v > 0 ? '+' : ''}${fmt(v * price, 'zwd')}`}
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
