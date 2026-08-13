import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, getFields, getAttendance, createAttendance, markPaid } from '../api/farmApi';
import { fmt, qty, today, initials, avatarColor, IMAGES } from '../utils/format';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const empty = { worker: '', field: '', date: today(), hours: '', adjustment: '', adj_reason: '', notes: '' };

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', color: '#111827' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  preview: { background: '#e8f5ee', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#1a6b3a', marginTop: 10 },
  adjBox: { background: '#fef3e2', borderRadius: 8, padding: 12, marginTop: 10 },
  adjLabel: { fontSize: 10, fontWeight: 700, color: '#c97d1a', marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  logItem: {
    background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10,
    padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
  },
  avatar: (bg) => ({
    width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 700, flexShrink: 0,
  }),
  info: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#1d4ed8', marginBottom: 14 },
};

export default function Hours() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: getWorkers });
  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => getAttendance() });

  const mut = useMutation({
    mutationFn: createAttendance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['workers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setForm(empty); },
  });
  const paidMut = useMutation({
    mutationFn: markPaid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['workers'] }); },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedWorker = useMemo(() => workers.find(w => String(w.id) === String(form.worker)), [workers, form.worker]);

  const hours = parseFloat(form.hours) || 0;
  const adjustment = parseFloat(form.adjustment) || 0;
  const hourlyRate = selectedWorker?.hourly_rate || 0;
  const basePay = hours * hourlyRate;
  const totalPay = basePay + adjustment;

  const isPermanent = selectedWorker?.pay_type === 'monthly';
  const isPartTimeDaily = selectedWorker?.pay_type === 'daily';
  const isPartTimeHourly = selectedWorker?.pay_type === 'hourly';

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      worker: parseInt(form.worker),
      field: parseInt(form.field),
      work_date: form.date,
      hours_worked: hours,
      pay: totalPay,
      original_pay: basePay,
      adjusted: adjustment !== 0,
      adjust_reason: form.adj_reason || '',
      notes: form.notes || '',
    };
    mut.mutate(payload);
  };

  return (
    <>
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.hours} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.75), rgba(0,0,0,0.25))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Hours &amp; Pay</div>
          <div style={S.bannerSub}>Log hours worked on each field - costs auto-calculated</div>
        </div>
      </div>

      <div style={S.info}>
        Log hours each worker spent on a field. For permanent workers, the cost is auto-calculated from their salary. Part-time workers use their hourly/daily rate. A worker can split their day across multiple fields.
      </div>

      <div className="two-col-layout" style={S.twoCol}>
        {/* Left: Form */}
        <div>
          <form style={S.card} onSubmit={submit}>
            <div className="form-grid-2" style={S.row2}>
              <div><label style={S.label}>Worker</label>
                <select style={S.input} value={form.worker} onChange={e => set('worker', e.target.value)} required>
                  <option value="">Select...</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.pay_type === 'monthly' ? 'Permanent' : 'Part-time'})
                    </option>
                  ))}
                </select>
              </div>
              <div><label style={S.label}>Field</label>
                <select style={S.input} value={form.field} onChange={e => set('field', e.target.value)} required>
                  <option value="">Select...</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid-2" style={S.row2}>
              <div><label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
              <div><label style={S.label}>Hours Worked</label>
                <input style={S.input} type="number" min="0.5" max="24" step="0.5" value={form.hours} onChange={e => set('hours', e.target.value)} required placeholder="e.g. 5" />
              </div>
            </div>

            {selectedWorker && hours > 0 && (
              <div style={S.preview}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Cost Preview</div>
                <div>
                  {hours} hrs x {fmt(hourlyRate)}/hr
                  {isPermanent && <span style={{ fontSize: 10, color: '#6b7280' }}> (from {fmt(selectedWorker.rate)}/mo salary)</span>}
                  {' = '}<strong>{fmt(basePay)}</strong>
                </div>
                {adjustment !== 0 && (
                  <div style={{ marginTop: 2 }}>
                    Adjustment: {adjustment > 0 ? '+' : ''}{fmt(adjustment)}
                    {' = '}<strong>{fmt(totalPay)}</strong>
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                  This will be added as labour cost to {fields.find(f => String(f.id) === String(form.field))?.name || 'the selected field'}
                </div>
              </div>
            )}

            <div style={S.adjBox}>
              <div style={S.adjLabel}>Adjustment (optional)</div>
              <div className="form-grid-2" style={S.row2}>
                <input style={S.input} type="number" step="0.01" value={form.adjustment} onChange={e => set('adjustment', e.target.value)} placeholder="+/- amount" />
                <input style={S.input} value={form.adj_reason} onChange={e => set('adj_reason', e.target.value)} placeholder="Reason" />
              </div>
            </div>

            <label style={S.label}>Task Notes</label>
            <input style={S.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What did they work on?" />
            <button style={S.btn} type="submit" disabled={mut.isPending}>{mut.isPending ? 'Saving...' : 'Save Entry'}</button>
            {mut.isError && <p style={{ color: '#c0392b', fontSize: 10, marginTop: 4 }}>{mut.error?.response?.data?.detail || 'Failed'}</p>}
          </form>
        </div>

        {/* Right: Attendance log */}
        <div>
          <div style={S.sectionTitle}>Attendance Log</div>
          {(Array.isArray(attendance) ? attendance : []).length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No entries yet.</p>}
          {(Array.isArray(attendance) ? attendance : []).map(a => {
            const ac = avatarColor(a.worker_name || '');
            return (
              <div key={a.id} style={S.logItem}>
                <div style={S.avatar(ac.bg)}>{initials(a.worker_name || '')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{a.worker_name || `Worker #${a.worker}`}</span>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600, background: a.pay_type === 'monthly' ? '#dcfce7' : '#fef3c7', color: a.pay_type === 'monthly' ? '#166534' : '#92400e' }}>
                      {a.pay_type === 'monthly' ? 'PERM' : 'P/T'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                    {a.work_date} &middot; {a.field_name || ''} &middot; {qty(a.hours_worked || 0)}hrs
                    {a.notes ? ` \u00B7 ${a.notes}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1a6b3a' }}>{fmt(a.pay)}</div>
                  <button
                    style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 4, border: 'none', fontWeight: 600, cursor: a.paid ? 'default' : 'pointer',
                      background: a.paid ? '#dcfce7' : '#fef3c7', color: a.paid ? '#166534' : '#92400e',
                    }}
                    onClick={() => { if (!a.paid) paidMut.mutate(a.id); }}
                    disabled={a.paid || paidMut.isPending}
                  >
                    {a.paid ? 'Paid' : 'Mark paid'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

