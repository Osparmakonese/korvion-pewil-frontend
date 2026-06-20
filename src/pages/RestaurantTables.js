import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRestaurantTables, createRestaurantTable, setTableStatus, deleteRestaurantTable } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };

const STATUS = ['free', 'occupied', 'reserved', 'cleaning'];
const COLOR = { free: '#e8f5ee', occupied: '#fee2e2', reserved: '#fef3c7', cleaning: '#eef2ff' };
const TEXT = { free: '#1a6b3a', occupied: '#991b1b', reserved: '#92400e', cleaning: '#3730a3' };

export default function RestaurantTables() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['restaurant-tables'], queryFn: getRestaurantTables });
  const tables = arr(data);
  const empty = { label: '', seats: 4, zone: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({ mutationFn: createRestaurantTable, onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant-tables'] }); setForm(empty); } });
  const status = useMutation({ mutationFn: ({ id, s }) => setTableStatus(id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) });
  const del = useMutation({ mutationFn: deleteRestaurantTable, onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) });

  const cycle = (t) => {
    const next = STATUS[(STATUS.indexOf(t.status) + 1) % STATUS.length];
    status.mutate({ id: t.id, s: next });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Floor — tap a table to change its status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
          {tables.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No tables yet — add some on the right.</p>}
          {tables.map((t) => (
            <div key={t.id} onClick={() => cycle(t)} style={{ cursor: 'pointer', borderRadius: 10, padding: '14px 10px', textAlign: 'center', background: COLOR[t.status] || '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{t.label}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{t.seats} seats{t.zone ? ` · ${t.zone}` : ''}</div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: TEXT[t.status], marginTop: 4 }}>{t.status}</div>
              <button onClick={(e) => { e.stopPropagation(); del.mutate(t.id); }} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 10, cursor: 'pointer', marginTop: 2 }}>remove</button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Add table</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (form.label) create.mutate(form); }}>
          <label style={label}>Label / number</label>
          <input style={input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          <label style={label}>Seats</label>
          <input style={input} type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value || '1', 10) })} />
          <label style={label}>Zone / area</label>
          <input style={input} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="e.g. Patio, Bar" />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add table'}</button>
        </form>
      </div>
    </div>
  );
}
