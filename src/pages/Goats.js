import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoats, createGoat, updateGoat, deleteGoat, getGoatHealth, createGoatHealth, updateGoatHealth, deleteGoatHealth, getLivestockSales, createLivestockSale, deleteLivestockSale } from '../api/farmApi';
import { today, fmt, qty, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import LivestockEditModal from '../components/LivestockEditModal';
import HealthRecordEditModal from '../components/HealthRecordEditModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const emptyGoat = { tag_number: '', name: '', breed: '', sex: 'buck', date_of_birth: '', date_acquired: today(), purchase_price: '', weight_kg: '', status: 'active', cause_of_death: '', date_of_death: '', mother: '', notes: '' };
const emptyHealth = { goat: '', record_type: '', description: '', record_date: today(), cost: '', vet_name: '', next_due: '', notes: '' };
const emptySale = { goat: '', quantity: '1', buyer: '', sale_price: '', sale_date: today(), description: '' };

const STATUS_OPTIONS = [['active','Active'],['sold','Sold'],['deceased','Deceased'],['culled','Culled']];

const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 14,
    background: 'linear-gradient(135deg, #1a6b3a, #2d9e58)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden'
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  twoCol: { display: 'grid', gridTemplateColumns: '40% 60%', gap: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box', cursor: 'pointer' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, marginTop: 16 },
  tabs: { display: 'flex', gap: 0, marginBottom: 16 },
  tab: (active) => ({ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: active ? '#1a6b3a' : '#fff', color: active ? '#fff' : '#374151', transition: 'all .15s', borderRadius: active ? '0' : '0' }),
  goatCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  badge: (color) => ({ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'uppercase', background: color === 'buck' ? '#dcfce7' : color === 'doe' ? '#fef3c7' : '#f3f4f6', color: color === 'buck' ? '#166534' : color === 'doe' ? '#92400e' : '#374151' }),
  statusBadge: (status) => {
    const map = { active: ['#dcfce7','#166534'], sold: ['#dbeafe','#1e40af'], deceased: ['#fee2e2','#991b1b'], culled: ['#fef3c7','#92400e'] };
    const [bg, fg] = map[status] || map.active;
    return { display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'uppercase', background: bg, color: fg };
  },
  preview: { background: '#e8f5ee', borderRadius: 7, padding: '10px 14px', fontSize: 11, color: '#1a6b3a', marginTop: 8 },
};

export default function Goats() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [goatForm, setGoatForm] = useState(emptyGoat);
  const [healthForm, setHealthForm] = useState(emptyHealth);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [activeTab, setActiveTab] = useState('herd'); // 'herd' | 'health' | 'sales'
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all'
  const [delConfirm, setDelConfirm] = useState(null);
  const [editAnimal, setEditAnimal] = useState(null);
  const [editHealth, setEditHealth] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const { data: goats = [] } = useQuery({ queryKey: ['goats'], queryFn: getGoats });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['goatHealth'], queryFn: () => getGoatHealth({ animal_type: 'goat' }) });
  const { data: sales = [] } = useQuery({ queryKey: ['livestockSales'], queryFn: () => getLivestockSales({ animal_type: 'goat' }) });

  const addGoatMut = useMutation({
    mutationFn: createGoat,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goats'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setGoatForm(emptyGoat); },
  });

  const healthMut = useMutation({
    mutationFn: createGoatHealth,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goatHealth'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setHealthForm(emptyHealth); },
  });

  const saleMut = useMutation({
    mutationFn: createLivestockSale,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setSaleForm(emptySale); },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteGoat(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goats'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); },
  });

  const setG = (k, v) => setGoatForm(p => ({ ...p, [k]: v }));
  const setH = (k, v) => setHealthForm(p => ({ ...p, [k]: v }));
  const setS = (k, v) => setSaleForm(p => ({ ...p, [k]: v }));

  const filteredGoats = statusFilter === 'all' ? goats : goats.filter(g => (g.status || 'active') === 'active');
  const activeGoatsCount = goats.filter(g => (g.status || 'active') === 'active').length;

  const handleAddGoat = (e) => {
    e.preventDefault();
    addGoatMut.mutate({
      tag_number: goatForm.tag_number,
      name: goatForm.name || '',
      breed: goatForm.breed || '',
      sex: goatForm.sex,
      date_of_birth: goatForm.date_of_birth || null,
      date_acquired: goatForm.date_acquired,
      purchase_price: parseFloat(goatForm.purchase_price) || 0,
      weight_kg: parseFloat(goatForm.weight_kg) || 0,
      status: goatForm.status || 'active',
      cause_of_death: goatForm.cause_of_death || '',
      date_of_death: goatForm.date_of_death || null,
      mother: goatForm.mother ? parseInt(goatForm.mother) : null,
      notes: goatForm.notes || '',
    });
  };

  const handleAddHealth = (e) => {
    e.preventDefault();
    healthMut.mutate({
      goat: parseInt(healthForm.goat),
      type: healthForm.record_type,
      description: healthForm.description,
      record_date: healthForm.record_date,
      cost: parseFloat(healthForm.cost) || 0,
      vet_name: healthForm.vet_name || '',
      next_due: healthForm.next_due || '',
      notes: healthForm.notes || '',
    });
  };

  const handleAddSale = (e) => {
    e.preventDefault();
    const payload = {
      animal_type: 'goat',
      quantity: parseInt(saleForm.quantity) || 1,
      buyer: saleForm.buyer,
      sale_price: parseFloat(saleForm.sale_price),
      sale_date: saleForm.sale_date,
      description: saleForm.description || '',
    };
    if (saleForm.goat) payload.goat = parseInt(saleForm.goat);
    saleMut.mutate(payload);
  };

  return (
    <>
      {/* Banner */}
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.fields || IMAGES.dam} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Goat Herd Management</div>
          <div style={S.bannerSub}>Track herd health, breeding, and sales</div>
        </div>
      </div>

      <div style={S.twoCol}>
        {/* LEFT PANEL: Forms */}
        <div>
          {/* Add Goat Form */}
          <div style={S.card}>
            <div style={S.cardTitle}>Add Goat</div>
            <form onSubmit={handleAddGoat}>
              <label style={S.label}>Tag Number *</label>
              <input style={S.input} value={goatForm.tag_number} onChange={e => setG('tag_number', e.target.value)} placeholder="e.g. G001" required />

              <label style={S.label}>Name</label>
              <input style={S.input} value={goatForm.name} onChange={e => setG('name', e.target.value)} placeholder="e.g. Buttercup" />

              <div style={S.row2}>
                <div><label style={S.label}>Breed</label><input style={S.input} value={goatForm.breed} onChange={e => setG('breed', e.target.value)} placeholder="e.g. Boer" /></div>
                <div><label style={S.label}>Sex</label><select style={S.select} value={goatForm.sex} onChange={e => setG('sex', e.target.value)}><option value="buck">Buck</option><option value="doe">Doe</option><option value="kid">Kid</option></select></div>
              </div>

              <div style={S.row2}>
                <div><label style={S.label}>Date of Birth</label><input style={S.input} type="date" value={goatForm.date_of_birth} onChange={e => setG('date_of_birth', e.target.value)} /></div>
                <div><label style={S.label}>Date Acquired</label><input style={S.input} type="date" value={goatForm.date_acquired} onChange={e => setG('date_acquired', e.target.value)} /></div>
              </div>

              <div style={S.row2}>
                <div><label style={S.label}>Purchase Price ($)</label><input style={S.input} type="number" min="0" step="0.01" value={goatForm.purchase_price} onChange={e => setG('purchase_price', e.target.value)} placeholder="0.00" /></div>
                <div><label style={S.label}>Weight (kg)</label><input style={S.input} type="number" min="0" step="0.1" value={goatForm.weight_kg} onChange={e => setG('weight_kg', e.target.value)} placeholder="0.0" /></div>
              </div>

              <label style={S.label}>Status</label>
              <select style={S.select} value={goatForm.status} onChange={e => setG('status', e.target.value)}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              {(goatForm.status === 'deceased' || goatForm.status === 'culled') && (
                <div style={S.row2}>
                  <div><label style={S.label}>Cause of Death</label><input style={S.input} value={goatForm.cause_of_death} onChange={e => setG('cause_of_death', e.target.value)} placeholder="e.g. illness" /></div>
                  <div><label style={S.label}>Date of Death</label><input style={S.input} type="date" value={goatForm.date_of_death} onChange={e => setG('date_of_death', e.target.value)} /></div>
                </div>
              )}

              <label style={S.label}>Mother (for lineage)</label>
              <select style={S.select} value={goatForm.mother} onChange={e => setG('mother', e.target.value)}>
                <option value="">-- None --</option>
                {goats.filter(g => g.sex === 'doe' && (g.status || 'active') === 'active').map(g => (
                  <option key={g.id} value={g.id}>{g.tag_number}{g.name ? ` - ${g.name}` : ''}</option>
                ))}
              </select>

              <label style={S.label}>Notes</label>
              <input style={S.input} value={goatForm.notes} onChange={e => setG('notes', e.target.value)} placeholder="Health notes, markings, etc." />

              <button style={S.btn} type="submit" disabled={addGoatMut.isPending}>{addGoatMut.isPending ? 'Saving...' : '+ Add Goat'}</button>
            </form>
          </div>

          {/* Health Log Form */}
          {activeTab === 'health' && (
            <div style={S.card}>
              <div style={S.cardTitle}>Log Health Record</div>
              <form onSubmit={handleAddHealth}>
                <label style={S.label}>Goat</label>
                <select style={S.select} value={healthForm.goat} onChange={e => setH('goat', e.target.value)} required>
                  <option value="">Select goat...</option>
                  {goats.map(g => <option key={g.id} value={g.id}>{g.tag_number} - {g.name || 'Unnamed'}</option>)}
                </select>

                <label style={S.label}>Type</label>
                <select style={S.select} value={healthForm.record_type} onChange={e => setH('record_type', e.target.value)} required>
                  <option value="">Select type...</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="treatment">Treatment</option>
                  <option value="checkup">Checkup</option>
                  <option value="deworming">Deworming</option>
                  <option value="injury">Injury</option>
                  <option value="other">Other</option>
                </select>

                <label style={S.label}>Description</label>
                <input style={S.input} value={healthForm.description} onChange={e => setH('description', e.target.value)} placeholder="What was done?" />

                <div style={S.row2}>
                  <div><label style={S.label}>Date</label><input style={S.input} type="date" value={healthForm.record_date} onChange={e => setH('record_date', e.target.value)} /></div>
                  <div><label style={S.label}>Cost ($)</label><input style={S.input} type="number" min="0" step="0.01" value={healthForm.cost} onChange={e => setH('cost', e.target.value)} placeholder="0.00" /></div>
                </div>

                <label style={S.label}>Vet Name</label>
                <input style={S.input} value={healthForm.vet_name} onChange={e => setH('vet_name', e.target.value)} placeholder="Optional" />

                <label style={S.label}>Next Due Date</label>
                <input style={S.input} type="date" value={healthForm.next_due} onChange={e => setH('next_due', e.target.value)} />

                <label style={S.label}>Notes</label>
                <input style={S.input} value={healthForm.notes} onChange={e => setH('notes', e.target.value)} placeholder="Additional notes" />

                <button style={S.btn} type="submit" disabled={healthMut.isPending}>{healthMut.isPending ? 'Saving...' : '+ Log Health'}</button>
              </form>
            </div>
          )}

          {/* Sale Log Form */}
          {activeTab === 'sales' && (
            <div style={S.card}>
              <div style={S.cardTitle}>Log Sale</div>
              <form onSubmit={handleAddSale}>
                <label style={S.label}>Sell from Herd <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — links sale to animal)</span></label>
                <select style={S.select} value={saleForm.goat} onChange={e => setS('goat', e.target.value)}>
                  <option value="">Quick sale (no link)</option>
                  {goats.filter(g => g.status === 'active' || !g.status).map(g => (
                    <option key={g.id} value={g.id}>{g.tag_number} - {g.name || g.breed || 'Unnamed'}</option>
                  ))}
                </select>

                <label style={S.label}>Quantity Sold</label>
                <input style={S.input} type="number" min="1" value={saleForm.quantity} onChange={e => setS('quantity', e.target.value)} placeholder="Number of goats" required />

                <label style={S.label}>Buyer</label>
                <input style={S.input} value={saleForm.buyer} onChange={e => setS('buyer', e.target.value)} placeholder="Buyer name" required />

                <label style={S.label}>Sale Price ($)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={saleForm.sale_price} onChange={e => setS('sale_price', e.target.value)} placeholder="Total price" required />

                <label style={S.label}>Sale Date</label>
                <input style={S.input} type="date" value={saleForm.sale_date} onChange={e => setS('sale_date', e.target.value)} />

                <label style={S.label}>Description</label>
                <input style={S.input} value={saleForm.description} onChange={e => setS('description', e.target.value)} placeholder="e.g., Buck for breeding" />

                <button style={S.btn} type="submit" disabled={saleMut.isPending}>{saleMut.isPending ? 'Saving...' : '+ Log Sale'}</button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Lists */}
        <div>
          {/* Tab Navigation */}
          <div style={S.tabs}>
            <button onClick={() => setActiveTab('herd')} style={S.tab(activeTab === 'herd')}>Herd</button>
            <button onClick={() => setActiveTab('health')} style={S.tab(activeTab === 'health')}>Health</button>
            <button onClick={() => setActiveTab('sales')} style={S.tab(activeTab === 'sales')}>Sales</button>
          </div>

          {/* HERD TAB */}
          {activeTab === 'herd' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={S.sectionTitle}>Herd ({activeGoatsCount})</div>
                <select style={{ ...S.select, width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="all">All</option>
                </select>
              </div>
              {filteredGoats.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No goats yet.</p>}
              {filteredGoats.map(g => {
                const linkedHealth = healthRecords.filter(h => h.goat === g.id);
                const healthCost = linkedHealth.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
                const linkedSale = sales.find(s => s.goat === g.id);
                const salePrice = linkedSale ? parseFloat(linkedSale.sale_price) || 0 : 0;
                const purchasePrice = parseFloat(g.purchase_price) || 0;
                const totalCost = purchasePrice + healthCost;
                const pnl = salePrice - totalCost;
                return (
                <div key={g.id} style={S.goatCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        {g.tag_number}
                        {g.name && <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>({g.name})</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{g.breed || 'Unknown breed'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: 4 }}><span style={S.badge(g.sex)}>{g.sex}</span></div>
                      <div><span style={S.statusBadge(g.status || 'active')}>{g.status || 'active'}</span></div>
                    </div>
                  </div>

                  {g.weight_kg && <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>Weight: <strong>{qty(g.weight_kg)} kg</strong></div>}
                  {g.date_of_birth && <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>DOB: <strong>{g.date_of_birth}</strong></div>}
                  {g.purchase_price > 0 && <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>Purchase: <strong>{fmt(g.purchase_price)}</strong></div>}
                  {(g.status === 'deceased' || g.status === 'culled') && g.cause_of_death && (
                    <div style={{ fontSize: 10, color: '#991b1b', marginBottom: 6, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>
                      <strong>{g.status === 'deceased' ? 'Died' : 'Culled'}:</strong> {g.cause_of_death}{g.date_of_death && ` on ${g.date_of_death}`}
                    </div>
                  )}
                  {g.notes && <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', padding: '6px 10px', background: '#f9fafb', borderRadius: 6, marginBottom: 8 }}>{g.notes}</div>}
                  <div style={{ marginTop: 6, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, fontSize: 10 }}>
                    <div style={{ color: '#6b7280' }}>Costs: {fmt(totalCost)} {healthCost > 0 && <span>(health: {fmt(healthCost)})</span>}</div>
                    {salePrice > 0 && <div style={{ color: '#6b7280' }}>Sale: {fmt(salePrice)}</div>}
                    {(salePrice > 0 || (g.status && g.status !== 'active')) && (
                      <div style={{ fontWeight: 700, color: pnl >= 0 ? '#1a6b3a' : '#c0392b' }}>P&amp;L: {pnl >= 0 ? '+' : ''}{fmt(pnl)}</div>
                    )}
                  </div>

                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    {delConfirm === g.id ? (
                      <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#6b7280', marginRight: 4 }}>Delete?</span>
                        <button onClick={() => delMut.mutate(g.id)} style={{ fontSize: 10, padding: '2px 8px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>Yes</button>
                        <button onClick={() => setDelConfirm(null)} style={{ fontSize: 10, padding: '2px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer' }}>No</button>
                      </div>
                    ) : (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button onClick={() => setEditAnimal(g)} style={{ fontSize: 10, padding: '3px 10px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => setDelConfirm(g.id)} style={{ fontSize: 10, padding: '3px 10px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <>
              <div style={S.sectionTitle}>Health Records</div>
              {healthRecords.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No health records yet.</p>}
              {healthRecords.map((h, idx) => {
                const goat = goats.find(g => g.id === h.goat);
                return (
                  <div key={idx} style={S.goatCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{goat ? `${goat.tag_number} - ${goat.name || 'Unnamed'}` : 'Unknown Goat'}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}><strong>{h.record_type}</strong>: {h.description}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1a6b3a' }}>{fmt(h.cost || 0)}</div>
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Date: {h.record_date}</div>
                    {h.vet_name && <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Vet: {h.vet_name}</div>}
                    {h.next_due && <div style={{ fontSize: 10, color: '#1a6b3a', fontWeight: 600, marginBottom: 4 }}>Next due: {h.next_due}</div>}
                    {h.notes && <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', padding: '6px 10px', background: '#f9fafb', borderRadius: 6 }}>{h.notes}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={() => setEditHealth(h)} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#1a6b3a', border: '1px solid #1a6b3a', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                      <button onClick={async () => { if (window.confirm('Delete this health record?')) { await deleteGoatHealth(h.id); qc.invalidateQueries({ queryKey: ['goatHealth'] }); } }} style={{ fontSize: 9, padding: '2px 8px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <>
              <div style={S.sectionTitle}>Sales Log</div>
              {sales.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>No sales recorded yet.</p>}
              {sales.map((s, idx) => (
                <div key={idx} style={S.goatCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Sale: {s.quantity} goat{s.quantity > 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.buyer}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1a6b3a' }}>{fmt(s.sale_price)}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Date: {s.sale_date}</div>
                  {s.description && <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', padding: '6px 10px', background: '#f9fafb', borderRadius: 6 }}>{s.description}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmModal !== null} onConfirm={() => { if (confirmModal) confirmModal(); setConfirmModal(null); }} onCancel={() => setConfirmModal(null)} fields={[]} />

      <LivestockEditModal
        isOpen={!!editAnimal}
        animal={editAnimal}
        animalLabel="Goat"
        onClose={() => setEditAnimal(null)}
        onSave={async (id, payload) => {
          await updateGoat(id, payload);
          qc.invalidateQueries({ queryKey: ['goats'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />

      <HealthRecordEditModal
        isOpen={!!editHealth}
        record={editHealth}
        onClose={() => setEditHealth(null)}
        onSave={async (id, payload) => {
          await updateGoatHealth(id, payload);
          qc.invalidateQueries({ queryKey: ['goatHealth'] });
        }}
      />
    </>
  );
}
