import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFields, getExpenses, createExpense, deleteExpense, getStock } from '../api/farmApi';
import { fmt, qty as fmtQty, today, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const CATS = [
  ['seeds_seedlings','Seed'],['fertilizer_chemicals','Fertiliser'],
  ['fertilizer_chemicals','Chemical'],['transport_fuel','Fuel'],
  ['transport_fuel','Transport'],['equipment_tools','Equipment'],
  ['food_meals','Labour'],['other','Other'],
];
const STOCK_CATS = ['seeds_seedlings','fertilizer_chemicals','transport_fuel'];
const empty = { field:'', category:'food_meals', description:'', amount:'', qty:'', stock_item:'', expense_date:today(), logged_by:'' };
const S = {
  twoCol:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 },
  info:{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'12px 16px', fontSize:11, color:'#1d4ed8', marginBottom:14 },
  bannerTitle:{ color:'#fff', fontSize:16, fontWeight:700, fontFamily:"'Playfair Display', serif" },
  bannerSub:{ color:'rgba(255,255,255,0.7)', fontSize:11 },
  card:{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:18, marginBottom:16 },
  label:{ display:'block', fontSize:10, fontWeight:600, color:'#6b7280', marginBottom:3, marginTop:8 },
  input:{ width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:12, outline:'none', color:'#111827', boxSizing:'border-box' },
  row2:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  btn:{ width:'100%', padding:'10px', background:'#1a6b3a', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', marginTop:14 },
  error:{ fontSize:10, color:'#c0392b', marginTop:4 },
  sectionTitle:{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:10 },
  table:{ width:'100%', borderCollapse:'collapse', fontSize:11 },
  th:{ textAlign:'left', padding:'8px 10px', fontSize:9, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' },
  td:{ padding:'8px 10px', borderBottom:'1px solid #f3f4f6', color:'#374151' },
  preview:{ background:'#e8f5ee', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px 14px', marginTop:10, fontSize:11, color:'#1a6b3a' },
  warn:{ background:'#fef3e2', border:'1px solid #f59e0b', borderRadius:8, padding:'12px 14px', marginTop:10, fontSize:11, color:'#92400e' },
};

export default function Costs({ onTabChange }) {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [delConfirm, setDelConfirm] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: getStock });
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => getExpenses() });
  const mut = useMutation({ mutationFn: createExpense, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['stock'] }); setForm(empty); } });
  const delMut = useMutation({ mutationFn: (id) => deleteExpense(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDelConfirm(null); } });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isStockCat = STOCK_CATS.includes(form.category);
  const catItems = stock.filter(s => {
    if (form.category === 'seeds_seedlings') return s.category === 'seed';
    if (form.category === 'fertilizer_chemicals') return s.category === 'fertilizer' || s.category === 'chemical';
    if (form.category === 'transport_fuel') return s.category === 'fuel';
    return false;
  });
  const sel = stock.find(s => String(s.id) === String(form.stock_item));
  const qty = parseFloat(form.qty) || 0;
  const calcAmt = sel ? qty * parseFloat(sel.unit_cost || 0) : 0;
  const remaining = sel ? parseFloat(sel.remaining_qty ?? sel.opening_qty) - qty : null;

  const submit = (e) => {
    e.preventDefault();
    if (isStockCat) {
      if (!catItems.length || !form.stock_item || qty <= 0) return;
      const desc = sel ? qty + ' ' + sel.unit + ' ' + sel.name : form.description;
      const payload = { field: parseInt(form.field), category: form.category, description: desc, amount: calcAmt, expense_date: form.expense_date, logged_by: form.logged_by, stock_item: parseInt(form.stock_item), qty: qty };
      setPending(payload);
    } else {
      setPending({ field: parseInt(form.field), category: form.category, description: form.description, amount: parseFloat(form.amount), expense_date: form.expense_date, logged_by: form.logged_by });
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <div style={S.info}>Chemicals, fertilizers, seeds and fuel: select from Stock and enter quantity - the system calculates the cost automatically.</div>
      <div className="two-col-layout" style={S.twoCol}>
        <div>
          <div style={{ position:'relative', height:110, borderRadius:10, overflow:'hidden', marginBottom:14 }}>
            <img src={IMAGES.cost} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(20,30,60,0.85),rgba(0,0,0,0.25))' }} />
            <div style={{ position:'absolute', bottom:0, left:0, padding:'12px 16px', color:'#fff', zIndex:1 }}>
              <div style={S.bannerTitle}>Farm Costs &amp; Expenses</div>
              <div style={S.bannerSub}>Track all farm expenditure</div>
            </div>
          </div>
          <form style={S.card} onSubmit={submit}>
            <div className="form-grid-2" style={S.row2}>
              <div><label style={S.label}>Field</label><select style={S.input} value={form.field} onChange={e => set('field', e.target.value)} required><option value="">Select...</option>{fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
              <div><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => { set('category', e.target.value); set('stock_item',''); set('qty',''); }}>{CATS.map(([v,l]) => <option key={v+l} value={v}>{l}</option>)}</select></div>
            </div>
            {isStockCat ? (
              catItems.length === 0 ? (
                <div style={S.warn}>
                  <div style={{ fontWeight:600, marginBottom:6 }}>No matching items in Stock</div>
                  <div style={{ marginBottom:10 }}>Add items to Stock first, then come back here.</div>
                  <button type="button" onClick={() => onTabChange && onTabChange('Stock')} style={{ fontSize:11, padding:'6px 14px', background:'#1a6b3a', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>Go to Stock</button>
                </div>
              ) : (
                <>
                  <label style={S.label}>Select Item from Stock</label>
                  <select style={S.input} value={form.stock_item} onChange={e => set('stock_item', e.target.value)} required>
                    <option value="">Select stock item...</option>
                    {catItems.map(s => <option key={s.id} value={s.id}>{s.name} - {fmt(s.unit_cost)}/{s.unit} ({fmtQty(s.remaining_qty ?? s.opening_qty)} {s.unit} left)</option>)}
                  </select>
                  <div className="form-grid-2" style={S.row2}>
                    <div><label style={S.label}>Quantity Used{sel ? ' ('+sel.unit+')' : ''}</label><input style={S.input} type="number" min="0.01" step="any" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="e.g. 5" required /></div>
                    <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} /></div>
                  </div>
                  {sel && qty > 0 && (
                    <div style={S.preview}>
                      <div style={{ fontWeight:700, marginBottom:4 }}>Cost Preview</div>
                      <div>{qty} {sel.unit} x {fmt(sel.unit_cost)}/{sel.unit} = <strong>{fmt(calcAmt)}</strong></div>
                      {remaining !== null && <div style={{ marginTop:4, color: remaining < 0 ? '#c0392b' : '#1a6b3a' }}>{remaining < 0 ? 'Not enough stock available' : 'Remaining after: ' + remaining + ' ' + sel.unit}</div>}
                    </div>
                  )}
                  <label style={S.label}>Logged By</label>
                  <input style={S.input} value={form.logged_by} onChange={e => set('logged_by', e.target.value)} placeholder="Your name" />
                </>
              )
            ) : (
              <>
                <label style={S.label}>Description</label>
                <input style={S.input} value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. 3 workers weeding" required />
                <div className="form-grid-2" style={S.row2}>
                  <div><label style={S.label}>Amount ($)</label><input style={S.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" /></div>
                  <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} /></div>
                </div>
                <label style={S.label}>Logged By</label>
                <input style={S.input} value={form.logged_by} onChange={e => set('logged_by', e.target.value)} placeholder="Your name" />
              </>
            )}
            <button style={S.btn} type="submit" disabled={mut.isPending || (isStockCat && remaining !== null && remaining < 0)}>
              {mut.isPending ? 'Saving...' : '+ Save Expense'}
            </button>
            {mut.isError && <p style={S.error}>{mut.error?.response?.data?.detail || 'Failed to save'}</p>}
          </form>
        </div>
        <div>
          <div style={S.sectionTitle}>Expense Log</div>
          {isLoading ? <p style={{ fontSize:11, color:'#9ca3af' }}>Loading...</p> : (
            <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', overflow:'hidden' }}>
              <div style={{ overflowX: 'auto' }}><table style={S.table}>
                <thead><tr><th style={S.th}>Description</th><th style={S.th}>Category</th><th style={S.th}>Field</th><th style={S.th}>Date</th><th style={S.th}>Amount</th><th style={S.th}></th></tr></thead>
                <tbody>
                  {(Array.isArray(expenses) ? expenses : []).map((ex, i) => (
                    <tr key={ex.id || i}>
                      <td style={S.td}>{ex.description || ex.category}{ex.is_auto && <span className="pill-blue" style={{ marginLeft:6 }}>AUTO</span>}</td>
                      <td style={S.td}>{ex.category}</td>
                      <td style={S.td}>{ex.field_name || '-'}</td>
                      <td style={S.td}>{ex.expense_date || ex.date}</td>
                      <td style={{ ...S.td, fontWeight:700, color:'#c0392b' }}>{fmt(ex.amount)}</td>
                      <td style={S.td}>
                        {delConfirm === (ex.id || i) ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => delMut.mutate(ex.id)} style={{ fontSize:10, padding:'2px 6px', background:'#c0392b', color:'#fff', border:'none', borderRadius:3, cursor:'pointer' }}>Yes</button>
                            <button onClick={() => setDelConfirm(null)} style={{ fontSize:10, padding:'2px 6px', background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:3, cursor:'pointer' }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelConfirm(ex.id || i)} style={{ fontSize:10, padding:'2px 6px', background:'#fff', color:'#c0392b', border:'1px solid #fca5a5', borderRadius:3, cursor:'pointer' }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(expenses) ? expenses : []).length === 0 && <tr><td style={S.td} colSpan={6}>No expenses logged yet.</td></tr>}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal isOpen={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); mut.mutate(pending); }}
        fields={pending ? [
          { label:'Field', value:(fields.find(f => String(f.id) === String(pending.field)) || {}).name || pending.field },
          { label:'Category', value:pending.category },
          { label:'Description', value:pending.description },
          { label:'Amount', value:pending.amount ? fmt(pending.amount) : '' },
          { label:'Date', value:pending.expense_date },
        ] : []} />
    </>
  );
}
