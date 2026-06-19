import { useState, useEffect } from 'react';
import { getVerticals, setBusinessType } from '../api/coreApi';
import { useAuth } from '../context/AuthContext';

// Owner-only: view and change the tenant's business type. Changing it shows/hides
// features instantly (a fresh token is applied) — data is never deleted.

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 };
const title = { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 };
const note = (ok) => ({ padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12, background: ok ? '#e8f5ee' : '#fef2f2', color: ok ? '#1a6b3a' : '#991b1b' });
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 10 };
const tile = (on) => ({ textAlign: 'left', border: `1.5px solid ${on ? '#1a6b3a' : '#e5e7eb'}`, background: on ? '#e8f5ee' : '#fff', borderRadius: 10, padding: '12px 12px', cursor: 'pointer' });
const btn = { padding: '9px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 };

export default function BusinessTypePanel() {
  const { user, applyAuthUpdate } = useAuth();
  const isOwner = (user?.role || 'owner') === 'owner';
  const [verticals, setVerticals] = useState([]);
  const [picked, setPicked] = useState(user?.business_type || '');
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVerticals()
      .then((d) => setVerticals(d.verticals || []))
      .catch(() => setVerticals([]));
  }, []);

  const current = verticals.find((v) => v.slug === (user?.business_type || ''));
  const changed = picked && picked !== (user?.business_type || '');

  const save = async () => {
    setSaving(true); setMsg({ ok: false, text: '' });
    try {
      const res = await setBusinessType(picked);
      applyAuthUpdate(res);
      setMsg({ ok: true, text: 'Business type updated. Your menu has been tailored to match.' });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.business_type || e?.response?.data?.detail || 'Could not update business type.' });
    } finally { setSaving(false); }
  };

  if (!isOwner) {
    return (
      <div style={card}>
        <h3 style={title}>Business type</h3>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          Your business is set up as <strong>{current?.label || user?.business_type || '—'}</strong>. Only the owner can change this.
        </p>
      </div>
    );
  }

  // Only one option for this account type (e.g. farm) — show read-only.
  if (verticals.length <= 1) {
    return (
      <div style={card}>
        <h3 style={title}>Business type</h3>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          {current?.icon} <strong>{current?.label || user?.business_type}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      <h3 style={title}>Business type</h3>
      <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
        Pewil tailors which tools you see to your business type. Changing it shows or hides
        features immediately — your data is never deleted, so switching back restores everything.
      </p>
      {msg.text && <div style={note(msg.ok)}>{msg.text}</div>}
      <div style={grid}>
        {verticals.map((v) => (
          <div key={v.slug} style={tile(picked === v.slug)} onClick={() => setPicked(v.slug)}>
            <div style={{ fontSize: 22 }}>{v.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 4 }}>{v.label}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{v.description}</div>
          </div>
        ))}
      </div>
      <button style={{ ...btn, opacity: changed ? 1 : 0.5 }} disabled={!changed || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save business type'}
      </button>
    </div>
  );
}
