/**
 * MobileLandingPage.js — Frame 4 of the locked mobile design.
 *
 * Phone-first marketing landing. Used by pages/LandingPage.js when
 * window.innerWidth <= 500. Reuses the same demoLogin and navigation
 * primitives so cold visitors get a clean phone experience instead
 * of the dense desktop landing crammed onto a small screen.
 */
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileInstallPrompt from './MobileInstallPrompt';

const T = {
  cream:   '#faf6ef',
  cream2:  '#f5ede0',
  ink:     '#1a1812',
  inkSoft: '#4b4636',
  muted:   '#8a8474',
  line:    '#e6dec8',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange:  '#d9562c',
  orange2: '#f4a743',
};

export default function MobileLandingPage() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth() || {};
  const [busy, setBusy] = React.useState(null); // 'farm' | 'retail' | null
  const [err, setErr] = React.useState('');

  const enterDemo = async (module) => {
    if (busy) return;
    setBusy(module); setErr('');
    try {
      const ok = await demoLogin?.(module);
      if (ok) navigate('/app');
      else setErr("Demo isn't available right now. Please try again shortly.");
    } finally { setBusy(null); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.cream,
      color: T.ink,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Background tint blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 80% -20%, rgba(244,167,67,0.30), transparent 50%),
          radial-gradient(circle at -10% 10%, rgba(26,107,58,0.18), transparent 50%)
        `,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 22px 0',
        flex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 28,
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em',
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
            }} />
            Pewil
          </div>
          <Link to="/login" style={{
            color: T.ink, fontSize: 13, fontWeight: 700,
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.6)',
            border: `1px solid ${T.line}`,
            textDecoration: 'none',
          }}>Log in</Link>
        </div>

        <div style={{
          color: T.orange, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>For shops &amp; farms in Zimbabwe</div>

        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 38, fontWeight: 700, lineHeight: 1.06,
          margin: '0 0 14px', letterSpacing: '-0.02em',
        }}>
          Run your <span style={{ color: T.orange }}>shop</span> from your pocket.
        </h1>
        <p style={{
          color: T.inkSoft, fontSize: 14, lineHeight: 1.45,
          margin: '0 0 22px',
        }}>
          Sell, track stock, close the till and read your numbers — all on
          the phone in your hand. Built for Zim retailers and farmers.
        </p>

        {/* Feature cards */}
        <FeatureCard icon="🛒" title="Mobile point of sale"
          desc="Cash, EcoCash, card, split-tender. Works offline at the till." />
        <FeatureCard icon="📦" title="Stock that knows itself"
          desc="Reorder alerts, theft signals, supplier purchase orders by SMS." />
        <FeatureCard icon="📈" title="Numbers your way"
          desc="Z-Reports, end of day, taxes — formatted for ZIMRA when you need it." />

        {/* Demo entry buttons */}
        <div style={{ marginTop: 12, marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '0 4px 10px',
          }}>Take it for a spin</div>
          <DemoBtn label="Try the Retail demo" sub="POS, stock, reports — sample data"
            onClick={() => enterDemo('retail')} loading={busy === 'retail'} disabled={!!busy} />
          <DemoBtn label="Try the Farm demo" sub="Cattle, fields, crops, health"
            onClick={() => enterDemo('farm')} loading={busy === 'farm'} disabled={!!busy} />
          {err && (
            <div style={{ marginTop: 10, color: T.orange, fontSize: 12 }}>{err}</div>
          )}
        </div>
      </div>

      {/* Sticky CTA bar */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 3,
        padding: '14px 22px calc(22px + env(safe-area-inset-bottom, 0px))',
        background: `linear-gradient(180deg, transparent, ${T.cream} 30%)`,
      }}>
        <Link to="/register" style={{
          display: 'block', textAlign: 'center',
          background: T.ink, color: T.cream,
          padding: 16, borderRadius: 16,
          fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
          textDecoration: 'none',
        }}>
          Start 14-day free trial
          <span style={{
            display: 'block', fontSize: 11, color: T.orange2,
            fontWeight: 600, marginTop: 3, letterSpacing: 0,
          }}>No card · install in under a minute</span>
        </Link>
      </div>

      {/* PWA install nudge — fires on first visit if the visitor is on
          a phone and Pewil isn't already installed. Self-gates on
          beforeinstallprompt (Chrome/Android) or iOS detection. */}
      <MobileInstallPrompt />
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${T.line}`,
      borderRadius: 18,
      padding: 14,
      boxShadow: '0 6px 16px rgba(28,22,10,0.06)',
      marginBottom: 12,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: T.cream2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flex: '0 0 38px',
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

function DemoBtn({ label, sub, onClick, loading, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 10,
        textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.55 : 1,
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: T.cream2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flex: '0 0 36px',
      }}>▶</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>
          {loading ? 'Opening demo…' : label}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ color: T.muted, fontSize: 16 }}>›</div>
    </button>
  );
}
