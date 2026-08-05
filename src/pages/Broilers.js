import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBroilerBatches, createBroilerBatch, updateBroilerBatch, deleteBroilerBatch,
  getBroilerExpenses, createBroilerExpense, deleteBroilerExpense,
  getLivestockSales, createLivestockSale, deleteLivestockSale,
} from '../api/farmApi';
import { today, fmt, qty, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const EXPENSE_CATEGORIES = [['feed', 'Feed'], ['medication', 'Medication'], ['vaccination', 'Vaccination'], ['equipment', 'Equipment'], ['other', 'Other']];

const emptyBatch = { batch_name: '', quantity: '', date_acquired: today(), purchase_price: '', target_weight: '', notes: '' };
const emptyExpense = { batch: '', category: 'feed', description: '', amount: '', record_date: today(), notes: '' };
const emptySale = { batch: '', quantity: '', buyer: '', sale_price: '', sale_date: today(), description: '' };

const S = {
  banner: {
    height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 16,
    background: 'linear-gradient(135deg, #1a6b3a, #2d8659)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  twoCol: { display: 'grid', gridTemplateColumns: '40% 1fr', gap: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Playfair Display', serif" },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, fontFamily: "'Playfair Display', serif" },
  tabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: (active) => ({ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: active ? '#1a6b3a' : '#fff', color: active ? '#fff' : '#374151', borderRadius: 7, transition: 'all .15s' }),
  batchCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12 },
  batchName: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 },
  batchMeta: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  badge: (bg, color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: color, marginBottom: 6 }),
  deleteBtn: { width: '100%', padding: '6px', background: 'none', border: '1px solid #c0392b', borderRadius: 6, color: '#c0392b', fontSize: 10, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  totalBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 },
  totalValue: { fontSize: 24, fontWeight: 700, color: '#1a6b3a', marginBottom: 4 },
  totalLabel: { fontSize: 11, color: '#6b7280' },
  expenseRecord: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 },
  expenseRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 },
  expenseAmount: { fontWeight: 700, color: '#c97d1a' },
  saleRecord: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 },
  saleRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 },
  saleAmount: { fontWeight: 700, color: '#1a6b3a' },
  summary: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#1e40af', marginTop: 12 },
};

