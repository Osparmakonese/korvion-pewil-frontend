import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHarvests, createHarvest, deleteHarvest, getFields } from '../api/farmApi';
import { fmt, qty, today, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const QUALITY_GRADES = [
  ['', '-- Select Grade --'],
  ['A', 'A - Premium'],
  ['B', 'B - Standard'],
  ['C', 'C - Lower'],
  ['mixed', 'Mixed Grade'],
];

const emptyForm = { field: '', harvest_date: today(), quantity_kg: '', quality_grade: '', notes: '' };

const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    background: 'linear-gradient(135deg, #1a6b3a, #2d8659)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 310px', gap: 20 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  statsBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#1a6b3a', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#6b7280', marginBottom: 12 },
  harvestCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 8, padding: 12, marginBottom: 10 },
  harvestHeader: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 6 },
  harvestRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: '#374151' },
  harvestMeta: { fontSize: 10, color: '#9ca3af' },
  badge: (bg, color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: bg, color: color, marginBottom: 6 }),
  deleteBtn: { width: '100%', padding: '6px', background: 'none', border: '1px solid #c0392b', borderRadius: 8, color: '#c0392b', fontSize: 10, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  emptyState: { background: '#f3f4f6', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: 12 },
};

export default function Harvest({ onTabChange }) {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [delConfirm, setDelConfirm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const { data: harvests = [] } = useQuery({ queryKey: ['harvests'], queryFn: getHarvests });
  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });

  const addMut = useMutation({
    mutationFn: createHarvest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setForm(emptyForm);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteHarvest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDelConfirm(null);
    },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.field || !form.quantity_kg) return;
    setPending({
      'Field': fields.find(f => String(f.id) === String(form.field))?.name || '-',
      'Harvest Date': form.harvest_date,
      'Quantity': qty(form.quantity_kg) + ' kg',
      'Quality Grade': form.quality_grade || 'Not specified',
    });
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    addMut.mutate({
      field: parseInt(form.field),
      harvest_date: form.harvest_date,
      quantity_kg: parseFloat(form.quantity_kg),
      quality_grade: form.quality_grade || null,
      notes: form.notes,
    });
    setConfirmOpen(false);
  };

  // Calculate summary stats
  const totalKg = harvests.reduce((sum, h) => sum + (parseFloat(h.quantity_kg) || 0), 0);
  const harvestCount = harvests.length;
  const avgPerHarvest = harvestCount > 0 ? totalKg / harvestCount : 0;

  // Group harvests by field and calculate yield per field
  const yieldByField = {};
  harvests.forEach(h => {
    const fieldId = h.field;
    if (!yieldByField[fieldId]) {
      yieldByField[fieldId] = { total: 0, count: 0, field_name: h.field_name, crop: h.crop };
    }
    yieldByField[fieldId].total += parseFloat(h.quantity_kg) || 0;
    yieldByField[fieldId].count += 1;
  });

  // Get field sizes for yield per hectare calculation
  const fieldSizeMap = {};
  fields.forEach(f => {
    fieldSizeMap[f.id] = f.size_ha;
  });

  const yieldTableData = Object.entries(yieldByField).map(([fieldId, data]) => ({
    fieldId: parseInt(fieldId),
    fieldName: data.field_name,
    crop: data.crop,
    size_ha: fieldSizeMap[parseInt(fieldId)] || 0,
    total_kg: data.total,
    count: data.count,
  })).sort((a, b) => b.total_kg - a.total_kg);

  const confirmModalFields = pending ? Object.entries(pending).map(([label, value]) => ({ label, value })) : [];

  // Sort harvests by date descending
  const sortedHarvests = [...harvests].sort((a, b) => new Date(b.harvest_date) - new Date(a.harvest_date));

  return (
    <>
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.tea || IMAGES.fields} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Harvest & Yield</div>
          <div style={S.bannerSub}>Track harvest output per field</div>
        </div>
      </div>

      <div className="two-col-layout" style={S.twoCol}>
        {/* LEFT PANEL: Form */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>Log Harvest</div>
            <form onSubmit={submit}>
              <label style={S.label}>Field</label>
              <select style={S.input} value={form.field} onChange={e => set('field', e.target.value)} required>
                <option value="">-- Select Field --</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>)}
              </select>

              <label style={S.label}>Harvest Date</label>
              <input style={S.input} type="date" value={form.harvest_date} onChange={e => set('harvest_date', e.target.value)} />

              <label style={S.label}>Quantity (kg)</label>
              <input style={S.input} type="number" step="0.1" min="0" value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} placeholder="0.0" required />

              <label style={S.label}>Quality Grade</label>
              <select style={S.input} value={form.quality_grade} onChange={e => set('quality_grade', e.target.value)}>
                {QUALITY_GRADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />

              <button style={S.btn} type="submit">+ Log Harvest</button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Summary & History */}
        <div>
          <div style={S.statsBox}>
            <div style={S.statValue}>{qty(totalKg)}</div>
            <div style={S.statLabel}>Total Harvested (kg)</div>
            <div style={S.statValue} style={{ fontSize: 20 }}>{harvestCount}</div>
            <div style={S.statLabel}>Number of Harvests</div>
            <div style={S.statValue} style={{ fontSize: 20 }}>{qty(avgPerHarvest)}</div>
            <div style={S.statLabel}>Average per Harvest (kg)</div>
          </div>

          <div style={S.sectionTitle}>Recent Harvests</div>
          {sortedHarvests.length === 0 ? (
            <div style={S.emptyState}>No harvests yet. Log one using the form on the left.</div>
          ) : (
            sortedHarvests.map(h => {
              const gradeColor = h.quality_grade === 'A' ? '#dcfce7' : h.quality_grade === 'B' ? '#fef3e2' : h.quality_grade === 'C' ? '#fee2e2' : '#f3f4f6';
              const gradeTextColor = h.quality_grade === 'A' ? '#166534' : h.quality_grade === 'B' ? '#92400e' : h.quality_grade === 'C' ? '#991b1b' : '#6b7280';
              return (
                <div key={h.id} style={S.harvestCard}>
                  <div style={S.harvestHeader}>{h.field_name}</div>
                  <div style={S.harvestRow}>
                    <span style={S.harvestMeta}>{h.harvest_date}</span>
                    <span style={{ fontWeight: 700, color: '#1a6b3a' }}>{qty(h.quantity_kg)} kg</span>
                  </div>
                  {h.quality_grade && (
                    <div style={S.badge(gradeColor, gradeTextColor)}>
                      Grade {h.quality_grade}
                    </div>
                  )}
                  {h.notes && <div style={{ ...S.harvestMeta, marginTop: 6 }}>{h.notes}</div>}
                  <button style={S.deleteBtn} onClick={() => setDelConfirm(h)}>Delete</button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Yield per Field Table */}
      <div style={{ marginTop: 32 }}>
        <div style={S.sectionTitle}>Yield per Field</div>
        {yieldTableData.length === 0 ? (
          <div style={S.emptyState}>No harvest data yet. Log a harvest to see field yield statistics.</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e3e8e4', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}><table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Field Name</th>
                  <th style={S.th}>Crop</th>
                  <th style={S.th}>Size (ha)</th>
                  <th style={S.th}>Total Yield (kg)</th>
                  <th style={S.th}>Yield/ha</th>
                  <th style={S.th}># Harvests</th>
                </tr>
              </thead>
              <tbody>
                {yieldTableData.map((row, i) => {
                  const yieldPerHa = row.size_ha > 0 ? row.total_kg / row.size_ha : 0;
                  return (
                    <tr key={i}>
                      <td style={S.td}>{row.fieldName}</td>
                      <td style={S.td}>{row.crop}</td>
                      <td style={S.td}>{qty(row.size_ha)}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#1a6b3a' }}>{qty(row.total_kg)}</td>
                      <td style={S.td}>{qty(yieldPerHa)}</td>
                      <td style={S.td}>{row.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal isOpen={confirmOpen} onConfirm={confirmSubmit} onCancel={() => setConfirmOpen(false)} fields={confirmModalFields} />

      {/* Delete Confirm */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete Harvest?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>Are you sure you want to delete this harvest from <strong>{delConfirm.field_name}</strong> on {delConfirm.harvest_date}? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelConfirm(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button onClick={() => delMut.mutate(delConfirm.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
