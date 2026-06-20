import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getKitchenOrders, createKitchenOrder, transitionKitchenOrder, getRestaurantTables } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };

const COLUMNS = [
  { key: 'open', label: 'Open', next: 'sent', nextLabel: 'Send to kitchen' },
  { key: 'sent', label: 'Sent', next: 'preparing', nextLabel: 'Start preparing' },
  { key: 'preparing', label: 'Preparing', next: 'ready', nextLabel: 'Mark ready' },
  { key: 'ready', label: 'Ready', next: 'served', nextLabel: 'Mark served' },
];

export default function KitchenOrders() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['kitchen-orders'], queryFn: () => getKitchenOrders(), refetchInterval: 15000 });
  const { data: tablesData } = useQuery({ queryKey: ['restaurant-tables'], queryFn: getRestaurantTables });
  const orders = arr(data);
  const tables = arr(tablesData);
  const empty = { table: '', items_text: '', notes: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({
    mutationFn: createKitchenOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen-orders'] }); setForm(empty); },
  });
  const move = useMutation({
    mutationFn: ({ id, status }) => transitionKitchenOrder(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    const items_data = (form.items_text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ name: l, qty: 1 }));
    if (items_data.length === 0) return;
    create.mutate({ table: form.table || null, items_data, notes: form.notes });
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New order</h3>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={label}>Table</label>
            <select style={input} value={form.table} onChange={(e) => setForm({ ...form, table: e.target.value })}>
              <option value="">Walk-in / none</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Items (one per line)</label>
            <textarea style={{ ...input, minHeight: 38, fontFamily: 'inherit' }} value={form.items_text} onChange={(e) => setForm({ ...form, items_text: e.target.value })} placeholder={'Beef burger\nChips x2'} />
          </div>
          <div>
            <label style={label}>Notes</label>
            <input style={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="No onions…" />
          </div>
          <button style={{ ...btn, marginTop: 0 }} disabled={create.isPending}>Send</button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} style={{ ...card, marginBottom: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>{col.label} ({items.length})</div>
              {items.map((o) => (
                <div key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{o.table_label ? `Table ${o.table_label}` : 'Walk-in'}</div>
                  {(o.items_data || []).map((it, i) => <div key={i} style={{ fontSize: 11, color: '#374151' }}>• {it.qty || 1}× {it.name}</div>)}
                  {o.notes && <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>{o.notes}</div>}
                  <button onClick={() => move.mutate({ id: o.id, status: col.next })} style={{ ...btn, marginTop: 8, padding: '6px 10px', fontSize: 11, width: '100%' }}>{col.nextLabel}</button>
                </div>
              ))}
              {items.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af' }}>—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
