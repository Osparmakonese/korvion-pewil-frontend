/**
 * FuelGrades — manage the fuel grades sold (Diesel 50ppm, ULP93, etc.).
 *
 * Each grade has:
 *   - name (display)
 *   - code (price-board label + regulator default)
 *   - colour for the price board
 *   - is_blended flag
 *   - regulator_codes map (zera/epra/nmdpra/...)
 *
 * Adding a grade does NOT create the Product — that's a separate step
 * on the Products page. We surface a hint: "Don't forget to create a
 * Product with is_fuel=true linked to this grade so cashiers can ring
 * fuel sales."
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFuelGrades, createFuelGrade, updateFuelGrade, deleteFuelGrade,
} from '../api/retailApi';
// In-app navigation uses onTabChange (no react-router subroutes)
function BackToForecourt({ onTabChange }) {
  return (
    <button onClick={() => onTabChange && onTabChange('Forecourt')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              border: '1px solid #e5e7eb', background: '#fff', color: '#374151',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              marginBottom: 14,
            }}>
      ← Back to Forecourt
    </button>
  );
}
import { confirm } from '../utils/confirm';

const T = {
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
  green: '#1a6b3a', greenT: '#e8f5ee',
  red: '#c0392b', redT: '#fde8e8',
};

const REGULATOR_OPTIONS = [
  { value: 'zera', label: 'ZERA (Zimbabwe)' },
  { value: 'epra', label: 'EPRA (Kenya)' },
  { value: 'nmdpra', label: 'NMDPRA (Nigeria)' },
  { value: 'sars_fuel', label: 'SARS Fuel (South Africa)' },
  { value: 'ura_fuel', label: 'URA (Uganda)' },
];

const blank = {
  name: '', code: '', color_hex: '#1f3d26',
  octane_or_grade: '', is_blended: false,
  regulator_codes: {},
};

export default function FuelGrades({ onTabChange }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ['fuel-grades'],
    queryFn: listFuelGrades,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fuel-grades'] });
    qc.invalidateQueries({ queryKey: ['fuel-dashboard'] });
  };

  const saveMut = useMutation({
    mutationFn: (data) => data.id ? updateFuelGrade(data.id, data) : createFuelGrade(data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteFuelGrade(id),
    onSuccess: invalidate,
  });

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Fuel grades</h1>
        <button onClick={() => setEditing({ ...blank })} style={btnPrimary}>+ Add grade</button>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: T.surface }}>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Code</th>
              <th style={th}>Spec</th>
              <th style={th}>Blended?</th>
              <th style={th}>Colour</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 18, color: T.muted }}>Loading…</td></tr>
            ) : grades.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 18, color: T.muted }}>No fuel grades yet. Add one to start.</td></tr>
            ) : grades.map(g => (
              <tr key={g.id} style={{ borderTop: `1px solid ${T.line}` }}>
                <td style={td}>{g.name}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{g.code}</td>
                <td style={{ ...td, color: T.muted, fontSize: 13 }}>{g.octane_or_grade || '—'}</td>
                <td style={td}>{g.is_blended ? 'Yes' : 'No'}</td>
                <td style={td}>
                  <span style={{
                    display: 'inline-block', width: 24, height: 14, borderRadius: 4,
                    background: g.color_hex, border: `1px solid ${T.line}`,
                  }} />
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => setEditing({ ...g })} style={btnGhost}>Edit</button>
                  <button
                    onClick={async () => {
                      if (await confirm(`Delete grade "${g.name}"?`)) delMut.mutate(g.id);
                    }}
                    style={{ ...btnGhost, color: T.red, marginLeft: 8 }}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, color: T.muted, fontSize: 13.5, lineHeight: 1.5 }}>
        After adding a grade, create a <strong>Product</strong> with <em>Is fuel = yes</em> and the
        matching grade selected. The product's price is what the till charges; the grade is
        what the tank inventory deducts from.
      </p>

      {editing && (
        <GradeModal
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(v) => saveMut.mutate(v)}
          saving={saveMut.isPending}
        />
      )}
    </div>
  );
}

function GradeModal({ value, onCancel, onSave, saving }) {
  const [v, setV] = useState(value);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const setReg = (rk, val) => setV(p => ({
    ...p, regulator_codes: { ...(p.regulator_codes || {}), [rk]: val },
  }));

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>
          {v.id ? `Edit ${v.name}` : 'Add fuel grade'}
        </h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <Field label="Name" value={v.name} onChange={x => set('name', x)} placeholder="Petrol Unleaded 93" />
          <Field label="Code" value={v.code} onChange={x => set('code', x.toUpperCase())} placeholder="PUL93" />
          <Field label="Spec" value={v.octane_or_grade} onChange={x => set('octane_or_grade', x)} placeholder="93 RON" />
          <div>
            <label style={lbl}>Colour</label>
            <input type="color" value={v.color_hex || '#1f3d26'}
                   onChange={e => set('color_hex', e.target.value)}
                   style={{ width: '100%', height: 38, border: `1px solid ${T.line}`, borderRadius: 8 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={!!v.is_blended} onChange={e => set('is_blended', e.target.checked)} />
            <span style={{ fontSize: 14, color: T.inkSoft }}>Is blended (e.g. E10, E20)</span>
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, color: T.ink, marginBottom: 8 }}>Regulator codes (optional)</div>
          <p style={{ color: T.muted, fontSize: 12.5, marginTop: 0 }}>
            Use the codes from your regulator's monthly return template. Leave blank to default to this grade's code.
          </p>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            {REGULATOR_OPTIONS.map(opt => (
              <Field key={opt.value} label={opt.label}
                     value={v.regulator_codes?.[opt.value] || ''}
                     onChange={x => setReg(opt.value, x)}
                     placeholder="Optional" />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(v)} disabled={saving || !v.name || !v.code} style={btnPrimary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
             placeholder={placeholder} style={inp} />
    </div>
  );
}

const th = { padding: 12, textAlign: 'left', fontSize: 12.5, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' };
const td = { padding: 12, fontSize: 14, color: T.inkSoft };
const lbl = { display: 'block', fontSize: 12.5, color: T.muted, marginBottom: 4, fontWeight: 600 };
const inp = { width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 14, color: T.ink };
const btnPrimary = { padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: '#fff', background: T.green, border: 'none', cursor: 'pointer' };
const btnGhost = { padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: 'transparent', border: `1px solid ${T.line}`, cursor: 'pointer' };
const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, .5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};
const modalCard = {
  background: '#fff', borderRadius: 14, padding: 22, width: 620, maxWidth: '90%',
  boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)',
};
