import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaymentCredentials, createPaymentCredentials, updatePaymentCredentials,
  deletePaymentCredentials, getPaymentProviders,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };
const pill = (c) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.fg });

const EMPTY = {
  provider: 'paynow', currency: 'USD', environment: 'test', display_name: '',
  integration_id: '', integration_key: '', account_email: '', is_enabled: true,
};

export default function PaymentSettings() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['payment-credentials'], queryFn: getPaymentCredentials });
  const { data: provData } = useQuery({ queryKey: ['payment-providers'], queryFn: getPaymentProviders });
  const creds = arr(data);
  const providers = arr(provData);

  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const reset = () => { setForm(EMPTY); setEditId(null); };
  const save = useMutation({
    mutationFn: (payload) => editId ? updatePaymentCredentials(editId, payload) : createPaymentCredentials(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-credentials'] }); reset(); },
  });
  const del = useMutation({ mutationFn: deletePaymentCredentials, onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-credentials'] }) });

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({
      provider: c.provider, currency: c.currency, environment: c.environment,
      display_name: c.display_name || '', integration_id: c.integration_id || '',
      integration_key: '', account_email: c.account_email || '', is_enabled: c.is_enabled,
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    // On edit, a blank key means "keep the stored secret".
    if (editId && !payload.integration_key) delete payload.integration_key;
    save.mutate(payload);
  };

  const methodHint = (() => {
    const p = providers.find((x) => x.slug === form.provider);
    return p ? `Methods: ${(p.methods || []).join(', ')} · Currencies: ${(p.currencies || []).join(', ')}` : '';
  })();

  return (
    <div className="vtl-stack" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 16 }}>
      <div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Your payment accounts</h3>
          <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
            Money is collected straight into <b>your own</b> mobile money merchant account. Paste the Integration ID and Key
            you got from your provider. New Paynow integrations start in <b>test mode</b> — no real money moves until you switch them to live.
          </p>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Account</th><th style={th}>Currency</th><th style={th}>Mode</th><th style={th}>Key</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>
              {creds.length === 0 && <tr><td style={td} colSpan={6}>No accounts yet. Add your Paynow details on the right.</td></tr>}
              {creds.map((c) => (
                <tr key={c.id}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{c.display_name || c.provider}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>ID {c.integration_id || '—'}</div></td>
                  <td style={td}>{c.currency}</td>
                  <td style={td}><span style={pill(c.environment === 'live' ? { bg: '#e8f5ee', fg: '#1a6b3a' } : { bg: '#fef3e2', fg: '#c97d1a' })}>{c.environment}</span></td>
                  <td style={td}>{c.has_key ? '•••• set' : <span style={{ color: '#c0392b' }}>missing</span>}</td>
                  <td style={td}>{c.is_ready ? <span style={pill({ bg: '#e8f5ee', fg: '#1a6b3a' })}>ready</span> : <span style={pill({ bg: '#fdecea', fg: '#c0392b' })}>off</span>}</td>
                  <td style={td}>
                    <button onClick={() => startEdit(c)} style={{ background: '#EFF6FF', color: '#1d4ed8', border: 'none', padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => del.mutate(c.id)} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {creds.some((c) => c.last_error) && (
            <p style={{ fontSize: 11, color: '#c0392b', marginTop: 8 }}>
              Last error: {creds.find((c) => c.last_error)?.last_error}
            </p>
          )}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{editId ? 'Edit account' : 'Add an account'}</h3>
        <form onSubmit={submit}>
          <label style={label}>Provider</label>
          <select style={input} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
            {(providers.length ? providers : [{ slug: 'paynow', label: 'Paynow (EcoCash / OneMoney)', built: true }]).map((p) => (
              <option key={p.slug} value={p.slug} disabled={p.built === false}>{p.label}{p.built === false ? ' — coming soon' : ''}</option>
            ))}
          </select>
          {methodHint && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{methodHint}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={label}>Currency</label>
              <select style={input} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option><option value="ZWG">ZWG</option>
              </select>
            </div>
            <div>
              <label style={label}>Mode</label>
              <select style={input} value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                <option value="test">Test mode</option><option value="live">Live</option>
              </select>
            </div>
          </div>

          <label style={label}>Account label</label>
          <input style={input} placeholder="e.g. Pewil POS – USD" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />

          <label style={label}>Integration ID</label>
          <input style={input} value={form.integration_id} onChange={(e) => setForm({ ...form, integration_id: e.target.value })} required />

          <label style={label}>Integration Key {editId && <span style={{ color: '#9ca3af' }}>(leave blank to keep current)</span>}</label>
          <input style={input} type="password" autoComplete="off" placeholder={editId ? '•••• keep current' : 'Paste your secret key'} value={form.integration_key} onChange={(e) => setForm({ ...form, integration_key: e.target.value })} required={!editId} />

          <label style={label}>Paynow account email</label>
          <input style={input} type="email" placeholder="A login email of your Paynow account" value={form.account_email} onChange={(e) => setForm({ ...form, account_email: e.target.value })} />
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Required for mobile money. In test mode it must match a login email on your Paynow account.</p>

          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} /> Enabled
          </label>

          {save.isError && <p style={{ fontSize: 11, color: '#c0392b', marginTop: 6 }}>{save.error?.response?.data?.detail || 'Could not save. Check the details.'}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : (editId ? 'Save changes' : 'Add account')}</button>
            {editId && <button type="button" onClick={reset} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
