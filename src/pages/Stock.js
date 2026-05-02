import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStock, createStockItem, logStockUsage, getStockUsage, getFields, deleteStockItem, getCattle, getGoats, getSheep, getPigs, getBroilerBatches, getLayerFlocks } from '../api/farmApi';
import { fmt, qty, today, IMAGES } from '../utils/format';

const CATEGORIES = [['chemical','Chemical'],['fertilizer','Fertiliser'],['seed','Seed'],['fuel','Fuel'],['equipment','Equipment'],['other','Other']];
const UNITS = [['litres','L'],['kg','kg'],['bags','bags'],['units','units'],['litres','bottles'],['units','packs']];
const emptyItem = { name: '', category: 'chemical', opening_qty: '', unit: 'litres', total_cost: '', alert_threshold: '' };
const emptyUsage = { item: '', field: '', opening_qty: '', date: today(), notes: '', livestock_type: '', livestock_id: '' };
const LIVESTOCK_TYPES = [['','-- Field only --'],['cattle','Cattle'],['goat','Goat'],['sheep','Sheep'],['pig','Pig'],['broiler','Broiler Batch'],['layer','Layer Flock']];

const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  preview: { background: '#e8f5ee', borderRadius: 7, padding: '10px 14px', fontSize: 11, color: '#1a6b3a', marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  stockItem: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  barTrack: { height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  barFill: (color, pct) => ({ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }),
};

export default function Stock() {
  const qc = useQueryClient();
  const [itemForm, setItemForm] = useState(emptyItem);
  const [usageForm, setUsageForm] = useState(emptyUsage);
  const [delConfirm, setDelConfirm] = useState(null);

  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: getStock });
  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: usage = [] } = useQuery({ queryKey: ['stockUsage'], queryFn: getStockUsage });
  const { data: cattle = [] } = useQuery({ queryKey: ['cattle'], queryFn: getCattle });
  const { data: goats = [] } = useQuery({ queryKey: ['goats'], queryFn: getGoats });
  const { data: sheep = [] } = useQuery({ queryKey: ['sheep'], queryFn: getSheep });
  const { data: pigs = [] } = useQuery({ queryKey: ['pigs'], queryFn: getPigs });
  const { data: broilers = [] } = useQuery({ queryKey: ['broilerBatches'], queryFn: getBroilerBatches });
  const { data: layers = [] } = useQuery({ queryKey: ['layerFlocks'], queryFn: getLayerFlocks });

  const livestockOptions = {
    cattle: (Array.isArray(cattle) ? cattle : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.tag_number} - ${a.name || a.breed}` })),
    goat: (Array.isArray(goats) ? goats : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.tag_number} - ${a.name || a.breed}` })),
    sheep: (Array.isArray(sheep) ? sheep : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.tag_number} - ${a.name || a.breed}` })),
    pig: (Array.isArray(pigs) ? pigs : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.tag_number} - ${a.name || a.breed}` })),
    broiler: (Array.isArray(broilers) ? broilers : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.batch_name} (${a.current_count} birds)` })),
    layer: (Array.isArray(layers) ? layers : []).filter(a => a.status === 'active').map(a => ({ id: a.id, label: `${a.flock_name} (${a.current_count} birds)` })),
  };

  const addMut = useMutation({
    mutationFn: createStockItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setItemForm(emptyItem);
    },
  });
  const usageMut = useMutation({
    mutationFn: logStockUsage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stockUsage'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setUsageForm(emptyUsage);
    },
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteStockItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock'] }); qc.invalidateQueries({ queryKey: ['lowStock'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); },
  });

  const setI = (k, v) => setItemForm(p => ({ ...p, [k]: v }));
  const setU = (k, v) => setUsageForm(p => ({ ...p, [k]: v }));

  const selectedItem = stock.find(s => String(s.id) === String(usageForm.item));
  const qtyUsed = parseFloat(usageForm.opening_qty) || 0;
  const remainAfter = selectedItem ? (selectedItem.remaining_qty ?? selectedItem.opening_qty) - qtyUsed : null;
  const costPreview = selectedItem ? qtyUsed * (selectedItem.unit_cost || 0) : 0;

  // Auto-calculate unit cost from total cost and quantity
  const formQty = parseFloat(itemForm.opening_qty) || 0;
  const formTotalCost = parseFloat(itemForm.total_cost) || 0;
  const autoUnitCost = formQty > 0 ? formTotalCost / formQty : 0;

  return (
    <>
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.stock} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,30,80,0.82), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Stock &amp; Inventory Management</div>
          <div style={S.bannerSub}>Track chemicals, fertilizers, and farm supplies</div>
        </div>
      </div>

      <div className="two-col-layout" style={S.twoCol}>
        {/* Left */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>Add Stock Item</div>
            <form onSubmit={e => { e.preventDefault(); addMut.mutate({ name: itemForm.name, category: itemForm.category, opening_qty: formQty, unit: itemForm.unit, unit_cost: autoUnitCost, alert_threshold: parseFloat(itemForm.alert_threshold) || 0 }); }}>
              <div className="form-grid-2" style={S.row2}>
                <div><label style={S.label}>Name</label><input style={S.input} value={itemForm.name} onChange={e => setI('name', e.target.value)} placeholder="e.g. Lambda Cyhalothrin" required /></div>
                <div><label style={S.label}>Category</label><select style={S.input} value={itemForm.category} onChange={e => setI('category', e.target.value)}>{CATEGORIES.map(([v,l]) => <option key={v+l} value={v}>{l}</option>)}</select></div>
              </div>
              <div className="form-grid-3" style={S.row3}>
                <div><label style={S.label}>Opening Qty</label><input style={S.input} type="number" min="0" step="any" value={itemForm.opening_qty} onChange={e => setI('opening_qty', e.target.value)} required placeholder="0" /></div>
                <div><label style={S.label}>Unit</label><select style={S.input} value={itemForm.unit} onChange={e => setI('unit', e.target.value)}>{UNITS.map(([v,l]) => <option key={v+l} value={v}>{l}</option>)}</select></div>
                <div><label style={S.label}>Total Cost Bought ($)</label><input style={S.input} type="number" min="0" step="any" value={itemForm.total_cost} onChange={e => setI('total_cost', e.target.value)} placeholder="0.00" required /></div>
              </div>
              {formQty > 0 && formTotalCost > 0 && (
                <div style={S.preview}>Unit Cost: <strong>{fmt(autoUnitCost)}</strong> per {itemForm.unit} (auto-calculated)</div>
              )}
              <label style={S.label}>Alert Threshold</label>
              <input style={S.input} type="number" min="0" step="any" value={itemForm.alert_threshold} onChange={e => setI('alert_threshold', e.target.value)} placeholder="Warn when below..." />
              <button style={S.btn} type="submit" disabled={addMut.isPending}>{addMut.isPending ? 'Saving...' : '+ Add Item'}</button>
            </form>
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>Log Usage</div>
            <form onSubmit={e => { e.preventDefault(); const payload = { item: parseInt(usageForm.item), opening_qty: parseFloat(usageForm.opening_qty), date: usageForm.date, notes: usageForm.notes }; if (usageForm.field) payload.field = parseInt(usageForm.field); if (usageForm.livestock_type) { payload.livestock_type = usageForm.livestock_type; payload.livestock_id = parseInt(usageForm.livestock_id); } usageMut.mutate(payload); }}>
              <div className="form-grid-2" style={S.row2}>
                <div><label style={S.label}>Item</label><select style={S.input} value={usageForm.item} onChange={e => setU('item', e.target.value)} required><option value="">Select...</option>{stock.map(s => <option key={s.id} value={s.id}>{s.name} ({qty(s.remaining_qty ?? s.opening_qty)} {s.unit})</option>)}</select></div>
                <div><label style={S.label}>Field {usageForm.livestock_type ? '(optional)' : ''}</label><select style={S.input} value={usageForm.field} onChange={e => setU('field', e.target.value)} required={!usageForm.livestock_type}><option value="">Select...</option>{fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
              </div>
              <div className="form-grid-2" style={S.row2}>
                <div><label style={S.label}>Qty Used</label><input style={S.input} type="number" min="0" step="any" value={usageForm.opening_qty} onChange={e => setU('opening_qty', e.target.value)} required placeholder="0" /></div>
                <div><label style={S.label}>Date</label><input style={S.input} type="date" value={usageForm.date} onChange={e => setU('date', e.target.value)} /></div>
              </div>
              <div className="form-grid-2" style={S.row2}>
                <div><label style={S.label}>Link to Livestock (optional)</label>
                  <select style={S.input} value={usageForm.livestock_type} onChange={e => { setU('livestock_type', e.target.value); setU('livestock_id', ''); }}>
                    {LIVESTOCK_TYPES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {usageForm.livestock_type && (
                  <div><label style={S.label}>Select {usageForm.livestock_type}</label>
                    <select style={S.input} value={usageForm.livestock_id} onChange={e => setU('livestock_id', e.target.value)} required>
                      <option value="">Select...</option>
                      {(livestockOptions[usageForm.livestock_type] || []).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {selectedItem && qtyUsed > 0 && (
                <div style={S.preview}>After this: <strong>{qty(remainAfter)} {selectedItem.unit}</strong> remaining - Cost to {usageForm.livestock_type ? usageForm.livestock_type : 'field'}: <strong>{fmt(costPreview)}</strong></div>
              )}
              <label style={S.label}>Notes</label>
              <input style={S.input} value={usageForm.notes} onChange={e => setU('notes', e.target.value)} placeholder="Optional" />
              <button style={S.btn} type="submit" disabled={usageMut.isPending}>{usageMut.isPending ? 'Logging...' : '+ Log Usage'}</button>
            </form>
          </div>
        </div>

        {/* Right */}
        <div>
          <div style={S.sectionTitle}>Stock Levels</div>
          {stock.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No stock items yet.</p>}
          {(Array.isArray(stock) ? stock : []).map(s => {
            const rem = s.remaining_qty ?? s.opening_qty;
            const pct = s.opening_qty > 0 ? (rem / s.opening_qty) * 100 : 0;
            const isLow = rem <= (s.alert_threshold || 0);
            const totalCost = parseFloat(s.unit_cost || 0) * parseFloat(s.opening_qty || 0);
            const itemUsage = (Array.isArray(usage) ? usage : []).filter(u => u.item === s.id).slice(0, 3);
            return (
              <div key={s.id} style={S.stockItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.category} - Total: {fmt(totalCost)} ({fmt(s.unit_cost)}/{s.unit})</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isLow ? '#c0392b' : '#1a6b3a', fontFamily: "'Playfair Display', serif" }}>{qty(rem)}</div>
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>{s.unit} left</div>
                  </div>
                </div>
                <div style={S.barTrack}><div style={S.barFill(isLow ? '#c0392b' : '#1a6b3a', pct)} /></div>
                {isLow && <div style={{ fontSize: 10, color: '#c0392b', fontWeight: 600, marginTop: 4 }}>Below alert threshold ({qty(s.alert_threshold)} {s.unit})</div>}
                {itemUsage.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', marginBottom: 4 }}>RECENT:</div>
                    {itemUsage.map((u, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>
                        {u.date}: {qty(u.opening_qty)} {s.unit} {'\u2192'} {u.livestock_name ? <span style={{ color: '#6c5ce7', fontWeight: 600 }}>{u.livestock_name}</span> : (u.field_name || `Field #${u.field}`)}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  {delConfirm === s.id ? (
                    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', marginRight: 4 }}>Delete this item?</span>
                      <button onClick={() => delMut.mutate(s.id)} style={{ fontSize: 10, padding: '2px 8px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>Yes</button>
                      <button onClick={() => setDelConfirm(null)} style={{ fontSize: 10, padding: '2px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer' }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDelConfirm(s.id)} style={{ fontSize: 10, padding: '3px 10px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
