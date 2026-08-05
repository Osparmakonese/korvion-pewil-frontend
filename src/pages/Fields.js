import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFields, createField, closeField, deleteField, getFieldsPnL } from '../api/farmApi';
import { fmt, qty, today, cropEmoji, cropGradient, cropImage, IMAGES } from '../utils/format';
import FieldModal from '../components/FieldModal';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const CROPS = ['Tomatoes', 'Maize', 'Tobacco', 'Vegetables', 'Other'];

const empty = { name: '', crop: 'tomatoes', size_ha: '', plant_date: today(), notes: '' };

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '310px 1fr', gap: 20 },
  formCard: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '20px', position: 'sticky', top: 80,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  formTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
    color: '#111827', marginBottom: 16,
  },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, marginTop: 10 },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, outline: 'none', resize: 'vertical',
    minHeight: 60, color: '#111827',
  },
  btn: {
    width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', marginTop: 14, transition: 'background 0.15s',
  },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14,
    fontFamily: "'Playfair Display', serif",
  },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  fcard: {
    background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
    overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s',
  },
  fcardImg: (crop) => ({
    height: 120, background: cropGradient(crop), position: 'relative',
    display: 'flex', alignItems: 'flex-end', padding: '0 14px 10px',
  }),
  fcardOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)',
  },
  fcardLabel: {
    position: 'relative', zIndex: 2, color: '#fff', fontSize: 14, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 5,
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  fcardBadge: { position: 'absolute', top: 8, right: 8, zIndex: 2 },
  fcardBody: { padding: '12px 14px' },
  fcardName: { fontWeight: 700, fontSize: 14, color: '#111827' },
  fcardMeta: { fontSize: 10, color: '#9ca3af', marginBottom: 8 },
  fcardStats: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
    borderTop: '1px solid #e5e7eb', paddingTop: 8, marginBottom: 8,
  },
  fcardStat: { textAlign: 'center' },
  fcardStatVal: (c) => ({ fontSize: 12, fontWeight: 700, color: c }),
  fcardStatLabel: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase' },
  closeBtn: {
    width: '100%', padding: '7px', background: 'none', border: '1px solid #c0392b',
    borderRadius: 6, color: '#c0392b', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  closedBox: {
    background: '#f3f4f6', borderRadius: 6, padding: '8px 12px',
    fontSize: 10, color: '#6b7280', textAlign: 'center',
  },
};

