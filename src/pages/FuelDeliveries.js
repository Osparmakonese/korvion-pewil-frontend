/**
 * FuelDeliveries — record bulk fuel deliveries.
 *
 * Each delivery increments the linked tank's current_volume_litres by
 * net_litres on the backend (see FuelDeliverySerializer.create). Operator
 * just types the BoL figures.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFuelDeliveries, createFuelDelivery,
  listFuelTanks, getSuppliers,
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
  line: '#e5e7eb', surface: '#f9fafb', green: '#1a6b3a',
};

const blank = {
  tank: '', supplier: '', delivery_date: new Date().toISOString().slice(0, 10),
  gross_litres: '', net_litres: '', cost_per_litre: '', total_cost: '',
  reference: '', notes: '',
};

export default function FuelDeliveries({ onTabChange }) {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['fuel-deliveries'], queryFn: () => listFuelDeliveries(),
  });
  const { data: tanks = [] } = useQuery({
    queryKey: ['fuel-tanks'], queryFn: () => listFuelTanks(),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['retail-suppliers'], queryFn: getSuppliers,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fuel-deliveries'] });
    qc.invalidateQueries({ queryKey: ['fuel-deliveries-recent'] });
    qc.invalidateQueries({ queryKey: ['fuel-tanks'] });
    qc.invalidateQueries({ queryKey: ['fuel-dashboard'] });
  };

  const saveMut = useMutation({
    mutationFn: createFuelDelivery,
    onSuccess: () => { invalidate(); setShowNew(false); },
  });

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Fuel deliveries</h1>
        <button onClick={() => setShowNew(true)} disabled={tanks.length === 0}
                style={tanks.length ? btnPrimary : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}>
          + Record delivery
        </button>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: T.surface }}>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Reference</th>
              <th style={th}>Tank</th>
              <th style={th}>Grade</th>
              <th style={th}>Supplier</th>
              <th style={th}>Gross L</th>
              <th style={th}>Net L</th>
              <th style={th}>Cost</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 18, color: T.muted }}>Loading…</td></tr>
            ) : deliveries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 18, color: T.muted }}>No deliveries yet.</td></tr>
            ) : deliveries.map(d => (
              <tr key={d.id} style={{ borderTop: `1px solid ${T.line}` }}>
                <td style={td}>{d.delivery_date}</td>
                <td style={{ ...td, fontFamily: 'monospace' }}>{d.reference}</td>
                <td style={td}>{d.tank_label}</td>
                <td style={td}>{d.fuel_grade_code}</td>
                <td style={td}>{d.supplier_name || '—'}</td>
                <td style={td}>{Number(d.gross_litres).toLocaleString()}</td>
                <td style={td}>{Number(d.net_litres).toLocaleString()}</td>
                <td style={td}>{Number(d.cost_per_litre).toFixed(4)}</td>
                <td style={{ ...td, fontWeight: 700, color: T.green }}>{fmt(Number(d.total_cost || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewDeliveryModal
          tanks={tanks}
          suppliers={suppliers}
          onCancel={() => setShowNew(false)}
          onSave={(v) => saveMut.mutate(v)}
          saving={saveMut.isPending}
        />
      )}
    </div>
  );
}

function NewDeliveryModal({ tanks, suppliers, onCancel, onSave, saving }) {
  const [v, setV] = useState(blank);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  // Auto-compute total_cost when net + cost_per_litre change.
  const computedTotal = useMemo(() => {
    const n = Number(v.net_litres || 0);
    const c = Number(v.cost_per_litre || 0);
    if (n > 0 && c > 0) return (n * c).toFixed(2);
    return v.total_cost || '';
  }, [v.net_litres, v.cost_per_litre, v.total_cost]);

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>Record fuel delivery</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <div>
            <label style={lbl}>Tank</label>
            <select value={v.tank || ''} onChange={e => set('tank', Number(e.target.value) || '')} style={inp}>
              <option value="">— Select —</option>
              {tanks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.fuel_grade_code} @ {t.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Supplier (optional)</label>
            <select value={v.supplier || ''} onChange={e => set('supplier', Number(e.target.value) || '')} style={inp}>
              <option value="">— None —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Field label="Delivery date" type="date" value={v.delivery_date} onChange={x => set('delivery_date', x)} />
          <Field label="BoL / Reference" value={v.reference} onChange={x => set('reference', x)} placeholder="BOL-2026-0042" />
          <Field label="Gross litres" type="number" value={v.gross_litres} onChange={x => set('gross_litres', x)} placeholder="20000" />
          <Field label="Net litres (TCV)" type="number" value={v.net_litres} onChange={x => set('net_litres', x)} placeholder="19950" />
          <Field label="Cost / litre" type="number" value={v.cost_per_litre} onChange={x => set('cost_per_litre', x)} placeholder="0.8500" />
          <Field label="Total cost" type="number" value={v.total_cost || computedTotal} onChange={x => set('total_cost', x)} placeholder="auto" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Notes</label>
          <textarea value={v.notes} onChange={e => set('notes', e.target.value)}
                    style={{ ...inp, minHeight: 70 }} placeholder="Truck reg, driver name, anything to flag." />
        </div>
        <p style={{ marginTop: 8, color: T.muted, fontSize: 12.5 }}>
          On save, this adds <strong>{Number(v.net_litres || 0).toLocaleString()} L</strong> to the tank's book stock.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button
            onClick={() => onSave({ ...v, total_cost: v.total_cost || computedTotal })}
            disabled={saving || !v.tank || !v.reference || !v.net_litres || !v.cost_per_litre}
            style={btnPrimary}
          >{saving ? 'Saving…' : 'Record'}</button>
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
const modalCard = { background: '#fff', borderRadius: 14, padding: 22, width: 680, maxWidth: '90%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)' };
