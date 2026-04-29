/**
 * MobileLandingPage.js — first-impression mobile landing.
 *
 * Used by pages/LandingPage.js when window.innerWidth <= 500. This is
 * what someone sees when they Google "Pewil" on a phone, tap the
 * result, and land cold. The structure follows the locked mockup at
 * mobile-mockups/PEWIL_MOBILE_LANDING_FIRST_IMPRESSION_2026-04-28.html:
 *
 *   1. Brand row + Login link
 *   2. Hero: eyebrow + big headline + lede + dark-ink CTA + secondary
 *   3. Trust strip: 3 checkmarks
 *   4. 4 feature cards (Mobile POS, Stock, Numbers, Farm side)
 *   5. Before / after comparison table
 *   6. One specific testimonial (placeholder until first real customer)
 *   7. Pricing teaser
 *   8. 5-question FAQ
 *   9. Footer with policy + support links
 *  10. Sticky bottom CTA bar
 *  + Demo entry buttons (Try Retail / Try Farm) preserved from old version
 *  + MobileInstallPrompt at the bottom (PWA install nudge)
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
  amber:   '#f5c518',
};

export default function MobileLandingPage() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth() || {};
  const [busy, setBusy] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [openFaq, setOpenFaq] = React.useState(0);

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
      {/* ── Hero region with tinted-cream background ─────────────── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(circle at 80% -20%, rgba(244,167,67,0.30), transparent 50%),
            radial-gradient(circle at -10% 10%, rgba(26,107,58,0.18), transparent 50%)
          `,
        }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '20px 22px 0' }}>
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

          {/* Hero copy */}
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
            color: T.inkSoft, fontSize: 14, lineHeight: 1.5,
            margin: '0 0 18px',
          }}>
            Sell, track stock, close the till, and read your numbers — all on
            the phone in your hand. Built for Zim retailers and farmers who'd
            rather work than fight a spreadsheet.
          </p>

          <Link to="/register" style={{
            display: 'block', textAlign: 'center',
            background: T.ink, color: T.cream,
            padding: 16, borderRadius: 16,
            fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
            textDecoration: 'none', marginBottom: 10,
          }}>
            Start 14-day free trial
            <span style={{
              display: 'block', fontSize: 11, color: T.orange2,
              fontWeight: 600, marginTop: 3, letterSpacing: 0,
            }}>No card · install in under a minute</span>
          </Link>

          {/* Demo entry — collapsed into a single secondary button row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
            <button
              type="button"
              onClick={() => enterDemo('retail')}
              disabled={!!busy}
              style={{
                flex: 1,
                padding: 14, borderRadius: 14,
                background: '#fff', color: T.ink,
                border: `1px solid ${T.line}`,
                fontWeight: 700, fontSize: 12,
                fontFamily: 'inherit',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy && busy !== 'retail' ? 0.5 : 1,
              }}
            >
              {busy === 'retail' ? 'Opening…' : '▶ Try Retail demo'}
            </button>
            <button
              type="button"
              onClick={() => enterDemo('farm')}
              disabled={!!busy}
              style={{
                flex: 1,
                padding: 14, borderRadius: 14,
                background: '#fff', color: T.ink,
                border: `1px solid ${T.line}`,
                fontWeight: 700, fontSize: 12,
                fontFamily: 'inherit',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy && busy !== 'farm' ? 0.5 : 1,
              }}
            >
              {busy === 'farm' ? 'Opening…' : '▶ Try Farm demo'}
            </button>
          </div>
          {err && (
            <div style={{ color: T.orange, fontSize: 12, marginBottom: 16 }}>{err}</div>
          )}
        </div>
      </div>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.6)',
        borderTop: `1px solid ${T.line}`,
        borderBottom: `1px solid ${T.line}`,
        padding: '14px 22px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, fontWeight: 600, color: T.inkSoft,
        textAlign: 'center',
      }}>
        <TrustItem text="Built for Zim" />
        <TrustItem text="ZIMRA-ready" />
        <TrustItem text="Works offline" />
      </div>

      {/* ── Features ─────────────────────────────────────────────── */}
      <Section>
        <Kicker>What you get</Kicker>
        <H2>Everything the till and the books need.</H2>
        <FeatureCard
          icon="🛒"
          title="Mobile point of sale"
          desc="Cash, EcoCash, card, split-tender. Scan or search. Loyalty members in one tap. Works at the till even when the network drops."
        />
        <FeatureCard
          icon="📦"
          title="Stock that pings you"
          desc="Reorder alerts when shelves run thin. Theft signals if voids and discounts spike. Purchase orders to suppliers via WhatsApp."
        />
        <FeatureCard
          icon="📈"
          title="Numbers your way"
          desc="Daily Z-Reports, end-of-day cash drawer math, ZIMRA-shaped exports — when the auditor asks, you don't scramble."
        />
        <FeatureCard
          icon="🐄"
          title="Farm side, same app"
          desc="Cattle, goats, sheep, pigs, fields, crops, payroll. One tenant per business — pick retail or farm at signup."
        />
      </Section>

      {/* ── Before / after compare ───────────────────────────────── */}
      <Section bg="rgba(255,255,255,0.45)">
        <Kicker>Before / after</Kicker>
        <H2>From WhatsApp groups to <em style={{ color: T.orange, fontStyle: 'normal' }}>actual numbers</em>.</H2>
        <div style={{
          background: '#fff',
          border: `1px solid ${T.line}`,
          borderRadius: 18,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}>
          <CompareCol heading="Before Pewil" headingColor={T.muted} items={[
            'Receipt book + WhatsApp screenshots',
            'Manual stock check at month-end',
            'Cash variance you only spot in arrears',
            'ZIMRA submissions done by hand',
          ]} />
          <CompareCol heading="After Pewil" headingColor={T.green} bordered items={[
            'Receipt prints + auto-saves',
            'Live stock with reorder alerts',
            'Z-Report variance flagged at close',
            'One-tap fiscal export',
          ]} />
        </div>
      </Section>

      {/* ── Testimonial ──────────────────────────────────────────── */}
      <Section>
        <div style={{
          background: 'linear-gradient(135deg, #fff, #f9efd9)',
          border: `1px solid ${T.line}`,
          borderRadius: 18,
          padding: 18,
        }}>
          <div style={{ fontSize: 14, color: T.amber, marginBottom: 8 }}>★★★★★</div>
          <blockquote style={{
            margin: '0 0 14px',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18, fontWeight: 500,
            lineHeight: 1.35, color: T.ink,
            letterSpacing: '-0.01em',
          }}>
            "First month on Pewil I caught a ZIG 240 variance I would have just written off in the old days. Paid for itself before lunch."
          </blockquote>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
              color: '#fff', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>T</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Tendai M.</div>
              <div style={{ fontSize: 11, color: T.muted }}>Spaza owner · Highfield, Harare</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Pricing teaser ───────────────────────────────────────── */}
      <Section>
        <div style={{
          background: T.ink,
          color: T.cream,
          borderRadius: 22,
          padding: 22,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(244,167,67,0.16)',
            top: -100, right: -80,
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            color: T.orange2, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Plans from</div>
          <div style={{
            position: 'relative', zIndex: 1,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 44, fontWeight: 700, lineHeight: 1, marginTop: 6,
          }}>
            ZIG 89<small style={{ fontSize: 16, opacity: 0.7, fontWeight: 500 }}>/mo</small>
          </div>
          <p style={{
            position: 'relative', zIndex: 1,
            color: 'rgba(250,246,239,0.85)',
            fontSize: 13, lineHeight: 1.45, margin: '10px 0 14px',
          }}>
            14 days free, no card. Cancel anytime. Pay by EcoCash or card.
          </p>
          <Link to="/pricing" style={{
            position: 'relative', zIndex: 1,
            display: 'block', textAlign: 'center',
            background: T.cream, color: T.ink,
            padding: 14, borderRadius: 14,
            fontWeight: 800, fontSize: 13,
            textDecoration: 'none',
          }}>See full pricing →</Link>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <Section bg="rgba(255,255,255,0.45)">
        <Kicker>Common questions</Kicker>
        <H2>Quick answers.</H2>
        <div style={{
          background: '#fff',
          border: `1px solid ${T.line}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}>
          {FAQS.map((f, idx) => (
            <FaqRow
              key={idx}
              question={f.q}
              answer={f.a}
              isOpen={openFaq === idx}
              onToggle={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              isLast={idx === FAQS.length - 1}
            />
          ))}
        </div>
      </Section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div style={{
        background: T.cream2,
        padding: '26px 22px 18px',
        color: T.muted,
        fontSize: 12,
      }}>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: T.ink, fontSize: 18, fontWeight: 700,
          marginBottom: 8,
        }}>Pewil</div>
        <p style={{ margin: '0 0 14px', lineHeight: 1.45, color: T.inkSoft }}>
          The operating system for Zim retailers and farmers. Made in Harare, used everywhere with a phone signal.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <Link to="/pricing" style={footLink}>Pricing</Link>
          <Link to="/contact" style={footLink}>Support</Link>
          <Link to="/terms" style={footLink}>Terms</Link>
          <Link to="/privacy" style={footLink}>Privacy</Link>
          <Link to="/refunds" style={footLink}>Refund policy</Link>
        </div>
        <div style={{ color: T.muted, fontSize: 11 }}>© 2026 Pewil. All rights reserved.</div>
      </div>

      {/* ── Sticky bottom CTA ────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 6,
        padding: '14px 22px calc(22px + env(safe-area-inset-bottom, 0px))',
        background: `linear-gradient(180deg, transparent, ${T.cream} 25%)`,
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
          }}>Free for 14 days · no card</span>
        </Link>
      </div>

      {/* PWA install nudge */}
      <MobileInstallPrompt />
    </div>
  );
}

/* ── FAQ data ───────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'Does it work without internet?',
    a: "Yes — the till keeps ringing up sales offline and syncs the moment you're back online. Stock counts and receipts queue safely.",
  },
  {
    q: 'Can my cashier use it on a phone?',
    a: 'Yes. Pewil is designed phone-first. The same app runs on tablets and desktops too, so you can mix devices across your shop.',
  },
  {
    q: 'Is it ZIMRA-compliant?',
    a: "Pewil exports ZIMRA-shaped fiscal data and supports linking a fiscal device. Set it up under Settings → ZIMRA Fiscal once your device is registered.",
  },
  {
    q: 'What if I have farm AND retail?',
    a: "Each tenant is one or the other for now — pick retail or farm at signup. If you run both, talk to support — we're piloting multi-module accounts.",
  },
  {
    q: 'How do I cancel?',
    a: 'Settings → Billing → Cancel subscription. No phone calls, no questions. Your data stays exportable for 30 days after cancellation.',
  },
];

/* ── Sub-components ─────────────────────────────────────────────── */

function Section({ children, bg }) {
  return (
    <div style={{
      padding: '32px 22px',
      background: bg || 'transparent',
    }}>
      {children}
    </div>
  );
}

function Kicker({ children }) {
  return (
    <div style={{
      color: T.orange, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 8,
    }}>{children}</div>
  );
}

function H2({ children }) {
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em',
      lineHeight: 1.15, margin: '0 0 12px',
    }}>{children}</h2>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${T.line}`,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 6px 16px rgba(28,22,10,0.06)',
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: 12, background: T.cream2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 19, marginBottom: 10,
      }}>{icon}</div>
      <h3 style={{
        fontSize: 16, fontWeight: 700, margin: '0 0 4px',
      }}>{title}</h3>
      <p style={{
        fontSize: 13, color: T.inkSoft, margin: 0, lineHeight: 1.45,
      }}>{desc}</p>
    </div>
  );
}

