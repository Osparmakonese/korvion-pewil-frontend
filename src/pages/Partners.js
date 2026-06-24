import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPartnersOverview, createPartner, updatePartner, assignTenantPartner } from '../api/coreApi';

/**
 * Partners / Collaborators — super-admin only.
 * Track hardware partners & collaborators, the signups they brought, and
 * the commission owed. Attribute shops to partners.
 */
const G = '#1a6b3a';
const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: "'Inter', sans-serif" },
  h1: { fontSize: 22, fontWeight: 800, margin: '0 0 2px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12.5, color: '#64748b', margin: '0 0 18px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 },
  kpi: (a) => ({ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${a}`, borderRadius: 12, padding: '14px 16px' }),
  kpiLabel: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' },
  kpiVal: { fontSize: 24, fontWeight: 800, color: '#0f172a', fontFamily: "'Playfair Display', serif", marginTop: 2 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardH: { fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '7px 8px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '8px 8px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  btn: { padding: '9px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', border: 'none', background: G, color: '#fff' },
  btnO: { padding: '6px 10px', borderRadius: 7, fontWeight: 700, fontSize: 11.5, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', color: '#334155' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: fg }),
  sel: { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12.5, background: '#fff' },
};
const money = (n) => '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TYPES = [['hardware', 'Hardware seller'], ['reseller', 'Reseller'], ['referral', 'Referral partner'], ['agent', 'Field agent'], ['other', 'Other']];

export default function Partners() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['partnersOverview'], queryFn: getPartnersOverview, staleTime: 30000 });
  const [form, setForm] = useState({ name: '', partner_type: 'hardware', contact_name: '', contact_phone: '', contact_email: '', commission_pct: '', referral_code: '', notes: '' });
  const [showForm, setShowForm] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['partnersOverview'] });

  const createMut = useMutation({ mutationFn: () => createPartner({ ...form, commission_pct: form.commission_pct || 0 }),
    onSuccess: () => { setForm({ name: '', partner_type: 'hardware', contact_name: '', contact_phone: '', contact_email: '', commission_pct: '', referral_code: '', notes: '' }); setShowForm(false); invalidate(); } });
  const toggleMut = useMutation({ mutationFn: ({ id, is_active }) => updatePartner(id, { is_active }), onSuccess: invalidate });
  const assignMut = useMutation({ mutationFn: ({ tenant_id, partner_id }) => assignTenantPartner(tenant_id, partner_id || null), onSuccess: invalidate });

  if (isLoading) return <div style={{ ...S.page, color: '#94a3b8' }}>Loading partners…</div>;
  if (error) return <div style={{ ...S.page, color: '#b91c1c' }}>Could not load — this page is for super-admins only.</div>;

  const partners = data.partners || [];
  const tenants = data.tenants || [];

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Partners &amp; Collaborators</h1>
      <p style={S.sub}>The hardware partners and collaborators you work with — the shops they brought, and the commission owed. Super-admin only.</p>

      <div style={S.kpiGrid}>
        <div style={S.kpi(G)}><div style={S.kpiLabel}>Partners</div><div style={S.kpiVal}>{partners.length}</div></div>
        <div style={S.kpi('#0369a1')}><div style={S.kpiLabel}>Attributed shops</div><div style={S.kpiVal}>{data.attributed} / {data.total_tenants}</div></div>
        <div style={S.kpi('#c97d1a')}><div style={S.kpiLabel}>Commission owed / mo</div><div style={S.kpiVal}>{money(data.total_est_commission_monthly)}</div></div>
        <div style={S.kpi('#7c3aed')}><div style={S.kpiLabel}>Unattributed shops</div><div style={S.kpiVal}>{data.unattributed}</div></div>
      </div>

      {/* Partners table */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ ...S.cardH, margin: 0 }}>Your partners</h3>
          <button style={S.btn} onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add partner'}</button>
        </div>

        {showForm && (
          <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={S.formGrid}>
              <input style={S.input} placeholder="Partner / company name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select style={S.input} value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input style={S.input} placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              <input style={S.input} placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              <input style={S.input} placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              <input style={S.input} type="number" placeholder="Commission %" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
              <input style={S.input} placeholder="Referral code (optional)" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} />
            </div>
            <button style={S.btn} disabled={!form.name || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? 'Saving…' : 'Save partner'}
            </button>
          </div>
        )}

        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Partner</th><th style={S.th}>Type</th><th style={S.th}>Contact</th>
            <th style={S.th}>Comm %</th><th style={S.th}>Signups</th><th style={S.th}>Paying</th>
            <th style={S.th}>MRR</th><th style={S.th}>Owed / mo</th><th style={S.th}></th>
          </tr></thead>
          <tbody>
            {partners.length === 0 && <tr><td style={S.td} colSpan={9}>No partners yet — add the hardware sellers you’re collaborating with.</td></tr>}
            {partners.map((p) => (
              <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                <td style={S.td}><b>{p.name}</b>{p.referral_code ? <div style={{ fontSize: 10.5, color: '#94a3b8' }}>code: {p.referral_code}</div> : null}</td>
                <td style={S.td}>{(TYPES.find((t) => t[0] === p.partner_type) || [])[1] || p.partner_type}</td>
                <td style={S.td}>{p.contact_name || '—'}{p.contact_phone ? <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{p.contact_phone}</div> : null}</td>
                <td style={S.td}>{p.commission_pct}%</td>
                <td style={S.td}>{p.signups}</td>
                <td style={S.td}>{p.paying}</td>
                <td style={S.td}>{money(p.mrr)}</td>
                <td style={S.td}><b style={{ color: G }}>{money(p.est_commission_monthly)}</b></td>
                <td style={S.td}><button style={S.btnO} onClick={() => toggleMut.mutate({ id: p.id, is_active: !p.is_active })}>{p.is_active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attribute shops to partners */}
      <div style={S.card}>
        <h3 style={S.cardH}>Attribute shops to a partner</h3>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: -6, marginBottom: 12 }}>Pick which partner brought each shop. This drives the signup counts and commission above.</p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Brought by</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td style={S.td}><b>{t.name}</b></td>
                <td style={S.td}>
                  <select style={S.sel} value={t.referred_by || ''} onChange={(e) => assignMut.mutate({ tenant_id: t.id, partner_id: e.target.value })}>
                    <option value="">— Direct / organic —</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
