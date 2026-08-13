import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLayerFlocks, createLayerFlock, updateLayerFlock, deleteLayerFlock,
  getEggCollections, createEggCollection, deleteEggCollection,
  getLayerExpenses, createLayerExpense, deleteLayerExpense,
  getLivestockSales, createLivestockSale, deleteLivestockSale,
} from '../api/farmApi';
import { fmt, today, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const EXPENSE_CATS = [
  ['feed', 'Feed'],
  ['medication', 'Medication'],
  ['vaccination', 'Vaccination'],
  ['equipment', 'Equipment'],
  ['other', 'Other'],
];

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '40% 1fr', gap: 20 },
  banner: { position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  bannerImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20, 30, 60, 0.85), rgba(0, 0, 0, 0.25))' },
  bannerContent: { position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  bannerSub: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 },
  tabsContainer: { display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e3e8e4', paddingBottom: 0 },
  tabBtn: (active) => ({
    padding: '10px 16px',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: active ? '#1a6b3a' : '#9ca3af',
    borderBottom: active ? '2px solid #1a6b3a' : '2px solid transparent',
    transition: 'all 0.2s',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  flockCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  flockCardInfo: { flex: 1 },
  flockCardName: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 },
  flockCardMeta: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  badge: { display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '4px 8px', borderRadius: 4, marginRight: 4 },
  badgeActive: { background: '#dcfce7', color: '#166534' },
  badgeInactive: { background: '#fecaca', color: '#991b1b' },
  preview: { background: '#e8f5ee', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginTop: 10, fontSize: 11, color: '#1a6b3a' },
  total: { background: '#f6f8f6', border: '1px solid #e3e8e4', borderRadius: 10, padding: 14, marginTop: 16, fontSize: 12, fontWeight: 600, color: '#111827' },
};

export default function Layers() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('flocks');
  const [formFlock, setFormFlock] = useState({ flock_name: '', quantity: '', date_acquired: today(), purchase_price: '', notes: '' });
  const [formEgg, setFormEgg] = useState({ flock: '', record_date: today(), eggs_collected: '', broken: '', notes: '' });
  const [formExpense, setFormExpense] = useState({ flock: '', category: 'feed', description: '', amount: '', record_date: today(), notes: '' });
  const [formSale, setFormSale] = useState({ flock: '', quantity: '', buyer: '', sale_price: '', sale_date: today(), description: '' });
  const [delConfirm, setDelConfirm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [mortalityModal, setMortalityModal] = useState(null);
  const [mortalityCount, setMortalityCount] = useState('');
  const [rowDelete, setRowDelete] = useState(null);

  const { data: flocks = [] } = useQuery({ queryKey: ['layerFlocks'], queryFn: getLayerFlocks });
  const { data: eggs = [] } = useQuery({ queryKey: ['eggCollections'], queryFn: () => getEggCollections() });
  const { data: expenses = [] } = useQuery({ queryKey: ['layerExpenses'], queryFn: () => getLayerExpenses() });
  const { data: sales = [] } = useQuery({ queryKey: ['livestockSales'], queryFn: () => getLivestockSales({ animal_type: 'eggs' }) });

  const mutFlock = useMutation({ mutationFn: createLayerFlock, onSuccess: () => { qc.invalidateQueries({ queryKey: ['layerFlocks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setFormFlock({ flock_name: '', quantity: '', date_acquired: today(), purchase_price: '', notes: '' }); } });
  const delFlockMut = useMutation({ mutationFn: (id) => deleteLayerFlock(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['layerFlocks'] }); setDelConfirm(null); } });
  const updateFlockMut = useMutation({ mutationFn: ({ id, data }) => updateLayerFlock(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['layerFlocks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setMortalityModal(null); setMortalityCount(''); } });
  const mutEgg = useMutation({ mutationFn: createEggCollection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['eggCollections'] }); setFormEgg({ flock: '', record_date: today(), eggs_collected: '', broken: '', notes: '' }); } });
  const delEggMut = useMutation({ mutationFn: (id) => deleteEggCollection(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['eggCollections'] }); setRowDelete(null); } });
  const mutExpense = useMutation({ mutationFn: createLayerExpense, onSuccess: () => { qc.invalidateQueries({ queryKey: ['layerExpenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setFormExpense({ flock: '', category: 'feed', description: '', amount: '', record_date: today(), notes: '' }); } });
  const delExpenseMut = useMutation({ mutationFn: (id) => deleteLayerExpense(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['layerExpenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setRowDelete(null); } });
  const mutSale = useMutation({ mutationFn: createLivestockSale, onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); qc.invalidateQueries({ queryKey: ['layerFlocks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setFormSale({ flock: '', quantity: '', buyer: '', sale_price: '', sale_date: today(), description: '' }); } });
  const delSaleMut = useMutation({ mutationFn: (id) => deleteLivestockSale(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setRowDelete(null); } });

  const setFlock = (k, v) => setFormFlock(p => ({ ...p, [k]: v }));
  const setEgg = (k, v) => setFormEgg(p => ({ ...p, [k]: v }));
  const setExp = (k, v) => setFormExpense(p => ({ ...p, [k]: v }));
  const setSale = (k, v) => setFormSale(p => ({ ...p, [k]: v }));

  const submitFlock = (e) => {
    e.preventDefault();
    if (!formFlock.flock_name || !formFlock.quantity) return;
    const payload = {
      flock_name: formFlock.flock_name,
      quantity: parseInt(formFlock.quantity),
      date_acquired: formFlock.date_acquired,
      purchase_price: formFlock.purchase_price ? parseFloat(formFlock.purchase_price) : null,
      notes: formFlock.notes,
    };
    setPendingAction({ type: 'flock', data: payload });
    setConfirmOpen(true);
  };

  const submitEgg = (e) => {
    e.preventDefault();
    if (!formEgg.flock || !formEgg.eggs_collected) return;
    const payload = {
      flock: parseInt(formEgg.flock),
      record_date: formEgg.record_date,
      eggs_collected: parseInt(formEgg.eggs_collected),
      broken: formEgg.broken ? parseInt(formEgg.broken) : 0,
      notes: formEgg.notes,
    };
    setPendingAction({ type: 'egg', data: payload });
    setConfirmOpen(true);
  };

  const submitExpense = (e) => {
    e.preventDefault();
    if (!formExpense.flock || !formExpense.category || !formExpense.description || !formExpense.amount) return;
    const payload = {
      flock: parseInt(formExpense.flock),
      category: formExpense.category,
      description: formExpense.description,
      amount: parseFloat(formExpense.amount),
      record_date: formExpense.record_date,
      notes: formExpense.notes,
    };
    setPendingAction({ type: 'expense', data: payload });
    setConfirmOpen(true);
  };

  const submitSale = (e) => {
    e.preventDefault();
    if (!formSale.quantity || !formSale.buyer || !formSale.sale_price) return;
    const payload = {
      quantity: parseInt(formSale.quantity),
      buyer: formSale.buyer,
      sale_price: parseFloat(formSale.sale_price),
      sale_date: formSale.sale_date,
      description: formSale.description,
      animal_type: 'eggs',
      layer_flock: formSale.flock ? parseInt(formSale.flock) : null,
    };
    setPendingAction({ type: 'sale', data: payload });
    setConfirmOpen(true);
  };

  const submitMortality = () => {
    if (!mortalityModal || mortalityCount === '') return;
    const newMortality = (mortalityModal.mortality || 0) + parseInt(mortalityCount);
    const newCurrent = Math.max(0, (mortalityModal.current_count || mortalityModal.quantity) - parseInt(mortalityCount));
    updateFlockMut.mutate({ id: mortalityModal.id, data: { mortality: newMortality, current_count: newCurrent } });
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (!pendingAction) return;
    if (pendingAction.type === 'flock') mutFlock.mutate(pendingAction.data);
    else if (pendingAction.type === 'egg') mutEgg.mutate(pendingAction.data);
    else if (pendingAction.type === 'expense') mutExpense.mutate(pendingAction.data);
    else if (pendingAction.type === 'sale') mutSale.mutate(pendingAction.data);
    setPendingAction(null);
  };

  const totalBirds = flocks.reduce((sum, f) => sum + (f.current_count != null ? f.current_count : (f.quantity || 0)), 0);
  const totalEggs = eggs.reduce((sum, e) => sum + (e.eggs_collected || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalPurchases = flocks.reduce((sum, f) => sum + (parseFloat(f.purchase_price) || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + ((parseFloat(s.sale_price) || 0) * (parseInt(s.quantity) || 0)), 0);
  const totalCost = totalPurchases + totalExpenses;
  const profit = totalRevenue - totalCost;

  return (
    <>
      <div className="two-col-layout" style={S.twoCol}>
        {/* LEFT PANEL - ADD FLOCK FORM */}
        <div>
          <div style={S.banner}>
            <img src={IMAGES.layers || IMAGES.fields} alt="" style={S.bannerImg} />
            <div style={S.bannerOverlay} />
            <div style={S.bannerContent}>
              <div style={S.bannerTitle}>Layer Flocks</div>
              <div style={S.bannerSub}>Manage egg-laying poultry</div>
            </div>
          </div>
          <form style={S.card} onSubmit={submitFlock}>
            <label style={S.label}>Flock Name</label>
            <input style={S.input} value={formFlock.flock_name} onChange={e => setFlock('flock_name', e.target.value)} placeholder="e.g. Brown Hens - Batch 1" required />
            <label style={S.label}>Quantity (Birds)</label>
            <input style={S.input} type="number" min="1" value={formFlock.quantity} onChange={e => setFlock('quantity', e.target.value)} placeholder="e.g. 100" required />
            <div className="form-grid-2" style={S.row2}>
              <div>
                <label style={S.label}>Date Acquired</label>
                <input style={S.input} type="date" value={formFlock.date_acquired} onChange={e => setFlock('date_acquired', e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Purchase Price</label>
                <input style={S.input} type="number" min="0" step="0.01" value={formFlock.purchase_price} onChange={e => setFlock('purchase_price', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <label style={S.label}>Notes</label>
            <input style={S.input} value={formFlock.notes} onChange={e => setFlock('notes', e.target.value)} placeholder="e.g. Supplier details, breed..." />
            <button style={S.btn} type="submit" disabled={mutFlock.isPending}>
              {mutFlock.isPending ? 'Saving...' : '+ Add Flock'}
            </button>
            {mutFlock.isError && <p style={S.error}>{mutFlock.error?.response?.data?.detail || 'Failed to save'}</p>}
          </form>
        </div>

        {/* RIGHT PANEL - TABS */}
        <div>
          <div style={S.tabsContainer}>
            <button style={S.tabBtn(activeTab === 'flocks')} onClick={() => setActiveTab('flocks')}>Flocks</button>
            <button style={S.tabBtn(activeTab === 'eggs')} onClick={() => setActiveTab('eggs')}>Eggs</button>
            <button style={S.tabBtn(activeTab === 'expenses')} onClick={() => setActiveTab('expenses')}>Expenses</button>
            <button style={S.tabBtn(activeTab === 'sales')} onClick={() => setActiveTab('sales')}>Sales</button>
          </div>

          {/* FLOCKS TAB */}
          {activeTab === 'flocks' && (
            <div>
              <div style={S.sectionTitle}>Active Flocks</div>
              {flocks.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No flocks added yet.</p>
              ) : (
                <>
                  {flocks.map((flock) => {
                    const flockExpenses = expenses.filter(e => e.flock === flock.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                    const flockEggs = eggs.filter(e => e.flock === flock.id).reduce((s, e) => s + (parseInt(e.eggs_collected) || 0), 0);
                    const purchase = parseFloat(flock.purchase_price) || 0;
                    const flockTotalCost = purchase + flockExpenses;
                    return (
                      <div key={flock.id} style={{ ...S.flockCard, display: 'block' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={S.flockCardInfo}>
                            <div style={S.flockCardName}>{flock.flock_name}</div>
                            <div style={S.flockCardMeta}>
                              <span style={{ ...S.badge, ...S.badgeActive }}>{flock.status === 'sold' ? 'Sold' : 'Active'}</span>
                              {flock.current_count != null ? flock.current_count : flock.quantity} of {flock.quantity} birds
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>Mortality: {flock.mortality || 0} | Added: {flock.date_acquired}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                            <button
                              onClick={() => { setMortalityModal(flock); setMortalityCount(''); }}
                              style={{ fontSize: 10, padding: '4px 8px', background: '#fff', color: '#c97d1a', border: '1px solid #fcd34d', borderRadius: 4, cursor: 'pointer' }}
                            >
                              + Mortality
                            </button>
                            <button
                              onClick={() => setDelConfirm(flock.id)}
                              style={{ fontSize: 10, padding: '4px 8px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div style={{ background: '#f6f8f6', border: '1px solid #e3e8e4', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ color: '#6b7280' }}>Purchase:</span>
                            <span style={{ color: '#111827', fontWeight: 600 }}>{fmt(purchase)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ color: '#6b7280' }}>Expenses:</span>
                            <span style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(flockExpenses)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e3e8e4', paddingTop: 3, marginTop: 3 }}>
                            <span style={{ color: '#374151', fontWeight: 700 }}>Total Cost:</span>
                            <span style={{ color: '#1a6b3a', fontWeight: 700 }}>{fmt(flockTotalCost)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                            <span style={{ color: '#6b7280' }}>Eggs collected:</span>
                            <span style={{ color: '#374151', fontWeight: 600 }}>{flockEggs}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div style={S.total}>Total Active Birds: {totalBirds}</div>
              {flocks.length > 0 && (() => {
                const isProfit = profit >= 0;
                return (
                  <div style={{ background: isProfit ? '#f0faf4' : '#fff5f5', border: `1px solid ${isProfit ? '#bbf7d0' : '#fca5a5'}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>All Flocks P&L</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                      <div><span style={{ color: '#6b7280' }}>Purchase:</span> <strong>{fmt(totalPurchases)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Expenses:</span> <strong style={{ color: '#c0392b' }}>{fmt(totalExpenses)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Egg Revenue:</span> <strong style={{ color: '#1a6b3a' }}>{fmt(totalRevenue)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Total Cost:</span> <strong>{fmt(totalCost)}</strong></div>
                    </div>
                    <div style={{ borderTop: `1px solid ${isProfit ? '#bbf7d0' : '#fca5a5'}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isProfit ? 'Profit' : 'Loss'}:</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isProfit ? '#1a6b3a' : '#c0392b' }}>{fmt(Math.abs(profit))}</span>
                    </div>
                  </div>
                );
              })()}
              {delConfirm && (
                <ConfirmModal
                  isOpen={true}
                  onCancel={() => setDelConfirm(null)}
                  onConfirm={() => { delFlockMut.mutate(delConfirm); setDelConfirm(null); }}
                  fields={[{ label: 'Action', value: 'Delete this flock?' }]}
                />
              )}
            </div>
          )}

          {/* EGGS TAB */}
          {activeTab === 'eggs' && (
            <div>
              <form style={S.card} onSubmit={submitEgg}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Log Egg Collection</div>
                <label style={S.label}>Flock</label>
                <select style={S.input} value={formEgg.flock} onChange={e => setEgg('flock', e.target.value)} required>
                  <option value="">Select flock...</option>
                  {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_name}</option>)}
                </select>
                <div className="form-grid-2" style={S.row2}>
                  <div>
                    <label style={S.label}>Date</label>
                    <input style={S.input} type="date" value={formEgg.record_date} onChange={e => setEgg('record_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Eggs Collected</label>
                    <input style={S.input} type="number" min="0" value={formEgg.eggs_collected} onChange={e => setEgg('eggs_collected', e.target.value)} placeholder="0" required />
                  </div>
                </div>
                <label style={S.label}>Broken</label>
                <input style={S.input} type="number" min="0" value={formEgg.broken} onChange={e => setEgg('broken', e.target.value)} placeholder="0" />
                <label style={S.label}>Notes</label>
                <input style={S.input} value={formEgg.notes} onChange={e => setEgg('notes', e.target.value)} placeholder="e.g. weather conditions..." />
                <button style={S.btn} type="submit" disabled={mutEgg.isPending}>
                  {mutEgg.isPending ? 'Saving...' : '+ Log Collection'}
                </button>
                {mutEgg.isError && <p style={S.error}>{mutEgg.error?.response?.data?.detail || 'Failed to save'}</p>}
              </form>

              <div style={S.sectionTitle}>Egg Collection Records</div>
              {eggs.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No egg collections logged yet.</p>
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e3e8e4', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}><table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Flock</th>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Collected</th>
                        <th style={S.th}>Broken</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {eggs.map((egg, i) => (
                        <tr key={egg.id || i}>
                          <td style={S.td}>{egg.flock_name || 'Unknown'}</td>
                          <td style={S.td}>{egg.record_date || egg.date || '-'}</td>
                          <td style={S.td}>{egg.eggs_collected}</td>
                          <td style={S.td}>{egg.broken || 0}</td>
                          <td style={S.td}>
                            <button
                              onClick={() => setRowDelete({ type: 'egg', id: egg.id, label: `${egg.eggs_collected} eggs on ${egg.record_date || egg.date}` })}
                              style={{ fontSize: 9, padding: '2px 6px', background: 'none', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
              <div style={S.total}>Total Eggs Collected: {totalEggs}</div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div>
              <form style={S.card} onSubmit={submitExpense}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Log Expense</div>
                <label style={S.label}>Flock</label>
                <select style={S.input} value={formExpense.flock} onChange={e => setExp('flock', e.target.value)} required>
                  <option value="">Select flock...</option>
                  {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_name}</option>)}
                </select>
                <label style={S.label}>Category</label>
                <select style={S.input} value={formExpense.category} onChange={e => setExp('category', e.target.value)}>
                  {EXPENSE_CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <label style={S.label}>Description</label>
                <input style={S.input} value={formExpense.description} onChange={e => setExp('description', e.target.value)} placeholder="e.g. 20kg feed sack" required />
                <div className="form-grid-2" style={S.row2}>
                  <div>
                    <label style={S.label}>Amount</label>
                    <input style={S.input} type="number" min="0" step="0.01" value={formExpense.amount} onChange={e => setExp('amount', e.target.value)} placeholder="0.00" required />
                  </div>
                  <div>
                    <label style={S.label}>Date</label>
                    <input style={S.input} type="date" value={formExpense.record_date} onChange={e => setExp('record_date', e.target.value)} />
                  </div>
                </div>
                <label style={S.label}>Notes</label>
                <input style={S.input} value={formExpense.notes} onChange={e => setExp('notes', e.target.value)} placeholder="e.g. supplier details..." />
                <button style={S.btn} type="submit" disabled={mutExpense.isPending}>
                  {mutExpense.isPending ? 'Saving...' : '+ Log Expense'}
                </button>
                {mutExpense.isError && <p style={S.error}>{mutExpense.error?.response?.data?.detail || 'Failed to save'}</p>}
              </form>

              <div style={S.sectionTitle}>Expense Records</div>
              {expenses.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No expenses logged yet.</p>
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e3e8e4', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}><table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Flock</th>
                        <th style={S.th}>Category</th>
                        <th style={S.th}>Description</th>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Amount</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp, i) => (
                        <tr key={exp.id || i}>
                          <td style={S.td}>{exp.flock_name || 'Unknown'}</td>
                          <td style={S.td}>{exp.category}</td>
                          <td style={S.td}>{exp.description}</td>
                          <td style={S.td}>{exp.record_date || exp.date || '-'}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#c0392b' }}>{fmt(exp.amount)}</td>
                          <td style={S.td}>
                            <button
                              onClick={() => setRowDelete({ type: 'expense', id: exp.id, label: `${exp.description} (${fmt(exp.amount)})` })}
                              style={{ fontSize: 9, padding: '2px 6px', background: 'none', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
              <div style={S.total}>Total Expenses: {fmt(totalExpenses)}</div>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div>
              <form style={S.card} onSubmit={submitSale}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Log Egg Sale</div>
                <label style={S.label}>Flock (optional)</label>
                <select style={S.input} value={formSale.flock} onChange={e => setSale('flock', e.target.value)}>
                  <option value="">-- No flock link --</option>
                  {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_name}</option>)}
                </select>
                <label style={S.label}>Quantity (Eggs)</label>
                <input style={S.input} type="number" min="0" value={formSale.quantity} onChange={e => setSale('quantity', e.target.value)} placeholder="e.g. 30" required />
                <label style={S.label}>Buyer</label>
                <input style={S.input} value={formSale.buyer} onChange={e => setSale('buyer', e.target.value)} placeholder="e.g. John's Restaurant" required />
                <div className="form-grid-2" style={S.row2}>
                  <div>
                    <label style={S.label}>Sale Price</label>
                    <input style={S.input} type="number" min="0" step="0.01" value={formSale.sale_price} onChange={e => setSale('sale_price', e.target.value)} placeholder="0.00" required />
                  </div>
                  <div>
                    <label style={S.label}>Sale Date</label>
                    <input style={S.input} type="date" value={formSale.sale_date} onChange={e => setSale('sale_date', e.target.value)} />
                  </div>
                </div>
                <label style={S.label}>Description</label>
                <input style={S.input} value={formSale.description} onChange={e => setSale('description', e.target.value)} placeholder="e.g. delivery notes..." />
                <button style={S.btn} type="submit" disabled={mutSale.isPending}>
                  {mutSale.isPending ? 'Saving...' : '+ Log Sale'}
                </button>
                {mutSale.isError && <p style={S.error}>{mutSale.error?.response?.data?.detail || 'Failed to save'}</p>}
              </form>

              <div style={S.sectionTitle}>Sales Records</div>
              {sales.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No sales logged yet.</p>
              ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e3e8e4', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}><table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Quantity</th>
                        <th style={S.th}>Buyer</th>
                        <th style={S.th}>Sale Date</th>
                        <th style={S.th}>Price</th>
                        <th style={S.th}>Total</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale, i) => (
                        <tr key={sale.id || i}>
                          <td style={S.td}>{sale.quantity}</td>
                          <td style={S.td}>{sale.buyer}</td>
                          <td style={S.td}>{sale.sale_date || '-'}</td>
                          <td style={S.td}>{fmt(sale.sale_price)}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#1a6b3a' }}>{fmt((sale.quantity || 0) * (sale.sale_price || 0))}</td>
                          <td style={S.td}>
                            <button
                              onClick={() => setRowDelete({ type: 'sale', id: sale.id, label: `${sale.quantity} eggs → ${sale.buyer}` })}
                              style={{ fontSize: 9, padding: '2px 6px', background: 'none', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mortality Modal */}
      {mortalityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Record Mortality</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Flock: <strong>{mortalityModal.flock_name}</strong> · Current: {mortalityModal.current_count || 0} birds</div>
            <label style={S.label}>How many died?</label>
            <input style={S.input} type="number" min="1" max={mortalityModal.current_count || mortalityModal.quantity} value={mortalityCount} onChange={e => setMortalityCount(e.target.value)} autoFocus placeholder="0" />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setMortalityModal(null); setMortalityCount(''); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button onClick={submitMortality} disabled={!mortalityCount || updateFlockMut.isPending} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#c97d1a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (!mortalityCount || updateFlockMut.isPending) ? 0.5 : 1 }}>
                {updateFlockMut.isPending ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Delete Confirm */}
      {rowDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete {rowDelete.type}?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>Remove "<strong>{rowDelete.label}</strong>"? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRowDelete(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button
                onClick={() => {
                  if (rowDelete.type === 'egg') delEggMut.mutate(rowDelete.id);
                  else if (rowDelete.type === 'expense') delExpenseMut.mutate(rowDelete.id);
                  else if (rowDelete.type === 'sale') delSaleMut.mutate(rowDelete.id);
                }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => { setConfirmOpen(false); setPendingAction(null); }}
        onConfirm={handleConfirm}
        fields={pendingAction ? [
          pendingAction.type === 'flock' && { label: 'Flock Name', value: pendingAction.data.flock_name },
          pendingAction.type === 'flock' && { label: 'Quantity', value: pendingAction.data.quantity },
          pendingAction.type === 'flock' && { label: 'Date Acquired', value: pendingAction.data.date_acquired },
          pendingAction.type === 'egg' && { label: 'Eggs Collected', value: pendingAction.data.eggs_collected },
          pendingAction.type === 'egg' && { label: 'Date', value: pendingAction.data.record_date },
          pendingAction.type === 'expense' && { label: 'Description', value: pendingAction.data.description },
          pendingAction.type === 'expense' && { label: 'Amount', value: fmt(pendingAction.data.amount) },
          pendingAction.type === 'expense' && { label: 'Date', value: pendingAction.data.record_date },
          pendingAction.type === 'sale' && { label: 'Quantity (Eggs)', value: pendingAction.data.quantity },
          pendingAction.type === 'sale' && { label: 'Buyer', value: pendingAction.data.buyer },
          pendingAction.type === 'sale' && { label: 'Sale Date', value: pendingAction.data.sale_date },
          pendingAction.type === 'sale' && { label: 'Total', value: fmt((pendingAction.data.quantity || 0) * (pendingAction.data.sale_price || 0)) },
        ].filter(Boolean) : []}
      />
    </>
  );
}
