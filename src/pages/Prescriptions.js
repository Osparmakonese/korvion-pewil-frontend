// Prescriptions — Pharmacy Phase 3 (2026-08-31).
//
// What changed from the Phase 2 form: the patient is a RECORD, not a typed
// name (picker with allergies shown in red at the moment that matters);
// items are structured product lines with dosage (so the till and the label
// printer can use them); repeats are counted ("dispense 1 of 3"); and the
// whole Rx can be sent to the till — the sale it rings links back and counts
// the dispense automatically, mirroring how quotations convert.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPrescriptions, createPrescription, dispensePrescription,
  getPatients, createPatient, getProducts, createTicket, readyTicket,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const miniBtn = { padding: '6px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#111827' };
const pill = (s) => ({ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
  background: s === 'dispensed' ? '#e8f5ee' : s === 'cancelled' ? '#fee2e2' : s === 'partial' ? '#e0ecff' : '#fef3c7',
  color: s === 'dispensed' ? '#1a6b3a' : s === 'cancelled' ? '#991b1b' : s === 'partial' ? '#1d4ed8' : '#92400e' });
const allergyBanner = { background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, marginTop: 6 };

function printLabels(rx) {
  // Dispensing labels — one per item, sized for a small label printer but
  // printable on anything. Dosage is the label's whole reason to exist.
  const w = window.open('', '_blank', 'width=420,height=600');
  if (!w) return;
  const items = (rx.items_data || []).map((it) => `
    <div class="lbl">
      <div class="shop">${rx.pharmacy_name || ''}</div>
      <div class="pt"><b>${rx.patient_name || ''}</b></div>
      <div class="med">${it.name || it.description || ''} ${it.qty ? `× ${it.qty}` : ''}</div>
      <div class="dose">${it.dosage || ''}</div>
      ${it.instructions ? `<div class="ins">${it.instructions}</div>` : ''}
      <div class="rx">Rx #${rx.id} · ${new Date().toLocaleDateString()}</div>
      <div class="warn">KEEP OUT OF REACH OF CHILDREN</div>
    </div>`).join('');
  w.document.write(`<!doctype html><html><head><title>Labels Rx ${rx.id}</title><style>
    body{font-family:Arial,sans-serif;margin:8px}
    .lbl{border:1px dashed #999;padding:8px 10px;margin-bottom:8px;width:280px}
    .shop{font-size:10px;color:#555}.pt{font-size:13px}.med{font-size:13px;font-weight:bold;margin-top:2px}
    .dose{font-size:14px;font-weight:bold;margin-top:4px}.ins{font-size:11px;margin-top:2px}
    .rx{font-size:9px;color:#555;margin-top:4px}.warn{font-size:9px;font-weight:bold;margin-top:2px}
    @media print{.lbl{page-break-inside:avoid}}
  </style></head><body>${items}<script>window.print()</scr`+`ipt></body></html>`);
  w.document.close();
}

