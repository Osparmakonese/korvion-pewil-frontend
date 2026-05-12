import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCashierSessions, createCashierSession,
  getPOSSettings,
  getSessionXReport, closeCashierSessionAdvanced,
  createCashDrop, managerApprove,
  listBranches,
} from '../api/retailApi';
import { fmt } from '../utils/format';
import AIInsightCard from '../components/AIInsightCard';
import MobileCashierSessions from '../components/MobileCashierSessions';
import { invalidateSessionCaches } from '../utils/queryCache';

/* --- Open Session Modal ---
 *
 * Multi-branch (May 2026): if the tenant has more than one Branch, show
 * a branch picker. Single-branch tenants don't see it \u2014 backend silently
 * defaults to the tenant's HQ branch. We default-select the HQ branch
 * (or the first branch if no HQ flag) so the cashier can just hit
 * "Open Session" without thinking about it.
 */
function OpenSessionModal({ isOpen, onClose, onSubmit, loading, branches = [] }) {
  const [openingFloat, setOpeningFloat] = useState('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');

  // Default-select HQ (or first) branch whenever the modal opens or the
  // branches list arrives.
  useEffect(() => {
    if (!isOpen) return;
    if (branchId) return;
    if (!Array.isArray(branches) || branches.length === 0) return;
    const hq = branches.find((b) => b && b.is_hq);
    setBranchId(String((hq || branches[0]).id));
  }, [isOpen, branches, branchId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { opening_float: parseFloat(openingFloat) || 0, notes };
    if (branchId) payload.branch_id = parseInt(branchId, 10) || null;
    onSubmit(payload);
    setOpeningFloat('');
    setNotes('');
    // Keep branchId so re-opening the modal preserves the cashier's last
    // branch choice \u2014 typical cashier opens at the same branch all day.
  };

  if (!isOpen) return null;

  const showBranchPicker = Array.isArray(branches) && branches.length > 1;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {'\u{1F4B5}'} Open New Session
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>
        <form onSubmit={handleSubmit}>
          {showBranchPicker && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Branch</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="" disabled>Select a branch{'\u2026'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.code} \u2014 ${b.name}` : b.name}
                    {b.is_hq ? ' (HQ)' : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                Sales rung up here will count toward this branch{'\u2019'}s till totals.
              </div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Opening Float (Cash in Drawer)</label>
            <input type="number" step="0.01" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} required placeholder="0.00" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes for this session..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Opening...' : 'Open Session'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Manager PIN gate — reusable. Calls managerApprove + hands back a
 *     one-shot X-Manager-Approval token.
 */
function ManagerPinGate({ action, onApproved, small = false }) {
  const [managerId, setManagerId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await managerApprove({
        action, method: 'pin',
        manager_id: parseInt(managerId, 10) || 0,
        pin,
      });
      if (res && res.token) onApproved(res.token, res);
      else setErr('No token returned.');
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.response?.data?.error || 'Approval failed.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: small ? 8 : 12, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
        {'\u{1F510}'} Manager approval required ({action.replace('_', ' ')})
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type="number" value={managerId} onChange={e => setManagerId(e.target.value)} placeholder="Mgr ID" required
          style={{ width: 72, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, outline: 'none' }} />
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN" required
          style={{ flex: 1, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, outline: 'none' }} />
        <button type="submit" disabled={loading}
          style={{ padding: '6px 10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : 'Approve'}
        </button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 11, marginTop: 6 }}>{err}</div>}
    </form>
  );
}

/* --- Cash Drop Modal --- */
function CashDropModal({ isOpen, onClose, session, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('bank_drop');
  const [notes, setNotes] = useState('');
  const [approvalToken, setApprovalToken] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setAmount(''); setReason('bank_drop'); setNotes(''); setApprovalToken(''); setErr(''); }
  }, [isOpen, session && session.id]);

  if (!isOpen || !session) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!approvalToken) { setErr('Manager approval needed first.'); return; }
    setErr(''); setLoading(true);
    try {
      await createCashDrop({
        session: session.id,
        amount: parseFloat(amount) || 0,
        reason, notes,
      }, approvalToken);
      onDone();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.response?.data?.error || 'Drop failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 440, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {'\u{1F4B0}'} Cash Drop — Session #{session.id}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        {!approvalToken && (
          <ManagerPinGate action="cash_drop" onApproved={(tok) => setApprovalToken(tok)} />
        )}

        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Amount</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}>
            <option value="bank_drop">Bank drop</option>
            <option value="supplier_payment">Supplier payment</option>
            <option value="petty_cash">Petty cash / expense</option>
            <option value="float_adjustment">Float adjustment</option>
            <option value="other">Other</option>
          </select>

          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', marginBottom: 14 }} />

          {err && <div style={{ color: '#c0392b', fontSize: 11, marginBottom: 10 }}>{err}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading || !approvalToken}
              style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (loading || !approvalToken) ? 0.6 : 1 }}>
              {loading ? 'Recording...' : 'Record Drop'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- X-Report Modal (mid-shift snapshot, non-destructive) --- */
function XReportModal({ isOpen, onClose, session }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!isOpen || !session) return;
    setData(null); setErr('');
    getSessionXReport(session.id).then(setData).catch(e =>
      setErr(e?.response?.data?.detail || 'Failed to load X-Report.'));
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 460, width: '92%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {'\u{1F4CA}'} X-Report — Session #{session.id}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        {err ? (
          <div style={{ color: '#c0392b', fontSize: 12 }}>{err}</div>
        ) : !data ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading snapshot...</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
              As of {new Date(data.as_of).toLocaleString()} — non-destructive snapshot
            </div>
            <div style={{ fontSize: 12 }}>
              <RowKV k="Cashier" v={data.cashier || '\u2014'} />
              <RowKV k="Opened" v={data.opened_at ? new Date(data.opened_at).toLocaleString() : '\u2014'} />
              <RowKV k="Opening Float" v={fmt(data.opening_float, 'zwd')} />
              <RowKV k="Sales" v={`${data.sales_count} txns \u00B7 ${fmt(data.sales_total, 'zwd')}`} />
              <RowKV k="VAT collected" v={fmt(data.vat_collected, 'zwd')} />
              <RowKV k="Cash drops" v={`${data.cash_drops_count} \u00B7 ${fmt(data.cash_drops_total, 'zwd')}`} />
              <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payment breakdown</div>
              {Object.entries(data.payment_breakdown || {}).map(([k, v]) => (
                <RowKV key={k} k={k} v={`${v.count} \u00B7 ${fmt(v.total, 'zwd')}`} />
              ))}
              {Object.keys(data.payment_breakdown || {}).length === 0 && (
                <div style={{ fontSize: 11, color: '#9ca3af' }}>No sales yet.</div>
              )}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                <RowKV k={<strong>Expected in drawer</strong>} v={<strong style={{ color: '#1a6b3a' }}>{fmt(data.expected_cash, 'zwd')}</strong>} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Print</button>
              <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RowKV({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: '#6b7280' }}>{k}</span>
      <span style={{ color: '#111827' }}>{v}</span>
    </div>
  );
}

/* --- Timeline Modal (printable end-of-shift receipt) --- */
function TimelineModal({ isOpen, onClose, session }) {
  if (!isOpen || !session) return null;
  const events = session.timeline || [];
  const iconFor = (kind) => ({
    open: '\u{1F4B5}', cash_drop: '\u{1F4B0}',
    sales_hour: '\u{1F6D2}', close: '\u{1F512}',
  }[kind] || '\u2022');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div id="timeline-print-area" style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '92%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {'\u{1F4CB}'} Shift Report — #{session.id}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        <div style={{ fontSize: 12, marginBottom: 10 }}>
          <RowKV k="Cashier" v={session.cashier_username} />
          <RowKV k="Status" v={session.status} />
          <RowKV k="Opened" v={session.opened_at ? new Date(session.opened_at).toLocaleString() : '\u2014'} />
          {session.closed_at && <RowKV k="Closed" v={new Date(session.closed_at).toLocaleString()} />}
        </div>

        <div style={{ borderTop: '1px dashed #d1d5db', paddingTop: 8, marginTop: 4 }}>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No events yet.</div>
          ) : events.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
              <div style={{ width: 18 }}>{iconFor(e.kind)}</div>
              <div style={{ width: 120, color: '#6b7280' }}>{new Date(e.ts).toLocaleString()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#111827' }}>{e.label}</div>
                {e.meta && e.meta.reason && <div style={{ color: '#6b7280', fontSize: 11 }}>Reason: {e.meta.reason}{e.meta.approved_by ? ` \u00B7 ${e.meta.approved_by}` : ''}</div>}
                {e.meta && e.meta.variance != null && (
                  <div style={{ color: e.meta.variance === 0 ? '#1a6b3a' : '#c0392b', fontSize: 11 }}>
                    {'Expected '}{fmt(e.meta.expected_cash, 'zwd')}{' \u00B7 Variance '}{e.meta.variance >= 0 ? '+' : ''}{fmt(e.meta.variance, 'zwd')}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 600, color: e.amount < 0 ? '#c0392b' : '#111827' }}>
                {e.amount !== 0 ? fmt(e.amount, 'zwd') : ''}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: 10, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Print</button>
          <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* --- Close Session Modal (denomination count + blind close + variance reveal) --- */
// USD cash denominations commonly used in Zimbabwe. (ZWL denoms can be swapped
// per-tenant later via POSSettings.denomination_set if/when needed.)
const DENOMS = [
  { value: 100, label: '$100' },
  { value: 50,  label: '$50'  },
  { value: 20,  label: '$20'  },
  { value: 10,  label: '$10'  },
  { value: 5,   label: '$5'   },
  { value: 2,   label: '$2'   },
  { value: 1,   label: '$1'   },
  { value: 0.5, label: '50c'  },
  { value: 0.25,label: '25c'  },
  { value: 0.10,label: '10c'  },
  { value: 0.05,label: '5c'   },
];

function CloseSessionModal({ isOpen, onClose, onSubmit, session, loading, blindClose, varianceThreshold }) {
  const [counts, setCounts] = useState({});   // { '100': 3, '20': 5, ... }
  const [submitted, setSubmitted] = useState(false);
  const [varianceReason, setVarianceReason] = useState('');
  const [approvalToken, setApprovalToken] = useState('');
  const [err, setErr] = useState('');

  // Reset whenever modal reopens with a different session.
  useEffect(() => {
    if (isOpen) {
      setCounts({}); setSubmitted(false);
      setVarianceReason(''); setApprovalToken(''); setErr('');
    }
  }, [isOpen, session && session.id]);

  if (!isOpen || !session) return null;

  const countedCash = DENOMS.reduce((sum, d) => {
    const c = parseInt(counts[d.value] || 0, 10);
    return sum + (isNaN(c) ? 0 : c) * d.value;
  }, 0);

  // Expected cash = opening_float + cash sales \u2212 cash drops.
  const cashPayments = (session.payment_breakdown && session.payment_breakdown.cash) || { total: 0 };
  const drops = Number(session.cash_drops_total || 0);
  const expectedCash = Number(session.opening_float || 0) + Number(cashPayments.total || 0) - drops;
  const variance = countedCash - expectedCash;

  const showVariance = !blindClose || submitted;
  const gateActive = Number.isFinite(varianceThreshold) && varianceThreshold >= 0 && Math.abs(variance) > varianceThreshold;
  const gateSatisfied = !gateActive || (varianceReason && approvalToken);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    if (blindClose && !submitted) {
      setSubmitted(true);
      return;
    }
    if (gateActive && !gateSatisfied) {
      setErr('Select a reason and get manager approval to continue.');
      return;
    }
    const payload = {
      closing_cash: countedCash,
      closing_denominations: Object.fromEntries(
        Object.entries(counts)
          .filter(([, c]) => parseInt(c, 10) > 0)
          .map(([d, c]) => [d, parseInt(c, 10)])
      ),
    };
    if (gateActive) payload.variance_reason = varianceReason;
    onSubmit(session.id, payload, gateActive ? approvalToken : undefined);
  };

  const pillColor = variance === 0 ? '#1a6b3a' : variance < 0 ? '#c0392b' : '#b8860b';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 560, width: '92%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827' }}>
            {'\u{1F512}'} Close Session #{session.id}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>{'\u00D7'}</button>
        </div>

        {/* Session facts */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>Cashier:</span>
            <strong>{session.cashier_username}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>Opened:</span>
            <strong>{session.opened_at ? new Date(session.opened_at).toLocaleString() : ''}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>Sales:</span>
            <strong>{session.sales_count || 0} txns &middot; {fmt(session.sales_total || 0, 'zwd')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>Opening Float:</span>
            <strong style={{ color: '#1a6b3a' }}>{fmt(session.opening_float, 'zwd')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Cash drops:</span>
            <strong style={{ color: drops > 0 ? '#c0392b' : '#111827' }}>
              {session.cash_drops_count || 0} &middot; {fmt(drops, 'zwd')}
            </strong>
          </div>
        </div>

        {blindClose && !submitted && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 7, padding: 10, marginBottom: 12, fontSize: 11 }}>
            {'\u{1F441}'} <strong>Blind close mode.</strong> Count the drawer by denomination without seeing the expected total. Variance will be revealed after you submit.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>
            Denomination count
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {DENOMS.map(d => {
              const c = counts[d.value] || '';
              const sub = (parseInt(c || 0, 10) || 0) * d.value;
              return (
                <div key={d.value} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 7, padding: '6px 8px' }}>
                  <span style={{ fontWeight: 700, width: 46, color: '#111827' }}>{d.label}</span>
                  <span style={{ color: '#9ca3af' }}>x</span>
                  <input
                    type="number" min="0" step="1"
                    value={c}
                    onChange={e => setCounts(prev => ({ ...prev, [d.value]: e.target.value }))}
                    placeholder="0"
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 13, outline: 'none', minWidth: 0 }}
                  />
                  <span style={{ fontSize: 11, color: '#6b7280', minWidth: 62, textAlign: 'right' }}>
                    {sub > 0 ? fmt(sub, 'zwd') : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals panel */}
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>Counted (drawer):</span>
              <strong>{fmt(countedCash, 'zwd')}</strong>
            </div>
            {showVariance ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#6b7280' }}>Expected:</span>
                  <strong>{fmt(expectedCash, 'zwd')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #d1d5db' }}>
                  <span style={{ color: '#6b7280' }}>Variance:</span>
                  <strong style={{ color: pillColor }}>
                    {variance > 0 ? '+' : ''}{fmt(variance, 'zwd')}
                  </strong>
                </div>
              </>
            ) : (
              <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 11 }}>
                Expected / variance hidden until submit.
              </div>
            )}
          </div>

          {/* Variance gate — shown once variance is visible and exceeds threshold */}
          {showVariance && gateActive && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>
                {'\u26A0'} Variance {variance >= 0 ? '+' : ''}{fmt(variance, 'zwd')} exceeds threshold {fmt(varianceThreshold, 'zwd')}
              </div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>Reason code</label>
              <select required value={varianceReason} onChange={e => setVarianceReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 10, background: '#fff' }}>
                <option value="">{'Select reason\u2026'}</option>
                <option value="till_short">Till short — cash missing</option>
                <option value="till_over">Till over — extra cash</option>
                <option value="counting_error">Counting / denomination error</option>
                <option value="bank_drop_mismatch">Bank-drop mismatch</option>
                <option value="float_error">Opening float mis-entered</option>
                <option value="theft_suspected">Suspected theft</option>
                <option value="other">Other (see notes)</option>
              </select>
              {!approvalToken ? (
                <ManagerPinGate action="variance_approval" onApproved={(tok) => setApprovalToken(tok)} small />
              ) : (
                <div style={{ fontSize: 11, color: '#1a6b3a', fontWeight: 600 }}>{'\u2713'} Manager approval captured.</div>
              )}
            </div>
          )}

          {err && <div style={{ color: '#c0392b', fontSize: 11, marginBottom: 10 }}>{err}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading || (showVariance && gateActive && !gateSatisfied)}
              style={{ flex: 1, padding: 10, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (loading || (showVariance && gateActive && !gateSatisfied)) ? 0.6 : 1 }}>
              {loading
                ? 'Closing...'
                : (blindClose && !submitted) ? 'Review Variance' : 'Confirm & Close Session'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Styles --- */
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  addBtn: { padding: '10px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f9fafb' },
  tableHeaderCell: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' },
  tableBody: { fontSize: 13, color: '#374151' },
  tableRow: { borderBottom: '1px solid #e5e7eb' },
  tableRowHover: { background: '#f9fafb' },
  tableCell: { padding: '14px 16px', textAlign: 'left' },
  sessionIdCell: { fontFamily: 'monospace', fontWeight: 600, color: '#1a6b3a' },
  cashierCell: { fontWeight: 600 },
  emptyCell: { color: '#9ca3af' },
  pill: (type) => {
    const styles = {
      open: { background: '#e8f5ee', color: '#1a6b3a' },
      balanced: { background: '#e8f5ee', color: '#1a6b3a' },
      variance: { background: '#fef3e2', color: '#92400e' },
    };
    return { display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, ...styles[type] };
  },
  varianceNegative: { color: '#c0392b', fontWeight: 700 },
  varianceZero: { color: '#1a6b3a', fontWeight: 700 },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9ca3af' },
};

export default function CashierSessions() {
  const qc = useQueryClient();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [closingSession, setClosingSession] = useState(null);

  // Mobile branch — phones get the locked-design list. Open/Close modals
  // already render below at the bottom of the JSX tree, so we render them
  // inside the mobile branch's fragment too. Hooks declared before any
  // conditional return so React's hook order stays consistent.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 500
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['retail-cashier-sessions-page'],
    queryFn: getCashierSessions,
    staleTime: 30000,
  });

  const { data: posSettings } = useQuery({
    queryKey: ['retail-pos-settings-for-close'],
    queryFn: getPOSSettings,
    staleTime: 60000,
  });
  const blindClose = !!(posSettings && posSettings.blind_close);

  // Multi-branch (May 2026): fetch branches once so the Open Session modal
  // can show a picker for chains. Single-branch tenants get a 1-element
  // list back and the picker auto-hides.
  const { data: branches = [] } = useQuery({
    queryKey: ['retail-branches-for-session-open'],
    queryFn: listBranches,
    staleTime: 60000,
  });

  const openMut = useMutation({
    mutationFn: createCashierSession,
    onSuccess: () => {
      // Opening a session must reach POS so the cashier sees the new
      // session immediately, plus end-of-day and dashboard rollups.
      invalidateSessionCaches(qc);
      setShowOpenModal(false);
    },
  });

  const closeMut = useMutation({
    mutationFn: ({ id, data, token }) => closeCashierSessionAdvanced(id, data, token),
    onSuccess: () => {
      invalidateSessionCaches(qc);
      setClosingSession(null);
    },
  });

  const handleCloseSession = (id, data, token) => {
    closeMut.mutate({ id, data, token });
  };

  // ── State for the Batch 6 modals ──
  const [dropSession, setDropSession] = useState(null);
  const [xReportSession, setXReportSession] = useState(null);
  const [timelineSession, setTimelineSession] = useState(null);

  const varianceThreshold = Number(posSettings?.variance_threshold ?? 5);

  // Combine all sessions for table display
  const allSessions = [...sessions].sort((a, b) => {
    // Sort by status (open first), then by opened_at descending
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    return new Date(b.opened_at || 0) - new Date(a.opened_at || 0);
  });

  // Helper to determine status pill
  const getStatusPill = (session) => {
    if (session.status === 'open') {
      return { type: 'open', label: 'Open' };
    }
    if (session.variance === 0) {
      return { type: 'balanced', label: 'Balanced' };
    }
    return { type: 'variance', label: 'Variance' };
  };

  // Mobile branch — keep all the same modals so open/close/x-report
  // flows still work; the only change is that the list itself becomes
  // a phone-native card stack.
  if (isMobile) {
    return (
      <>
        <MobileCashierSessions
          onOpenSession={() => setShowOpenModal(true)}
          onCloseSession={(s) => setClosingSession(s)}
          onViewSession={(s) => setXReportSession(s)}
        />
        <OpenSessionModal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          onSubmit={(data) => openMut.mutate(data)}
          loading={openMut.isPending}
          branches={branches}
        />
        <CloseSessionModal
          isOpen={!!closingSession}
          onClose={() => setClosingSession(null)}
          onSubmit={handleCloseSession}
          session={closingSession}
          loading={closeMut.isPending}
          blindClose={blindClose}
          varianceThreshold={varianceThreshold}
        />
        <XReportModal
          isOpen={!!xReportSession}
          onClose={() => setXReportSession(null)}
          session={xReportSession}
        />
      </>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Cashier Sessions</h1>
        <button onClick={() => setShowOpenModal(true)} style={S.addBtn}>
          + Open Session
        </button>
      </div>

      {/* Sessions Table */}
      <div style={S.card}>
        {isLoading ? (
          <div style={S.emptyState}>Loading sessions...</div>
        ) : allSessions.length > 0 ? (
          <table style={S.table}>
            <thead style={S.tableHead}>
              <tr style={S.tableRow}>
                <th style={S.tableHeaderCell}>Session</th>
                <th style={S.tableHeaderCell}>Cashier</th>
                <th style={S.tableHeaderCell}>Opened</th>
                <th style={S.tableHeaderCell}>Closed</th>
                <th style={S.tableHeaderCell}>Sales</th>
                <th style={S.tableHeaderCell}>Opening Cash</th>
                <th style={S.tableHeaderCell}>Expected</th>
                <th style={S.tableHeaderCell}>Actual</th>
                <th style={S.tableHeaderCell}>Variance</th>
                <th style={S.tableHeaderCell}>Status</th>
              </tr>
            </thead>
            <tbody style={S.tableBody}>
              {allSessions.map(session => {
                const statusPill = getStatusPill(session);
                const isOpen = session.status === 'open';
                const variance = session.variance;

                return (
                  <tr
                    key={session.id}
                    style={{ ...S.tableRow, cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...S.tableCell, ...S.sessionIdCell }}>CS-{String(session.id).padStart(3, '0')}</td>
                    <td style={{ ...S.tableCell, ...S.cashierCell }}>{session.cashier_username}</td>
                    <td style={S.tableCell}>{session.opened_at ? new Date(session.opened_at).toLocaleString() : '—'}</td>
                    <td style={S.tableCell}>{isOpen ? '—' : (session.closed_at ? new Date(session.closed_at).toLocaleString() : '—')}</td>
                    <td style={S.tableCell}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {session.sales_count || 0}
                      </div>
                      {(session.sales_total || 0) > 0 && (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {fmt(session.sales_total || 0, 'zwd')}
                        </div>
                      )}
                    </td>
                    <td style={S.tableCell}>{fmt(session.opening_float || 0, 'zwd')}</td>
                    <td style={S.tableCell}>{isOpen ? '—' : fmt(session.expected_cash || 0, 'zwd')}</td>
                    <td style={S.tableCell}>{isOpen ? '—' : fmt(session.closing_cash || 0, 'zwd')}</td>
                    <td style={S.tableCell}>
                      {isOpen ? (
                        '—'
                      ) : variance !== null ? (
                        <span style={variance < 0 ? S.varianceNegative : variance === 0 ? S.varianceZero : {}}>
                          {variance >= 0 ? '+' : ''}{fmt(variance, 'zwd')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={S.tableCell}>
                      <div style={S.pill(statusPill.type)}>
                        {statusPill.label}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {isOpen && (
                          <>
                            <button onClick={() => setDropSession(session)}
                              style={{ padding: '4px 8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                              Drop
                            </button>
                            <button onClick={() => setXReportSession(session)}
                              style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                              X-Rpt
                            </button>
                          </>
                        )}
                        <button onClick={() => setTimelineSession(session)}
                          style={{ padding: '4px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                          Timeline
                        </button>
                        {isOpen && (
                          <button onClick={() => setClosingSession(session)}
                            style={{ padding: '4px 10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ ...S.emptyState, padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>💳</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No sessions yet</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Open a cashier session to start processing sales</p>
          </div>
        )}
      </div>

      {/* AI Cashier Monitor */}
      <div style={{ marginTop: 16 }}>
        <AIInsightCard feature="retail_cashier_monitor" title="AI Cashier Analysis" />
      </div>

      <OpenSessionModal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} onSubmit={data => openMut.mutate(data)} loading={openMut.isPending} branches={branches} />
      <CloseSessionModal
        isOpen={!!closingSession}
        onClose={() => setClosingSession(null)}
        onSubmit={handleCloseSession}
        session={closingSession}
        loading={closeMut.isPending}
        blindClose={blindClose}
        varianceThreshold={varianceThreshold}
      />
      <CashDropModal
        isOpen={!!dropSession}
        onClose={() => setDropSession(null)}
        session={dropSession}
        onDone={() => {
          // Cash drop changes drawer balance — fan-out to POS + EOD.
          invalidateSessionCaches(qc);
          setDropSession(null);
        }}
      />
      <XReportModal
        isOpen={!!xReportSession}
        onClose={() => setXReportSession(null)}
        session={xReportSession}
      />
      <TimelineModal
        isOpen={!!timelineSession}
        onClose={() => setTimelineSession(null)}
        session={timelineSession}
      />
    </div>
  );
}
