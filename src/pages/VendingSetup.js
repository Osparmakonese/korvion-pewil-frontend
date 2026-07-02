import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVendingCredentials, createVendingCredentials, updateVendingCredentials, deleteVendingCredentials,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const EMPTY = { provider: 'paynow_billpay', environment: 'test', display_name: '', base_url: 'https://billpay.paynow.co.zw', auth_id: '', auth_key: '', is_enabled: true };

export default function VendingSetup() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['vending-credentials'], queryFn: getVendingCredentials });
  const creds = arr(data);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const reset = () => { setForm(EMPTY); setEditId(null); };
  const save = useMutation({
    mutationFn: (p) => editId ? updateVendingCredentials(editId, p) : createVendingCredentials(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vending-credentials'] }); reset(); },
  });
  const del = useMutation({ mutationFn: deleteVendingCredentials, onSuccess: () => qc.invalidateQueries({ queryKey: ['vending-credentials'] }) });

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({ provider: c.provider, environment: c.environment, display_name: c.display_name || '', base_url: c.base_url || 'https://billpay.paynow.co.zw', auth_id: c.auth_id || '', auth_key: '', is_enabled: c.is_enabled });
  };
  const submit = (e) => { e.preventDefault(); const p = { ...form }; if (editId && !p.auth_key) delete p.auth_key; save.mutate(p); };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Your vending account</h3>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
          Selling airtime, ZESA and water tokens draws from <b>your own</b> prefunded Paynow BillPay float. Open a BillPay
          Vendor account with Paynow, load your float, and paste the API user details here. Until then, vending stays off.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ textAlign: 'left', fontSize: 9, color: '#9ca3af', padding: '6px 8px' }}>ACCOUNT</th>
            <th style={{ textAlign: 'left', fontSize: 9, color: '#9ca3af', padding: '6px 8px' }}>MODE</th>
            <th style={{ textAlign: 'left', fontSize: 9, color: '#9ca3af', padding: '6px 8px' }}>KEY</th>
            <th style={{ textAlign: 'left', fontSize: 9, color: '#9ca3af', padding: '6px 8px' }}>STATUS</th>
            <th></th>
          </tr></thead>
          <tbody>
            {creds.length === 0 && <tr><td style={{ padding: 8, fontSize: 12 }} colSpan={5}>No vending account yet.</td></tr>}
            {creds.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '7px 8px', fontSize: 12 }}><div style={{ fontWeight: 600 }}>{c.display_name || 'Paynow BillPay'}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>{c.auth_id || '—'}</div></td>
                <td style={{ padding: '7px 8px' }}><span style={pill(c.environment === 'live' ? { bg: '#e8f5ee', fg: '#1a6b3a' } : { bg: '#fef3e2', fg: '#c97d1a' })}>{c.environment}</span></td>
                <td style={{ padding: '7px 8px', fontSize: 12 }}>{c.has_key ? '•••• set' : <span style={{ color: '#c0392b' }}>missing</span>}</td>
                <td style={{ padding: '7px 8px' }}>{c.is_ready ? <span style={pill({ bg: '#e8f5ee', fg: '#1a6b3a' })}>ready</span> : <span style={pill({ bg: '#fdecea', fg: '#c0392b' })}>off</span>}</td>
                <td style={{ padding: '7px 8px' }}>
                  <button onClick={() => startEdit(c)} style={{ background: '#EFF6FF', color: '#1d4ed8', border: 'none', padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => del.mutate(c.id)} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {creds.some((c) => c.last_error) && <p style={{ fontSize: 11, color: '#c0392b', marginTop: 8 }}>Last error: {creds.find((c) => c.last_error)?.last_error}</p>}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{editId ? 'Edit account' : 'Connect BillPay'}</h3>
        <form onSubmit={submit}>
          <label style={label}>Account label</label>
          <input style={input} placeholder="e.g. Pewil Vending" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          <label style={label}>Mode</label>
          <select style={input} value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
            <option value="test">Test mode</option><option value="live">Live</option>
          </select>
          <label style={label}>API username (BillPay user)</label>
          <input style={input} value={form.auth_id} onChange={(e) => setForm({ ...form, auth_id: e.target.value })} required />
          <label style={label}>API password {editId && <span style={{ color: '#9ca3af' }}>(blank = keep)</span>}</label>
          <input style={input} type="password" autoComplete="off" placeholder={editId ? '•••• keep current' : 'Paste your BillPay API password'} value={form.auth_key} onChange={(e) => setForm({ ...form, auth_key: e.target.value })} required={!editId} />
          <label style={label}>Base URL</label>
          <input style={input} value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} /> Enabled
          </label>
          {save.isError && <p style={{ fontSize: 11, color: '#c0392b', marginTop: 6 }}>{save.error?.response?.data?.detail || 'Could not save.'}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : (editId ? 'Save' : 'Connect')}</button>
            {editId && <button type="button" onClick={reset} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Cancel</button>}
          </div>
        </form>
        <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 12 }}>Get a BillPay Vendor API user from Paynow support. Your float is funded on the Paynow side.</p>
      </div>
    </div>
  );
}
