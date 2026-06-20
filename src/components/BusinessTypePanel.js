import { useState, useEffect } from 'react';
import { getVerticals, setBusinessType } from '../api/coreApi';
import { useAuth } from '../context/AuthContext';

// Owner-only: view and change the tenant's business type(s). A business can be
// several types at once (e.g. a service station that's both fuel + general
// retail) — features are the union of all selected. Non-owners see it read-only.

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 };
const title = { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 };
const note = (ok) => ({ padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12, background: ok ? '#e8f5ee' : '#fef2f2', color: ok ? '#1a6b3a' : '#991b1b' });
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 10 };
const tile = (on) => ({ textAlign: 'left', border: `1.5px solid ${on ? '#1a6b3a' : '#e5e7eb'}`, background: on ? '#e8f5ee' : '#fff', borderRadius: 10, padding: '12px 12px', cursor: 'pointer' });
const btn = { padding: '9px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 };

function currentTypes(user) {
  if (Array.isArray(user?.business_types) && user.business_types.length) return user.business_types;
  return user?.business_type ? [user.business_type] : [];
}
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join('|');
  const sb = [...b].sort().join('|');
  return sa === sb;
}

export default function BusinessTypePanel() {
  const { user, applyAuthUpdate } = useAuth();
  const isOwner = (user?.role || 'owner') === 'owner';
  const [verticals, setVerticals] = useState([]);
  const [picked, setPicked] = useState(currentTypes(user));
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVerticals()
      .then((d) => setVerticals(d.verticals || []))
      .catch(() => setVerticals([]));
  }, []);

  const cur = currentTypes(user);
  const labelFor = (slug) => verticals.find((v) => v.slug === slug)?.label || slug;
  const changed = picked.length > 0 && !sameSet(picked, cur);

  const toggle = (slug) => {
    setPicked((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  const save = async () => {
    setSaving(true); setMsg({ ok: false, text: '' });
    try {
      const res = await setBusinessType(picked);
      applyAuthUpdate(res);
      setMsg({ ok: true, text: 'Business type updated. Your menu has been tailored to match.' });
    } catch (e) {
      const d = e?.response?.data;
      setMsg({ ok: false, text: d?.business_types || d?.detail || 'Could not update business type.' });
    } finally { setSaving(false); }
  };

  if (!isOwner) {
    return (
      <div style={card}>
        <h3 style={title}>Business type</h3>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          Your business is set up as <strong>{cur.map(labelFor).join(' + ') || '—'}</strong>. Only the owner can change this.
        </p>
      </div>
    );
  }

  // Single-option module (e.g. farm) — read-only.
  if (verticals.length <= 1) {
    return (
      <div style={card}>
        <h3 style={title}>Business type</h3>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          {verticals[0]?.icon} <strong>{cur.map(labelFor).join(' + ') || verticals[0]?.label}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      <h3 style={title}>Business type</h3>
      <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
        Pick everything your business does — you can select more than one (e.g. a fuel station that also runs a shop).
        Your tools are the combination of all selected types. Changing this shows or hides features immediately;
        your data is never deleted, so switching back restores everything.
      </p>
      {msg.text && <div style={note(msg.ok)}>{msg.text}</div>}
      <div style={grid}>
        {verticals.map((v) => {
          const on = picked.includes(v.slug);
          return (
            <div key={v.slug} style={tile(on)} onClick={() => toggle(v.slug)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ fontSize: 22 }}>{v.icon}</div>
                <span style={{ fontSize: 15, fontWeight: 800, color: on ? '#1a6b3a' : '#cbd5d8' }}>{on ? '✓' : '＋'}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 4 }}>{v.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{v.description}</div>
            </div>
          );
        })}
      </div>
      <button style={{ ...btn, opacity: changed ? 1 : 0.5 }} disabled={!changed || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save business type'}
      </button>
    </div>
  );
}