export default function Broilers() {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'expenses' | 'sales'
  const [delConfirm, setDelConfirm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [mortalityModal, setMortalityModal] = useState(null); // batch being edited
  const [mortalityCount, setMortalityCount] = useState('');
  const [rowDelete, setRowDelete] = useState(null); // {type:'expense'|'sale', id, label}

  const { data: batches = [] } = useQuery({ queryKey: ['broilerBatches'], queryFn: getBroilerBatches });
  const { data: expenses = [] } = useQuery({ queryKey: ['broilerExpenses'], queryFn: () => getBroilerExpenses() });
  const { data: sales = [] } = useQuery({ queryKey: ['livestockSales'], queryFn: () => getLivestockSales({ animal_type: 'broiler' }) });

  const addBatchMut = useMutation({
    mutationFn: createBroilerBatch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broilerBatches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setBatchForm(emptyBatch); },
  });

  const delBatchMut = useMutation({
    mutationFn: (id) => deleteBroilerBatch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broilerBatches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); },
  });

  const addExpenseMut = useMutation({
    mutationFn: createBroilerExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broilerExpenses'] }); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setExpenseForm(emptyExpense); },
  });

  const delExpenseMut = useMutation({
    mutationFn: (id) => deleteBroilerExpense(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broilerExpenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setRowDelete(null); },
  });

  const addSaleMut = useMutation({
    mutationFn: createLivestockSale,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); qc.invalidateQueries({ queryKey: ['broilerBatches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setSaleForm(emptySale); },
  });

  const delSaleMut = useMutation({
    mutationFn: (id) => deleteLivestockSale(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['livestockSales'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setRowDelete(null); },
  });

  const updateBatchMut = useMutation({
    mutationFn: ({ id, data }) => updateBroilerBatch(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['broilerBatches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setMortalityModal(null); setMortalityCount(''); },
  });

  const setB = (k, v) => setBatchForm(p => ({ ...p, [k]: v }));
  const setE = (k, v) => setExpenseForm(p => ({ ...p, [k]: v }));
  const setS = (k, v) => setSaleForm(p => ({ ...p, [k]: v }));

  const submitBatch = (e) => {
    e.preventDefault();
    if (!batchForm.batch_name.trim() || !batchForm.quantity) return;
    setPending({
      'Batch Name': batchForm.batch_name,
      'Quantity': batchForm.quantity,
      'Date Acquired': fmt(batchForm.date_acquired),
      'Purchase Price': batchForm.purchase_price ? fmt(parseFloat(batchForm.purchase_price)) : '-',
      'Target Weight': batchForm.target_weight ? `${batchForm.target_weight} kg` : '-',
    });
    setConfirmOpen(true);
  };

  const confirmBatch = () => {
    addBatchMut.mutate({
      batch_name: batchForm.batch_name,
      quantity: parseInt(batchForm.quantity),
      date_acquired: batchForm.date_acquired,
      purchase_price: batchForm.purchase_price ? parseFloat(batchForm.purchase_price) : null,
      target_weight: batchForm.target_weight ? parseFloat(batchForm.target_weight) : null,
      notes: batchForm.notes,
    });
    setConfirmOpen(false);
  };

  const submitExpense = (e) => {
    e.preventDefault();
    if (!expenseForm.batch || !expenseForm.amount) return;
    addExpenseMut.mutate({
      batch: parseInt(expenseForm.batch),
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      record_date: expenseForm.record_date || null,
      notes: expenseForm.notes,
    });
  };

  const submitSale = (e) => {
    e.preventDefault();
    if (!saleForm.quantity || !saleForm.sale_price) return;
    addSaleMut.mutate({
      animal_type: 'broiler',
      broiler_batch: saleForm.batch ? parseInt(saleForm.batch) : null,
      quantity: parseInt(saleForm.quantity),
      buyer: saleForm.buyer || null,
      sale_price: parseFloat(saleForm.sale_price),
      sale_date: saleForm.sale_date,
      description: saleForm.description,
    });
  };

  const submitMortality = () => {
    if (!mortalityModal || mortalityCount === '') return;
    const newMortality = (mortalityModal.mortality || 0) + parseInt(mortalityCount);
    const newCurrent = Math.max(0, (mortalityModal.current_count || mortalityModal.quantity) - parseInt(mortalityCount));
    updateBatchMut.mutate({ id: mortalityModal.id, data: { mortality: newMortality, current_count: newCurrent } });
  };

  // Calculate total active birds (use server-maintained current_count)
  const totalBirds = batches.reduce((sum, b) => sum + (b.current_count || 0), 0);

  // Calculate totals for expenses and sales
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.sale_price) || 0), 0);

  const confirmModalFields = pending ? Object.entries(pending).map(([label, value]) => ({ label, value })) : [];

  return (
    <>
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.broilers || IMAGES.fields} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,107,58,0.85), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Broiler Management</div>
          <div style={S.bannerSub}>Manage broiler batches, expenses, and sales</div>
        </div>
      </div>

      <div style={S.twoCol}>
        {/* LEFT PANEL: Add Batch Form */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>Add Batch</div>
            <form onSubmit={submitBatch}>
              <label style={S.label}>Batch Name</label>
              <input style={S.input} value={batchForm.batch_name} onChange={e => setB('batch_name', e.target.value)} placeholder="e.g. Batch A - Jan 2026" required />

              <label style={S.label}>Quantity (birds)</label>
              <input style={S.input} type="number" min="1" value={batchForm.quantity} onChange={e => setB('quantity', e.target.value)} placeholder="100" required />

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Date Acquired</label>
                  <input style={S.input} type="date" value={batchForm.date_acquired} onChange={e => setB('date_acquired', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Purchase Price ($)</label>
                  <input style={S.input} type="number" step="0.01" min="0" value={batchForm.purchase_price} onChange={e => setB('purchase_price', e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <label style={S.label}>Target Weight (kg)</label>
              <input style={S.input} type="number" step="0.1" min="0" value={batchForm.target_weight} onChange={e => setB('target_weight', e.target.value)} placeholder="2.5" />

              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={batchForm.notes} onChange={e => setB('notes', e.target.value)} placeholder="Optional notes..." />

              <button style={S.btn} type="submit">Add Batch</button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Tabs */}
        <div>
          <div style={S.tabs}>
            <button style={S.tab(activeTab === 'batches')} onClick={() => setActiveTab('batches')}>Batches</button>
            <button style={S.tab(activeTab === 'expenses')} onClick={() => setActiveTab('expenses')}>Expenses</button>
            <button style={S.tab(activeTab === 'sales')} onClick={() => setActiveTab('sales')}>Sales</button>
          </div>

          {/* BATCHES TAB */}
          {activeTab === 'batches' && (
            <div>
              <div style={S.totalBox}>
                <div style={S.totalValue}>{totalBirds}</div>
                <div style={S.totalLabel}>Active Birds Across All Batches</div>
              </div>
              {(() => {
                const purchaseCosts = batches.reduce((s, b) => s + (parseFloat(b.purchase_price) || 0), 0);
                const totalCost = purchaseCosts + totalExpenses;
                const profit = totalSalesRevenue - totalCost;
                const isProfit = profit >= 0;
                return (
                  <div style={{ background: isProfit ? '#f0faf4' : '#fff5f5', border: `1px solid ${isProfit ? '#bbf7d0' : '#fca5a5'}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>All Batches P&L</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                      <div><span style={{ color: '#6b7280' }}>Purchase:</span> <strong>{fmt(purchaseCosts)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Expenses:</span> <strong style={{ color: '#c0392b' }}>{fmt(totalExpenses)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Revenue:</span> <strong style={{ color: '#1a6b3a' }}>{fmt(totalSalesRevenue)}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Total Cost:</span> <strong>{fmt(totalCost)}</strong></div>
                    </div>
                    <div style={{ borderTop: `1px solid ${isProfit ? '#bbf7d0' : '#fca5a5'}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isProfit ? 'Profit' : 'Loss'}:</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isProfit ? '#1a6b3a' : '#c0392b' }}>{fmt(Math.abs(profit))}</span>
                    </div>
                  </div>
                );
              })()}

              <div style={S.sectionTitle}>Batch List</div>
              {batches.length === 0 ? (
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                  No batches yet. Add one using the form on the left.
                </div>
              ) : (
                batches.map(batch => {
                  const mortality = batch.mortality || 0;
                  const currentCount = batch.current_count != null ? batch.current_count : Math.max(0, batch.quantity - mortality);
                  const sold = Math.max(0, batch.quantity - mortality - currentCount);
                  const statusColor = currentCount > 0 ? '#dcfce7' : '#fee2e2';
                  const statusTextColor = currentCount > 0 ? '#166534' : '#991b1b';
                  const batchExpenses = expenses.filter(e => e.batch === batch.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                  const purchaseCost = parseFloat(batch.purchase_price) || 0;
                  const totalCost = purchaseCost + batchExpenses;
                  const costPerBird = batch.quantity > 0 ? totalCost / batch.quantity : 0;

                  return (
                    <div key={batch.id} style={S.batchCard}>
                      <div style={S.batchName}>{batch.batch_name}</div>
                      <div style={S.batchMeta}>Started: {fmt(batch.date_acquired)}</div>
                      <div style={S.batchMeta}>Current: <strong>{currentCount}</strong> of {batch.quantity} birds</div>
                      {mortality > 0 && <div style={{ ...S.batchMeta, color: '#c0392b' }}>Mortality: {mortality}</div>}
                      {sold > 0 && <div style={{ ...S.batchMeta, color: '#1a6b3a' }}>Sold: {sold}</div>}
                      {batch.target_weight && <div style={S.batchMeta}>Target: {qty(batch.target_weight)} kg</div>}
                      <div style={S.badge(statusColor, statusTextColor)}>
                        {currentCount > 0 ? 'Active' : 'Finished'}
                      </div>
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', marginTop: 6, fontSize: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: '#6b7280' }}>Purchase:</span>
                          <span style={{ color: '#111827', fontWeight: 600 }}>{fmt(purchaseCost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: '#6b7280' }}>Expenses:</span>
                          <span style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(batchExpenses)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 3, marginTop: 3 }}>
                          <span style={{ color: '#374151', fontWeight: 700 }}>Total Cost:</span>
                          <span style={{ color: '#1a6b3a', fontWeight: 700 }}>{fmt(totalCost)}</span>
                        </div>
                        {currentCount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                            <span style={{ color: '#6b7280' }}>Per bird:</span>
                            <span style={{ color: '#374151', fontWeight: 600 }}>{fmt(costPerBird)}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #c97d1a', borderRadius: 6, color: '#c97d1a', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => { setMortalityModal(batch); setMortalityCount(''); }}
                        >
                          + Mortality
                        </button>
                        <button style={{ ...S.deleteBtn, marginTop: 0, flex: 1 }} onClick={() => setDelConfirm(batch)}>Delete</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div>
              <div style={S.card}>
                <div style={S.cardTitle}>Log Expense</div>
                <form onSubmit={submitExpense}>
                  <label style={S.label}>Batch</label>
                  <select style={S.input} value={expenseForm.batch} onChange={e => setE('batch', e.target.value)} required>
                    <option value="">-- Select batch --</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>

                  <label style={S.label}>Category</label>
                  <select style={S.input} value={expenseForm.category} onChange={e => setE('category', e.target.value)}>
                    {EXPENSE_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>

                  <label style={S.label}>Description</label>
                  <input style={S.input} value={expenseForm.description} onChange={e => setE('description', e.target.value)} placeholder="e.g. Feed purchase" />

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Amount ($)</label>
                      <input style={S.input} type="number" step="0.01" min="0" value={expenseForm.amount} onChange={e => setE('amount', e.target.value)} placeholder="0.00" required />
                    </div>
                    <div>
                      <label style={S.label}>Date</label>
                      <input style={S.input} type="date" value={expenseForm.record_date} onChange={e => setE('record_date', e.target.value)} />
                    </div>
                  </div>

                  <label style={S.label}>Notes</label>
                  <textarea style={S.textarea} value={expenseForm.notes} onChange={e => setE('notes', e.target.value)} placeholder="Optional notes..." />

                  <button style={S.btn} type="submit">Log Expense</button>
                </form>
              </div>

              <div style={S.sectionTitle}>Expense Records</div>
              {expenses.length === 0 ? (
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                  No expenses recorded yet.
                </div>
              ) : (
                <>
                  {expenses.map(exp => (
                    <div key={exp.id} style={S.expenseRecord}>
                      <div style={S.expenseRow}>
                        <span>{exp.description || exp.category}</span>
                        <span style={S.expenseAmount}>{fmt(exp.amount)}</span>
                      </div>
                      <div style={{ ...S.expenseRow, alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: 10 }}>{fmt(exp.record_date || exp.date)} · {batches.find(b => b.id === exp.batch)?.batch_name || 'Unknown'}</span>
                        <button
                          onClick={() => setRowDelete({ type: 'expense', id: exp.id, label: `${exp.description || exp.category} (${fmt(exp.amount)})` })}
                          style={{ fontSize: 9, padding: '3px 6px', background: 'none', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={S.summary}>
                    Total Expenses: <strong>{fmt(totalExpenses)}</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div>
              <div style={S.card}>
                <div style={S.cardTitle}>Log Sale</div>
                <form onSubmit={submitSale}>
                  <label style={S.label}>Batch (optional, decrements count)</label>
                  <select style={S.input} value={saleForm.batch} onChange={e => setS('batch', e.target.value)}>
                    <option value="">-- No batch link --</option>
                    {batches.filter(b => (b.current_count || 0) > 0).map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.current_count} birds)</option>)}
                  </select>

                  <label style={S.label}>Quantity (birds)</label>
                  <input style={S.input} type="number" min="1" value={saleForm.quantity} onChange={e => setS('quantity', e.target.value)} placeholder="10" required />

                  <label style={S.label}>Buyer</label>
                  <input style={S.input} value={saleForm.buyer} onChange={e => setS('buyer', e.target.value)} placeholder="e.g. Local restaurant" />

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Sale Price ($)</label>
                      <input style={S.input} type="number" step="0.01" min="0" value={saleForm.sale_price} onChange={e => setS('sale_price', e.target.value)} placeholder="0.00" required />
                    </div>
                    <div>
                      <label style={S.label}>Sale Date</label>
                      <input style={S.input} type="date" value={saleForm.sale_date} onChange={e => setS('sale_date', e.target.value)} />
                    </div>
                  </div>

                  <label style={S.label}>Description</label>
                  <textarea style={S.textarea} value={saleForm.description} onChange={e => setS('description', e.target.value)} placeholder="Optional notes..." />

                  <button style={S.btn} type="submit">Log Sale</button>
                </form>
              </div>

              <div style={S.sectionTitle}>Sales Records</div>
              {sales.length === 0 ? (
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                  No sales recorded yet.
                </div>
              ) : (
                <>
                  {sales.map(sale => (
                    <div key={sale.id} style={S.saleRecord}>
                      <div style={S.saleRow}>
                        <span>{sale.quantity} birds - {sale.buyer || 'Direct'}</span>
                        <span style={S.saleAmount}>{fmt(sale.sale_price)}</span>
                      </div>
                      <div style={{ ...S.saleRow, alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: 10 }}>{fmt(sale.sale_date)} · {sale.description || '-'}</span>
                        <button
                          onClick={() => setRowDelete({ type: 'sale', id: sale.id, label: `${sale.quantity} birds → ${sale.buyer || 'Direct'} (${fmt(sale.sale_price)})` })}
                          style={{ fontSize: 9, padding: '3px 6px', background: 'none', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={S.summary}>
                    Total Sales Revenue: <strong>{fmt(totalSalesRevenue)}</strong>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Batch Modal */}
      <ConfirmModal isOpen={confirmOpen} onConfirm={confirmBatch} onCancel={() => setConfirmOpen(false)} fields={confirmModalFields} />

      {/* Mortality Modal */}
      {mortalityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Record Mortality</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Batch: <strong>{mortalityModal.batch_name}</strong> · Current: {mortalityModal.current_count || 0} birds</div>
            <label style={S.label}>How many died?</label>
            <input style={S.input} type="number" min="1" max={mortalityModal.current_count || mortalityModal.quantity} value={mortalityCount} onChange={e => setMortalityCount(e.target.value)} autoFocus placeholder="0" />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setMortalityModal(null); setMortalityCount(''); }} style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button onClick={submitMortality} disabled={!mortalityCount || updateBatchMut.isPending} style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', background: '#c97d1a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (!mortalityCount || updateBatchMut.isPending) ? 0.5 : 1 }}>
                {updateBatchMut.isPending ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Delete Confirm (expense or sale) */}
      {rowDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete {rowDelete.type}?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>Remove "<strong>{rowDelete.label}</strong>"? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRowDelete(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button
                onClick={() => rowDelete.type === 'expense' ? delExpenseMut.mutate(rowDelete.id) : delSaleMut.mutate(rowDelete.id)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirm */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Delete Batch?</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>Are you sure you want to delete "<strong>{delConfirm.batch_name}</strong>"? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelConfirm(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button onClick={() => delBatchMut.mutate(delConfirm.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', background: '#c0392b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
