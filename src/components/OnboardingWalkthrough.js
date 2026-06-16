import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pewil_onboarding_done';

const STEPS = [
  {
    title: 'Welcome to Pewil!',
    desc: 'Your all-in-one farm management and retail POS platform. Let\'s take a quick tour to get you started.',
    emoji: '\u{1F44B}',
    tip: 'This walkthrough only takes 60 seconds.',
  },
  {
    title: 'Your Dashboard',
    desc: 'The dashboard shows your season overview, revenue, expenses, and key metrics at a glance. It updates in real-time as you add data.',
    emoji: '\u{1F4CA}',
    tip: 'Tip: Click any metric card for more details.',
  },
  {
    title: 'Navigate with the Sidebar',
    desc: 'Use the sidebar to switch between sections like Fields, Stock, Livestock, and more. If your plan includes Retail, use the module switcher at the top.',
    emoji: '\u{1F5C2}\uFE0F',
    tip: 'Tip: Collapsible sections keep the sidebar clean.',
  },
  {
    title: 'Add Your First Data',
    desc: 'Look for the "+" button in the top-right corner of most pages to add new records — fields, livestock, sales, costs, and more.',
    emoji: '\u2795',
    tip: 'Tip: You can also import data from Excel on the Import page.',
  },
  {
    title: 'Invite Your Team',
    desc: 'Go to Team (in the Owner section) to invite managers and workers. Each role has specific permissions to keep your data secure.',
    emoji: '\u{1F465}',
    tip: 'Tip: Workers can only view data; managers can add and edit.',
  },
  {
    title: 'Install as an App',
    desc: 'Pewil works great on mobile! Tap "Add to Home Screen" in your browser to install Pewil as a native app on your phone.',
    emoji: '\u{1F4F1}',
    tip: 'Tip: Works offline too — your data syncs when you\'re back online.',
  },
  {
    title: 'You\'re All Set!',
    desc: 'Explore the platform, add your data, and start running your business smarter. Visit Help & Support anytime if you need assistance.',
    emoji: '\u{1F389}',
    tip: 'No card needed to start — explore everything Pewil can do.',
  },
];

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100000,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: '36px 32px 28px',
    width: 440, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    textAlign: 'center', position: 'relative',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 },
  desc: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 },
  tip: { fontSize: 12, color: '#1a6b3a', background: '#e8f5ee', padding: '8px 14px', borderRadius: 8, marginBottom: 20 },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: (active) => ({ width: active ? 20 : 8, height: 8, borderRadius: 4, background: active ? '#1a6b3a' : '#d1d5db', transition: 'all 0.2s' }),
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnPrimary: { padding: '10px 24px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '10px 20px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  skip: { position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18 },
  progress: { height: 3, background: '#e5e7eb', borderRadius: 2, marginBottom: 20, overflow: 'hidden' },
  progressBar: (pct) => ({ height: '100%', background: '#1a6b3a', width: `${pct}%`, transition: 'width 0.3s ease' }),
};

export default function OnboardingWalkthrough({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { setVisible(true); }
  }, []);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVisible(false);
    if (onComplete) onComplete();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) finish(); }}>
      <div style={S.modal}>
        <button style={S.skip} onClick={finish} title="Skip walkthrough">{'\u2715'}</button>

        <div style={S.progress}>
          <div style={S.progressBar(pct)} />
        </div>

        <div style={S.emoji}>{current.emoji}</div>
        <h2 style={S.title}>{current.title}</h2>
        <p style={S.desc}>{current.desc}</p>
        <div style={S.tip}>{current.tip}</div>

        <div style={S.dots}>
          {STEPS.map((_, i) => <div key={i} style={S.dot(i === step)} />)}
        </div>

        <div style={S.actions}>
          {isFirst ? (
            <button style={S.btnSecondary} onClick={finish}>Skip tour</button>
          ) : (
            <button style={S.btnSecondary} onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {isLast ? (
            <button style={S.btnPrimary} onClick={finish}>Get Started</button>
          ) : (
            <button style={S.btnPrimary} onClick={() => setStep(s => s + 1)}>
              {isFirst ? "Let's Go" : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
