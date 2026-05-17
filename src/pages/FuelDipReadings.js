/**
 * FuelDipReadings — manual stick-dip log + variance report.
 *
 * Operator dips each tank (typically at shift change), enters the
 * litres they measured, and we compute the variance against the
 * system's book stock. ±0.5% is "normal"; bigger gets flagged.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFuelDipReadings, createFuelDipReading,
  listFuelTanks, getDipVarianceReport,
} from '../api/retailApi';
function BackToForecourt({ onTabChange }) {
  return (
    <button onClick={() => onTabChange && onTabChange('Forecourt')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
      ← Back to Forecourt
    </button>
  );
}

const T = {
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
  green: '#1a6b3a', red: '#c0392b', redT: '#fde8e8',
  amber: '#c77700', amberT: '#fdeedd',
};

const blank = {
  tank: '', reading_type: 'close',
  dip_litres: '', book_litres: '',
  reading_at: new Date().toISOString().slice(0, 16),
  notes: '',
};

export default function FuelDipReadings({ onTabChange }) {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState('log'); // 'log' | 'variance'

  const { data: dips = [], isLoading } = useQuery({
    queryKey: ['fuel-dip-readings'], queryFn: () => listFuelDipReadings(),
  });
  const { data: tanks = [] } = useQuery({
    queryKey: ['fuel-tanks'], queryFn: () => listFuelTanks(),
  });
  const { data: variance } = useQuery({
    queryKey: ['fuel-dip-variance'], queryFn: getDipVarianceReport,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fuel-dip-readings'] });
    qc.invalidateQueries({ queryKey: ['fuel-dip-variance'] });
    qc.invalidateQueries({ queryKey: ['fuel-dashboard'] });
    qc.invalidateQueries({ queryKey: ['fuel-tanks'] });
  };

  const saveMut = useMutation({
    mutationFn: createFuelDipReading,
    onSuccess: () => { invalidate(); setShowNew(false); },
  });

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Dip readings</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('log')} style={view === 'log' ? btnTabActive : btnTab}>Log</button>
          <button onClick={() => setView('variance')} style={view === 'variance' ? btnTabActive : btnTab}>Variance report</button>
          <button onClick={() => setShowNew(true)} disabled={tanks.length === 0}
                  style={tanks.length ? btnPrimary : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}>
            + Record dip
          </button>
        </div>
      </div>

      {view === 'log' && (
        <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: T.surface }}>
              <tr>
                <th style={th}>When</th>
                <th style={th}>Tank</th>
                <th style={th}>Grade</th>
                <th style={th}>Type</th>
                <th style={th}>Dip L</th>
                <th style={th}>Book L</th>
                <th style={th}>Variance</th>
                <th style={th}>Variance %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: 18, color: T.muted }}>Loading…</td></tr>
              ) : dips.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 18, color: T.muted }}>No dips recorded yet.</td></tr>
              ) : dips.map(d => {
                const pct = Number(d.variance_pct || 0);
                const flagged = Math.abs(pct) > 0.5;
                return (
                  <tr key={d.id} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td style={td}>{new Date(d.reading_at).toLocaleString()}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{d.tank_label}</td>
                    <td style={td}>{d.fuel_grade_code}</td>
                    <td style={td}>{d.reading_type}</td>
                    <td style={td}>{Number(d.dip_litres).toLocaleString()}</td>
                    <td style={td}>{Number(d.book_litres).toLocaleString()}</td>
                    <td style={{ ...td, color: flagged ? T.red : T.inkSoft }}>
                      {pct > 0 ? '+' : ''}{Number(d.variance_litres).toLocaleString()} L
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: flagged ? T.red : T.green }}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(3)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'variance' && (
        <div>
          <p style={{ color: T.muted, fontSize: 13.5, margin: '0 0 12px 0' }}>
            Variance &gt; <strong>±{variance?.threshold_pct ?? 0.5}%</strong> is flagged for review.
            Typical sources: temperature, evaporation, meter calibration, theft.
          </p>
          <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: T.surface }}>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Tank</th>
                  <th style={th}>Grade</th>
                  <th style={th}>Type</th>
                  <th style={th}>Dip L</th>
                  <th style={th}>Book L</th>
                  <th style={th}>Variance %</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {(variance?.rows || []).length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 18, color: T.muted }}>No dip readings in the last 30 days.</td></tr>
                ) : variance.rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.line}`, background: r.flagged ? T.redT : 'transparent' }}>
                    <td style={td}>{r.date} {r.time}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.tank}</td>
                    <td style={td}>{r.fuel_grade}</td>
                    <td style={td}>{r.reading_type}</td>
                    <td style={td}>{Number(r.dip_litres).toLocaleString()}</td>
                    <td style={td}>{Number(r.book_litres).toLocaleString()}</td>
                    <td style={{ ...td, fontWeight: 700, color: r.flagged ? T.red : T.green }}>
                      {r.variance_pct > 0 ? '+' : ''}{Number(r.variance_pct).toFixed(3)}%
                    </td>
                    <td style={td}>{r.flagged ? <span style={pillRed}>FLAG</span> : <span style={pillGreen}>OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <NewDipModal
          tanks={tanks}
          onCancel={() => setShowNew(false)}
          onSave={(v) => saveMut.mutate(v)}
          saving={saveMut.isPending}
        />
      )}
    </div>
  );
}

function NewDipModal({ tanks, onCancel, onSave, saving }) {
  const [v, setV] = useState(blank);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const selectedTank = tanks.find(t => Number(t.id) === Number(v.tank));

  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>Record dip</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <div>
            <label style={lbl}>Tank</label>
            <select value={v.tank || ''} onChange={e => {
              const id = Number(e.target.value) || '';
              set('tank', id);
              const t = tanks.find(x => x.id === id);
              if (t) set('book_litres', t.current_volume_litres);
            }} style={inp}>
              <option value="">— Select —</option>
              {tanks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.fuel_grade_code} @ {t.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Reading type</label>
            <select value={v.reading_type} onChange={e => set('reading_type', e.target.value)} style={inp}>
              <option value="open">Opening</option>
              <option value="close">Closing</option>
              <option value="midshift">Mid-shift</option>
              <option value="post_delivery">Post-delivery</option>
            </select>
          </div>
          <Field label="Reading time" type="datetime-local" value={v.reading_at} onChange={x => set('reading_at', x)} />
          <Field label="Dip (litres)" type="number" value={v.dip_litres} onChange={x => set('dip_litres', x)} placeholder="Measured volume" />
          <Field label="Book (litres)" type="number" value={v.book_litres} onChange={x => set('book_litres', x)}
                 placeholder={selectedTank ? `Auto: ${Number(selectedTank.current_volume_litres).toLocaleString()}` : 'Auto'} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Notes</label>
          <textarea value={v.notes} onChange={e => set('notes', e.target.value)}
                    style={{ ...inp, minHeight: 70 }} placeholder="Weather, pump status, anything unusual." />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(v)} disabled={saving || !v.tank || !v.dip_litres} style={btnPrimary}>
            {saving ? 'Saving…' : 'Record'}
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
const btnTab = { padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: '#fff', border: `1px solid ${T.line}`, cursor: 'pointer' };
const btnTabActive = { ...btnTab, background: T.green, color: '#fff', borderColor: T.green };
const pillRed = { background: T.redT, color: T.red, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999 };
const pillGreen = { background: '#e8f5ee', color: T.green, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, .5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modalCard = { background: '#fff', borderRadius: 14, padding: 22, width: 620, maxWidth: '90%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)' };
