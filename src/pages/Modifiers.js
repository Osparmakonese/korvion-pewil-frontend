import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getModifierGroups, createModifierGroup, deleteModifierGroup,
  createModifierOption, deleteModifierOption,
} from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '8px 14px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };

export default function Modifiers() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['modifier-groups'], queryFn: getModifierGroups });
  const groups = arr(data);
  const [form, setForm] = useState({ name: '', required: false, min_select: 0, max_select: 1 });
  const [optDraft, setOptDraft] = useState({});

  const createGroup = useMutation({ mutationFn: createModifierGroup, onSuccess: () => { qc.invalidateQueries({ queryKey: ['modifier-groups'] }); setForm({ name: '', required: false, min_select: 0, max_select: 1 }); } });
  const delGroup = useMutation({ mutationFn: deleteModifierGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ['modifier-groups'] }) });
  const addOption = useMutation({ mutationFn: createModifierOption, onSuccess: () => qc.invalidateQueries({ queryKey: ['modifier-groups'] }) });
  const delOption = useMutation({ mutationFn: deleteModifierOption, onSuccess: () => qc.invalidateQueries({ queryKey: ['modifier-groups'] }) });

  return (
    <div className="vtl-stack" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Modifier groups</h3>
        {groups.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No modifier groups yet.</p>}
        {groups.map((g) => (
          <div key={g.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{g.name} <span style={{ fontSize: 10, color: '#6b7280' }}>{g.required ? 'required' : 'optional'} · pick {g.min_select}–{g.max_select}</span></div>
              <button onClick={() => delGroup.mutate(g.id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 11 }}>Delete</button>
            </div>
            <div style={{ marginTop: 6 }}>
              {(g.options || []).map((o) => (
                <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#f3f4f6', borderRadius: 12, padding: '2px 8px', marginRight: 6, marginBottom: 4 }}>
                  {o.name}{Number(o.price_delta) ? ` +${Number(o.price_delta).toFixed(2)}` : ''}
                  <button onClick={() => delOption.mutate(o.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input style={{ ...input, marginTop: 0 }} placeholder="Option name" value={optDraft[g.id]?.name || ''} onChange={(e) => setOptDraft({ ...optDraft, [g.id]: { ...optDraft[g.id], name: e.target.value } })} />
              <input style={{ ...input, marginTop: 0, width: 90 }} type="number" step="0.01" placeholder="+price" value={optDraft[g.id]?.price_delta || ''} onChange={(e) => setOptDraft({ ...optDraft, [g.id]: { ...optDraft[g.id], price_delta: e.target.value } })} />
              <button style={{ ...btn, marginTop: 0 }} onClick={() => { const d = optDraft[g.id]; if (d?.name) { addOption.mutate({ group: g.id, name: d.name, price_delta: d.price_delta || 0 }); setOptDraft({ ...optDraft, [g.id]: { name: '', price_delta: '' } }); } }}>Add</button>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New group</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (form.name) createGroup.mutate(form); }}>
          <label style={label}>Name</label>
          <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Size, Extras" required />
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> Required
          </label>
          <label style={label}>Min select</label>
          <input style={input} type="number" min={0} value={form.min_select} onChange={(e) => setForm({ ...form, min_select: parseInt(e.target.value || '0', 10) })} />
          <label style={label}>Max select</label>
          <input style={input} type="number" min={1} value={form.max_select} onChange={(e) => setForm({ ...form, max_select: parseInt(e.target.value || '1', 10) })} />
          <button style={btn} disabled={createGroup.isPending}>{createGroup.isPending ? 'Saving…' : 'Add group'}</button>
        </form>
      </div>
    </div>
  );
}
