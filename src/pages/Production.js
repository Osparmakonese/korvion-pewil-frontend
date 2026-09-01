// Production — Phase 4 (2026-08-31), light manufacturing.
//
// A recipe (bill of materials) on a finished product; a production order
// consumes the raw materials and books the finished goods — both audited
// stock movements — and the TRUE cost (components + labour) lands on the
// finished item, so the margin on every jar is real.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBoms, createBom, getProductionOrders, createProductionOrder,
  completeProductionOrder, getProducts,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';
import { fmtQty } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const miniBtn = { padding: '6px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#111827' };

export default function Production() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data: bomData } = useQuery({ queryKey: ['boms'], queryFn: getBoms });
  const { data: orderData } = useQuery({ queryKey: ['production-orders'], queryFn: () => getProductionOrders() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const boms = arr(bomData);
  const orders = arr(orderData);
  const products = arr(prodData);

  const emptyLine = { component: '', quantity: '' };
  const [bomForm, setBomForm] = useState({ product: '', labour_cost_per_unit: '' });
  const [bomLines, setBomLines] = useState([{ ...emptyLine }]);
  const [runForm, setRunForm] = useState({ bom: '', quantity: '' });
  const [runError, setRunError] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['boms'] });
    qc.invalidateQueries({ queryKey: ['production-orders'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };
  const createRecipe = useMutation({
    mutationFn: createBom,
    onSuccess: () => { invalidate(); setBomForm({ product: '', labour_cost_per_unit: '' }); setBomLines([{ ...emptyLine }]); },
  });
  const createRun = useMutation({
    mutationFn: createProductionOrder,
    onSuccess: () => { invalidate(); setRunForm({ bom: '', quantity: '' }); },
  });
  const complete = useMutation({
    mutationFn: completeProductionOrder,
    onSuccess: () => { invalidate(); setRunError(''); },
    onError: (err) => setRunError(String(err?.response?.data?.detail || 'Could not complete.')),
  });

  const submitRecipe = (e) => {
    e.preventDefault();
    const lines = bomLines.filter((l) => l.component && Number(l.quantity) > 0)
      .map((l) => ({ component: Number(l.component), quantity: l.quantity }));
    if (!bomForm.product || !lines.length) return;
    createRecipe.mutate({ product: Number(bomForm.product),
                          labour_cost_per_unit: bomForm.labour_cost_per_unit || 0, lines });
  };
  const submitRun = (e) => {
    e.preventDefault();
    if (!runForm.bom || !(Number(runForm.quantity) > 0)) return;
    createRun.mutate({ bom: Number(runForm.bom), quantity: runForm.quantity });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 16 }}>
      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Production orders</h3>
          {orders.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No orders yet. Save a recipe, then start a run.</p>}
          {orders.map((o) => (
            <div key={o.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {fmtQty(o.quantity)} × {o.bom_detail?.product_name || `BOM ${o.bom}`}
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 6, textTransform: 'uppercase',
                                 background: o.status === 'completed' ? '#e8f5ee' : '#fef3c7',
                                 color: o.status === 'completed' ? '#1a6b3a' : '#92400e' }}>{o.status}</span>
                </div>
                {o.status === 'completed' ? (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    Components {o.component_cost} + labour {o.labour_cost} = {o.total_cost} ({o.unit_cost} each)
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Draft — completing consumes the raw materials.</div>
                )}
              </div>
              {o.status === 'draft' && (
                <button onClick={() => { setRunError(''); complete.mutate(o.id); }} disabled={complete.isPending}
                        style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}>
                  {complete.isPending ? 'Running…' : '▶ Complete run'}
                </button>
              )}
            </div>
          ))}
          {runError && <div style={{ fontSize: 11, color: '#991b1b', marginTop: 6 }}>{runError}</div>}
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recipes</h3>
          {boms.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No recipes yet.</p>}
          {boms.map((b) => (
            <div key={b.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{b.product_name}</div>
              {(b.lines || []).map((l) => (
                <div key={l.id} style={{ fontSize: 11, color: '#374151' }}>
                  • {fmtQty(l.quantity)} {l.component_unit} {l.component_name} @ {l.component_cost}
                </div>
              ))}
              {Number(b.labour_cost_per_unit) > 0 && (
                <div style={{ fontSize: 11, color: '#6b7280' }}>+ labour {b.labour_cost_per_unit} per unit</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Start a run</h3>
          <form onSubmit={submitRun}>
            <label style={label}>Recipe</label>
            <select style={input} value={runForm.bom} onChange={(e) => setRunForm({ ...runForm, bom: e.target.value })} required>
              <option value="">Select…</option>
              {boms.map((b) => <option key={b.id} value={b.id}>{b.product_name}</option>)}
            </select>
            <label style={label}>Quantity to make</label>
            <input style={input} type="number" step="0.001" min="0" required value={runForm.quantity}
                   onChange={(e) => setRunForm({ ...runForm, quantity: e.target.value })} />
            <button style={btn} disabled={createRun.isPending}>{createRun.isPending ? 'Saving…' : 'Create order'}</button>
          </form>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New recipe</h3>
          <form onSubmit={submitRecipe}>
            <label style={label}>Finished product</label>
            <select style={input} value={bomForm.product} onChange={(e) => setBomForm({ ...bomForm, product: e.target.value })} required>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label style={label}>Components (per 1 finished unit)</label>
            {bomLines.map((l, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <select style={{ ...input, flex: 2 }} value={l.component}
                        onChange={(e) => setBomLines(bomLines.map((x, i) => i === idx ? { ...x, component: e.target.value } : x))}>
                  <option value="">Component…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input style={{ ...input, flex: 1 }} type="number" step="0.0001" min="0" placeholder="Qty" value={l.quantity}
                       onChange={(e) => setBomLines(bomLines.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
              </div>
            ))}
            <button type="button" onClick={() => setBomLines([...bomLines, { ...emptyLine }])} style={miniBtn}>+ Component</button>
            <label style={label}>Labour + overhead per unit (optional)</label>
            <input style={input} type="number" step="0.0001" min="0" value={bomForm.labour_cost_per_unit}
                   onChange={(e) => setBomForm({ ...bomForm, labour_cost_per_unit: e.target.value })} />
            <button style={btn} disabled={createRecipe.isPending}>{createRecipe.isPending ? 'Saving…' : 'Save recipe'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
