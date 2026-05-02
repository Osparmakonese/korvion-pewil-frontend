import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSheep, createSheep, updateSheep, deleteSheep, getSheepHealth, createSheepHealth, updateSheepHealth, deleteSheepHealth, getLivestockSales, createLivestockSale, deleteLivestockSale } from '../api/farmApi';
import { today, fmt, qty, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import LivestockEditModal from '../components/LivestockEditModal';
import HealthRecordEditModal from '../components/HealthRecordEditModal';

/* ── empty forms ── */
const emptySheep = { tag_number: '', name: '', breed: '', sex: 'ewe', date_of_birth: '', date_acquired: today(), purchase_price: '', weight_kg: '', status: 'active', cause_of_death: '', date_of_death: '', mother: '', notes: '' };
const emptyHealth = { sheep: '', record_type: 'vaccination', description: '', record_date: today(), cost: '', vet_name: '', next_due: '', wool_kg: '', notes: '' };
const emptySale = { sheep: '', quantity: '1', buyer: '', sale_price: '', sale_date: today(), description: '' };

const STATUS_OPTIONS = [['active','Active'],['sold','Sold'],['deceased','Deceased'],['culled','Culled']];

/* ── styles ── */
const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    background: 'linear-gradient(135deg, #1a6b3a 0%, #2d9e58 100%)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    backgroundImage: `url(${IMAGES.sheep || IMAGES.fields})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
    position: 'relative',
  },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.2))', borderRadius: 10 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)', position: 'relative', zIndex: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)', position: 'relative', zIndex: 2 },
  twoCol: { display: 'grid', gridTemplateColumns: '40% 1fr', gap: 20, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Playfair Display', serif" },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: 60 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  btnSecondary: { width: '100%', padding: '10px', background: '#c97d1a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  btnSmall: { padding: '6px 12px', fontSize: 11, fontWeight: 600, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Playfair Display', serif" },
  sheepCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  sheepCardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheepName: { fontSize: 13, fontWeight: 700, color: '#111827' },
  sheepMeta: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  badge: (color) => ({ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', background: color === 'amber' ? '#fef3c7' : color === 'red' ? '#fee2e2' : '#dcfce7', color: color === 'amber' ? '#92400e' : color === 'red' ? '#991b1b' : '#166534' }),
  tabs: { display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #e5e7eb' },
  tab: (active) => ({ flex: 1, padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderBottom: active ? '2px solid #1a6b3a' : '2px solid transparent', color: active ? '#1a6b3a' : '#6b7280', transition: 'all .15s' }),
  countBadge: { display: 'inline-block', background: '#1a6b3a', color: '#fff', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, marginLeft: 8 },
  healthCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 10 },
  saleCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 10 },
  filterPill: (active) => ({ padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 20, background: active ? '#111827' : '#fff', color: active ? '#fff' : '#374151', transition: 'all .15s', marginRight: 8, marginBottom: 8 }),
  preview: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '10px 12px', fontSize: 11, color: '#166534', marginTop: 8 },
};

const HEALTH_TYPES = [['vaccination','Vaccination'],['shearing','Shearing'],['treatment','Treatment'],['check','Health Check'],['other','Other']];
const SEX_OPTIONS = [['ewe','Ewe'],['ram','Ram'],['lamb','Lamb']];

