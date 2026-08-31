// Medical Aid — Pharmacy Phase 3 (2026-08-31).
//
// The outstanding ledger is the report a pharmacy runs its month on: every
// medical-aid sale books a claim automatically at the till; this page is
// where those claims get chased — accepted, rejected, PAID — per society,
// with a CSV a claims clerk can email to CIMAS on the 1st.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMedicalAidProviders, createMedicalAidProvider,
  getMedicalAidClaims, setClaimStatus, getClaimsOutstanding, exportClaimsCsv,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const miniBtn = { padding: '5px 9px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: '#111827' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (s) => ({ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
  background: s === 'paid' ? '#e8f5ee' : s === 'rejected' ? '#fee2e2' : s === 'accepted' ? '#e0ecff' : '#fef3c7',
  color: s === 'paid' ? '#1a6b3a' : s === 'rejected' ? '#991b1b' : s === 'accepted' ? '#1d4ed8' : '#92400e' });

export default function MedicalAid() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const { data: provData } = useQuery({ queryKey: ['medaid-providers'], queryFn: getMedicalAidProviders });
  const { data: claimData } = useQuery({
    queryKey: ['medaid-claims', statusFilter],
    queryFn: () => getMedicalAidClaims(statusFilter ? { status: statusFilter } : {}),
  });
  const { data: outData } = useQuery({ queryKey: ['medaid-outstanding'], queryFn: getClaimsOutstanding });
  const providers = arr(provData);
  const claims = arr(claimData);

  const [form, setForm] = useState({ name: '', short_code: '', provider_number: '', contact_phone: '' });
  const addProvider = useMutation({
    mutationFn: createMedicalAidProvider,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['medaid-providers'] }); setForm({ name: '', short_code: '', provider_number: '', contact_phone: '' }); },
  });
  const move = useMutation({
    mutationFn: ({ id, status, reference }) => setClaimStatus(id, { status, reference }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medaid-claims'] });
      qc.invalidateQueries({ queryKey: ['medaid-outstanding'] });
    },
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportClaimsCsv(statusFilter ? { status: statusFilter } : {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'medical-aid-claims.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const markPaid = (c) => {
    const ref = window.prompt(`Payment reference for ${c.provider_name} claim of ${c.amount}?`, c.reference || '');
    if (ref === null) return;
    move.mutate({ id: c.id, status: 'paid', reference: ref });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Outstanding board — the headline numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Societies owe you</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a6b3a' }}>{outData?.grand_total ?? '—'}</div>
        </div>
        {(outData?.providers || []).map((p) => (
          <div key={p.provider} style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{p.short_code || p.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{p.total}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{p.claims} claim(s)</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Claims ledger</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...input, width: 'auto', padding: '5px 8px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
              <button onClick={downloadCsv} style={miniBtn}>⬇ CSV</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Date</th><th style={th}>Receipt</th><th style={th}>Patient</th><th style={th}>Society</th><th style={th}>Amount</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>
              {claims.length === 0 && <tr><td style={td} colSpan={7}>No claims yet — they book themselves when a sale is paid by medical aid at the till.</td></tr>}
              {claims.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{(c.created_at || '').slice(0, 10)}</td>
                  <td style={td}>{c.receipt_number}</td>
                  <td style={td}>{c.patient_display || c.member_number || '—'}</td>
                  <td style={td}>{c.provider_name}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{c.amount}</td>
                  <td style={td}><span style={pill(c.status)}>{c.status}</span>{c.reference ? <div style={{ fontSize: 9, color: '#6b7280' }}>{c.reference}</div> : null}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.status === 'submitted' && <>
                        <button onClick={() => move.mutate({ id: c.id, status: 'accepted' })} style={miniBtn}>Accept</button>
                        <button onClick={() => move.mutate({ id: c.id, status: 'rejected' })} style={{ ...miniBtn, color: '#991b1b' }}>Reject</button>
                      </>}
                      {(c.status === 'submitted' || c.status === 'accepted') &&
                        <button onClick={() => markPaid(c)} style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}>Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Societies</h3>
          {providers.map((p) => (
            <div key={p.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '7px 0', fontSize: 12 }}>
              <b>{p.short_code || p.name}</b>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                {p.name}{p.provider_number ? ` · your provider no. ${p.provider_number}` : ''}
              </div>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (form.name) addProvider.mutate(form); }}>
            <label style={label}>Society name</label>
            <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CIMAS" required />
            <label style={label}>Short code (tills & reports)</label>
            <input style={input} value={form.short_code} onChange={(e) => setForm({ ...form, short_code: e.target.value })} />
            <label style={label}>Your provider number</label>
            <input style={input} value={form.provider_number} onChange={(e) => setForm({ ...form, provider_number: e.target.value })} />
            <label style={label}>Contact phone</label>
            <input style={input} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <button style={btn} disabled={addProvider.isPending}>{addProvider.isPending ? 'Saving…' : 'Add society'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
