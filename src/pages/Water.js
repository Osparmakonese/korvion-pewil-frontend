import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWaterLogs, createWaterLog, deleteWaterLog, getFields } from '../api/farmApi';
import { fmt, qty, today } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const WATER_TYPES = [
  { value: 'rainfall', label: 'Rainfall', emoji: '🌧' },
  { value: 'irrigation', label: 'Irrigation', emoji: '💧' },
  { value: 'borehole', label: 'Borehole', emoji: '🔧' },
  { value: 'dam', label: 'Dam', emoji: '🏞' },
];

const empty = { field: '', type: 'rainfall', amount: '', duration: '', cost: '', date: today(), notes: '' };

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  bannerContainer: { position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  banner: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)' },
  bannerContent: { position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif" },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  summaryBox: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  summaryCard: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 },
  summaryCardBlue: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 },
  summaryLabel: { fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 700, color: '#1a6b3a' },
  summaryValueBlue: { fontSize: 18, fontWeight: 700, color: '#0369a1' },
  summaryValueRed: { fontSize: 18, fontWeight: 700, color: '#c0392b' },
  logEntry: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 },
  logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logField: { fontSize: 12, fontWeight: 700, color: '#111827' },
  logType: { display: 'inline-block', fontSize: 20, marginRight: 8 },
  logMeta: { fontSize: 10, color: '#6b7280', marginBottom: 6 },
  logAmount: { fontSize: 13, fontWeight: 600, color: '#1a6b3a', marginBottom: 4 },
  deleteBtn: { fontSize: 10, padding: '2px 6px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' },
  deleteConfirm: { display: 'flex', gap: 4 },
  deleteYes: { fontSize: 10, padding: '2px 6px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' },
  deleteNo: { fontSize: 10, padding: '2px 6px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer' },
  icon: { display: 'inline-block', marginRight: 6 },
};