export default function Sheep() {
  const qc = useQueryClient();

  /* ── state ── */
  const [sheepForm, setSheepForm] = useState(emptySheep);
  const [healthForm, setHealthForm] = useState(emptyHealth);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [activeTab, setActiveTab] = useState('flock'); // 'flock' | 'health' | 'sales'
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' | 'sold' | 'all'
  const [delConfirm, setDelConfirm] = useState(null);
  const [editAnimal, setEditAnimal] = useState(null);
  const [editHealth, setEditHealth] = useState(null);

  /* ── queries ── */
  const { data: sheep = [] } = useQuery({ queryKey: ['sheep'], queryFn: getSheep });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['sheepHealth'], queryFn: () => getSheepHealth({ animal_type: 'sheep' }) });
  const { data: sales = [] } = useQuery({ queryKey: ['livestockSales'], queryFn: () => getLivestockSales({ animal_type: 'sheep' }) });

  /* ── mutations ──
     Every farm mutation must also invalidate ['dashboard'] so the herd
     count + revenue hero numbers refresh. Reported 2026-04-30 — products
     and sales were not updating dashboard tiles after CRUD. */
  const addMut = useMutation({
    mutationFn: createSheep,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sheep'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSheepForm(emptySheep);
    },
  });

  const healthMut = useMutation({
    mutationFn: createSheepHealth,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sheepHealth'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setHealthForm(emptyHealth);
    },
  });

  const saleMut = useMutation({
    mutationFn: createLivestockSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['livestockSales'] });
      qc.invalidateQueries({ queryKey: ['sheep'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSaleForm(emptySale);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteSheep(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sheep'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDelConfirm(null);
    },
  });

  /* ── helpers ── */
  const setSF = (k, v) => setSheepForm(p => ({ ...p, [k]: v }));
  const setHF = (k, v) => setHealthForm(p => ({ ...p, [k]: v }));
  const setSAF = (k, v) => setSaleForm(p => ({ ...p, [k]: v }));

  const activeSheep = sheep.filter(s => s.status !== 'sold');
  const filteredSheep = filterStatus === 'all' ? sheep : filterStatus === 'sold' ? sheep.filter(s => s.status === 'sold') : activeSheep;
  const sheepSales = sales.filter(s => s.animal_type === 'sheep');

  const selectedSheepForHealth = sheep.find(s => String(s.id) === String(healthForm.sheep));
  const selectedSheepForSale = sheep.find(s => String(s.id) === String(saleForm.sheep));

  /* ── handlers ── */
  const handleAddSheep = (e) => {
    e.preventDefault();
    addMut.mutate({
      tag_number: sheepForm.tag_number,
      name: sheepForm.name || '',
      breed: sheepForm.breed || '',
      sex: sheepForm.sex,
      date_of_birth: sheepForm.date_of_birth || null,
      date_acquired: sheepForm.date_acquired,
      purchase_price: parseFloat(sheepForm.purchase_price) || 0,
      weight_kg: parseFloat(sheepForm.weight_kg) || 0,
      status: sheepForm.status || 'active',
      cause_of_death: sheepForm.cause_of_death || '',
      date_of_death: sheepForm.date_of_death || null,
      mother: sheepForm.mother ? parseInt(sheepForm.mother) : null,
      notes: sheepForm.notes || '',
    });
  };

  const handleAddHealth = (e) => {
    e.preventDefault();
    healthMut.mutate({
      sheep: parseInt(healthForm.sheep),
      animal_type: 'sheep',
      type: healthForm.record_type,
      description: healthForm.description || '',
      record_date: healthForm.record_date,
      cost: parseFloat(healthForm.cost) || 0,
      vet_name: healthForm.vet_name || '',
      next_due: healthForm.next_due || null,
      wool_kg: parseFloat(healthForm.wool_kg) || 0,
      notes: healthForm.notes || '',
    });
  };

  const handleAddSale = (e) => {
    e.preventDefault();
    const payload = {
      animal_type: 'sheep',
      quantity: parseInt(saleForm.quantity) || 1,
      buyer: saleForm.buyer || '',
      sale_price: parseFloat(saleForm.sale_price) || 0,
      sale_date: saleForm.sale_date,
      description: saleForm.description || '',
    };
    if (saleForm.sheep) payload.sheep = parseInt(saleForm.sheep);
    saleMut.mutate(payload);
  };

  const handleDeleteSheep = (id) => {
    const s = sheep.find(x => x.id === id);
    setDelConfirm({ id, item: s });
  };

  const confirmDelete = () => {
    if (delConfirm) {
      delMut.mutate(delConfirm.id);
    }
  };

  return (
    <>
      {/* ── Banner ── */}
      <div style={S.banner}>
        <div style={S.bannerOverlay} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={S.bannerTitle}>Sheep Flock Management</div>
          <div style={S.bannerSub}>Track individual animals, health records, and sales</div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={S.twoCol}>
        {/* ── LEFT: Add Sheep Form ── */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>Add Sheep</div>
            <form onSubmit={handleAddSheep}>
              <label style={S.label}>Tag Number *</label>
              <input style={S.input} value={sheepForm.tag_number} onChange={e => setSF('tag_number', e.target.value)} placeholder="e.g. S-001" required />

              <label style={S.label}>Name</label>
              <input style={S.input} value={sheepForm.name} onChange={e => setSF('name', e.target.value)} placeholder="e.g. Daisy" />

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Breed</label>
                  <input style={S.input} value={sheepForm.breed} onChange={e => setSF('breed', e.target.value)} placeholder="e.g. Dorper" />
                </div>
                <div>
                  <label style={S.label}>Sex</label>
                  <select style={S.input} value={sheepForm.sex} onChange={e => setSF('sex', e.target.value)}>
                    {SEX_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <label style={S.label}>Date of Birth</label>
              <input style={S.input} type="date" value={sheepForm.date_of_birth} onChange={e => setSF('date_of_birth', e.target.value)} />

              <label style={S.label}>Date Acquired</label>
              <input style={S.input} type="date" value={sheepForm.date_acquired} onChange={e => setSF('date_acquired', e.target.value)} />

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Purchase Price</label>
                  <input style={S.input} type="number" step="0.01" min="0" value={sheepForm.purchase_price} onChange={e => setSF('purchase_price', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label style={S.label}>Weight (kg)</label>
                  <input style={S.input} type="number" step="0.1" min="0" value={sheepForm.weight_kg} onChange={e => setSF('weight_kg', e.target.value)} placeholder="0.0" />
                </div>
              </div>

              <label style={S.label}>Status</label>
              <select style={S.input} value={sheepForm.status} onChange={e => setSF('status', e.target.value)}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              {(sheepForm.status === 'deceased' || sheepForm.status === 'culled') && (
                <div style={S.row2}>
                  <div><label style={S.label}>Cause of Death</label><input style={S.input} value={sheepForm.cause_of_death} onChange={e => setSF('cause_of_death', e.target.value)} placeholder="e.g. illness" /></div>
                  <div><label style={S.label}>Date of Death</label><input style={S.input} type="date" value={sheepForm.date_of_death} onChange={e => setSF('date_of_death', e.target.value)} /></div>
                </div>
              )}

              <label style={S.label}>Mother (for lineage)</label>
              <select style={S.input} value={sheepForm.mother} onChange={e => setSF('mother', e.target.value)}>
                <option value="">-- None --</option>
                {sheep.filter(s => s.sex === 'ewe' && (s.status || 'active') === 'active').map(s => (
                  <option key={s.id} value={s.id}>{s.tag_number}{s.name ? ` - ${s.name}` : ''}</option>
                ))}
              </select>

              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={sheepForm.notes} onChange={e => setSF('notes', e.target.value)} placeholder="Additional notes..." />

              <button type="submit" style={S.btn} disabled={!sheepForm.tag_number || addMut.isPending}>
                {addMut.isPending ? 'Adding...' : 'Add Sheep'}
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Tabs & Lists ── */}
        <div>
          <div style={S.card}>
            {/* ── Tabs ── */}
            <div style={S.tabs}>
              <div style={S.tab(activeTab === 'flock')} onClick={() => setActiveTab('flock')}>
                Flock <span style={S.countBadge}>{activeSheep.length}</span>
              </div>
              <div style={S.tab(activeTab === 'health')} onClick={() => setActiveTab('health')}>
                Health
              </div>
              <div style={S.tab(activeTab === 'sales')} onClick={() => setActiveTab('sales')}>
                Sales
              </div>
            </div>

            {/* ── FLOCK TAB ── */}
            {activeTab === 'flock' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <button style={S.filterPill(filterStatus === 'active')} onClick={() => setFilterStatus('active')}>Active</button>
                  <button style={S.filterPill(filterStatus === 'sold')} onClick={() => setFilterStatus('sold')}>Sold</button>
                  <button style={S.filterPill(filterStatus === 'all')} onClick={() => setFilterStatus('all')}>All</button>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                  Showing {filteredSheep.length} of {sheep.length}
                </div>
                {filteredSheep.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#9ca3af', fontSize: 12 }}>No sheep found</div>
                ) : (
                  filteredSheep.map(s => {
                    const linkedHealth = healthRecords.filter(h => h.sheep === s.id);
                    const healthCost = linkedHealth.reduce((sum, h) => sum + (parseFloat(h.cost) || 0), 0);
                    const woolKg = linkedHealth.reduce((sum, h) => sum + (parseFloat(h.wool_kg) || 0), 0);
                    const linkedSale = sheepSales.find(sl => sl.sheep === s.id);
                    const salePrice = linkedSale ? parseFloat(linkedSale.sale_price) || 0 : 0;
                    const purchasePrice = parseFloat(s.purchase_price) || 0;
                    const totalCost = purchasePrice + healthCost;
                    const pnl = salePrice - totalCost;
                    return (
                    <div key={s.id} style={S.sheepCard}>
                      <div style={S.sheepCardRow}>
                        <div>
                          <div style={S.sheepName}>{s.name || s.tag_number}</div>
                          <div style={S.sheepMeta}>{s.tag_number} • {s.breed || 'Unknown breed'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 6, cursor: 'pointer' }} onClick={() => setEditAnimal(s)}>Edit</button>
                          <button style={S.btnSmall} onClick={() => handleDeleteSheep(s.id)}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <span style={S.badge(s.sex === 'ram' ? 'amber' : 'green')}>{s.sex}</span>
                        {s.weight_kg > 0 && <span style={{ fontSize: 11, color: '#6b7280' }}>{qty(s.weight_kg)} kg</span>}
                        {s.status === 'sold' && <span style={S.badge('red')}>Sold</span>}
                        {s.status === 'deceased' && <span style={S.badge('red')}>Deceased</span>}
                        {s.status === 'culled' && <span style={S.badge('amber')}>Culled</span>}
                      </div>
                      {(s.status === 'deceased' || s.status === 'culled') && s.cause_of_death && (
                        <div style={{ fontSize: 10, color: '#991b1b', marginTop: 6, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>
                          <strong>{s.status === 'deceased' ? 'Died' : 'Culled'}:</strong> {s.cause_of_death}{s.date_of_death && ` on ${s.date_of_death}`}
                        </div>
                      )}
                      <div style={{ marginTop: 6, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, fontSize: 10 }}>
                        <div style={{ color: '#6b7280' }}>Costs: {fmt(totalCost)} {healthCost > 0 && <span>(health: {fmt(healthCost)})</span>}</div>
                        {woolKg > 0 && <div style={{ color: '#6b7280' }}>Wool: {woolKg.toFixed(2)} kg</div>}
                        {salePrice > 0 && <div style={{ color: '#6b7280' }}>Sale: {fmt(salePrice)}</div>}
                        {(salePrice > 0 || (s.status && s.status !== 'active')) && (
                          <div style={{ fontWeight: 700, color: pnl >= 0 ? '#1a6b3a' : '#c0392b' }}>P&amp;L: {pnl >= 0 ? '+' : ''}{fmt(pnl)}</div>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── HEALTH TAB ── */}
            {activeTab === 'health' && (
              <>
                <div style={S.sectionTitle}>Log Health Record</div>
                <form onSubmit={handleAddHealth}>
                  <label style={S.label}>Sheep *</label>
                  <select style={S.input} value={healthForm.sheep} onChange={e => setHF('sheep', e.target.value)} required>
                    <option value="">Select sheep...</option>
                    {sheep.map(s => <option key={s.id} value={s.id}>{s.name || s.tag_number}</option>)}
                  </select>

                  <label style={S.label}>Type *</label>
                  <select style={S.input} value={healthForm.record_type} onChange={e => setHF('record_type', e.target.value)} required>
                    {HEALTH_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>

                  <label style={S.label}>Description</label>
                  <textarea style={S.textarea} value={healthForm.description} onChange={e => setHF('description', e.target.value)} placeholder="e.g. Routine shearing, vaccination details..." />

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Date</label>
                      <input style={S.input} type="date" value={healthForm.record_date} onChange={e => setHF('record_date', e.target.value)} required />
                    </div>
                    <div>
                      <label style={S.label}>Cost</label>
                      <input style={S.input} type="number" step="0.01" min="0" value={healthForm.cost} onChange={e => setHF('cost', e.target.value)} placeholder="0.00" />
                    </div>
                  </div>

                  <label style={S.label}>Vet Name</label>
                  <input style={S.input} value={healthForm.vet_name} onChange={e => setHF('vet_name', e.target.value)} placeholder="Optional" />

                  <label style={S.label}>Next Due</label>
                  <input style={S.input} type="date" value={healthForm.next_due} onChange={e => setHF('next_due', e.target.value)} />

                  <label style={S.label}>Wool Yield (kg)</label>
                  <input style={S.input} type="number" step="0.01" min="0" value={healthForm.wool_kg} onChange={e => setHF('wool_kg', e.target.value)} placeholder="For shearing records" />

                  <label style={S.label}>Notes</label>
                  <textarea style={S.textarea} value={healthForm.notes} onChange={e => setHF('notes', e.target.value)} placeholder="Additional notes..." />

                  <button type="submit" style={S.btn} disabled={!healthForm.sheep || healthMut.isPending}>
                    {healthMut.isPending ? 'Adding...' : 'Log Health Record'}
                  </button>
                </form>

                <div style={S.sectionTitle}>Recent Health Records</div>
                {healthRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#9ca3af', fontSize: 12 }}>No health records</div>
                ) : (
                  healthRecords.map(h => {
                    const sheepItem = sheep.find(s => s.id === h.sheep);
                    return (
                      <div key={h.id} style={S.healthCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                              {sheepItem?.name || sheepItem?.tag_number || 'Unknown'} - {h.record_type}
                            </div>
                            {h.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{h.description}</div>}
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                              {h.record_date} {h.vet_name && `• ${h.vet_name}`} {h.cost > 0 && `• ${fmt(h.cost)}`} {parseFloat(h.wool_kg) > 0 && `• ${h.wool_kg}kg wool`}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <button onClick={() => setEditHealth(h)} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                              <button onClick={async () => { if (window.confirm('Delete this health record?')) { await deleteSheepHealth(h.id); qc.invalidateQueries({ queryKey: ['sheepHealth'] }); } }} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── SALES TAB ── */}
            {activeTab === 'sales' && (
              <>
                <div style={S.sectionTitle}>Log Sale</div>
                <form onSubmit={handleAddSale}>
                  <label style={S.label}>Sell from Flock <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — links sale to animal)</span></label>
                  <select style={S.input} value={saleForm.sheep} onChange={e => setSAF('sheep', e.target.value)}>
                    <option value="">Quick sale (no link)</option>
                    {sheep.filter(s => (s.status || 'active') === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.tag_number} - {s.name || s.breed || 'Unnamed'}</option>
                    ))}
                  </select>

                  <label style={S.label}>Quantity *</label>
                  <input style={S.input} type="number" step="1" min="1" value={saleForm.quantity} onChange={e => setSAF('quantity', e.target.value)} placeholder="Number of sheep" required />

                  <label style={S.label}>Buyer</label>
                  <input style={S.input} value={saleForm.buyer} onChange={e => setSAF('buyer', e.target.value)} placeholder="Buyer name" />

                  <label style={S.label}>Sale Price</label>
                  <input style={S.input} type="number" step="0.01" min="0" value={saleForm.sale_price} onChange={e => setSAF('sale_price', e.target.value)} placeholder="Price per unit" />

                  <label style={S.label}>Sale Date</label>
                  <input style={S.input} type="date" value={saleForm.sale_date} onChange={e => setSAF('sale_date', e.target.value)} required />

                  <label style={S.label}>Description</label>
                  <textarea style={S.textarea} value={saleForm.description} onChange={e => setSAF('description', e.target.value)} placeholder="Sale details..." />

                  <button type="submit" style={S.btn} disabled={!saleForm.quantity || saleMut.isPending}>
                    {saleMut.isPending ? 'Recording...' : 'Log Sale'}
                  </button>
                </form>

                <div style={S.sectionTitle}>Sales History</div>
                {sheepSales.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#9ca3af', fontSize: 12 }}>No sales recorded</div>
                ) : (
                  sheepSales.map(sale => (
                    <div key={sale.id} style={S.saleCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                            {sale.quantity} sheep {sale.buyer && `to ${sale.buyer}`}
                          </div>
                          {sale.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sale.description}</div>}
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                            {sale.sale_date} • {fmt(sale.sale_price)} per unit • Total: {fmt((sale.quantity || 1) * (sale.sale_price || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <LivestockEditModal
        isOpen={!!editAnimal}
        animal={editAnimal}
        animalLabel="Sheep"
        onClose={() => setEditAnimal(null)}
        onSave={async (id, payload) => {
          await updateSheep(id, payload);
          qc.invalidateQueries({ queryKey: ['sheep'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />

      <HealthRecordEditModal
        isOpen={!!editHealth}
        record={editHealth}
        showWoolKg={true}
        onClose={() => setEditHealth(null)}
        onSave={async (id, payload) => {
          await updateSheepHealth(id, payload);
          qc.invalidateQueries({ queryKey: ['sheepHealth'] });
        }}
      />

      {/* ── Delete Confirm Modal ── */}
      <ConfirmModal
        isOpen={!!delConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setDelConfirm(null)}
        fields={delConfirm ? [
          { label: 'Tag', value: delConfirm.item?.tag_number },
          { label: 'Name', value: delConfirm.item?.name || '—' },
          { label: 'Action', value: 'Delete permanently' },
        ] : []}
      />
    </>
  );
}
