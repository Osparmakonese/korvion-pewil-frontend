import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoans, createLoan, createLoanRepayment, updateLoan } from '../api/farmApi';
import { fmt, today } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const emptyForm = {
  lender_name: '',
  amount: '',
  interest_rate: 0,
  start_date: today(),
  due_date: today(),
  purpose: '',
  notes: '',
};

const S = {
  info: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: '#1d4ed8', marginBottom: 14 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif" },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 },
  metricCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  metricIcon: (bg) => ({ width: 26, height: 26, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginBottom: 8 }),
  metricLabel: { fontSize: 10, color: '#6b7280', fontWeight: 500, marginBottom: 2 },
  metricVal: (color) => ({ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color, lineHeight: 1.2 }),
  metricTrend: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
  btnSmall: { padding: '6px 12px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnSmallSecondary: { padding: '6px 12px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10, fontFamily: "'Playfair Display', serif" },
  loanCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 },
  /* Von Restorff: overdue loans have red border to draw immediate attention */
  loanCardOverdue: { background: '#fff5f5', border: '2px solid #c0392b', borderRadius: 10, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(192,57,43,0.1)' },
  loanHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  loanLender: { fontSize: 13, fontWeight: 700, color: '#111827' },
  loanPurpose: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  loanStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, fontSize: 11 },
  loanStatItem: { color: '#6b7280' },
  loanStatLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 2, fontWeight: 600 },
  badge: (bg, color) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: bg, color }),
  progressBar: { width: '100%', height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: (pct, color) => ({ height: '100%', width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color, transition: 'width 0.3s' }),
  expandBtn: { background: 'none', border: 'none', color: '#1a6b3a', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 },
  repaymentHistory: { background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 12 },
  repaymentItem: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' },
  repaymentAmount: { fontWeight: 700, color: '#111827' },
  makePaymentForm: { background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 12, display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 8, alignItems: 'flex-end' },
  paymentInputSmall: { width: 120, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  paymentDateSmall: { width: 130, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, outline: 'none', color: '#111827', boxSizing: 'border-box' },
};

export default function Loans({ onTabChange }) {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [paymentForm, setPaymentForm] = useState({});

  const { data: loans = [], isLoading } = useQuery({ queryKey: ['loans'], queryFn: getLoans });
  const createMut = useMutation({ mutationFn: createLoan, onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setForm(emptyForm); } });
  const repayMut = useMutation({ mutationFn: createLoanRepayment, onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPaymentForm({}); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateLoan(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); } });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setPayment = (loanId, k, v) => setPaymentForm(p => ({ ...p, [loanId]: { ...(p[loanId] || { amount: '', payment_date: today() }), [k]: v } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.lender_name || !form.amount || !form.start_date || !form.due_date) return;
    setPending({
      lender_name: form.lender_name,
      amount: parseFloat(form.amount),
      interest_rate: parseFloat(form.interest_rate) || 0,
      start_date: form.start_date,
      due_date: form.due_date,
      purpose: form.purpose || null,
      notes: form.notes || null,
    });
    setConfirmOpen(true);
  };

  const handleMakePayment = (loanId) => {
    const pf = paymentForm[loanId];
    if (!pf || !pf.amount || !pf.payment_date) return;
    repayMut.mutate({
      loan: loanId,
      amount: parseFloat(pf.amount),
      payment_date: pf.payment_date,
    });
  };

  const handleMarkPaid = (loanId) => {
    updateMut.mutate({ id: loanId, data: { status: 'paid' } });
  };

  // Calculate summary metrics
  const totalBorrowed = loans.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + (parseFloat(l.total_repaid) || 0), 0);
  const outstandingBalance = loans.reduce((sum, l) => sum + (parseFloat(l.balance) || 0), 0);
  const activeLoans = loans.filter(l => l.status !== 'paid').length;

  return (
    <>
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.25))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Loans &amp; Credit</div>
          <div style={S.bannerSub}>Track borrowing and repayments</div>
        </div>
      </div>

      <div style={S.metricsGrid}>
        <div style={S.metricCard}>
          <div style={S.metricIcon('#e8f5ee')}>💰</div>
          <div style={S.metricLabel}>Total Borrowed</div>
          <div style={S.metricVal('#1a6b3a')}>{fmt(totalBorrowed)}</div>
        </div>
        <div style={S.metricCard}>
          <div style={S.metricIcon('#e8f5ee')}>✔</div>
          <div style={S.metricLabel}>Total Repaid</div>
          <div style={S.metricVal('#1a6b3a')}>{fmt(totalRepaid)}</div>
        </div>
        <div style={S.metricCard}>
          <div style={S.metricIcon('#fdecea')}>📊</div>
          <div style={S.metricLabel}>Outstanding Balance</div>
          <div style={S.metricVal('#c0392b')}>{fmt(outstandingBalance)}</div>
        </div>
        <div style={S.metricCard}>
          <div style={S.metricIcon('#fef3e2')}>📋</div>
          <div style={S.metricLabel}>Active Loans</div>
          <div style={S.metricVal('#c97d1a')}>{activeLoans}</div>
        </div>
      </div>

      <div style={S.twoCol}>
        <div>
          <form style={S.card} onSubmit={handleSubmit}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Add New Loan</div>
            <label style={S.label}>Lender Name</label>
            <input style={S.input} type="text" value={form.lender_name} onChange={e => set('lender_name', e.target.value)} placeholder="Bank, Individual, etc." required />
            <div style={S.row2}>
              <div><label style={S.label}>Amount ($)</label><input style={S.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required /></div>
              <div><label style={S.label}>Interest Rate (%)</label><input style={S.input} type="number" min="0" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} /></div>
            </div>
            <div style={S.row2}>
              <div><label style={S.label}>Start Date</label><input style={S.input} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required /></div>
              <div><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required /></div>
            </div>
            <label style={S.label}>Purpose (optional)</label>
            <input style={S.input} type="text" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g., Equipment, Seeds" />
            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" />
            <button style={S.btn} type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving...' : '+ Add Loan'}
            </button>
            {createMut.isError && <p style={S.error}>{createMut.error?.response?.data?.detail || 'Failed to save'}</p>}
          </form>
        </div>

        <div>
          <div style={S.sectionTitle}>Active Loans</div>
          {isLoading ? <p style={{ fontSize: 11, color: '#9ca3af' }}>Loading...</p> : (
            <div>
              {loans.length === 0 ? (
                <div style={{ ...S.card, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>No loans recorded yet.</div>
              ) : (
                loans.map((loan) => {
                  const amount = parseFloat(loan.amount) || 0;
                  const rate = parseFloat(loan.interest_rate) || 0;
                  const totalDue = amount * (1 + rate / 100);
                  const repaid = parseFloat(loan.total_repaid) || 0;
                  const balance = parseFloat(loan.balance) || 0;
                  const isOverdue = loan.due_date < today() && loan.status !== 'paid';
                  const repaidPct = totalDue > 0 ? (repaid / totalDue) * 100 : 0;
                  const isExpanded = expandedLoan === loan.id;
                  const history = loan.repayments || [];

                  return (
                    <div key={loan.id} style={isOverdue ? S.loanCardOverdue : S.loanCard}>
                      <div style={S.loanHeader}>
                        <div>
                          <div style={S.loanLender}>{loan.lender_name}</div>
                          {loan.purpose && <div style={S.loanPurpose}>{loan.purpose}</div>}
                        </div>
                        <span style={S.badge(loan.status === 'paid' ? '#e8f5ee' : isOverdue ? '#fdecea' : '#fef3e2', loan.status === 'paid' ? '#1a6b3a' : isOverdue ? '#c0392b' : '#92400e')}>
                          {loan.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Active'}
                        </span>
                      </div>

                      <div style={S.loanStats}>
                        <div><div style={S.loanStatLabel}>Amount Borrowed</div><div style={S.loanStatItem}>{fmt(amount)}</div></div>
                        <div><div style={S.loanStatLabel}>Interest Rate</div><div style={S.loanStatItem}>{rate.toFixed(2)}%</div></div>
                        <div><div style={S.loanStatLabel}>Total Due</div><div style={S.loanStatItem}>{fmt(totalDue)}</div></div>
                        <div><div style={S.loanStatLabel}>Total Repaid</div><div style={S.loanStatItem}>{fmt(repaid)}</div></div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Repayment Progress</span>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(balance)} remaining</span>
                        </div>
                        <div style={S.progressBar}>
                          <div style={S.progressFill(repaidPct, '#1a6b3a')} />
                        </div>
                      </div>

                      <div style={{ fontSize: 10, color: isOverdue ? '#c0392b' : '#6b7280', marginBottom: 12, fontWeight: isOverdue ? 600 : 400 }}>
                        Due: {loan.due_date}
                        {isOverdue && <span style={{ marginLeft: 8, color: '#c0392b' }}>⚠ OVERDUE</span>}
                      </div>

                      {history.length > 0 && (
                        <>
                          <button style={S.expandBtn} onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}>
                            {isExpanded ? '▼ Hide History' : '▶ View History'} ({history.length})
                          </button>
                          {isExpanded && (
                            <div style={S.repaymentHistory}>
                              {history.map((rep, i) => (
                                <div key={i} style={S.repaymentItem}>
                                  <span>{rep.payment_date}</span>
                                  <span style={S.repaymentAmount}>{fmt(parseFloat(rep.amount))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {loan.status !== 'paid' && (
                        <div style={S.makePaymentForm}>
                          <input style={S.paymentInputSmall} type="number" min="0" step="0.01" placeholder="Amount" value={paymentForm[loan.id]?.amount || ''} onChange={e => setPayment(loan.id, 'amount', e.target.value)} />
                          <input style={S.paymentDateSmall} type="date" value={paymentForm[loan.id]?.payment_date || today()} onChange={e => setPayment(loan.id, 'payment_date', e.target.value)} />
                          <button style={S.btnSmall} onClick={() => handleMakePayment(loan.id)} disabled={repayMut.isPending}>
                            {repayMut.isPending ? 'Processing...' : 'Pay'}
                          </button>
                        </div>
                      )}

                      {loan.status !== 'paid' && (
                        <button style={{ ...S.btnSmallSecondary, width: '100%', marginTop: 8 }} onClick={() => handleMarkPaid(loan.id)} disabled={updateMut.isPending}>
                          {updateMut.isPending ? 'Updating...' : '✓ Mark as Paid'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); createMut.mutate(pending); }}
        fields={pending ? [
          { label: 'Lender', value: pending.lender_name },
          { label: 'Amount', value: fmt(pending.amount) },
          { label: 'Interest Rate', value: `${pending.interest_rate}%` },
          { label: 'Total Due', value: fmt(pending.amount * (1 + pending.interest_rate / 100)) },
          { label: 'Start Date', value: pending.start_date },
          { label: 'Due Date', value: pending.due_date },
          ...(pending.purpose ? [{ label: 'Purpose', value: pending.purpose }] : []),
        ] : []} />
    </>
  );
}
