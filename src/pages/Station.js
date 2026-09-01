// Station — any device becomes a counter that sends work to the till (2026-09-01).
//
// Pharmacy: the dispensary. Butchery/deli/bakery: the counter (weights in kg).
// Clothing: the fitting-room hold. Hardware/wholesale: the quote desk.
// One page, shaped by the tenant's features; it creates TICKETS, never sales.
// Pay-ahead: request mobile money from the customer's phone while they queue;
// WhatsApp them their ticket slip. The till sees PAID and just hands over.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getTickets, createTicket, readyTicket, voidTicket, notifyTicket,
  attachTicketPayment, collectPayment, getProducts, getPatients, createPatient,
  createPrescription, listBranches, intakeScript,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';
import { fmtQty } from '../utils/format';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' };
const btn = { padding: '12px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 10, minHeight: 44 };
const miniBtn = { padding: '8px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#111827', minHeight: 40 };
const allergyBanner = { background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, marginTop: 6 };
const pill = (s) => ({ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
  background: s === 'paid' ? '#1a6b3a' : s === 'ready' ? '#e0ecff' : s === 'closed' ? '#e8f5ee' : s === 'void' || s === 'expired' ? '#fee2e2' : '#fef3c7',
  color: s === 'paid' ? '#fff' : s === 'ready' ? '#1d4ed8' : s === 'closed' ? '#1a6b3a' : s === 'void' || s === 'expired' ? '#991b1b' : '#92400e' });

const STATIONS = [
  { key: 'dispensary', label: 'Dispensary', feature: 'dispensary', emoji: '💊' },
  { key: 'counter', label: 'Counter', feature: 'tickets', emoji: '🥩' },
  { key: 'fitting_room', label: 'Fitting-room hold', feature: 'size_exchange', emoji: '👟' },
  { key: 'quote_desk', label: 'Quote desk', feature: 'quotations', emoji: '📋' },
];

function newKey() {
  try { return 'TK-' + crypto.randomUUID(); } catch (_) { return 'TK-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

export default function Station({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { user } = useAuth() || {};
  const features = Array.isArray(user?.features) ? user.features : [];
  const has = (f) => features.includes(f);
  const stations = STATIONS.filter((s) => has(s.feature));
  const weighable = has('weighable');
  const isPharmacy = has('dispensary');

  const [station, setStation] = useState(stations[0]?.key || 'counter');
  useEffect(() => { if (stations.length && !stations.find((s) => s.key === station)) setStation(stations[0].key); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stations.length]);

  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: branchData } = useQuery({ queryKey: ['branches'], queryFn: listBranches });
  const { data: mineData, refetch } = useQuery({
    queryKey: ['tickets-mine', station],
    queryFn: () => getTickets({ status: 'open,ready,paid', station }),
    refetchInterval: 15_000,
  });
  const products = arr(prodData);
  const branches = arr(branchData);
  const mine = arr(mineData);

  // ── customer / patient ──
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [patientQ, setPatientQ] = useState('');
  const [patient, setPatient] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', allergies: '' });
  const { data: patData } = useQuery({
    queryKey: ['patients', patientQ], queryFn: () => getPatients(patientQ),
    enabled: isPharmacy && patientQ.trim().length >= 2 && !patient,
  });
  const patientHits = arr(patData);

  // ── lines ──
  const emptyLine = { product: '', qty: '', notes: '', search: '' };
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [rx, setRx] = useState({ prescriber_name: '', refills_total: 1, controlled_prompt: true });
  const [branchId, setBranchId] = useState('');
  const [msg, setMsg] = useState('');

  const total = useMemo(() => lines.reduce((s, l) => {
    const p = products.find((x) => x.id === Number(l.product));
    return s + (p ? Number(p.selling_price) * (Number(l.qty) || 0) : 0);
  }, 0), [lines, products]);

  const createPat = useMutation({
    mutationFn: createPatient,
    onSuccess: (p) => { setPatient(p); setShowNewPatient(false); setNewPatient({ name: '', phone: '', allergies: '' }); },
  });

  const send = useMutation({
    mutationFn: async () => {
      const cleanLines = lines.filter((l) => l.product && Number(l.qty) > 0).map((l) => ({
        product: Number(l.product), qty: l.qty, notes: l.notes,
      }));
      if (!cleanLines.length) throw new Error('Add at least one item.');
      let prescriptionId = null;
      const prompts = [];
      if (isPharmacy && station === 'dispensary') {
        // Save the Rx first so repeats/labels/controlled log all exist; the
        // ticket carries it to the till, where the sale counts the dispense.
        const rxRes = await createPrescription({
          patient: patient?.id || null,
          patient_name: patient?.name || customer.name || 'Walk-in',
          patient_phone: patient?.phone || customer.phone || '',
          prescriber_name: rx.prescriber_name,
          refills_total: Math.max(1, Number(rx.refills_total) || 1),
          items_data: cleanLines.map((l) => {
            const p = products.find((x) => x.id === l.product);
            return { product: l.product, name: p?.name || '', qty: Number(l.qty), dosage: l.notes };
          }),
        });
        prescriptionId = rxRes.id;
        const anyControlled = cleanLines.some((l) => products.find((x) => x.id === l.product)?.is_controlled);
        if (anyControlled && rx.controlled_prompt) prompts.push('counselling', 'id_check');
      }
      const tk = await createTicket({
        station, branch: branchId || undefined,
        customer_name: patient?.name || customer.name, customer_phone: patient?.phone || customer.phone,
        patient: patient?.id || null, prescription: prescriptionId, lines: cleanLines, prompts,
        client_key: newKey(),
      });
      return readyTicket(tk.id);
    },
    onSuccess: (tk) => {
      setMsg(`Ticket ${tk.number} sent to the till.`);
      setLines([{ ...emptyLine }]); setCustomer({ name: '', phone: '' }); setPatient(null); setPatientQ('');
      refetch(); qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
    onError: (e) => setMsg(e?.response?.data?.detail || e?.response?.data?.lines || e?.message || 'Could not send.'),
  });

  const voidMut = useMutation({ mutationFn: ({ id, reason }) => voidTicket(id, reason), onSuccess: () => refetch() });
  const notify = useMutation({
    mutationFn: (tk) => notifyTicket(tk.id),
    onSuccess: (r) => setMsg(r.sent ? 'Slip sent on WhatsApp.' : 'WhatsApp did not accept the message.'),
    onError: (e) => setMsg(e?.response?.data?.detail || e?.response?.data?.phone || 'Could not send the slip.'),
  });
  const payAhead = useMutation({
    mutationFn: async (tk) => {
      const phone = tk.customer_phone || tk.patient_detail?.phone;
      if (!phone) throw new Error('No phone number on this ticket.');
      const txn = await collectPayment({
        amount: tk.total, phone, method: 'ecocash',
        currency: localStorage.getItem('currency') || 'USD',
        customer_name: tk.customer_name || tk.patient_detail?.name || '',
      });
      return attachTicketPayment(tk.id, txn.id);
    },
    onSuccess: () => { setMsg('Payment request sent to the customer\'s phone. The till will show PAID once it lands.'); refetch(); },
    onError: (e) => setMsg(e?.response?.data?.detail || e?.response?.data?.phone || e?.message || 'Could not request payment.'),
  });

  // Photo intake (dispensary): the model DRAFTS lines from a photo of the
  // script; the pharmacist confirms every line. Unmatched medicines are shown
  // as text so nothing is silently dropped or invented.
  const [scanMsg, setScanMsg] = useState('');
  const scan = useMutation({
    mutationFn: (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => intakeScript(reader.result).then(resolve, reject);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }),
    onSuccess: (draft) => {
      const matched = (draft.lines || []).filter((l) => l.matched).map((l) => ({
        product: String(l.product), qty: String(l.qty || 1), notes: l.dosage || '', search: '',
      }));
      const unmatched = (draft.lines || []).filter((l) => !l.matched).map((l) => l.written || l.name).filter(Boolean);
      if (matched.length) setLines(matched);
      if (draft.prescriber_name) setRx((r) => ({ ...r, prescriber_name: draft.prescriber_name }));
      if (draft.patient_name && !patient) setPatientQ(draft.patient_name);
      setScanMsg(`Read ${matched.length} line(s)${unmatched.length ? ` · not in catalogue: ${unmatched.join('; ')}` : ''}. Check each line before sending.`);
    },
    onError: (e) => setScanMsg(e?.response?.data?.detail || e?.response?.data?.image || 'Could not read the photo.'),
  });

  const stationMeta = STATIONS.find((s) => s.key === station) || STATIONS[1];

  if (!stations.length) {
    return <div style={card}><p style={{ fontSize: 13 }}>This business type has no station screens.</p></div>;
  }

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {stations.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {stations.map((s) => (
            <button key={s.key} onClick={() => setStation(s.key)}
              style={{ ...miniBtn, background: station === s.key ? '#1a6b3a' : '#fff',
                       color: station === s.key ? '#fff' : '#111827', borderColor: station === s.key ? '#1a6b3a' : '#d1d5db' }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16 }}>
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{stationMeta.emoji} {stationMeta.label} — new ticket</h3>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 0 }}>
            {station === 'dispensary' && 'Work the script here. Send to till when dispensed; the customer pays at the front.'}
            {station === 'counter' && 'Weigh and list the cuts. The customer pays at the till with their ticket number.'}
            {station === 'fitting_room' && 'Hold items for a customer trying on. Holds expire after 30 minutes.'}
            {station === 'quote_desk' && 'Build the order; the till completes payment.'}
          </p>

          {isPharmacy && station === 'dispensary' ? (
            <>
              <label style={label}>Patient</label>
              {patient ? (
                <div style={{ border: '1px solid #bde3cc', background: '#f2faf5', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><b style={{ fontSize: 13 }}>{patient.name}</b> <span style={{ fontSize: 11, color: '#6b7280' }}>{patient.phone}{patient.medical_aid_name ? ` · ${patient.medical_aid_name}` : ''}</span></div>
                    <button onClick={() => { setPatient(null); setPatientQ(''); }} style={{ ...miniBtn, padding: '4px 8px', minHeight: 0 }}>change</button>
                  </div>
                  {patient.allergies && <div style={allergyBanner}>⚠ Allergies: {patient.allergies}</div>}
                </div>
              ) : (
                <>
                  <input style={input} value={patientQ} placeholder="Search patient by name / phone / member no…" onChange={(e) => setPatientQ(e.target.value)} />
                  {patientHits.length > 0 && (
                    <div style={{ border: '1px solid #e3e8e4', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                      {patientHits.slice(0, 6).map((p) => (
                        <div key={p.id} onClick={() => setPatient(p)} style={{ padding: '9px 10px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                          <b>{p.name}</b> <span style={{ color: '#6b7280', fontSize: 11 }}>{p.phone}</span>{p.allergies && <span style={{ color: '#991b1b' }}> ⚠</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!showNewPatient && <button onClick={() => setShowNewPatient(true)} style={{ ...miniBtn, marginTop: 6 }}>+ New patient</button>}
                  {showNewPatient && (
                    <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 8, marginTop: 6 }}>
                      <input style={{ ...input, marginBottom: 4 }} placeholder="Full name" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                      <input style={{ ...input, marginBottom: 4 }} placeholder="Phone (for the ticket slip)" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                      <input style={input} placeholder="Allergies (as told by the patient)" value={newPatient.allergies} onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} />
                      <button disabled={!newPatient.name || createPat.isPending} onClick={() => createPat.mutate(newPatient)} style={{ ...btn, marginTop: 6, padding: '8px 12px', minHeight: 0 }}>Save patient</button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 2 }}>
                <label style={label}>Customer (optional)</label>
                <input style={input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Name" />
              </div>
              <div style={{ flex: 2 }}>
                <label style={label}>Phone (for the WhatsApp slip / pay-ahead)</label>
                <input style={input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+263…" />
              </div>
            </div>
          )}

          {isPharmacy && station === 'dispensary' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ ...miniBtn, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                📷 {scan.isPending ? 'Reading…' : 'Scan the script'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                       disabled={scan.isPending}
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) { setScanMsg(''); scan.mutate(f); } e.target.value = ''; }} />
              </label>
              {scanMsg && <span style={{ fontSize: 11, color: scanMsg.startsWith('Read') ? '#1a6b3a' : '#991b1b' }}>{scanMsg}</span>}
            </div>
          )}
          <label style={label}>{station === 'counter' && weighable ? 'Cuts and weights' : 'Items'}</label>
          {lines.map((l, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <select style={{ ...input, flex: 3 }} value={l.product}
                      onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, product: e.target.value } : x))}>
                <option value="">{station === 'dispensary' ? 'Medicine…' : 'Item…'}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.selling_price}{p.unit === 'kg' ? '/kg' : ''}</option>)}
              </select>
              <input style={{ ...input, flex: 1, minWidth: 70 }} type="number" step="any" min="0"
                     placeholder={station === 'counter' && weighable ? 'kg' : 'Qty'} value={l.qty}
                     onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, qty: e.target.value } : x))} />
              <input style={{ ...input, flex: 2 }} placeholder={station === 'dispensary' ? 'Dosage e.g. 1 tab 3× daily' : 'Note'} value={l.notes}
                     onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} />
            </div>
          ))}
          <button onClick={() => setLines([...lines, { ...emptyLine }])} style={miniBtn}>+ Line</button>

          {isPharmacy && station === 'dispensary' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <div style={{ flex: 2 }}>
                <label style={label}>Prescriber</label>
                <input style={input} value={rx.prescriber_name} onChange={(e) => setRx({ ...rx, prescriber_name: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Repeats</label>
                <input style={input} type="number" min="1" max="12" value={rx.refills_total} onChange={(e) => setRx({ ...rx, refills_total: e.target.value })} />
              </div>
            </div>
          )}
          {branches.length > 1 && (
            <>
              <label style={label}>Shop</label>
              <select style={input} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">My shop (default)</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Total ≈ {total.toFixed(2)}</div>
            <button onClick={() => { setMsg(''); send.mutate(); }} disabled={send.isPending} style={{ ...btn, marginTop: 0 }}>
              {send.isPending ? 'Sending…' : '➜ Send to till'}
            </button>
          </div>
          {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.startsWith('Ticket') || msg.startsWith('Slip') || msg.startsWith('Payment') ? '#1a6b3a' : '#991b1b' }}>{msg}</div>}
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Waiting at the till</h3>
          {mine.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No open tickets from this station.</p>}
          {mine.map((tk) => (
            <div key={tk.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{tk.number} <span style={pill(tk.paid_ahead ? 'paid' : tk.status)}>{tk.paid_ahead ? 'paid' : tk.status}</span></div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{tk.total}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {tk.customer_name || tk.patient_detail?.name || 'Walk-in'} · {(tk.lines || []).map((l) => `${l.name} ×${fmtQty(l.qty)}`).join(', ')}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <button onClick={() => notify.mutate(tk)} disabled={notify.isPending} style={miniBtn} title="Send the ticket slip to the customer's WhatsApp">💬 Slip</button>
                {!tk.paid_ahead && (
                  <button onClick={() => payAhead.mutate(tk)} disabled={payAhead.isPending} style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}
                          title="Ask the customer's phone to pay now (EcoCash / mobile money)">📱 Pay ahead</button>
                )}
                <button onClick={() => voidMut.mutate({ id: tk.id, reason: 'station' })} style={{ ...miniBtn, color: '#991b1b' }}>Void</button>
              </div>
            </div>
          ))}
          {onTabChange && (
            <button onClick={() => onTabChange('POS')} style={{ ...miniBtn, marginTop: 10, width: '100%' }}>Open the till on this device →</button>
          )}
        </div>
      </div>
    </div>
  );
}
