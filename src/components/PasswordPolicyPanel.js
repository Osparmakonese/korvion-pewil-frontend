import { useState, useEffect } from 'react';
import { getPasswordPolicy, updatePasswordPolicy } from '../api/authApi';
import { DEFAULT_POLICY } from '../utils/passwordPolicy';
import { useAuth } from '../context/AuthContext';

// Self-contained password-policy card. Owner sees an editor; everyone else sees
// a read-only summary. Used in both the farm Settings and retail Settings
// Security tabs so there is a single implementation of this security UI.

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 };
const title = { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 };
const fl = { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 12 };
const fi = { width: '100%', maxWidth: 120, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' };
const btn = { padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 };
const note = (ok) => ({ padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12, background: ok ? '#e8f5ee' : '#fef2f2', color: ok ? '#1a6b3a' : '#991b1b' });

export default function PasswordPolicyPanel() {
  const { user } = useAuth();
  const isOwner = (user?.role || 'owner') === 'owner';

  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPasswordPolicy()
      .then(p => { setPolicy(p); setDraft(p); })
      .catch(() => { setPolicy(DEFAULT_POLICY); setDraft(DEFAULT_POLICY); });
  }, []);

  const setField = (k, v) => setDraft(d => ({ ...(d || DEFAULT_POLICY), [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg({ ok: false, text: '' });
    try {
      const saved = await updatePasswordPolicy(draft);
      setPolicy(saved); setDraft(saved);
      setMsg({ ok: true, text: 'Password policy updated. It applies the next time anyone sets a password.' });
    } catch (err) {
      const d = err?.response?.data;
      const first = d && typeof d === 'object' ? (Object.values(d).flat()[0] || 'Could not save policy.') : 'Could not save policy.';
      setMsg({ ok: false, text: first });
    } finally { setSaving(false); }
  };

  return (
    <div style={card}>
      <h3 style={title}>Password policy</h3>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.6 }}>
        {isOwner
          ? 'Set the rules every account in your organization must follow. Changes apply the next time anyone sets or resets a password.'
          : 'These rules are set by your organization owner and apply to everyone.'}
      </p>
      {msg.text && <div style={note(msg.ok)}>{msg.text}</div>}

      {!isOwner ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <Row label="Minimum length" value={`${policy.min_length} characters`} />
          <Row label="Uppercase letter" value={policy.require_uppercase ? 'Required' : 'Optional'} />
          <Row label="Lowercase letter" value={policy.require_lowercase ? 'Required' : 'Optional'} />
          <Row label="Number" value={policy.require_number ? 'Required' : 'Optional'} />
          <Row label="Symbol" value={policy.require_symbol ? 'Required' : 'Optional'} />
          <Row label="Block common passwords" value={policy.block_common ? 'On' : 'Off'} />
          <Row label="Expire passwords" value={policy.expiry_days > 0 ? `Every ${policy.expiry_days} days` : 'Never'} />
          <Row label="Block reuse" value={policy.history_count > 0 ? `Last ${policy.history_count} passwords` : 'Off'} />
        </ul>
      ) : draft && (
        <form onSubmit={save}>
          <label style={fl}>Minimum length</label>
          <input style={fi} type="number" min={4} max={128} value={draft.min_length}
                 onChange={e => setField('min_length', parseInt(e.target.value || '0', 10))} />

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Toggle label="Require an uppercase letter (A–Z)" checked={!!draft.require_uppercase} onChange={v => setField('require_uppercase', v)} />
            <Toggle label="Require a lowercase letter (a–z)" checked={!!draft.require_lowercase} onChange={v => setField('require_lowercase', v)} />
            <Toggle label="Require a number (0–9)" checked={!!draft.require_number} onChange={v => setField('require_number', v)} />
            <Toggle label="Require a symbol (! @ # $ %)" checked={!!draft.require_symbol} onChange={v => setField('require_symbol', v)} />
          </div>

          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11.5, color: '#6b7280' }}>
            Common &amp; breached passwords are always blocked — this can't be turned off.
          </div>

          <label style={fl}>Force a password change every (days)</label>
          <input style={fi} type="number" min={0} max={3650} value={draft.expiry_days}
                 onChange={e => setField('expiry_days', parseInt(e.target.value || '0', 10))} />
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>0 = passwords never expire.</p>

          <label style={fl}>Block reuse of recent passwords (count)</label>
          <input style={fi} type="number" min={0} max={10} value={draft.history_count}
                 onChange={e => setField('history_count', parseInt(e.target.value || '0', 10))} />
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>0 = reuse allowed. Max 10.</p>

          <button style={btn} disabled={saving}>{saving ? 'Saving…' : 'Save policy'}</button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 600 }}>{value}</span>
    </li>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