export default function Fields() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [formErrors, setFormErrors] = useState({});
  const [selectedField, setSelectedField] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [closeConfirm, setCloseConfirm] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const { data: fields = [], isLoading } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: pnlData } = useQuery({ queryKey: ['fields-pnl'], queryFn: getFieldsPnL });
  const pnlMap = React.useMemo(() => {
    const m = {};
    (pnlData?.fields || []).forEach(p => { m[p.field_id] = p; });
    return m;
  }, [pnlData]);
  const [showPnlTable, setShowPnlTable] = useState(false);

  const addMut = useMutation({
    mutationFn: createField,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fields'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setForm(empty); setFormErrors({}); },
    onError: (err) => { setFormErrors(err.response?.data || {}); },
  });

  const closeMut = useMutation({
    mutationFn: closeField,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fields'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteField(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fields'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); },
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.size_ha || parseFloat(form.size_ha) <= 0) errs.size_ha = 'Must be > 0';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setPending({...form});
    setConfirmOpen(true);
    return;
    addMut.mutate({ ...form, size_ha: parseFloat(form.size_ha) });
  };

  return (
    <>
      <div className="two-col-reverse" style={S.twoCol}>
        {/* Left: Form */}
        <div>
          <div style={S.formCard}>
            <div style={S.formTitle}>Open New Field</div>
            <form onSubmit={submit}>
              <label style={S.label}>Field Name</label>
              <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Block A" />
              {formErrors.name && <div style={S.error}>{formErrors.name}</div>}

              <label style={S.label}>Crop</label>
              <select style={S.input} value={form.crop} onChange={e => set('crop', e.target.value)}>
                <option value='tomatoes'>Tomatoes</option><option value='maize'>Maize</option><option value='tobacco'>Tobacco</option><option value='vegetables'>Vegetables</option><option value='other'>Other</option>
              </select>

              <label style={S.label}>Size (hectares)</label>
              <input style={S.input} type="number" step="0.01" min="0" value={form.size_ha} onChange={e => set('size_ha', e.target.value)} placeholder="2.5" />
              {formErrors.size_ha && <div style={S.error}>{formErrors.size_ha}</div>}

              <label style={S.label}>Planting Date</label>
              <input style={S.input} type="date" value={form.plant_date} onChange={e => set('plant_date', e.target.value)} />

              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />

              <button style={S.btn} type="submit" disabled={addMut.isPending}
                onMouseEnter={e => { e.currentTarget.style.background = '#2d9e58'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a6b3a'; }}
              >
                {addMut.isPending ? 'Saving...' : '+ Open Field'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Field list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...S.sectionTitle, marginBottom: 0 }}>All Fields ({fields.length})</div>
            <button
              onClick={() => setShowPnlTable(v => !v)}
              style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: showPnlTable ? '#1a6b3a' : '#fff',
                color: showPnlTable ? '#fff' : '#1a6b3a',
                border: '1px solid #1a6b3a', borderRadius: 6,
              }}
            >{showPnlTable ? '‹ Back to Cards' : '📊 P&L Comparison'}</button>
          </div>

          {showPnlTable && pnlData && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>All Fields P&L Comparison</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Field</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Crop</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Revenue</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Expenses</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Profit</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(pnlData.fields || [])].sort((a, b) => b.profit - a.profit).map(p => (
                      <tr key={p.field_id} style={{ cursor: 'pointer' }} onClick={() => {
                        const f = fields.find(x => x.id === p.field_id);
                        if (f) setSelectedField(f);
                      }}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{cropEmoji(p.crop)} {p.field_name}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{p.crop}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{p.size_ha} ha</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#1a6b3a', fontWeight: 600 }}>{fmt(p.revenue)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#c0392b' }}>{fmt(p.expenses)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 700, color: p.profit >= 0 ? '#1a6b3a' : '#c0392b' }}>{fmt(p.profit)}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: p.margin >= 0 ? '#1a6b3a' : '#c0392b' }}>{p.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                      <td style={{ padding: '10px', borderTop: '2px solid #1a6b3a' }} colSpan={3}>TOTAL</td>
                      <td style={{ padding: '10px', borderTop: '2px solid #1a6b3a', textAlign: 'right', color: '#1a6b3a' }}>{fmt(pnlData.totals?.revenue || 0)}</td>
                      <td style={{ padding: '10px', borderTop: '2px solid #1a6b3a', textAlign: 'right', color: '#c0392b' }}>{fmt(pnlData.totals?.expenses || 0)}</td>
                      <td style={{ padding: '10px', borderTop: '2px solid #1a6b3a', textAlign: 'right', color: (pnlData.totals?.profit || 0) >= 0 ? '#1a6b3a' : '#c0392b' }}>{fmt(pnlData.totals?.profit || 0)}</td>
                      <td style={{ padding: '10px', borderTop: '2px solid #1a6b3a' }}></td>
                    </tr>
                  </tbody>
                </table></div>
              </div>
              {(!pnlData.fields || pnlData.fields.length === 0) && (
                <div style={{ padding: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No fields to compare yet.</div>
              )}
            </div>
          )}

          {isLoading && <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</p>}
          <div style={S.fieldGrid}>
            {fields.map(f => {
              const p = pnlMap[f.id];
              const fRev = p ? p.revenue : (f.total_revenue || 0);
              const fCost = p ? p.expenses : ((f.total_costs || 0) + (f.total_labour || 0));
              const fNet = p ? p.profit : (fRev - fCost);
              return (
                <div key={f.id} className="fcard" style={S.fcard}>
                  <div className="fcard-img" style={{ position: 'relative', height: 120, overflow: 'hidden' }} onClick={() => setSelectedField(f)}>
                    <img src={cropImage(f.crop)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                    <div style={S.fcardOverlay} />
                    <span style={{ ...S.fcardLabel, position: 'absolute', bottom: 10, left: 14 }}>{cropEmoji(f.crop)} {f.name}</span>
                    <span className={`pill-${f.status === 'active' ? 'green' : f.status === 'closed' ? 'red' : 'amber'}`} style={S.fcardBadge}>{f.status}</span>
                  </div>
                  <div style={S.fcardBody} onClick={() => setSelectedField(f)}>
                    <div style={S.fcardName}>{f.name}</div>
                    <div style={S.fcardMeta}>{qty(f.size_ha || f.hectares)} ha - Planted {f.plant_date || '””'}</div>
                    <div style={S.fcardStats}>
                      <div style={S.fcardStat}><div style={S.fcardStatVal('#1a6b3a')}>{fmt(fRev)}</div><div style={S.fcardStatLabel}>Revenue</div></div>
                      <div style={S.fcardStat}><div style={S.fcardStatVal('#c0392b')}>{fmt(fCost)}</div><div style={S.fcardStatLabel}>Costs</div></div>
                      <div style={S.fcardStat}><div style={S.fcardStatVal(fNet >= 0 ? '#1a6b3a' : '#c0392b')}>{fmt(fNet)}</div><div style={S.fcardStatLabel}>Net</div></div>
                    </div>
                  </div>
                  {f.status === 'active' && (
                    <div style={{ padding: '0 14px 12px' }}>
                      <button style={S.closeBtn}
                        onClick={() => setCloseConfirm(f.id)}
                        disabled={closeMut.isPending}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fdecea'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >Close Field</button>
                    </div>
                  )}
                  {f.status === 'closed' && (
                    <div style={{ padding: '0 14px 12px' }}><div style={S.closedBox}>Closed {f.closed_date || ''}</div></div>
                  )}
                  <div style={{ padding: '0 14px 12px' }}>
                    {delConfirm === f.id ? (
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#c0392b' }}>Delete this field?</span>
                        <button onClick={() => delMut.mutate(f.id)} style={{ fontSize:11, padding:'3px 10px', background:'#c0392b', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>Yes</button>
                        <button onClick={() => setDelConfirm(null)} style={{ fontSize:11, padding:'3px 10px', background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:4, cursor:'pointer' }}>No</button>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setDelConfirm(f.id); }} style={{ fontSize:11, padding:'3px 10px', background:'#fff', color:'#c0392b', border:'1px solid #fca5a5', borderRadius:4, cursor:'pointer' }}>Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!isLoading && fields.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No fields created yet.</p>}
        </div>
      </div>
      <FieldModal field={selectedField} isOpen={!!selectedField} onClose={() => setSelectedField(null)} />
      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          addMut.mutate({ ...pending, size_ha: parseFloat(pending.size_ha) });
        }}
        fields={pending ? [
          { label: 'Field Name', value: pending.name },
          { label: 'Crop', value: pending.crop.charAt(0).toUpperCase() + pending.crop.slice(1) },
          { label: 'Size (ha)', value: pending.size_ha },
          { label: 'Planting Date', value: pending.plant_date },
        ] : []}
      />
      <ConfirmModal
        isOpen={!!closeConfirm}
        onCancel={() => setCloseConfirm(null)}
        onConfirm={() => { closeMut.mutate(closeConfirm); setCloseConfirm(null); }}
        fields={[{ label: 'Action', value: 'Close this field permanently' }]}
      />
    </>
  );
}