export default function Prescriptions({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['prescriptions'], queryFn: () => getPrescriptions() });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const list = arr(data);
  const products = arr(prodData);

  // ── patient picker ──
  const [patientQ, setPatientQ] = useState('');
  const [patient, setPatient] = useState(null);      // chosen Patient record
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', allergies: '' });
  const { data: patData } = useQuery({
    queryKey: ['patients', patientQ],
    queryFn: () => getPatients(patientQ),
    enabled: patientQ.trim().length >= 2 && !patient,
  });
  const patientHits = arr(patData);

  // ── form ──
  const emptyLine = { product: '', qty: '', dosage: '' };
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [form, setForm] = useState({ prescriber_name: '', prescriber_reg_no: '', refills_total: 1, notes: '' });

  const createPat = useMutation({
    mutationFn: createPatient,
    onSuccess: (p) => { setPatient(p); setShowNewPatient(false); setNewPatient({ name: '', phone: '', allergies: '' }); },
  });
  const create = useMutation({
    mutationFn: createPrescription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      setLines([{ ...emptyLine }]);
      setForm({ prescriber_name: '', prescriber_reg_no: '', refills_total: 1, notes: '' });
      setPatient(null); setPatientQ('');
    },
  });
  const dispense = useMutation({
    mutationFn: (id) => dispensePrescription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    const items_data = lines
      .filter((l) => l.product)
      .map((l) => {
        const prod = products.find((p) => p.id === Number(l.product));
        return { product: Number(l.product), name: prod?.name || '', qty: Number(l.qty) || 1, dosage: l.dosage || '' };
      });
    if (!items_data.length) return;
    if (!patient && !patientQ.trim()) return;
    create.mutate({
      patient: patient?.id || null,
      patient_name: patient?.name || patientQ.trim(),
      patient_phone: patient?.phone || '',
      prescriber_name: form.prescriber_name, prescriber_reg_no: form.prescriber_reg_no,
      refills_total: Math.max(1, Number(form.refills_total) || 1),
      notes: form.notes, items_data,
    });
  };

  // Park the Rx for the POS: cart fills with its lines at CURRENT shelf
  // prices, and the completed sale calls dispense with the real sale id.
  // "To till" (2026-09-01): creates a TICKET on the server, so ANY till in the
  // shop sees it on its board — the dispensary and the front counter no longer
  // need to be the same device. Falls back to the local hand-off if the
  // ticket API is unavailable (e.g. offline), so the button always works.
  const toTill = useMutation({
    mutationFn: async (rx) => {
      const lines = (rx.items_data || []).filter((it) => it.product).map((it) => ({
        product: Number(it.product), qty: it.qty || 1, notes: it.dosage || '',
      }));
      const tk = await createTicket({
        station: 'dispensary', patient: rx.patient || null, prescription: rx.id,
        customer_name: rx.patient_name, customer_phone: rx.patient_phone || rx.patient_detail?.phone || '',
        lines, client_key: `RX-${rx.id}-${Date.now().toString(36)}`,
      });
      return readyTicket(tk.id);
    },
    onSuccess: (tk) => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      window.alert(`Ticket ${tk.number} is on the till board. The customer pays at the front.`);
    },
    onError: (err, rx) => {
      try {
        localStorage.setItem('pewil_pending_rx', JSON.stringify({
          id: rx.id, patient: rx.patient || null, patient_name: rx.patient_name,
          allergies: rx.patient_detail?.allergies || '',
          medical_aid: rx.patient_detail?.medical_aid || null,
          member_number: rx.patient_detail?.member_number || '',
          member_suffix: rx.patient_detail?.member_suffix || '',
          items_data: rx.items_data || [],
        }));
      } catch (_) {}
      if (onTabChange) onTabChange('POS');
    },
  });

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Prescriptions</h3>
        {list.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No prescriptions yet.</p>}
        {list.map((rx) => {
          const repeats = rx.refills_total > 1 ? `${rx.refills_used || 0} of ${rx.refills_total} dispensed` : null;
          const canDispense = rx.status !== 'dispensed' && rx.status !== 'cancelled';
          return (
            <div key={rx.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {rx.patient_name} <span style={pill(rx.status)}>{rx.status}</span>
                    {repeats && <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700, marginLeft: 6 }}>{repeats}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {rx.prescriber_name ? `Dr ${rx.prescriber_name}` : 'No prescriber'} · {(rx.items_data || []).length} item(s)
                  </div>
                  {rx.patient_detail?.allergies && (
                    <div style={{ ...allergyBanner, marginTop: 4, padding: '3px 8px' }}>⚠ Allergies: {rx.patient_detail.allergies}</div>
                  )}
                  {(rx.items_data || []).map((it, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#374151' }}>
                      • {it.name || it.description}{it.qty ? ` × ${it.qty}` : ''}{it.dosage ? ` — ${it.dosage}` : ''}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {canDispense && (
                    <button onClick={() => toTill.mutate(rx)} disabled={toTill.isPending} style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}>🛒 To till</button>
                  )}
                  {canDispense && (
                    <button onClick={() => dispense.mutate(rx.id)} disabled={dispense.isPending} style={miniBtn}>✔ Dispense</button>
                  )}
                  <button onClick={() => printLabels(rx)} style={miniBtn}>🏷 Labels</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New prescription</h3>
        <form onSubmit={submit}>
          <label style={label}>Patient</label>
          {patient ? (
            <div style={{ border: '1px solid #bde3cc', background: '#f2faf5', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{patient.name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{patient.phone || 'no phone'}{patient.medical_aid_name ? ` · ${patient.medical_aid_name}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setPatient(null); setPatientQ(''); }} style={{ ...miniBtn, padding: '3px 8px' }}>change</button>
              </div>
              {patient.allergies && <div style={allergyBanner}>⚠ Allergies: {patient.allergies}</div>}
            </div>
          ) : (
            <>
              <input style={input} value={patientQ} placeholder="Search name / phone / member no…"
                     onChange={(e) => setPatientQ(e.target.value)} />
              {patientHits.length > 0 && (
                <div style={{ border: '1px solid #e3e8e4', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                  {patientHits.slice(0, 6).map((p) => (
                    <div key={p.id} onClick={() => setPatient(p)}
                         style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                      <b>{p.name}</b> <span style={{ color: '#6b7280', fontSize: 10 }}>{p.phone}</span>
                      {p.allergies && <span style={{ color: '#991b1b', fontSize: 10 }}> ⚠</span>}
                    </div>
                  ))}
                </div>
              )}
              {!showNewPatient && (
                <button type="button" onClick={() => setShowNewPatient(true)} style={{ ...miniBtn, marginTop: 6 }}>+ New patient</button>
              )}
              {showNewPatient && (
                <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 8, marginTop: 6 }}>
                  <input style={{ ...input, marginBottom: 4 }} placeholder="Full name" value={newPatient.name}
                         onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                  <input style={{ ...input, marginBottom: 4 }} placeholder="Phone" value={newPatient.phone}
                         onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                  <input style={input} placeholder="Allergies (as told by the patient)" value={newPatient.allergies}
                         onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} />
                  <button type="button" disabled={!newPatient.name || createPat.isPending}
                          onClick={() => createPat.mutate(newPatient)} style={{ ...btn, marginTop: 6, padding: '6px 12px' }}>
                    {createPat.isPending ? 'Saving…' : 'Save patient'}
                  </button>
                </div>
              )}
            </>
          )}

          <label style={label}>Items</label>
          {lines.map((l, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <select style={{ ...input, flex: '2 1 120px' }} value={l.product}
                      onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, product: e.target.value } : x))}>
                <option value="">Medicine…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input style={{ ...input, flex: '0 0 52px' }} type="number" min="1" placeholder="Qty" value={l.qty}
                     onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, qty: e.target.value } : x))} />
              <input style={{ ...input, flex: '2 1 100px' }} placeholder="Dosage e.g. 1 tab 3× daily" value={l.dosage}
                     onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, dosage: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { ...emptyLine }])} style={{ ...miniBtn, marginTop: 2 }}>+ Add line</button>

          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 2 }}>
              <label style={label}>Prescriber name</label>
              <input style={input} value={form.prescriber_name} onChange={(e) => setForm({ ...form, prescriber_name: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Repeats</label>
              <input style={input} type="number" min="1" max="12" value={form.refills_total}
                     onChange={(e) => setForm({ ...form, refills_total: e.target.value })} />
            </div>
          </div>
          <label style={label}>Prescriber reg. no.</label>
          <input style={input} value={form.prescriber_reg_no} onChange={(e) => setForm({ ...form, prescriber_reg_no: e.target.value })} />
          <label style={label}>Notes</label>
          <input style={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save prescription'}</button>
        </form>
      </div>
    </div>
  );
}
