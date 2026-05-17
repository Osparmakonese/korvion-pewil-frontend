/**
 * RegulatorReturns — monthly returns for ZERA / EPRA / NMDPRA / SARS / URA.
 *
 * Workflow:
 *   1. Operator picks a regulator + period (month).
 *   2. Click "Generate draft" — backend builds the summary (sales litres
 *      per grade per branch, opening/closing stock, deliveries, variance).
 *   3. Operator reviews the per-grade breakdown.
 *   4. Operator downloads the CSV summary (from clipboard until file
 *      export endpoint lands in Phase 2) and uploads it to the regulator's
 *      portal manually.
 *   5. Operator pastes the regulator's acknowledgement reference and
 *      marks the return submitted.
 *
 * Direct electronic filing is Phase 2 — requires regulator-by-regulator
 * partner approval that doesn't exist yet on any of these portals.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRegulatorReturns, generateRegulatorReturn, markRegulatorReturnSubmitted,
} from '../api/retailApi';
function BackToForecourt({ onTabChange }) {
  return (
    <button onClick={() => onTabChange && onTabChange('Forecourt')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
      ← Back to Forecourt
    </button>
  );
}
import { fmt } from '../utils/format';

const T = {
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
  green: '#1a6b3a', amber: '#c77700', red: '#c0392b',
};

const REGULATOR_LABELS = {
  zera: 'ZERA (Zimbabwe)',
  epra: 'EPRA (Kenya)',
  nmdpra: 'NMDPRA (Nigeria)',
  sars_fuel: 'SARS Fuel (South Africa)',
  ura_fuel: 'URA (Uganda)',
  other: 'Other',
};

function defaultPeriod() {
  // Default to last month: take today, subtract one month, set day=1.
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = last.toISOString().slice(0, 10);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export default function RegulatorReturns({ onTabChange }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [submitting, setSubmitting] = useState(null);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['regulator-returns', filter],
    queryFn: () => listRegulatorReturns(filter === 'all' ? {} : { regulator: filter }),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['regulator-returns'] });

  const generateMut = useMutation({
    mutationFn: generateRegulatorReturn,
    onSuccess: (data) => { inv(); setShowNew(false); setViewing(data); },
  });

  const submitMut = useMutation({
    mutationFn: ({ id, reference }) => markRegulatorReturnSubmitted(id, reference),
    onSuccess: () => { inv(); setSubmitting(null); setViewing(null); },
  });

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Regulator returns</h1>
        <button onClick={() => setShowNew(true)} style={btnPrimary}>+ Generate return</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['all', 'zera', 'epra', 'nmdpra', 'sars_fuel', 'ura_fuel'].map(r => (
          <button key={r} onClick={() => setFilter(r)} style={filter === r ? btnTabActive : btnTab}>
            {r === 'all' ? 'All' : REGULATOR_LABELS[r] || r}
          </button>
        ))}
      </div>

      <div style={card}>
        <table style={tbl}>
          <thead style={{ background: T.surface }}>
            <tr><th style={th}>Regulator</th><th style={th}>Period</th><th style={th}>Status</th><th style={th}>Generated</th><th style={th}></th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} style={{ padding: 16 }}>Loading…</td></tr>
              : returns.length === 0 ? <tr><td colSpan={5} style={{ padding: 16, color: T.muted }}>No returns yet — click "Generate return" to create the first one.</td></tr>
              : returns.map(r => (
                <tr key={r.id} style={{ borderTop: `1px solid ${T.line}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.regulator_display}</td>
                  <td style={td}>{r.period_start} → {r.period_end}</td>
                  <td style={td}><StatusPill status={r.status} /></td>
                  <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setViewing(r)} style={btnGhost}>View</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, color: T.muted, fontSize: 13, lineHeight: 1.55, maxWidth: 720 }}>
        Pewil generates the figures you need for monthly returns — sales by grade by branch,
        opening + closing stock, deliveries, variance. Direct electronic filing requires
        regulator-by-regulator approval that's still in progress. For now, download the CSV
        and upload via your regulator's portal.
      </p>

      {showNew && (
        <NewReturnModal
          onCancel={() => setShowNew(false)}
          onGenerate={(v) => generateMut.mutate(v)}
          generating={generateMut.isPending}
          error={generateMut.error}
        />
      )}

      {viewing && (
        <ViewReturnModal
          ret={viewing}
          onClose={() => setViewing(null)}
          onSubmit={() => setSubmitting({ ...viewing, reference: '' })}
        />
      )}

      {submitting && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: 0, color: T.ink }}>Mark as submitted</h3>
            <p style={{ color: T.muted }}>
              Paste the acknowledgement reference your regulator portal returned after upload.
            </p>
            <div>
              <label style={lbl}>Submission reference</label>
              <input value={submitting.reference}
                     onChange={e => setSubmitting(s => ({ ...s, reference: e.target.value }))}
                     style={inp} placeholder="e.g. ZERA-2026-05-09472" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setSubmitting(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => submitMut.mutate({ id: submitting.id, reference: submitting.reference })}
                      disabled={submitMut.isPending} style={btnPrimary}>
                {submitMut.isPending ? 'Saving…' : 'Mark submitted'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    draft: { bg: T.surface, fg: T.muted, label: 'Draft' },
    submitted: { bg: '#e8f5ee', fg: T.green, label: 'Submitted' },
    acknowledged: { bg: '#e8f5ee', fg: T.green, label: 'Acknowledged' },
    rejected: { bg: '#fde8e8', fg: T.red, label: 'Rejected' },
  };
  const p = map[status] || map.draft;
  return <span style={{ background: p.bg, color: p.fg, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{p.label}</span>;
}

function NewReturnModal({ onCancel, onGenerate, generating, error }) {
  const def = defaultPeriod();
  const [v, setV] = useState({
    regulator_code: 'zera',
    period_start: def.start,
    period_end: def.end,
  });
  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>Generate regulator return</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <div>
            <label style={lbl}>Regulator</label>
            <select value={v.regulator_code} onChange={e => setV(p => ({ ...p, regulator_code: e.target.value }))} style={inp}>
              {Object.entries(REGULATOR_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={lbl}>Period start</label>
              <input type="date" value={v.period_start} onChange={e => setV(p => ({ ...p, period_start: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Period end</label>
              <input type="date" value={v.period_end} onChange={e => setV(p => ({ ...p, period_end: e.target.value }))} style={inp} />
            </div>
          </div>
        </div>
        {error && <div style={{ color: T.red, marginTop: 10, fontSize: 13 }}>Failed: {error?.response?.data?.detail || error?.message}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onGenerate(v)} disabled={generating} style={btnPrimary}>
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewReturnModal({ ret, onClose, onSubmit }) {
  const summary = ret.summary || {};
  const csv = useMemo(() => buildCsv(summary), [summary]);

  const copyCsv = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(csv);
  };
  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regulator-${ret.regulator_code}-${ret.period_start}-${ret.period_end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalCard, width: 880, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>{ret.regulator_display}</h2>
            <div style={{ color: T.muted, fontSize: 13 }}>{ret.period_start} → {ret.period_end} · <StatusPill status={ret.status} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={downloadCsv} style={btnGhost}>Download CSV</button>
            <button onClick={copyCsv} style={btnGhost}>Copy CSV</button>
            {ret.status === 'draft' && <button onClick={onSubmit} style={btnPrimary}>Mark submitted</button>}
          </div>
        </div>

        <div style={{ marginTop: 12, overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <Stat label="Sales L" value={Number(summary.totals?.sales_litres || 0).toLocaleString()} />
            <Stat label="Deliveries L" value={Number(summary.totals?.deliveries_litres || 0).toLocaleString()} />
            <Stat label="Revenue" value={fmt(Number(summary.totals?.revenue || 0))} />
          </div>

          {(summary.branches || []).map((br, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: T.ink, marginBottom: 6 }}>{br.branch_name} ({br.branch_code})</div>
              <div style={card}>
                <table style={tbl}>
                  <thead style={{ background: T.surface }}>
                    <tr>
                      <th style={th}>Grade</th><th style={th}>Reg code</th>
                      <th style={th}>Open L</th><th style={th}>Deliv L</th>
                      <th style={th}>Sales L</th><th style={th}>Close L</th>
                      <th style={th}>Expected L</th><th style={th}>Variance L</th>
                      <th style={th}>Avg / L</th><th style={th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(br.grades || []).map((g, j) => (
                      <tr key={j} style={{ borderTop: `1px solid ${T.line}` }}>
                        <td style={{ ...td, fontWeight: 600 }}>{g.grade_name}</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>{g.regulator_code}</td>
                        <td style={td}>{Number(g.opening_litres).toLocaleString()}</td>
                        <td style={td}>{Number(g.deliveries_litres).toLocaleString()}</td>
                        <td style={td}>{Number(g.sales_litres).toLocaleString()}</td>
                        <td style={td}>{Number(g.closing_litres).toLocaleString()}</td>
                        <td style={td}>{Number(g.expected_closing_litres).toLocaleString()}</td>
                        <td style={{ ...td, color: Math.abs(g.variance_litres) > 0 ? T.amber : T.green }}>
                          {Number(g.variance_litres).toLocaleString()}
                        </td>
                        <td style={td}>{Number(g.average_price_per_litre).toFixed(4)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{fmt(Number(g.revenue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} style={btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function buildCsv(summary) {
  const rows = [];
  const push = (cells) => rows.push(cells.map(c => {
    const s = String(c ?? '');
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  push(['# Regulator', summary.regulator || '']);
  push(['# Period start', summary.period_start || '']);
  push(['# Period end', summary.period_end || '']);
  push(['# Currency', summary.currency || '']);
  push(['# Generated at', summary.generated_at || '']);
  push([]);
  push(['Branch', 'Branch code', 'Grade code', 'Grade name', 'Regulator code',
        'Blended?', 'Opening L', 'Deliveries L', 'Sales L', 'Closing L',
        'Expected closing L', 'Variance L', 'Avg price / L', 'Revenue']);
  (summary.branches || []).forEach(br => {
    (br.grades || []).forEach(g => {
      push([
        br.branch_name, br.branch_code, g.grade_code, g.grade_name, g.regulator_code,
        g.is_blended ? 'Y' : 'N',
        g.opening_litres, g.deliveries_litres, g.sales_litres, g.closing_litres,
        g.expected_closing_litres, g.variance_litres,
        g.average_price_per_litre, g.revenue,
      ]);
    });
  });
  push([]);
  push(['# Totals']);
  push(['Sales L', summary.totals?.sales_litres || 0]);
  push(['Deliveries L', summary.totals?.deliveries_litres || 0]);
  push(['Revenue', summary.totals?.revenue || 0]);
  return rows.join('\n');
}

const card = { background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' };
const tbl = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: 10, textAlign: 'left', fontSize: 12, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' };
const td = { padding: 10, fontSize: 13.5, color: T.inkSoft };
const lbl = { display: 'block', fontSize: 12.5, color: T.muted, marginBottom: 4, fontWeight: 600 };
const inp = { width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 14, color: T.ink, background: '#fff' };
const btnPrimary = { padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: '#fff', background: T.green, border: 'none', cursor: 'pointer' };
const btnGhost = { padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: 'transparent', border: `1px solid ${T.line}`, cursor: 'pointer' };
const btnTab = { padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: '#fff', border: `1px solid ${T.line}`, cursor: 'pointer' };
const btnTabActive = { ...btnTab, background: T.green, color: '#fff', borderColor: T.green };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, .5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modalCard = { background: '#fff', borderRadius: 14, padding: 22, width: 560, maxWidth: '92%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)' };
