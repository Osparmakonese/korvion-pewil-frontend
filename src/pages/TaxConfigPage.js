/**
 * TaxConfigPage.js — owner/manager edit page for Zimbabwe PAYE bands and
 * NSSA rates. Backs onto GET/PATCH /retail/tax-config/current/.
 *
 * PAYE bands are a JSON list of {threshold, rate, deduct}. The editor lets
 * the owner add/remove rows and update rates as ZIMRA publishes new tables.
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTaxConfig, updateTaxConfig } from '../api/retailApi';
import usePrimaryAction from '../hooks/usePrimaryAction';

const MANAGER_ROLES = new Set(['owner', 'manager']);

const s = {
  page: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: '0 0 6px 0' },
  sub: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  h: { fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #e5e7eb' },
  input: { width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' },
  btnPrimary: { padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '6px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnRed: { padding: '6px 10px', background: '#fff', color: '#c0392b', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  flash: (ok) => ({
    marginTop: 12, padding: 10, borderRadius: 6, fontSize: 12,
    background: ok ? '#ecfdf5' : '#fef2f2',
    color: ok ? '#065f46' : '#991b1b',
    border: `1px solid ${ok ? '#a7f3d0' : '#fecaca'}`,
  }),
};

function BandEditor({ title, bands, onChange, disabled }) {
  const add = () => onChange([...bands, { threshold: 0, rate: 0, deduct: 0 }]);
  const update = (i, k, v) => {
    const next = bands.map((b, idx) => (idx === i ? { ...b, [k]: Number(v) } : b));
    onChange(next);
  };
  const remove = (i) => onChange(bands.filter((_, idx) => idx !== i));
  return (
    <div style={s.card}>
      <h2 style={s.h}>
        <span>{title}</span>
        {!disabled && (
          <button style={s.btnGhost} onClick={add}>+ Add band</button>
        )}
      </h2>
      <div style={{ overflowX: 'auto' }}><table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Threshold (monthly)</th>
            <th style={s.th}>Rate (0–1)</th>
            <th style={s.th}>Deduct (flat)</th>
            {!disabled && <th style={s.th}></th>}
          </tr>
        </thead>
        <tbody>
          {bands.length === 0 && (
            <tr><td style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: 20 }} colSpan={disabled ? 3 : 4}>
              No bands defined. {disabled ? '' : 'Add one above.'}
            </td></tr>
          )}
          {bands.map((b, i) => (
            <tr key={i}>
              <td style={s.td}>
                <input type="number" step="0.01" value={b.threshold}
                  disabled={disabled}
                  onChange={(e) => update(i, 'threshold', e.target.value)} style={s.input} />
              </td>
              <td style={s.td}>
                <input type="number" step="0.001" min="0" max="1" value={b.rate}
                  disabled={disabled}
                  onChange={(e) => update(i, 'rate', e.target.value)} style={s.input} />
              </td>
              <td style={s.td}>
                <input type="number" step="0.01" value={b.deduct}
                  disabled={disabled}
                  onChange={(e) => update(i, 'deduct', e.target.value)} style={s.input} />
              </td>
              {!disabled && (
                <td style={s.td}>
                  <button style={s.btnRed} onClick={() => remove(i)}>Remove</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
        PAYE owed = <code>gross × rate − deduct</code> for the highest band whose threshold ≤ gross.
      </div>
    </div>
  );
}

export default function TaxConfigPage() {
  // Top-bar primary action — see hooks/usePrimaryAction.js.
  usePrimaryAction(() => mut.mutate(form));

  const { user } = useAuth();
  const canManage = MANAGER_ROLES.has(user?.role);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['retail-tax-config'], queryFn: getTaxConfig });

  const [form, setForm] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        usd_bands: data.usd_bands || [],
        zig_bands: data.zig_bands || [],
        nssa_employee_rate: data.nssa_employee_rate,
        nssa_employer_rate: data.nssa_employer_rate,
        nssa_ceiling_usd: data.nssa_ceiling_usd,
        notes: data.notes || '',
      });
    }
  }, [data, form]);

  const mut = useMutation({
    mutationFn: updateTaxConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-tax-config'] });
      setFlash({ ok: true, msg: 'Tax config saved. New runs will use these values.' });
      setTimeout(() => setFlash(null), 4000);
    },
    onError: (e) => setFlash({
      ok: false,
      msg: e?.response?.data?.detail || e?.message || 'Save failed.',
    }),
  });

  if (isLoading || !form) {
    return <div style={s.page}><div style={s.sub}>Loading tax configuration…</div></div>;
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Zimbabwe Tax Configuration</h1>
      <p style={s.sub}>
        Edit the PAYE bands and NSSA rates used by payroll. Changes take effect on the
        <em> next</em> "Generate from Hours" — existing runs keep their computed values.
        {!canManage && <strong style={{ color: '#c0392b' }}> &nbsp;Read-only (owner/manager role required).</strong>}
      </p>

      <BandEditor title="PAYE bands — USD"
        bands={form.usd_bands}
        disabled={!canManage}
        onChange={(b) => setForm({ ...form, usd_bands: b })} />

      <BandEditor title="PAYE bands — ZiG"
        bands={form.zig_bands}
        disabled={!canManage}
        onChange={(b) => setForm({ ...form, zig_bands: b })} />

      <div style={s.card}>
        <h2 style={s.h}><span>NSSA rates & ceiling</span></h2>
        <div style={s.grid}>
          <div>
            <label style={s.label}>Employee rate</label>
            <input type="number" step="0.0001" min="0" max="1"
              disabled={!canManage}
              value={form.nssa_employee_rate}
              onChange={(e) => setForm({ ...form, nssa_employee_rate: Number(e.target.value) })}
              style={s.input} />
          </div>
          <div>
            <label style={s.label}>Employer rate</label>
            <input type="number" step="0.0001" min="0" max="1"
              disabled={!canManage}
              value={form.nssa_employer_rate}
              onChange={(e) => setForm({ ...form, nssa_employer_rate: Number(e.target.value) })}
              style={s.input} />
          </div>
          <div>
            <label style={s.label}>Ceiling (USD / month)</label>
            <input type="number" step="0.01"
              disabled={!canManage}
              value={form.nssa_ceiling_usd}
              onChange={(e) => setForm({ ...form, nssa_ceiling_usd: Number(e.target.value) })}
              style={s.input} />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <label style={s.label}>Notes</label>
        <textarea rows={3} disabled={!canManage}
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          style={{ ...s.input, resize: 'vertical' }} />
      </div>

      {canManage && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnPrimary} disabled={mut.isPending}
            onClick={() => mut.mutate(form)}>
            {mut.isPending ? 'Saving…' : 'Save tax configuration'}
          </button>
        </div>
      )}

      {flash && <div style={s.flash(flash.ok)}>{flash.msg}</div>}
    </div>
  );
}
