import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

/**
 * WhatsApp Assistant panel (Settings → Notifications).
 *
 * Lets an owner/manager:
 *  - connect their own WhatsApp number via a one-time LINK code (+ wa.me deep link),
 *  - see and revoke connected numbers,
 *  - choose which proactive messages go to WhatsApp (daily report / low stock),
 *  - turn the inbound assistant on/off.
 *
 * Self-contained: fetches its own status + settings and patches /retail/tenant-settings/.
 */
const G = '#1a6b3a';
const S = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 16 },
  head: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#111827', margin: 0 },
  sub: { fontSize: 12, color: '#6b7280', margin: '4px 0 0' },
  btn: { padding: '9px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', background: G, color: '#fff' },
  btnO: { padding: '7px 12px', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', color: '#334155' },
  btnDanger: { padding: '5px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', border: '1px solid #fecaca', background: '#fff', color: '#b91c1c' },
  codeBox: { marginTop: 12, background: '#e8f5ee', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 },
  code: { fontSize: 30, fontWeight: 800, letterSpacing: 4, color: G, fontFamily: 'monospace' },
  pill: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color: fg }),
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9', gap: 10 },
  warn: { fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginTop: 10 },
};

function Toggle({ label, desc, on, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={onToggle} disabled={disabled} aria-pressed={on}
        style={{ width: 44, height: 24, borderRadius: 20, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: on ? G : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background .15s', opacity: disabled ? 0.5 : 1 }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </button>
    </div>
  );
}

export default function WhatsAppAssistant() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const [{ data: st }, { data: ts }] = await Promise.all([
        api.get('/retail/whatsapp/status/'),
        api.get('/retail/tenant-settings/'),
      ]);
      setStatus(st);
      setSettings(ts);
    } catch (e) {
      setErr('Could not load WhatsApp status.');
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const generate = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/retail/whatsapp/link-code/', {});
      setCode(data);
    } catch (e) {
      setErr('Could not generate a code. Try again.');
    } finally { setBusy(false); }
  };

  const revoke = async (b) => {
    if (!window.confirm(`Disconnect ${b.whatsapp_number}?`)) return;
    try {
      await api.post('/retail/whatsapp/revoke/', { id: b.id });
      await loadStatus();
    } catch (e) { setErr('Could not revoke that number.'); }
  };

  const patchToggle = async (field) => {
    if (!settings) return;
    const next = !settings[field];
    setSettings((s) => ({ ...s, [field]: next }));
    try {
      await api.patch('/retail/tenant-settings/', { [field]: next });
    } catch (e) {
      setSettings((s) => ({ ...s, [field]: !next }));
      setErr('Could not save that setting.');
    }
  };

  const configured = status?.configured;
  const bindings = status?.bindings || [];

  // While Pewil's own WhatsApp Business number is still being verified by Meta,
  // the assistant is dormant. Show an honest "coming soon" state rather than a
  // connect flow that can't deliver yet.
  if (status && !configured) {
    return (
      <section style={S.card}>
        <div style={S.head}>
          <h2 style={S.title}>
            WhatsApp assistant <span style={{ ...S.pill('#fef3c7', '#92400e'), marginLeft: 6, verticalAlign: 'middle' }}>Coming soon</span>
          </h2>
          <p style={S.sub}>
            Soon you’ll get your daily report and low-stock alerts straight to WhatsApp, and be able to ask Pewil
            things like <i>“today’s sales”</i> or <i>“add product Sugar 2kg 2.80”</i> right from a chat.
          </p>
        </div>
        <div style={{ ...S.warn, background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
          We’re finishing the setup of Pewil’s official WhatsApp Business number (it’s in verification with Meta).
          As soon as it’s live, this is where you’ll connect your number — no app update needed.
        </div>
      </section>
    );
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <h2 style={S.title}>WhatsApp assistant</h2>
        <p style={S.sub}>
          Connect your WhatsApp to get the daily report and low-stock alerts as messages, and to ask Pewil
          things like <i>“today’s sales”</i> or <i>“add product Sugar 2kg 2.80”</i> right from a chat.
        </p>
      </div>

      {err && <div style={{ ...S.warn, color: '#b91c1c', background: '#fef2f2', borderColor: '#fecaca' }}>{err}</div>}

      {/* Connected numbers */}
      <div style={{ marginTop: 6 }}>
        {bindings.length === 0 && (
          <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0' }}>No numbers connected yet.</p>
        )}
        {bindings.map((b) => (
          <div key={b.id} style={S.row}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                +{b.whatsapp_number} {b.is_self && <span style={S.pill('#e0f2fe', '#0369a1')}>you</span>}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {b.display_name || b.user} · {b.role}
                {b.last_seen_at ? ` · last seen ${new Date(b.last_seen_at).toLocaleString()}` : ''}
              </div>
            </div>
            <button style={S.btnDanger} onClick={() => revoke(b)}>Disconnect</button>
          </div>
        ))}
      </div>

      {/* Connect flow */}
      <div style={{ marginTop: 14 }}>
        <button style={S.btn} disabled={busy} onClick={generate}>
          {busy ? 'Generating…' : '+ Connect a WhatsApp number'}
        </button>
      </div>

      {code && (
        <div style={S.codeBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.05em' }}>Your link code</div>
          <div style={S.code}>{code.code}</div>
          <p style={{ fontSize: 12, color: '#166534', margin: '8px 0 10px' }}>
            Send <b>LINK {code.code}</b> to the Pewil WhatsApp number from the phone you want to connect.
            This code expires in {code.expires_in_minutes} minutes.
          </p>
          {code.wa_link ? (
            <a href={code.wa_link} target="_blank" rel="noreferrer" style={{ ...S.btn, display: 'inline-block', textDecoration: 'none' }}>
              Open WhatsApp with the code filled in
            </a>
          ) : (
            <div style={{ fontSize: 12, color: '#92400e' }}>
              Pewil’s WhatsApp number isn’t configured on the server yet, so the one-tap link isn’t available.
              Once it is, you’ll text the code to that number.
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button style={S.btnO} onClick={loadStatus}>I’ve sent it — refresh</button>
          </div>
        </div>
      )}

      {/* Channel toggles */}
      {settings && (
        <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
          <Toggle label="Daily report on WhatsApp"
            desc="Send each day’s sales summary to connected numbers (in addition to email)."
            on={!!settings.wa_daily_report} onToggle={() => patchToggle('wa_daily_report')} />
          <Toggle label="Low-stock alerts on WhatsApp"
            desc="Message connected numbers when products drop to their reorder level."
            on={!!settings.wa_low_stock} onToggle={() => patchToggle('wa_low_stock')} />
          <Toggle label="Allow commands from WhatsApp"
            desc="Let connected owner/manager numbers ask for sales, low stock, and add products by chat."
            on={settings.wa_assistant_enabled !== false} onToggle={() => patchToggle('wa_assistant_enabled')} />
        </div>
      )}
    </section>
  );
}
