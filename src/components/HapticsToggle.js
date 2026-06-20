import { useState } from 'react';
import { hapticsEnabled, setHapticsEnabled } from '../utils/haptics';
import haptics from '../utils/haptics';

// Touch-feedback (haptics) preference. Only rendered on devices that actually
// support the Vibration API (Android Chrome) — hidden on iPhone/desktop where
// it would do nothing and just confuse.
export default function HapticsToggle() {
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const [on, setOn] = useState(hapticsEnabled());
  if (!supported) return null;

  const toggle = () => {
    const next = !on;
    setHapticsEnabled(next);
    setOn(next);
    if (next) haptics.success();
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Touch feedback</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Subtle vibration on taps, scans and completed sales.</div>
        </div>
        <button type="button" onClick={toggle} role="switch" aria-checked={on}
          style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: on ? '#1a6b3a' : '#d1d5db', position: 'relative',
            transition: 'background 0.2s', flex: '0 0 50px',
          }}>
          <span style={{
            position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    </div>
  );
}
