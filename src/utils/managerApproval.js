import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import api from '../api/axios';

/**
 * requireManagerApproval(action, opts) → Promise<approvalToken>
 *
 * Pops a modal asking the manager to authenticate (Password or PIN).
 * Resolves with a short-lived approval token to attach as
 * `X-Manager-Approval` header on the gated mutation.
 * Rejects if the cashier cancels.
 *
 *   const token = await requireManagerApproval('void_sale', { resourceId: saleId });
 *   await api.post(`/retail/sales/${saleId}/void/`, {}, {
 *     headers: { 'X-Manager-Approval': token },
 *   });
 */
const ACTION_LABELS = {
  void_sale: 'Void sale',
  refund: 'Refund',
  price_override: 'Price override / discount',
  reprint_receipt: 'Reprint receipt',
  reopen_session: 'Reopen closed session',
};

export function requireManagerApproval(action, opts = {}) {
  // `label` overrides the modal heading for generic actions (the backend
  // only accepts a fixed action list, so e.g. quick-add-product is logged
  // as 'other' but should still read clearly to the manager).
  const { resourceType = '', resourceId = '', notes = '', label = '' } = opts;

  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.setAttribute('data-pewil-mgr-approval', '');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);

    const cleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    };

    root.render(
      <ManagerApprovalModal
        action={action}
        label={label}
        resourceType={resourceType}
        resourceId={resourceId}
        notes={notes}
        onApproved={(token) => { cleanup(); resolve(token); }}
        onCancel={() => { cleanup(); reject(new Error('cancelled')); }}
      />
    );
  });
}

function ManagerApprovalModal({ action, label, resourceType, resourceId, notes, onApproved, onCancel }) {
  const [caps, setCaps] = useState(null);
  const [tab, setTab] = useState('password'); // 'password' | 'pin' | 'webauthn'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [managerId, setManagerId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/retail/manager-approval/capabilities/')
      .then((r) => {
        setCaps(r.data);
        // Pick the first available method as default tab
        if (r.data.methods.pin) setTab('pin');
        else setTab('password');
        if (r.data.managers?.length === 1) setManagerId(String(r.data.managers[0].id));
      })
      .catch(() => setCaps({ methods: { password: true, pin: false, webauthn: false }, managers: [] }));
  }, []);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const body = {
        action,
        method: tab,
        resource_type: resourceType,
        resource_id: String(resourceId || ''),
        notes,
      };
      if (tab === 'password') {
        body.manager_username = username.trim();
        body.manager_password = password;
      } else if (tab === 'pin') {
        body.manager_id = parseInt(managerId, 10);
        body.pin = pin;
      }
      const res = await api.post('/retail/manager-approval/approve/', body);
      onApproved(res.data.approval_token);
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || 'Approval failed.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); };

  const tabBtn = (key, label, enabled) => (
    <button
      key={key}
      type="button"
      disabled={!enabled}
      onClick={() => { setTab(key); setError(''); }}
      style={{
        flex: 1, padding: '8px 10px', border: 'none',
        background: tab === key ? '#1a6b3a' : '#f3f4f6',
        color: tab === key ? '#fff' : (enabled ? '#374151' : '#9ca3af'),
        fontSize: 12, fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed',
      }}
    >{label}</button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        style={{
          background: '#fff', borderRadius: 12, width: '92%', maxWidth: 460,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Manager Approval Required
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {label || ACTION_LABELS[action] || action}
          </div>
          {resourceId && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              {resourceType} #{resourceId}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {tabBtn('password', '🔑 Password', caps?.methods?.password ?? true)}
          {tabBtn('pin', '🔢 PIN', caps?.methods?.pin ?? false)}
          {tabBtn('webauthn', '👆 Fingerprint', caps?.methods?.webauthn ?? false)}
        </div>

        <div style={{ padding: 20 }}>
          {tab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                autoFocus type="text" placeholder="Manager username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password" placeholder="Manager password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {tab === 'pin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                value={managerId} onChange={(e) => setManagerId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Select manager —</option>
                {(caps?.managers || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name || m.last_name ? `${m.first_name || ''} ${m.last_name || ''}`.trim() + ' · ' : ''}
                    {m.username}
                  </option>
                ))}
              </select>
              <input
                autoFocus type="password" inputMode="numeric" placeholder="PIN"
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle, fontSize: 22, letterSpacing: '0.5em', textAlign: 'center' }}
                maxLength={10}
              />
            </div>
          )}

          {tab === 'webauthn' && (
            <div style={{ padding: '12px 0', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
              Fingerprint authentication will be available in the next update. Use Password or PIN for now.
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || tab === 'webauthn'}
              style={{ ...approveBtn, opacity: (submitting || tab === 'webauthn') ? 0.6 : 1 }}
            >
              {submitting ? 'Verifying…' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
};
const cancelBtn = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const approveBtn = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#1a6b3a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};

export default requireManagerApproval;