export default function Water({ onTabChange }) {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [delConfirm, setDelConfirm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: waterLogs = [], isLoading } = useQuery({ queryKey: ['waterLogs'], queryFn: getWaterLogs });

  const mut = useMutation({
    mutationFn: createWaterLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waterLogs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setForm(empty);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteWaterLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waterLogs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDelConfirm(null);
    },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.field || !form.type || !form.amount) return;
    const payload = {
      field: parseInt(form.field),
      type: form.type,
      amount: parseFloat(form.amount),
      duration: form.duration ? parseFloat(form.duration) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      date: form.date,
      notes: form.notes,
    };
    setPending(payload);
    setConfirmOpen(true);
  };

  const sorted = Array.isArray(waterLogs) ? [...waterLogs].sort((a, b) => new Date(b.date || b.water_date) - new Date(a.date || a.water_date)) : [];

  const typeEmoji = (t) => WATER_TYPES.find(x => x.value === t)?.emoji || '💧';
  const typeName = (t) => WATER_TYPES.find(x => x.value === t)?.label || t;
  const fieldName = (fid) => fields.find(f => f.id === fid || String(f.id) === String(fid))?.name || '-';

  // Summary calculations
  const totalWater = sorted.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
  const totalIrrigationCost = sorted.filter(w => w.type === 'irrigation').reduce((s, w) => s + (parseFloat(w.cost) || 0), 0);
  const rainfallCount = sorted.filter(w => w.type === 'rainfall').length;
  const irrigationCount = sorted.filter(w => w.type === 'irrigation').length;

  // Per-field summary
  const fieldSummaries = fields.map(f => {
    const fieldLogs = sorted.filter(w => w.field === f.id || String(w.field) === String(f.id));
    const rainfallL = fieldLogs.filter(w => w.type === 'rainfall').reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
    const irrigationL = fieldLogs.filter(w => w.type === 'irrigation').reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
    const totalL = rainfallL + irrigationL;
    const totalCost = fieldLogs.filter(w => w.type === 'irrigation').reduce((s, w) => s + (parseFloat(w.cost) || 0), 0);
    return {
      fieldId: f.id,
      fieldName: f.name,
      totalL,
      rainfallL,
      irrigationL,
      totalCost,
      eventCount: fieldLogs.length,
    };
  });

  return (
    <>
      <div style={S.twoCol}>
        <div>
          <div style={S.bannerContainer}>
            <div style={S.banner} />
            <div style={S.bannerContent}>
              <div style={S.bannerTitle}>Water &amp; Irrigation</div>
              <div style={S.bannerSub}>Track water usage and rainfall per field</div>
            </div>
          </div>
          <form style={S.card} onSubmit={submit}>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Field</label>
                <select style={S.input} value={form.field} onChange={e => set('field', e.target.value)} required>
                  <option value="">Select...</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Type</label>
                <select style={S.input} value={form.type} onChange={e => set('type', e.target.value)} required>
                  {WATER_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Amount (litres)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label style={S.label}>Duration (hours)</label>
                <input style={S.input} type="number" min="0" step="0.5" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Cost ($)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="optional" />
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
            </div>
            <label style={S.label}>Notes</label>
            <textarea style={{ ...S.input, minHeight: 60, fontFamily: 'Inter, sans-serif' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Add any notes..." />
            <button style={S.btn} type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Saving...' : '+ Log Water Event'}
            </button>
            {mut.isError && <p style={S.error}>{mut.error?.response?.data?.detail || 'Failed to save'}</p>}
          </form>
        </div>
        <div>
          <div style={S.sectionTitle}>Summary</div>
          <div style={S.summaryBox}>
            <div style={S.summaryCardBlue}>
              <div style={S.summaryLabel}>Total Water Used</div>
              <div style={S.summaryValueBlue}>{qty(totalWater)}<span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>L</span></div>
            </div>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Total Irrigation Cost</div>
              <div style={S.summaryValue}>{fmt(totalIrrigationCost)}</div>
            </div>
            <div style={S.summaryCardBlue}>
              <div style={S.summaryLabel}>Rainfall Events</div>
              <div style={S.summaryValueBlue}>{rainfallCount}</div>
            </div>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Irrigation Events</div>
              <div style={S.summaryValue}>{irrigationCount}</div>
            </div>
          </div>

          <div style={S.sectionTitle}>Water Log</div>
          {isLoading ? (
            <p style={{ fontSize: 11, color: '#9ca3af' }}>Loading...</p>
          ) : sorted.length === 0 ? (
            <p style={{ fontSize: 11, color: '#9ca3af' }}>No water events logged yet.</p>
          ) : (
            sorted.map((log, i) => (
              <div key={log.id || i} style={S.logEntry}>
                <div style={S.logHeader}>
                  <div>
                    <div style={S.logField}>
                      <span style={S.logType}>{typeEmoji(log.type)}</span>
                      {fieldName(log.field)}
                    </div>
                    <div style={S.logMeta}>{typeName(log.type)} • {log.date || log.water_date}</div>
                  </div>
                  {delConfirm === (log.id || i) ? (
                    <div style={S.deleteConfirm}>
                      <button onClick={() => delMut.mutate(log.id)} style={S.deleteYes}>Yes</button>
                      <button onClick={() => setDelConfirm(null)} style={S.deleteNo}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDelConfirm(log.id || i)} style={S.deleteBtn}>Delete</button>
                  )}
                </div>
                <div style={S.logAmount}>{qty(log.amount)} litres</div>
                {log.duration && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Duration: {qty(log.duration)} hours</div>}
                {log.cost && parseFloat(log.cost) > 0 && <div style={{ fontSize: 11, color: '#c97d1a', fontWeight: 600, marginBottom: 4 }}>Cost: {fmt(log.cost)}</div>}
                {log.notes && <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>"{log.notes}"</div>}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={S.sectionTitle}>Per-Field Summary</div>
        {fieldSummaries.length === 0 ? (
          <p style={{ fontSize: 11, color: '#9ca3af' }}>No fields available.</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}><table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Field</th>
                  <th style={S.th}>Total (L)</th>
                  <th style={S.th}>Rainfall (L)</th>
                  <th style={S.th}>Irrigation (L)</th>
                  <th style={S.th}>Total Cost</th>
                  <th style={S.th}>Events</th>
                </tr>
              </thead>
              <tbody>
                {fieldSummaries.map((fs, i) => (
                  <tr key={fs.fieldId || i}>
                    <td style={S.td}>{fs.fieldName}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{qty(fs.totalL)}</td>
                    <td style={S.td}>{qty(fs.rainfallL)}</td>
                    <td style={S.td}>{qty(fs.irrigationL)}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: fs.totalCost > 0 ? '#c0392b' : '#6b7280' }}>{fmt(fs.totalCost)}</td>
                    <td style={S.td}>{fs.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mut.mutate(pending);
        }}
        fields={
          pending
            ? [
                { label: 'Field', value: fieldName(pending.field) },
                { label: 'Type', value: typeName(pending.type) },
                { label: 'Amount', value: qty(pending.amount) + ' litres' },
                pending.duration ? { label: 'Duration', value: qty(pending.duration) + ' hours' } : null,
                pending.cost ? { label: 'Cost', value: fmt(pending.cost) } : null,
                { label: 'Date', value: pending.date },
                pending.notes ? { label: 'Notes', value: pending.notes } : null,
              ].filter(Boolean)
            : []
        }
      />
    </>
  );
}
