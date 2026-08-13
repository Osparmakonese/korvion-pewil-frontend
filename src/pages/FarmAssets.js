import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFarmAssets, createFarmAsset, deleteFarmAsset } from '../api/farmApi';
import { fmt, today } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const LIFESPANS = [
  ['season', 'This season only', 'Seeds bought in bulk, short-use items'],
  ['short', '1-2 seasons', 'Small tools, sprayers, small pipes'],
  ['long', 'Many years', 'Tractor, irrigation system, large equipment'],
];
const LIFESPAN_YEARS = { season: 1, short: 2, long: 10 };

const empty = { name: '', cost: '', purchase_date: today(), lifespan: 'long', funded_by: '', notes: '' };

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 18, marginBottom: 14 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', color: '#111827' },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  assetCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: '#1d4ed8', marginBottom: 14 },
  depBox: { background: '#e8f5ee', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#166534', marginTop: 8 },
};

function calcDep(cost, lifespan) {
  return parseFloat(cost || 0) / (LIFESPAN_YEARS[lifespan] || 1);
}

export default function FarmAssets() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const { data: assets = [], isLoading } = useQuery({ queryKey: ['farmAssets'], queryFn: getFarmAssets });

  const addMut = useMutation({
    mutationFn: createFarmAsset,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmAssets'] }); setForm(empty); setConfirmOpen(false); },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteFarmAsset(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmAssets'] }); setDelConfirm(null); },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const lifespanLabel = (l) => LIFESPANS.find(x => x[0] === l)?.[1] || l;
  const totalDep = (Array.isArray(assets) ? assets : []).reduce((s, a) => s + calcDep(a.cost, a.lifespan), 0);

  return (
    <div style={S.twoCol}>
      <div>
        <div style={S.infoBox}>
          Assets that last more than one season go here. The system calculates the depreciation per season automatically so your field costs stay accurate.
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Add Farm Asset</div>
          <form onSubmit={e => { e.preventDefault(); setPending({...form}); setConfirmOpen(true); }}>
            <label style={S.label}>Asset Name</label>
            <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Irrigation pipes, Tractor, Sprayer" required />
            <label style={S.label}>Purchase Cost ($)</label>
            <input style={S.input} type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0.00" required />
            <label style={S.label}>Purchase Date</label>
            <input style={S.input} type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            <label style={S.label}>How long will this last?</label>
            {LIFESPANS.map(([val, title, desc]) => (
              <div key={val}
                onClick={() => set('lifespan', val)}
                style={{ border: form.lifespan === val ? '2px solid #1a6b3a' : '1px solid #e3e8e4', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: form.lifespan === val ? '#e8f5ee' : '#fff', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{title}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{desc}</div>
              </div>
            ))}
            {form.cost && (
              <div style={S.depBox}>
                Annual depreciation: <strong>{fmt(calcDep(form.cost, form.lifespan))}</strong> per season
              </div>
            )}
            <label style={S.label}>Funded by field (informational only)</label>
            <input style={S.input} value={form.funded_by} onChange={e => set('funded_by', e.target.value)} placeholder="e.g. Tomatoes 2026 revenue" />
            <label style={S.label}>Notes</label>
            <input style={S.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
            <button style={S.btn} type="submit" disabled={addMut.isPending}>{addMut.isPending ? 'Saving...' : '+ Add Asset'}</button>
          </form>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={S.sectionTitle}>Farm Assets ({(Array.isArray(assets) ? assets : []).length})</div>
          {assets.length > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>Total: <strong style={{ color: '#c97d1a' }}>{fmt(totalDep)}/season</strong></div>}
        </div>
        {isLoading && <p style={{ fontSize: 11, color: '#9ca3af' }}>Loading...</p>}
        {!isLoading && assets.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No assets yet. Add equipment, tools or infrastructure that lasts more than one season.</p>}
        {(Array.isArray(assets) ? assets : []).map(a => (
          <div key={a.id} style={S.assetCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  {lifespanLabel(a.lifespan)} - Bought {a.purchase_date}{a.funded_by ? ' - Funded: ' + a.funded_by : ''}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <div><div style={{ fontSize: 9, color: '#9ca3af' }}>PURCHASE COST</div><div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(a.cost)}</div></div>
                  <div><div style={{ fontSize: 9, color: '#9ca3af' }}>PER SEASON</div><div style={{ fontSize: 13, fontWeight: 700, color: '#c97d1a' }}>{fmt(calcDep(a.cost, a.lifespan))}</div></div>
                  <div><div style={{ fontSize: 9, color: '#9ca3af' }}>LIFESPAN</div><div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3a' }}>{LIFESPAN_YEARS[a.lifespan]}yr</div></div>
                </div>
                {a.notes && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>{a.notes}</div>}
              </div>
              <div style={{ flexShrink: 0, marginLeft: 12 }}>
                {delConfirm === a.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#c0392b' }}>Sure?</span>
                    <button onClick={() => delMut.mutate(a.id)} style={{ fontSize: 11, padding: '3px 8px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setDelConfirm(null)} style={{ fontSize: 11, padding: '3px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setDelConfirm(a.id)} style={{ fontSize: 11, padding: '3px 8px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => addMut.mutate({ ...pending, cost: parseFloat(pending.cost) })}
        fields={pending ? [
          { label: 'Asset Name', value: pending.name },
          { label: 'Cost', value: fmt(parseFloat(pending.cost || 0)) },
          { label: 'Lifespan', value: lifespanLabel(pending.lifespan) },
          { label: 'Depreciation/season', value: fmt(calcDep(pending.cost, pending.lifespan)) },
          { label: 'Funded by', value: pending.funded_by },
        ] : []}
      />
    </div>
  );
}
