// Butchery — Phase 4 (2026-08-31).
//
// Carcass in by weight, cuts out by weight, and the two numbers a butchery
// lives on: yield % (how much of the animal reached the counter) and true
// cost per kg of every cut (carcass price spread over usable weight —
// pushed onto each cut product so margins are real).
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCarcasses, createCarcass, completeCutting, getYieldReport, getProducts,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const miniBtn = { padding: '6px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#111827' };
const ANIMALS = [['beef', 'Beef'], ['pork', 'Pork'], ['goat', 'Goat'], ['lamb', 'Lamb'], ['chicken', 'Chicken'], ['other', 'Other']];

export default function Butchery() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['carcasses'], queryFn: () => getCarcasses() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: yieldData } = useQuery({ queryKey: ['yield-report'], queryFn: getYieldReport });
  const carcasses = arr(data);
  const products = arr(prodData);

  const emptyIntake = { animal_type: 'beef', tag: '', intake_weight_kg: '', cost_total: '' };
  const [intake, setIntake] = useState(emptyIntake);
  const [cuttingId, setCuttingId] = useState(null);       // carcass being cut
  const [cutLines, setCutLines] = useState([{ product: '', weight_kg: '' }]);
  const [cutError, setCutError] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['carcasses'] });
    qc.invalidateQueries({ queryKey: ['yield-report'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };
  const create = useMutation({
    mutationFn: createCarcass,
    onSuccess: () => { invalidate(); setIntake(emptyIntake); },
  });
  const cut = useMutation({
    mutationFn: ({ id, cuts }) => completeCutting(id, { cuts }),
    onSuccess: () => { invalidate(); setCuttingId(null); setCutLines([{ product: '', weight_kg: '' }]); setCutError(''); },
    onError: (err) => {
      const d = err?.response?.data;
      setCutError((d && (d.cuts || d.branch || d.detail)) || 'Cutting failed.');
    },
  });

  const submitIntake = (e) => {
    e.preventDefault();
    if (!intake.intake_weight_kg || !intake.cost_total) return;
    create.mutate({ ...intake, received_date: new Date().toISOString().slice(0, 10) });
  };
  const startCut = (c) => { setCuttingId(c.id); setCutLines([{ product: '', weight_kg: '' }]); setCutError(''); };
  const submitCut = (c) => {
    const cuts = cutLines.filter((l) => l.product && Number(l.weight_kg) > 0)
      .map((l) => ({ product: Number(l.product), weight_kg: l.weight_kg }));
    if (!cuts.length) { setCutError('Add at least one cut with a weight.'); return; }
    cut.mutate({ id: c.id, cuts });
  };
  const cutTotal = cutLines.reduce((s, l) => s + (Number(l.weight_kg) || 0), 0);

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Yield strip */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {(yieldData?.animals || []).map((a) => (
          <div key={a.animal_type} style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{a.animal_type} yield</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: Number(a.avg_yield_pct) < 70 ? '#991b1b' : '#1a6b3a' }}>{a.avg_yield_pct}%</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{a.carcasses} carcass(es) · {a.total_loss_kg}kg lost</div>
          </div>
        ))}
        {!(yieldData?.animals || []).length && (
          <div style={{ ...card, marginBottom: 0, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
            Yield figures appear after the first carcass is cut.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 16 }}>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Carcasses</h3>
          {carcasses.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No carcasses yet — book one in on the right.</p>}
          {carcasses.map((c) => (
            <div key={c.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
                    {c.animal_type} · {c.intake_weight_kg}kg {c.tag ? `· ${c.tag}` : ''}
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 6, textTransform: 'uppercase',
                                   background: c.status === 'cut' ? '#e8f5ee' : '#fef3c7',
                                   color: c.status === 'cut' ? '#1a6b3a' : '#92400e' }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    Paid {c.cost_total} ({c.cost_per_kg}/kg on the hook)
                    {c.status === 'cut' && ` · yield ${c.yield_pct}% · loss ${c.cutting_loss_kg}kg`}
                  </div>
                  {(c.cuts || []).map((cc) => (
                    <div key={cc.id} style={{ fontSize: 11, color: '#374151' }}>
                      • {cc.product_name}: {cc.weight_kg}kg (cost {cc.allocated_cost})
                    </div>
                  ))}
                </div>
                {c.status === 'hanging' && cuttingId !== c.id && (
                  <button onClick={() => startCut(c)} style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}>🔪 Cut</button>
                )}
              </div>
              {cuttingId === c.id && (
                <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                    Cutting {c.intake_weight_kg}kg — cuts so far {cutTotal.toFixed(2)}kg
                    ({c.intake_weight_kg ? ((cutTotal / Number(c.intake_weight_kg)) * 100).toFixed(1) : 0}% yield)
                  </div>
                  {cutLines.map((l, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <select style={{ ...input, flex: 2 }} value={l.product}
                              onChange={(e) => setCutLines(cutLines.map((x, i) => i === idx ? { ...x, product: e.target.value } : x))}>
                        <option value="">Cut (product)…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input style={{ ...input, flex: 1 }} type="number" step="0.001" min="0" placeholder="kg" value={l.weight_kg}
                             onChange={(e) => setCutLines(cutLines.map((x, i) => i === idx ? { ...x, weight_kg: e.target.value } : x))} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => setCutLines([...cutLines, { product: '', weight_kg: '' }])} style={miniBtn}>+ Cut</button>
                    <button onClick={() => submitCut(c)} disabled={cut.isPending}
                            style={{ ...miniBtn, background: '#1a6b3a', color: '#fff', borderColor: '#1a6b3a' }}>
                      {cut.isPending ? 'Booking…' : 'Complete cutting'}
                    </button>
                    <button onClick={() => { setCuttingId(null); setCutError(''); }} style={miniBtn}>Cancel</button>
                  </div>
                  {cutError && <div style={{ fontSize: 11, color: '#991b1b', marginTop: 6 }}>{cutError}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Book a carcass in</h3>
          <form onSubmit={submitIntake}>
            <label style={label}>Animal</label>
            <select style={input} value={intake.animal_type}
                    onChange={(e) => setIntake({ ...intake, animal_type: e.target.value })}>
              {ANIMALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label style={label}>Abattoir tag / reference</label>
            <input style={input} value={intake.tag} onChange={(e) => setIntake({ ...intake, tag: e.target.value })} />
            <label style={label}>Weight on the hook (kg)</label>
            <input style={input} type="number" step="0.001" min="0" required value={intake.intake_weight_kg}
                   onChange={(e) => setIntake({ ...intake, intake_weight_kg: e.target.value })} />
            <label style={label}>Total paid</label>
            <input style={input} type="number" step="0.01" min="0" required value={intake.cost_total}
                   onChange={(e) => setIntake({ ...intake, cost_total: e.target.value })} />
            <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Book in'}</button>
          </form>
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 10 }}>
            Cuts sell as your existing per-kg products. When cutting completes, each cut's
            cost price updates to what this carcass truly cost per usable kg.
          </p>
        </div>
      </div>
    </div>
  );
}
