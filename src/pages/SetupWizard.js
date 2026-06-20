import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getVerticals, completeSetup } from '../api/coreApi';

// First-run setup wizard. Shown to an owner whose tenant has setup_completed=false.
// Step 1: pick business type. Step 2: a couple of tailored quick-setup answers.
// Step 3: finish -> completeSetup -> fresh token (features apply immediately).

const C = {
  green: '#1a6b3a', green3: '#e8f5ee', ink: '#111827', ink3: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
};

// Light, optional quick-setup questions per vertical. Saved to vertical_settings.
const QUICK = {
  supermarket: [{ key: 'enable_scale', label: 'I weigh produce on a scale', type: 'bool', def: true }],
  fuel: [{ key: 'tank_count', label: 'How many fuel tanks?', type: 'number', def: 2 }],
  pharmacy: [{ key: 'require_batch_numbers', label: 'Track batch numbers & expiry dates', type: 'bool', def: true }],
  restaurant: [{ key: 'table_count', label: 'How many tables?', type: 'number', def: 10 }],
  wholesale: [{ key: 'enable_credit_accounts', label: 'Offer customers credit accounts', type: 'bool', def: true }],
  electronics: [{ key: 'track_serials', label: 'Track serial numbers / IMEI', type: 'bool', def: true }],
  liquor: [{ key: 'age_check', label: 'Require age check on alcohol sales', type: 'bool', def: true }],
};

const S = {
  wrap: { minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', sans-serif" },
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', width: 720, maxWidth: '100%', padding: '32px 32px 28px' },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.green },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.ink, margin: '6px 0 4px' },
  sub: { fontSize: 14, color: C.ink3, marginBottom: 22 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  tile: (on) => ({ textAlign: 'left', border: `1.5px solid ${on ? C.green : C.line}`, background: on ? C.green3 : '#fff', borderRadius: 12, padding: '14px 14px', cursor: 'pointer', transition: 'all .15s' }),
  tileIcon: { fontSize: 26, marginBottom: 6 },
  tileLabel: { fontSize: 14, fontWeight: 700, color: C.ink },
  tileDesc: { fontSize: 11.5, color: C.ink3, marginTop: 3, lineHeight: 1.5 },
  soon: { fontSize: 9, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 10, padding: '1px 7px', marginLeft: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  btn: { padding: '11px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  ghost: { padding: '11px 18px', background: 'transparent', color: C.ink3, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, cursor: 'pointer' },
  skip: { background: 'none', border: 'none', color: C.ink3, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
  qLabel: { fontSize: 13, color: C.ink, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' },
  input: { width: 110, padding: '9px 11px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 },
  err: { background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, marginBottom: 14 },
};

export default function SetupWizard({ onDone }) {
  const { user, applyAuthUpdate } = useAuth();
  const [step, setStep] = useState(1);
  const [verticals, setVerticals] = useState([]);
  const [picked, setPicked] = useState(
    user?.business_types && user.business_types.length
      ? user.business_types
      : (user?.business_type ? [user.business_type] : [])
  );
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getVerticals()
      .then((d) => setVerticals(d.verticals || []))
      .catch(() => setVerticals([]));
  }, []);

  // A business can be several types at once (e.g. a service station that also
  // runs a shop) — gather the quick-setup questions for every selected type.
  const quick = picked.flatMap((slug) => (QUICK[slug] || []));

  const toggle = (slug) => {
    setPicked((prev) => {
      const on = prev.includes(slug);
      const next = on ? prev.filter((s) => s !== slug) : [...prev, slug];
      if (!on) {
        const defs = {};
        (QUICK[slug] || []).forEach((q) => { defs[q.key] = q.def; });
        setAnswers((a) => ({ ...defs, ...a }));
      }
      return next;
    });
  };

  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const res = await completeSetup({ business_types: picked, vertical_settings: answers });
      applyAuthUpdate(res);
      if (onDone) onDone();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.response?.data?.business_type || 'Could not finish setup. Please try again.');
      setBusy(false);
    }
  };

  const skip = async () => {
    // Skipping still records the (default/current) type and marks setup done.
    setBusy(true); setErr('');
    try {
      const fallback = picked.length ? picked
        : (user?.business_types || (user?.business_type ? [user.business_type] : []));
      const res = await completeSetup({ business_types: fallback });
      applyAuthUpdate(res);
      if (onDone) onDone();
    } catch {
      setBusy(false);
    }
  };

  const pickedLabel = picked
    .map((p) => verticals.find((v) => v.slug === p)?.label)
    .filter(Boolean)
    .join(' + ');

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        {err && <div style={S.err}>{err}</div>}

        {step === 1 && (
          <>
            <div style={S.eyebrow}>Welcome to Pewil</div>
            <h1 style={S.h1}>What kind of business do you run?</h1>
            <p style={S.sub}>Pick everything your business does — you can choose more than one (e.g. a fuel station that also runs a shop). We'll show only the tools you need. You can change this later in Settings.</p>
            <div style={S.grid}>
              {verticals.map((v) => {
                const on = picked.includes(v.slug);
                return (
                  <div key={v.slug} style={S.tile(on)} onClick={() => toggle(v.slug)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={S.tileIcon}>{v.icon}</div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: on ? '#1a6b3a' : '#cbd5d8' }}>{on ? '✓' : '＋'}</span>
                    </div>
                    <div style={S.tileLabel}>
                      {v.label}
                      {v.built === false && <span style={S.soon}>SOON</span>}
                    </div>
                    <div style={S.tileDesc}>{v.description}</div>
                  </div>
                );
              })}
            </div>
            <div style={S.row}>
              <button style={S.skip} onClick={skip} disabled={busy}>Skip for now</button>
              <button
                style={{ ...S.btn, opacity: picked.length ? 1 : 0.5 }}
                disabled={picked.length === 0 || busy}
                onClick={() => setStep(quick.length ? 2 : 3)}
              >
                Continue{picked.length > 1 ? ` (${picked.length})` : ''}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={S.eyebrow}>{pickedLabel}</div>
            <h1 style={S.h1}>A few quick details</h1>
            <p style={S.sub}>Optional — these set sensible defaults. You can change everything later.</p>
            <div>
              {quick.map((q) => (
                <label key={q.key} style={S.qLabel}>
                  {q.type === 'bool' ? (
                    <input
                      type="checkbox"
                      checked={!!answers[q.key]}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.checked }))}
                    />
                  ) : (
                    <input
                      type="number" min={0} style={S.input}
                      value={answers[q.key] ?? q.def}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: parseInt(e.target.value || '0', 10) }))}
                    />
                  )}
                  {q.label}
                </label>
              ))}
            </div>
            <div style={S.row}>
              <button style={S.ghost} onClick={() => setStep(1)} disabled={busy}>Back</button>
              <button style={S.btn} onClick={() => setStep(3)} disabled={busy}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={S.eyebrow}>Almost done</div>
            <h1 style={S.h1}>You're set up as a {pickedLabel || 'business'}</h1>
            <p style={S.sub}>
              Pewil is now tailored to your business. Tools you don't need are hidden — turn the full set back on anytime by changing your business type in Settings.
            </p>
            <div style={S.row}>
              <button style={S.ghost} onClick={() => setStep(quick.length ? 2 : 1)} disabled={busy}>Back</button>
              <button style={S.btn} onClick={finish} disabled={busy}>
                {busy ? 'Finishing…' : 'Finish & enter Pewil'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
