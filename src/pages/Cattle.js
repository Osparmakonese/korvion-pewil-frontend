import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCattle, createCattle, updateCattle, deleteCattle, getCattleHealth, createCattleHealth, updateCattleHealth, deleteCattleHealth, getLivestockSales, createLivestockSale, deleteLivestockSale } from '../api/farmApi';
import { today, fmt, qty, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import LivestockEditModal from '../components/LivestockEditModal';
import HealthRecordEditModal from '../components/HealthRecordEditModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const SEXES = [['bull','Bull'],['cow','Cow'],['calf','Calf']];
const HEALTH_TYPES = [['vaccination','Vaccination'],['treatment','Treatment'],['checkup','Checkup'],['deworming','Deworming'],['other','Other']];
const STATUSES = [['all','All'],['active','Active'],['sold','Sold'],['deceased','Deceased'],['culled','Culled']];

const emptyCattle = { tag_number: '', name: '', breed: '', sex: 'bull', date_of_birth: '', date_acquired: today(), purchase_price: '', weight_kg: '', status: 'active', cause_of_death: '', date_of_death: '', mother: '', notes: '' };
const emptyHealth = { cattle: '', record_type: 'vaccination', description: '', record_date: today(), cost: '', vet_name: '', next_due: '', notes: '' };
const emptySale = { cattle: '', quantity: '1', buyer: '', sale_price: '', sale_date: today(), description: '' };
const STATUS_OPTIONS = [['active','Active'],['sold','Sold'],['deceased','Deceased'],['culled','Culled']];

const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    background: 'linear-gradient(135deg, #1a6b3a, #2d9e58)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  bannerImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.3))' },
  bannerContent: { position: 'relative', zIndex: 1 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  formCard: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '20px', position: 'sticky', top: 120,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  formTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700,
    color: '#111827', marginBottom: 14,
  },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, marginTop: 10 },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, outline: 'none', resize: 'vertical',
    minHeight: 60, color: '#111827',
  },
  btn: {
    width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', marginTop: 12, transition: 'background 0.15s',
  },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12,
    fontFamily: "'Playfair Display', serif",
  },
  tabBar: {
    display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 12,
  },
  tabBtn: (active) => ({
    padding: '8px 16px', border: 'none', background: 'none',
    borderBottom: active ? '2px solid #1a6b3a' : 'none',
    color: active ? '#1a6b3a' : '#9ca3af',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  countBadge: {
    display: 'inline-block', background: '#1a6b3a', color: '#fff',
    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 6,
  },
  cattleCard: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '14px 16px', marginBottom: 10,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827' },
  cardMeta: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 9, fontWeight: 700, color: '#fff', background: color,
  }),
  cardBody: { fontSize: 11, color: '#6b7280', lineHeight: 1.6 },
  cardStats: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
    borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8, fontSize: 10,
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  healthCard: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #1a6b3a',
    borderRadius: 8, padding: '10px 12px', marginBottom: 8,
  },
  saleCard: {
    background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #c97d1a',
    borderRadius: 8, padding: '10px 12px', marginBottom: 8,
  },
  deleteBtn: {
    fontSize: 10, padding: '3px 10px', background: '#fff', color: '#c0392b',
    border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', marginTop: 8,
  },
};

