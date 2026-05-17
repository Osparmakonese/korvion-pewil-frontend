/**
 * FuelTanks — CRUD for physical fuel storage tanks at each branch.
 *
 * Each tank has: branch FK, fuel grade FK, label, capacity (litres),
 * dead-stock (litres), current volume (litres), pump count.
 *
 * Setting current_volume manually is OK at onboarding (operator dips
 * the tank and types the litres). After that, deliveries and sales
 * keep the number live.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFuelTanks, createFuelTank, updateFuelTank, deleteFuelTank,
  listFuelGrades, listBranches,
} from '../api/retailApi';
function BackToForecourt({ onTabChange }) {
  return (
    <button onClick={() => onTabChange && onTabChange('Forecourt')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
      ← Back to Forecourt
    </button>
  );
}
import { confirm } from '../utils/confirm';

const T = {
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
  green: '#1a6b3a', red: '#c0392b',
};

const blank = {
  branch: '', fuel_grade: '', label: '',
  capacity_litres: '', dead_stock_litres: 0,
  current_volume_litres: 0, pump_count: 1,
};

export default function FuelTanks({ onTabChange }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: tanks = [], isLoading } = useQuery({
    queryKey: ['fuel-tanks'], queryFn: () => listFuelTanks(),
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['fuel-grades'], queryFn: listFuelGrades,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['retail-branches'], queryFn: listBranches,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fuel-tanks'] });
    qc.invalidateQueries({ queryKey: ['fuel-dashboard'] });
  };

  const saveMut = useMutation({
    mutationFn: (data) => data.id ? updateFuelTank(data.id, data) : createFuelTank(data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteFuelTank(id),
    onSuccess: invalidate,
  });

  const canCreate = grades.length > 0 && branches.length > 0;

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Fuel tanks</h1>
        <button
          onClick={() => setEditing({ ...blank })}
          disabled={!canCreate}
          title={!canCreate ? 'Add at least one fuel grade and one branch first.' : ''}
          style={canCreate ? btnPrimary : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}
        >+ Add tank</button>
      </div>

      {!canCreate && (
        <div style={{
          background: '#fff', border: `1px solid ${T.line}`, borderRadius: 12,
          padding: 14, marginBottom: 16, color: T.muted, fontSize: 13.5,
        }}>
          {grades.length === 0 && <>Add at least one <button onClick={() => onTabChange && onTabChange('Fuel Grades')} style={{ background: 'transparent', border: 0, color: T.green, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>fuel grade</button> before creating tanks. </>}
          {branches.length === 0 && <>Add at least one branch before creating tanks.</>}
        </div>
      )}

      <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: T.surface }}>
            <tr>
              <th style={th}>Branch</th>
              <th style={th}>Label</th>
              <th style={th}>Grade</th>
              <th style={th}>Capacity</th>
              <th style={th}>Current</th>
              <th style={th}>Ullage</th>
              <th style={th}>Pumps</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 18, color: T.muted }}>Loading…</td></tr>
            ) : tanks.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 18, color: T.muted }}>No tanks yet.</td></tr>
            ) : tanks.map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${T.line}` }}>
                <td style={td}>{t.branch_name}</td>
                <td style={{ ...td, fontWeight: 600 }}>{t.label}</td>
                <td style={td}>{t.fuel_grade_code}</td>
                <td style={td}>{Number(t.capacity_litres).toLocaleString()} L</td>
                <td style={td}>{Number(t.current_volume_litres).toLocaleString()} L</td>
                <td style={td}>{Number(t.ullage_litres).toLocaleString()} L</td>
                <td style={td}>{t.pump_count}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => setEditing({ ...t })} style={btnGhost}>Edit</button>
                  <button
                    onClick={async () => {
                      if (await confirm(`Delete tank "${t.label}"?`)) delMut.mutate(t.id);
                    }}
                    style={{ ...btnGhost, color: T.red, marginLeft: 8 }}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <TankModal
          value={editing}
          grades={grades}
          branches={branches}
          onCancel={() => setEditing(null)}
          onSave={(v) => saveMut.mutate(v)}
          saving={saveMut.isPending}
        />
      )}
    </div>
  );
}

function TankModal({ value, grades, branches, onCancel, onSave, saving }) {
  const [v, setV] = useState(value);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>
          {v.id ? `Edit ${v.label}` : 'Add tank'}
        </h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <div>
            <label style={lbl}>Branch</label>
            <select value={v.branch || ''} onChange={e => set('branch', Number(e.target.value) || '')} style={inp}>
              <option value="">— Select —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Fuel grade</label>
            <select value={v.fuel_grade || ''} onChange={e => set('fuel_grade', Number(e.target.value) || '')} style={inp}>
              <option value="">— Select —</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
            </select>
          </div>
          <Field label="Label" value={v.label} onChange={x => set('label', x)} placeholder="Tank 1" />
          <Field label="Pump count" type="number" value={v.pump_count} onChange={x => set('pump_count', Number(x) || 1)} />
          <Field label="Capacity (litres)" type="number" value={v.capacity_litres} onChange={x => set('capacity_litres', x)} placeholder="20000" />
          <Field label="Dead stock (litres)" type="number" value={v.dead_stock_litres} onChange={x => set('dead_stock_litres', x)} />
          <Field label="Current volume (litres)" type="number" value={v.current_volume_litres} onChange={x => set('current_volume_litres', x)} />
        </div>
        <p style={{ marginTop: 14, color: T.muted, fontSize: 12.5 }}>
          Set <em>current volume</em> once at onboarding (dip the tank, type the litres). After that
          deliveries and sales keep it live.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(v)} disabled={saving || !v.branch || !v.fuel_grade || !v.label || !v.capacity_litres}
                  style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
    </div>
  );
}

const th = { padding: 12, textAlign: 'left', fontSize: 12.5, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' };
const td = { padding: 12, fontSize: 14, color: T.inkSoft };
const lbl = { display: 'block', fontSize: 12.5, color: T.muted, marginBottom: 4, fontWeight: 600 };
const inp = { width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 14, color: T.ink, background: '#fff' };
const btnPrimary = { padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: '#fff', background: T.green, border: 'none', cursor: 'pointer' };
const btnGhost = { padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: 'transparent', border: `1px solid ${T.line}`, cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, .5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modalCard = { background: '#fff', borderRadius: 14, padding: 22, width: 620, maxWidth: '90%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)' };
