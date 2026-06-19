import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrescriptions, createPrescription, dispensePrescription } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const pill = (s) => ({ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
  background: s === 'dispensed' ? '#e8f5ee' : s === 'cancelled' ? '#fee2e2' : '#fef3c7',
  color: s === 'dispensed' ? '#1a6b3a' : s === 'cancelled' ? '#991b1b' : '#92400e' });

export default function Prescriptions() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['prescriptions'], queryFn: () => getPrescriptions() });
  const list = arr(data);
  const empty = { patient_name: '', patient_phone: '', prescriber_name: '', prescriber_reg_no: '', notes: '', items_text: '' };
  const [form, setForm] = useState(empty);

  const create = useMutation({
    mutationFn: createPrescription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prescriptions'] }); setForm(empty); },
  });
  const dispense = useMutation({
    mutationFn: (id) => dispensePrescription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.patient_name) return;
    // items_text: one "name x qty - dosage" per line -> items_data
    const items_data = (form.items_text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ description: l }));
    create.mutate({
      patient_name: form.patient_name, patient_phone: form.patient_phone,
      prescriber_name: form.prescriber_name, prescriber_reg_no: form.prescriber_reg_no,
      notes: form.notes, items_data,
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Prescriptions</h3>
        {list.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No prescriptions yet.</p>}
        {list.map((rx) => (
          <div key={rx.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{rx.patient_name} <span style={pill(rx.status)}>{rx.status}</span></div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {rx.prescriber_name ? `Dr ${rx.prescriber_name}` : 'No prescriber'} · {(rx.items_data || []).length} item(s)
              </div>
              {(rx.items_data || []).map((it, i) => <div key={i} style={{ fontSize: 11, color: '#374151' }}>• {it.description || it.name}</div>)}
            </div>
            {rx.status !== 'dispensed' && (
              <button onClick={() => dispense.mutate(rx.id)} style={{ ...btn, marginTop: 0, padding: '6px 12px' }}>Dispense</button>
            )}
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New prescription</h3>
        <form onSubmit={submit}>
          <label style={label}>Patient name</label>
          <input style={input} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} required />
          <label style={label}>Patient phone</label>
          <input style={input} value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} />
          <label style={label}>Prescriber name</label>
          <input style={input} value={form.prescriber_name} onChange={(e) => setForm({ ...form, prescriber_name: e.target.value })} />
          <label style={label}>Prescriber reg. no.</label>
          <input style={input} value={form.prescriber_reg_no} onChange={(e) => setForm({ ...form, prescriber_reg_no: e.target.value })} />
          <label style={label}>Items (one per line)</label>
          <textarea style={{ ...input, minHeight: 70, fontFamily: 'inherit' }} value={form.items_text} onChange={(e) => setForm({ ...form, items_text: e.target.value })} placeholder={'Amoxicillin 500mg x 21 - 1 tab 3x daily'} />
          <label style={label}>Notes</label>
          <input style={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save prescription'}</button>
        </form>
      </div>
    </div>
  );
}