export default function Cattle() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [cattleForm, setCattleForm] = useState(emptyCattle);
  const [healthForm, setHealthForm] = useState(emptyHealth);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [cattleErrors, setCattleErrors] = useState({});
  const [tab, setTab] = useState('herd');
  const [statusFilter, setStatusFilter] = useState('all');
  const [delConfirm, setDelConfirm] = useState(null);
  const [editAnimal, setEditAnimal] = useState(null);
  const [editHealth, setEditHealth] = useState(null);
  const [cattleConfirm, setCattleConfirm] = useState(false);
  const [pendingCattle, setPendingCattle] = useState(null);

  const { data: cattle = [] } = useQuery({ queryKey: ['cattle'], queryFn: getCattle });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['cattleHealth'], queryFn: () => getCattleHealth({ animal_type: 'cattle' }) });
  const { data: sales = [] } = useQuery({ queryKey: ['livestockSales'], queryFn: () => getLivestockSales({ animal_type: 'cattle' }) });

  const addCattleMut = useMutation({
    mutationFn: createCattle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cattle'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setCattleForm(emptyCattle); setCattleErrors({}); setCattleConfirm(false); },
    onError: (err) => { setCattleErrors(err.response?.data || {}); },
  });

  const healthMut = useMutation({
    mutationFn: createCattleHealth,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cattleHealth'] }); setHealthForm(emptyHealth); },
    onError: (err) => { console.log('Health error:', err); },
  });

  const saleMut = useMutation({
    mutationFn: createLivestockSale,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); setSaleForm(emptySale); },
    onError: (err) => { console.log('Sale error:', err); },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteCattle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cattle'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); },
  });

  const setCat = (k, v) => setCattleForm(p => ({ ...p, [k]: v }));
  const setHealth = (k, v) => setHealthForm(p => ({ ...p, [k]: v }));
  const setSale = (k, v) => setSaleForm(p => ({ ...p, [k]: v }));

  const submitCattle = (e) => {
    e.preventDefault();
    const errs = {};
    if (!cattleForm.tag_number.trim()) errs.tag_number = 'Required';
    if (Object.keys(errs).length) { setCattleErrors(errs); return; }
    setPendingCattle({...cattleForm});
    setCattleConfirm(true);
  };

  const healthCattleList = cattle.map(c => ({ id: c.id, label: `${c.tag_number} - ${c.name || 'Unnamed'}` }));
  const activeCattle = cattle.filter(c => !c.is_sold).length;

  const filteredCattle = statusFilter === 'all' ? cattle : cattle.filter(c => c.status === statusFilter);

  const cattleHealthByAnimal = (cattleId) => healthRecords.filter(h => h.cattle === cattleId);

  return (
    <>
      <div style={S.banner}>
        <img src={IMAGES.cattle || IMAGES.fields} alt="" style={S.bannerImg} />
        <div style={S.bannerOverlay} />
        <div style={S.bannerContent}>
          <div style={S.bannerTitle}>Cattle Management</div>
          <div style={S.bannerSub}>Track herd health and sales records</div>
        </div>
      </div>

      <div style={S.twoCol}>
        {/* Left: Form */}
        <div>
          <div style={S.formCard}>
            <div style={S.formTitle}>Add Cattle</div>
            <form onSubmit={submitCattle}>
              <label style={S.label}>Tag Number <span style={{ color: '#c0392b' }}>*</span></label>
              <input style={S.input} value={cattleForm.tag_number} onChange={e => setCat('tag_number', e.target.value)} placeholder="e.g. T-001" />
              {cattleErrors.tag_number && <div style={S.error}>{cattleErrors.tag_number}</div>}

              <label style={S.label}>Name</label>
              <input style={S.input} value={cattleForm.name} onChange={e => setCat('name', e.target.value)} placeholder="e.g. Bessie" />

              <label style={S.label}>Breed</label>
              <input style={S.input} value={cattleForm.breed} onChange={e => setCat('breed', e.target.value)} placeholder="e.g. Holstein" />

              <label style={S.label}>Sex</label>
              <select style={S.input} value={cattleForm.sex} onChange={e => setCat('sex', e.target.value)}>
                {SEXES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              <label style={S.label}>Date of Birth</label>
              <input style={S.input} type="date" value={cattleForm.date_of_birth} onChange={e => setCat('date_of_birth', e.target.value)} />

              <label style={S.label}>Date Acquired</label>
              <input style={S.input} type="date" value={cattleForm.date_acquired} onChange={e => setCat('date_acquired', e.target.value)} />

              <label style={S.label}>Purchase Price</label>
              <input style={S.input} type="number" min="0" step="0.01" value={cattleForm.purchase_price} onChange={e => setCat('purchase_price', e.target.value)} placeholder="0.00" />

              <label style={S.label}>Weight (kg)</label>
              <input style={S.input} type="number" min="0" step="0.1" value={cattleForm.weight_kg} onChange={e => setCat('weight_kg', e.target.value)} placeholder="0.0" />

              <label style={S.label}>Status</label>
              <select style={S.input} value={cattleForm.status} onChange={e => setCat('status', e.target.value)}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              {cattleForm.status === 'deceased' && (
                <>
                  <label style={S.label}>Cause of Death</label>
                  <input style={S.input} value={cattleForm.cause_of_death} onChange={e => setCat('cause_of_death', e.target.value)} placeholder="e.g. Foot and Mouth Disease" />

                  <label style={S.label}>Date of Death</label>
                  <input style={S.input} type="date" value={cattleForm.date_of_death} onChange={e => setCat('date_of_death', e.target.value)} />
                </>
              )}

              <label style={S.label}>Mother (for lineage)</label>
              <select style={S.input} value={cattleForm.mother} onChange={e => setCat('mother', e.target.value)}>
                <option value="">-- None --</option>
                {cattle.filter(c => c.sex === 'cow' && c.status === 'active').map(c => (
                  <option key={c.id} value={c.id}>{c.tag_number}{c.name ? ` - ${c.name}` : ''}</option>
                ))}
              </select>

              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={cattleForm.notes} onChange={e => setCat('notes', e.target.value)} placeholder="Optional notes..." />

              <button style={S.btn} type="submit" disabled={addCattleMut.isPending}
                onMouseEnter={e => { e.currentTarget.style.background = '#2d9e58'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a6b3a'; }}
              >
                {addCattleMut.isPending ? 'Saving...' : '+ Add Cattle'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Tabs and Lists */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <div style={S.sectionTitle}>
              Cattle<span style={S.countBadge}>{activeCattle}</span>
            </div>
          </div>

          <div style={S.tabBar}>
            <button style={S.tabBtn(tab === 'herd')} onClick={() => { setTab('herd'); setStatusFilter('all'); }}>Herd</button>
            <button style={S.tabBtn(tab === 'health')} onClick={() => setTab('health')}>Health</button>
            <button style={S.tabBtn(tab === 'sales')} onClick={() => setTab('sales')}>Sales</button>
          </div>

          {/* HERD TAB */}
          {tab === 'herd' && (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                {STATUSES.map(([val, label]) => (
                  <button key={val}
                    onClick={() => setStatusFilter(val)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: statusFilter === val ? '1px solid #1a6b3a' : '1px solid #e5e7eb',
                      background: statusFilter === val ? '#e8f5ee' : '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      color: statusFilter === val ? '#1a6b3a' : '#6b7280',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredCattle.map(c => {
                const linkedHealth = healthRecords.filter(h => h.cattle === c.id);
                const healthCost = linkedHealth.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
                const linkedSale = sales.find(s => s.cattle === c.id);
                const salePrice = linkedSale ? parseFloat(linkedSale.sale_price) || 0 : 0;
                const purchasePrice = parseFloat(c.purchase_price) || 0;
                const totalCost = purchasePrice + healthCost;
                const pnl = salePrice - totalCost;
                return (
                <div key={c.id} style={S.cattleCard}>
                  <div style={S.cardHeader}>
                    <div>
                      <div style={S.cardTitle}>{c.tag_number}</div>
                      <div style={S.cardMeta}>{c.name || 'Unnamed'}</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={S.badge(c.sex === 'bull' ? '#0369a1' : c.sex === 'cow' ? '#7c3aed' : '#6b7280')}>
                          {(SEXES.find(s => s[0] === c.sex) || [c.sex, c.sex])[1]}
                        </span>
                        {c.status === 'sold' && <span style={{ ...S.badge('#c0392b'), marginLeft: 4 }}>SOLD</span>}
                        {c.status === 'deceased' && <span style={{ ...S.badge('#6b7280'), marginLeft: 4 }}>DECEASED</span>}
                        {c.status === 'culled' && <span style={{ ...S.badge('#374151'), marginLeft: 4 }}>CULLED</span>}
                      </div>
                    </div>
                  </div>
                  <div style={S.cardBody}>
                    {c.breed && <div>Breed: {c.breed}</div>}
                    {c.weight_kg && <div>Weight: {qty(c.weight_kg)} kg</div>}
                    {c.date_of_birth && <div>DOB: {c.date_of_birth}</div>}
                    {c.purchase_price && <div>Purchase: {fmt(c.purchase_price)}</div>}
                    {c.status === 'deceased' && c.cause_of_death && (
                      <div style={{ marginTop: 4, color: '#c0392b' }}>
                        Cause: {c.cause_of_death}{c.date_of_death ? ` (${c.date_of_death})` : ''}
                      </div>
                    )}
                    {c.notes && <div style={{ marginTop: 6, fontStyle: 'italic', color: '#9ca3af' }}>{c.notes}</div>}
                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, fontSize: 10 }}>
                      <div style={{ color: '#6b7280' }}>Costs: {fmt(totalCost)} {healthCost > 0 && <span>(health: {fmt(healthCost)})</span>}</div>
                      {salePrice > 0 && <div style={{ color: '#6b7280' }}>Sale: {fmt(salePrice)}</div>}
                      {(salePrice > 0 || c.status !== 'active') && (
                        <div style={{ fontWeight: 700, color: pnl >= 0 ? '#1a6b3a' : '#c0392b' }}>P&amp;L: {pnl >= 0 ? '+' : ''}{fmt(pnl)}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {delConfirm === c.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#c0392b' }}>Delete this animal?</span>
                        <button onClick={() => delMut.mutate(c.id)} style={{ fontSize: 10, padding: '3px 10px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Yes</button>
                        <button onClick={() => setDelConfirm(null)} style={{ fontSize: 10, padding: '3px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>No</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditAnimal(c)} style={{ fontSize: 10, padding: '3px 10px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => setDelConfirm(c.id)} style={S.deleteBtn}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}

              {filteredCattle.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No cattle to display.</p>}
            </div>
          )}

          {/* HEALTH TAB */}
          {tab === 'health' && (
            <div>
              <div style={{ ...S.formCard, position: 'static', marginBottom: 16, padding: '14px 16px' }}>
                <div style={{ ...S.formTitle, marginBottom: 10 }}>Log Health Record</div>
                <form onSubmit={(e) => { e.preventDefault(); healthMut.mutate({ ...healthForm, cattle: parseInt(healthForm.cattle), animal_type: 'cattle', cost: healthForm.cost ? parseFloat(healthForm.cost) : 0 }); }}>
                  <label style={S.label}>Cattle</label>
                  <select style={S.input} value={healthForm.cattle} onChange={e => setHealth('cattle', e.target.value)} required>
                    <option value="">Select...</option>
                    {healthCattleList.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>

                  <label style={S.label}>Type</label>
                  <select style={S.input} value={healthForm.record_type} onChange={e => setHealth('record_type', e.target.value)}>
                    {HEALTH_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>

                  <label style={S.label}>Description</label>
                  <textarea style={S.textarea} value={healthForm.description} onChange={e => setHealth('description', e.target.value)} placeholder="Details..." />

                  <div style={S.row2}>
                    <div><label style={S.label}>Date</label><input style={S.input} type="date" value={healthForm.record_date} onChange={e => setHealth('record_date', e.target.value)} /></div>
                    <div><label style={S.label}>Cost</label><input style={S.input} type="number" min="0" step="0.01" value={healthForm.cost} onChange={e => setHealth('cost', e.target.value)} placeholder="0.00" /></div>
                  </div>

                  <label style={S.label}>Vet Name</label>
                  <input style={S.input} value={healthForm.vet_name} onChange={e => setHealth('vet_name', e.target.value)} placeholder="Optional" />

                  <label style={S.label}>Next Due</label>
                  <input style={S.input} type="date" value={healthForm.next_due} onChange={e => setHealth('next_due', e.target.value)} />

                  <label style={S.label}>Notes</label>
                  <textarea style={S.textarea} value={healthForm.notes} onChange={e => setHealth('notes', e.target.value)} placeholder="Optional..." />

                  <button style={S.btn} type="submit" disabled={healthMut.isPending}>{healthMut.isPending ? 'Logging...' : '+ Log Record'}</button>
                </form>
              </div>

              <div style={{ ...S.sectionTitle, marginTop: 16 }}>Health History</div>
              {healthRecords.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No health records yet.</p>}
              {healthRecords.map(h => (
                <div key={h.id} style={S.healthCard}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#1a6b3a' }}>
                    {(HEALTH_TYPES.find(t => t[0] === h.record_type) || [h.record_type, h.record_type])[1]}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                    Cattle: {h.cattle_tag || `#${h.cattle}`} | Date: {h.record_date}
                  </div>
                  {h.description && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{h.description}</div>}
                  {h.cost && <div style={{ fontSize: 10, fontWeight: 600, color: '#1a6b3a', marginTop: 4 }}>Cost: {fmt(h.cost)}</div>}
                  {h.vet_name && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Vet: {h.vet_name}</div>}
                  {h.next_due && <div style={{ fontSize: 10, color: '#c97d1a', marginTop: 2 }}>Next Due: {h.next_due}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => setEditHealth(h)} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button onClick={async () => { if (window.confirm('Delete this health record?')) { await deleteCattleHealth(h.id); qc.invalidateQueries({ queryKey: ['cattleHealth'] }); } }} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SALES TAB */}
          {tab === 'sales' && (
            <div>
              <div style={{ ...S.formCard, position: 'static', marginBottom: 16, padding: '14px 16px' }}>
                <div style={{ ...S.formTitle, marginBottom: 10 }}>Log Sale</div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const payload = {
                    animal_type: 'cattle',
                    quantity: parseInt(saleForm.quantity) || 1,
                    sale_price: parseFloat(saleForm.sale_price) || 0,
                    sale_date: saleForm.sale_date,
                    buyer: saleForm.buyer,
                    description: saleForm.description,
                  };
                  if (saleForm.cattle) payload.cattle = parseInt(saleForm.cattle);
                  saleMut.mutate(payload);
                }}>
                  <label style={S.label}>Sell from Herd <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — links sale to animal)</span></label>
                  <select style={S.input} value={saleForm.cattle} onChange={e => setSale('cattle', e.target.value)}>
                    <option value="">Quick sale (no link)</option>
                    {cattle.filter(c => c.status === 'active').map(c => (
                      <option key={c.id} value={c.id}>{c.tag_number} - {c.name || c.breed || 'Unnamed'}</option>
                    ))}
                  </select>

                  <label style={S.label}>Quantity</label>
                  <input style={S.input} type="number" min="1" value={saleForm.quantity} onChange={e => setSale('quantity', e.target.value)} required placeholder="1" />

                  <label style={S.label}>Buyer</label>
                  <input style={S.input} value={saleForm.buyer} onChange={e => setSale('buyer', e.target.value)} placeholder="Buyer name" />

                  <label style={S.label}>Sale Price</label>
                  <input style={S.input} type="number" min="0" step="0.01" value={saleForm.sale_price} onChange={e => setSale('sale_price', e.target.value)} required placeholder="0.00" />

                  <label style={S.label}>Sale Date</label>
                  <input style={S.input} type="date" value={saleForm.sale_date} onChange={e => setSale('sale_date', e.target.value)} />

                  <label style={S.label}>Description</label>
                  <textarea style={S.textarea} value={saleForm.description} onChange={e => setSale('description', e.target.value)} placeholder="Optional notes..." />

                  <button style={S.btn} type="submit" disabled={saleMut.isPending}>{saleMut.isPending ? 'Recording...' : '+ Record Sale'}</button>
                </form>
              </div>

              <div style={{ ...S.sectionTitle, marginTop: 16 }}>Sale Records</div>
              {sales.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No sales recorded yet.</p>}
              {sales.map(s => (
                <div key={s.id} style={S.saleCard}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#c97d1a' }}>
                    {s.quantity} animal{s.quantity > 1 ? 's' : ''} sold
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                    {s.buyer || 'Unknown buyer'} | {s.sale_date}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#c97d1a', marginTop: 4 }}>
                    Total: {fmt(s.sale_price)}
                  </div>
                  {s.description && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{s.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={cattleConfirm}
        onCancel={() => setCattleConfirm(false)}
        onConfirm={() => { setCattleConfirm(false); addCattleMut.mutate({ ...pendingCattle, purchase_price: pendingCattle.purchase_price ? parseFloat(pendingCattle.purchase_price) : 0, weight_kg: pendingCattle.weight_kg ? parseFloat(pendingCattle.weight_kg) : 0, mother: pendingCattle.mother ? parseInt(pendingCattle.mother) : null, date_of_birth: pendingCattle.date_of_birth || null, date_of_death: pendingCattle.date_of_death || null }); }}
        fields={pendingCattle ? [
          { label: 'Tag Number', value: pendingCattle.tag_number },
          { label: 'Name', value: pendingCattle.name },
          { label: 'Breed', value: pendingCattle.breed },
          { label: 'Sex', value: (SEXES.find(s => s[0] === pendingCattle.sex) || [pendingCattle.sex, pendingCattle.sex])[1] },
          { label: 'Date Acquired', value: pendingCattle.date_acquired },
        ] : []}
      />

      <LivestockEditModal
        isOpen={!!editAnimal}
        animal={editAnimal}
        animalLabel="Cattle"
        onClose={() => setEditAnimal(null)}
        onSave={async (id, payload) => {
          await updateCattle(id, payload);
          qc.invalidateQueries({ queryKey: ['cattle'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />

      <HealthRecordEditModal
        isOpen={!!editHealth}
        record={editHealth}
        onClose={() => setEditHealth(null)}
        onSave={async (id, payload) => {
          await updateCattleHealth(id, payload);
          qc.invalidateQueries({ queryKey: ['cattleHealth'] });
        }}
      />

      {/* Sales now also have inline delete; full edit deferred */}
    </>
  );
}