function CompareCol({ heading, headingColor, items, bordered }) {
  return (
    <div style={{
      padding: 14,
      borderLeft: bordered ? `1px solid ${T.line}` : 'none',
    }}>
      <h4 style={{
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        margin: '0 0 8px', color: headingColor || T.muted,
      }}>{heading}</h4>
      <ul style={{ margin: 0, paddingLeft: 14 }}>
        {items.map((item, idx) => (
          <li key={idx} style={{
            fontSize: 12, color: T.inkSoft, marginBottom: 6, lineHeight: 1.4,
          }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FaqRow({ question, answer, isOpen, onToggle, isLast }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: isLast ? 'none' : `1px solid ${T.line}`,
      cursor: 'pointer',
    }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
      }}
    >
      <div style={{
        fontWeight: 700, fontSize: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{question}</span>
        <span style={{ color: T.muted, fontSize: 18 }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div style={{
          marginTop: 8,
          fontSize: 13, color: T.inkSoft, lineHeight: 1.5,
        }}>{answer}</div>
      )}
    </div>
  );
}

function TrustItem({ text }) {
  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      flex: '1 1 auto', justifyContent: 'center',
    }}>
      <span style={{ color: T.green, fontSize: 14 }}>✓</span>
      <span>{text}</span>
    </div>
  );
}

const footLink = {
  color: T.ink, textDecoration: 'none', fontWeight: 600, fontSize: 12,
};
