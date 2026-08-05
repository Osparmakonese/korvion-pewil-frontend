/**
 * RetailPayroll.js — full payroll workflow.
 *
 * List view: every payroll run with totals + status pill.
 * Detail drawer: lines table, inline edit, "Generate from Hours", Approve,
 * Mark Paid, and per-line Payslip print. Actions gate on role (owner|manager)
 * and status transitions (draft → approved → paid).
 *
 * Backend endpoints: see src/api/retailApi.js (getPayrollRuns, getPayrollRun,
 * generatePayrollLines, approvePayrollRun, markPayrollPaid, getPayslip, etc.)
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import usePrimaryAction from '../hooks/usePrimaryAction';
import {
  getPayrollRuns, getPayrollRun, createPayrollRun, deletePayrollRun,
  generatePayrollLines, recalculatePayrollRun,
  approvePayrollRun, markPayrollPaid,
  getPayslip, updatePayrollLine, deletePayrollLine,
} from '../api/retailApi';

const MANAGER_ROLES = new Set(['owner', 'manager']);

const styles = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  addBtn: { padding: '10px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  infoBanner: { background: '#fef3e2', border: '1px solid #c97d1a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#c97d1a', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' },
  mono: { fontFamily: 'monospace' },
  rowLink: { cursor: 'pointer' },
  pill: (status) => ({
    fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'inline-block',
    letterSpacing: '0.02em', textTransform: 'uppercase',
    background: status === 'paid' ? '#e8f5ee' : status === 'approved' ? '#e0f2fe' : '#fef3e2',
    color: status === 'paid' ? '#1a6b3a' : status === 'approved' ? '#0369a1' : '#c97d1a',
  }),
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
             alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%' },
  drawerBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 },
  drawer: { position: 'fixed', top: 0, right: 0, bottom: 0, width: '95%', maxWidth: 980,
            background: '#fff', zIndex: 901, boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
            overflowY: 'auto', padding: 24 },
  btnPrimary: { padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none',
                borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none',
              borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnRed: { padding: '6px 12px', background: '#fff', color: '#c0392b', border: '1px solid #fecaca',
            borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280',
           marginBottom: 4, textTransform: 'uppercase' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
           borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
};

const money = (v) => `$${Number(v || 0).toFixed(2)}`;

// ─── New Run modal ──────────────────────────────────────────
function NewRunModal({ onClose }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ period_start: today, period_end: today });
  const mut = useMutation({
    mutationFn: createPayrollRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-payroll-runs'] });
      onClose();
    },
  });
  return (
    <div style={styles.modalBg} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>
          New Payroll Run
        </h2>
        <div style={{ marginBottom: 12 }}>
          <label style={styles.label}>Period Start</label>
          <input type="date" value={form.period_start}
            onChange={(e) => setForm({ ...form, period_start: e.target.value })}
            style={styles.input} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Period End</label>
          <input type="date" value={form.period_end}
            onChange={(e) => setForm({ ...form, period_end: e.target.value })}
            style={styles.input} />
        </div>
        {mut.isError && (
          <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10 }}>
            {mut.error?.response?.data?.detail || mut.error?.message || 'Could not create run.'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => mut.mutate(form)} disabled={mut.isPending}
            style={{ ...styles.btnPrimary, flex: 1, opacity: mut.isPending ? 0.6 : 1 }}>
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onClose} style={{ ...styles.btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Payslip print ─────────────────────────────────────────
function printPayslip(slip) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  const fullName = slip.employee?.full_name || slip.employee?.username || 'Employee';
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Payslip ${slip.reference}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;color:#111827;max-width:640px;margin:24px auto;padding:0 24px;}
      h1{font-family:Georgia,serif;margin:0 0 4px 0;}
      .muted{color:#6b7280;font-size:12px;}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;}
      td,th{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;}
      th{background:#f9fafb;text-transform:uppercase;font-size:10px;color:#6b7280;}
      .right{text-align:right;font-family:monospace;}
      .section{margin-top:18px;}
      .net{font-size:18px;font-weight:700;color:#1a6b3a;}
      .btn{padding:8px 14px;background:#1a6b3a;color:#fff;border:none;border-radius:6px;cursor:pointer;}
      @media print { .noprint { display:none; } }
    </style></head><body>
    <h1>PAYSLIP</h1>
    <div class="muted">${slip.employer?.name || ''} &middot; Ref ${slip.reference}</div>
    <div class="section">
      <strong>${fullName}</strong><br/>
      <span class="muted">Staff #${slip.employee?.staff_number || '—'} &middot; ${slip.employee?.role || ''}</span><br/>
      <span class="muted">Period ${slip.period?.start} to ${slip.period?.end}</span>
    </div>
    <div class="section"><table>
      <thead><tr><th>Earnings</th><th class="right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Gross pay</td><td class="right">$${Number(slip.earnings?.gross_pay || 0).toFixed(2)}</td></tr>
        <tr><td>Hours worked</td><td class="right">${Number(slip.earnings?.hours_worked || 0).toFixed(2)}</td></tr>
      </tbody>
    </table></div>
    <div class="section"><table>
      <thead><tr><th>Deductions</th><th class="right">Amount</th></tr></thead>
      <tbody>
        <tr><td>PAYE</td><td class="right">$${Number(slip.deductions?.paye || 0).toFixed(2)}</td></tr>
        <tr><td>NSSA (employee)</td><td class="right">$${Number(slip.deductions?.nssa_employee || 0).toFixed(2)}</td></tr>
        <tr><td>Other</td><td class="right">$${Number(slip.deductions?.other || 0).toFixed(2)}</td></tr>
        <tr><td><strong>Total deductions</strong></td><td class="right"><strong>$${Number(slip.deductions?.total || 0).toFixed(2)}</strong></td></tr>
      </tbody>
    </table></div>
    <div class="section"><table>
      <tbody>
        <tr><td><strong>NET PAY</strong></td><td class="right net">$${Number(slip.net_pay || 0).toFixed(2)}</td></tr>
      </tbody>
    </table></div>
    <div class="section muted">Employer NSSA contribution: $${Number(slip.employer_contributions?.nssa_employer || 0).toFixed(2)}</div>
    <div class="section noprint"><button class="btn" onclick="window.print()">Print</button></div>
    </body></html>`;
  w.document.write(html);
  w.document.close();
}

// ─── Line editor row ───────────────────────────────────────
function LineRow({ line, runStatus, runId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    gross_pay: line.gross_pay,
    paye: line.paye,
    nssa_employee: line.nssa_employee,
    other_deductions: line.other_deductions,
    net_pay: line.net_pay,
    hours_worked: line.hours_worked,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['retail-payroll-run', runId] });
  const saveMut = useMutation({ mutationFn: (d) => updatePayrollLine(line.id, d), onSuccess: invalidate });
  const delMut  = useMutation({ mutationFn: () => deletePayrollLine(line.id), onSuccess: invalidate });
  const payslipMut = useMutation({
    mutationFn: () => getPayslip(runId, line.id),
    onSuccess: printPayslip,
  });

  const editable = runStatus === 'draft';

  if (editing) {
    return (
      <tr>
        <td style={styles.td}>{line.employee_name}</td>
        {['gross_pay', 'paye', 'nssa_employee', 'other_deductions', 'net_pay'].map((k) => (
          <td key={k} style={{ ...styles.td, ...styles.mono }}>
            <input type="number" step="0.01" value={draft[k]}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              style={{ ...styles.input, width: 90, padding: '4px 6px' }} />
          </td>
        ))}
        <td style={styles.td}>
          <button style={{ ...styles.btnPrimary, padding: '4px 10px', fontSize: 11 }}
            onClick={() => { saveMut.mutate(draft); setEditing(false); }}>Save</button>
          <button style={{ ...styles.btnGhost, padding: '4px 10px', fontSize: 11, marginLeft: 6 }}
            onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={styles.td}>{line.employee_name}</td>
      <td style={{ ...styles.td, ...styles.mono }}>{money(line.gross_pay)}</td>
      <td style={{ ...styles.td, ...styles.mono }}>{money(line.paye)}</td>
      <td style={{ ...styles.td, ...styles.mono }}>{money(line.nssa_employee)}</td>
      <td style={{ ...styles.td, ...styles.mono }}>{money(line.other_deductions)}</td>
      <td style={{ ...styles.td, ...styles.mono, fontWeight: 600, color: '#1a6b3a' }}>
        {money(line.net_pay)}
      </td>
      <td style={styles.td}>
        <button style={{ ...styles.btnGhost, padding: '4px 10px', fontSize: 11 }}
          onClick={() => payslipMut.mutate()}>Payslip</button>
        {editable && (
          <>
            <button style={{ ...styles.btnGhost, padding: '4px 10px', fontSize: 11, marginLeft: 6 }}
              onClick={() => setEditing(true)}>Edit</button>
            <button style={{ ...styles.btnRed, marginLeft: 6 }}
              onClick={() => { if (window.confirm('Remove this line?')) delMut.mutate(); }}>
              Remove
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

// ─── Run detail drawer ────────────────────────────────────
function RunDrawer({ runId, onClose, canManage }) {
  const qc = useQueryClient();
  const { data: run, isLoading } = useQuery({
    queryKey: ['retail-payroll-run', runId],
    queryFn: () => getPayrollRun(runId),
    enabled: !!runId,
  });

  const [currency, setCurrency] = useState('USD');
  const [includeMonthly, setIncludeMonthly] = useState(true);
  const [replace, setReplace] = useState(true);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['retail-payroll-run', runId] });
    qc.invalidateQueries({ queryKey: ['retail-payroll-runs'] });
  };
  const genMut = useMutation({
    mutationFn: () => generatePayrollLines(runId, { currency, replace, include_monthly: includeMonthly }),
    onSuccess: invalidate,
  });
  const recalcMut = useMutation({ mutationFn: () => recalculatePayrollRun(runId), onSuccess: invalidate });
  const approveMut = useMutation({ mutationFn: () => approvePayrollRun(runId), onSuccess: invalidate });
  const paidMut = useMutation({ mutationFn: () => markPayrollPaid(runId), onSuccess: invalidate });
  const deleteRunMut = useMutation({
    mutationFn: () => deletePayrollRun(runId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-payroll-runs'] });
      onClose();
    },
  });

  if (!runId) return null;

  return (
    <>
      <div style={styles.drawerBg} onClick={onClose} />
      <div style={styles.drawer}>
        {isLoading || !run ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading run…</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827',
                             fontFamily: "'Playfair Display', serif", margin: 0 }}>
                  Payroll Run #{run.id}
                </h2>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                  {new Date(run.period_start).toLocaleDateString()} – {new Date(run.period_end).toLocaleDateString()}
                  {'  '}<span style={styles.pill(run.status)}>{run.status}</span>
                </div>
              </div>
              <button onClick={onClose} style={styles.btnGhost}>Close</button>
            </div>

            {/* Totals strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                ['Gross', run.total_gross, '#111827'],
                ['PAYE',  run.total_paye,  '#c97d1a'],
                ['NSSA',  run.total_nssa,  '#c97d1a'],
                ['Net',   run.total_net,   '#1a6b3a'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb',
                     borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280',
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'monospace' }}>{money(val)}</div>
                </div>
              ))}
            </div>

            {/* Generate / actions bar */}
            {run.status === 'draft' && canManage && (
              <div style={{ ...styles.card, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280',
                              textTransform: 'uppercase', marginBottom: 8 }}>
                  Generate lines from attendance
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    style={{ ...styles.input, width: 110 }}>
                    <option value="USD">USD</option>
                    <option value="ZiG">ZiG</option>
                  </select>
                  <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={includeMonthly}
                      onChange={(e) => setIncludeMonthly(e.target.checked)} />
                    Include monthly salary workers
                  </label>
                  <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={replace}
                      onChange={(e) => setReplace(e.target.checked)} />
                    Replace existing lines
                  </label>
                  <button style={styles.btnPrimary} disabled={genMut.isPending}
                    onClick={() => genMut.mutate()}>
                    {genMut.isPending ? 'Generating…' : 'Generate from Hours'}
                  </button>
                  <button style={styles.btnGhost} onClick={() => recalcMut.mutate()}>
                    Recalculate totals
                  </button>
                </div>
                {genMut.data && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#1a6b3a' }}>
                    {'\u2705'} {genMut.data.created} line{genMut.data.created === 1 ? '' : 's'} generated ({genMut.data.currency}).
                  </div>
                )}
                {genMut.isError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>
                    {genMut.error?.response?.data?.error || genMut.error?.message || 'Generate failed.'}
                  </div>
                )}
              </div>
            )}

            {/* Lines table */}
            <div style={styles.card}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Gross</th>
                    <th style={styles.th}>PAYE</th>
                    <th style={styles.th}>NSSA</th>
                    <th style={styles.th}>Other</th>
                    <th style={styles.th}>Net</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(run.lines || []).length === 0 ? (
                    <tr><td style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 32 }} colSpan={7}>
                      No lines yet. Generate from attendance above.
                    </td></tr>
                  ) : run.lines.map((l) => (
                    <LineRow key={l.id} line={l} runStatus={run.status} runId={run.id} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lifecycle actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {run.status === 'draft' && canManage && (
                <button style={styles.btnPrimary} disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate()}>
                  {approveMut.isPending ? 'Approving…' : 'Approve run'}
                </button>
              )}
              {run.status === 'approved' && canManage && (
                <button style={styles.btnPrimary} disabled={paidMut.isPending}
                  onClick={() => {
                    if (window.confirm('Mark this run as paid? This writes journal entries and cannot be undone.')) {
                      paidMut.mutate();
                    }
                  }}>
                  {paidMut.isPending ? 'Processing…' : 'Mark paid + post journal'}
                </button>
              )}
              {run.status === 'draft' && canManage && (
                <button style={styles.btnRed}
                  onClick={() => {
                    if (window.confirm('Delete this draft run?')) deleteRunMut.mutate();
                  }}>
                  Delete draft
                </button>
              )}
              {(approveMut.isError || paidMut.isError) && (
                <div style={{ color: '#b91c1c', fontSize: 12, alignSelf: 'center' }}>
                  {(approveMut.error || paidMut.error)?.response?.data?.error ||
                   (approveMut.error || paidMut.error)?.message}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────
export default function RetailPayroll() {
  // Top-bar primary action — see hooks/usePrimaryAction.js.
  usePrimaryAction(() => setShowNew(true));

  const { user } = useAuth();
  const canManage = MANAGER_ROLES.has(user?.role);

  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['retail-payroll-runs'],
    queryFn: getPayrollRuns,
    staleTime: 30000,
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Payroll</h1>
        <button onClick={() => setShowNew(true)} style={styles.addBtn}>{'\u002B'} New Run</button>
      </div>

      <div style={styles.infoBanner}>
        {'\u26A0\uFE0F'} PAYE + NSSA applied automatically using tenant tax config. Edit bands in Settings → Tax Config.
      </div>

      {showNew && <NewRunModal onClose={() => setShowNew(false)} />}

      <div style={styles.card}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading payroll runs…</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F4B5}'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No payroll runs yet</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Click "New Run" to create one, then Generate lines from attendance.
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Run #</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Employees</th>
                <th style={styles.th}>Gross</th>
                <th style={styles.th}>PAYE</th>
                <th style={styles.th}>NSSA</th>
                <th style={styles.th}>Net</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={styles.rowLink}
                    onClick={() => setOpenId(run.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={styles.td}>#{run.id}</td>
                  <td style={styles.td}>
                    {new Date(run.period_start).toLocaleDateString()} – {new Date(run.period_end).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>{run.lines?.length || 0}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{money(run.total_gross)}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{money(run.total_paye)}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{money(run.total_nssa)}</td>
                  <td style={{ ...styles.td, ...styles.mono, fontWeight: 600, color: '#1a6b3a' }}>
                    {money(run.total_net)}
                  </td>
                  <td style={styles.td}><span style={styles.pill(run.status)}>{run.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId && (
        <RunDrawer runId={openId} onClose={() => setOpenId(null)} canManage={canManage} />
      )}
    </div>
  );
}
