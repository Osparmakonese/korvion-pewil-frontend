/**
 * MobileLandingPage.js — phone-first marketing landing.
 *
 * Used by pages/LandingPage.js when window.innerWidth <= 500. Same
 * desktop palette (green/amber/ink) and fonts (Inter + Playfair) as
 * the desktop landing — but laid out for thumb-scanning, not stacked
 * desktop. Africa-wide tone (see memory: pewil_brand_scope_africa.md).
 *
 * Structure follows mobile-mockups/PEWIL_MOBILE_LANDING_PROPER_2026-04-28.html:
 *   - Sticky top status + nav
 *   - Single-screen hero with one CTA
 *   - Trust strip (3 checks)
 *   - Persona horizontal scroll (3 swipe-able cards)
 *   - Three-operator segmented tabs (one card visible at a time)
 *   - Dark "why we built this" thread (4 cards stacked)
 *   - Parity accordion
 *   - Proof 2x2 grid
 *   - Final CTA gradient
 *   - Footer
 *   - Sticky bottom CTA bar
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileInstallPrompt from './MobileInstallPrompt';

/* Desktop palette — same tokens as PL_CSS in LandingPage.js. */
const T = {
  bg:      '#ffffff',
  bg2:     '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  amber:   '#c77700',
  amber2:  '#e09a2b',
  amberLight: '#fff4e1',
};

const PERSONA_OPS = [
  {
    key: 'farmer',
    chip: 'Farmer',
    name: 'Tinashe',
    meta: 'Brahman herd · 18 ha · Harare',
    gradient: `linear-gradient(135deg, ${T.green}, ${T.green2})`,
  },
  {
    key: 'small',
    chip: 'Small shop',
    name: 'Adaeze',
    meta: 'Boutique · 1 lane · Lagos',
    gradient: `linear-gradient(135deg, ${T.amber}, ${T.amber2})`,
  },
  {
    key: 'chain',
    chip: 'Chain',
    name: 'Mwangi Stores',
    meta: '3 branches · 9 lanes · Nairobi',
    gradient: 'linear-gradient(135deg, #111827, #374151)',
  },
];

const OPERATORS = {
  farmer: {
    chip: 'Farmer',
    title: 'For farmers.',
    sub: 'Cattle, fields, crops, eggs.',
    quote: '"I can finally see which field paid for the diesel and which one cost me."',
    feats: [
      'Tag livestock — health, weight, vaccines',
      'Field calendar with planting reminders',
      'Wages, expenses, trip settlement',
    ],
    price: '$9',
    tier: 'Starter',
    accent: T.green,
    photoGradient: `linear-gradient(135deg, ${T.green}, ${T.green2})`,
    cta: 'Try farm demo →',
    demoModule: 'farm',
  },
  small: {
    chip: 'Small shop',
    title: 'For small shops.',
    sub: 'Spaza, hardware, pharmacy, boutique.',
    quote: '"My cashier rings up sales on her phone. Receipts print, books update."',
    feats: [
      'Mobile POS — cash, mobile money, card, split-tender',
      'Stock + reorder alerts + supplier WhatsApp',
      'Tax-compliant exports (ZIMRA today, more rails coming)',
    ],
    price: '$19',
    tier: 'Pro',
    accent: T.amber,
    photoGradient: `linear-gradient(135deg, ${T.amber}, ${T.amber2})`,
    cta: 'Try retail demo →',
    demoModule: 'retail',
  },
  chain: {
    chip: 'Chain',
    title: 'For chains.',
    sub: 'Multi-branch, multi-cashier.',
    quote: '"All three branches close at 18:00 and head-office report is on my phone by 18:05."',
    feats: [
      'Per-branch dashboards rolled into HQ view',
      'Cashier perf, loss prevention, manager PIN',
      'Bulk WhatsApp purchase orders to suppliers',
    ],
    price: '$49',
    tier: 'Enterprise',
    accent: T.ink,
    photoGradient: 'linear-gradient(135deg, #111827, #374151)',
    cta: 'Talk to sales →',
    demoModule: null,
  },
};

const PARITY_ROWS = [
  {
    capability: 'Mobile POS · cash · mobile money · card',
    farmer: 'Light — for ad-hoc sales at the farm gate',
    small:  'Yes — full POS lane, split-tender included',
    chain:  'Yes — multi-lane, multi-cashier',
  },
  {
    capability: 'Stock with reorder alerts',
    farmer: 'Inputs & feed',
    small:  'Yes',
    chain:  'Yes — per branch',
  },
  {
    capability: 'Livestock + fields',
    farmer: 'Yes',
    small:  '—',
    chain:  '—',
  },
  {
    capability: 'Tax authority compliance',
    farmer: 'Yes (where local rails exist)',
    small:  'Yes',
    chain:  'Yes — across all branches',
  },
  {
    capability: 'Loss prevention dashboard',
    farmer: '—',
    small:  'Yes',
    chain:  'Yes — with cross-branch flags',
  },
];

export default function MobileLandingPage() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth() || {};
  const [busy, setBusy] = useState(null);
  const [activeOp, setActiveOp] = useState('small');
  const [openParity, setOpenParity] = useState(0);

  const enterDemo = async (module) => {
    if (busy || !module) return;
    setBusy(module);
    try {
      const ok = await demoLogin?.(module);
      if (ok) navigate('/app');
    } finally { setBusy(null); }
  };

  const op = OPERATORS[activeOp];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      color: T.ink,
      fontFamily: "'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      overflowY: 'auto',
    }}>
      {/* Sticky nav */}
      <nav style={stickyNav}>
        <div style={brand}>
          <span style={brandDot} /> Pewil
        </div>
        <Link to="/login" style={navCta}>Sign in</Link>
      </nav>

      {/* Hero */}
      <section style={hero}>
        <div style={heroKick}>
          <span style={heroKickDot} /> Built in Africa, for African operators
        </div>
        <h1 style={heroH1} className="ml-serif">
          Run your <span style={{ color: T.green }}>shop</span> &amp;{' '}
          your <span style={{ color: T.amber }}>farm</span> from one place.
        </h1>
        <p style={heroSub}>
          Sell, track stock, close the till — all on the phone in your hand.
        </p>
        <Link to="/register" style={heroCta}>Start 14-day free trial</Link>
        <div style={heroDemo}>
          Or try it instantly —{' '}
          <button
            type="button"
            onClick={() => enterDemo('retail')}
            disabled={!!busy}
            style={demoLink}
          >{busy === 'retail' ? 'opening…' : 'retail demo'}</button>
          {' · '}
          <button
            type="button"
            onClick={() => enterDemo('farm')}
            disabled={!!busy}
            style={demoLink}
          >{busy === 'farm' ? 'opening…' : 'farm demo'}</button>
        </div>
      </section>

      {/* Trust strip */}
      <div style={trustStrip}>
        <TrustItem icon="📡" text="Works offline" />
        <TrustItem icon="🧾" text="Tax-compliant" />
        <TrustItem icon="📱" text="Mobile money + card" />
      </div>

      {/* Persona horizontal scroll */}
      <section style={personaSection}>
        <SectionEye>Who's it for</SectionEye>
        <SectionH2>One product. Operators across Africa.</SectionH2>
        <div style={personaRail}>
          {PERSONA_OPS.map((p) => (
            <a key={p.key} href={`#operators-${p.key}`} style={personaTile(p.gradient)}>
              <div style={personaScrim} />
              <div style={personaLabel}>
                <span style={personaChip(p.key)}>{p.chip}</span>
                <div style={personaName}>{p.name}</div>
                <div style={personaMeta}>{p.meta}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Three operators — segmented tabs */}
      <section style={threeOpsSection} id="operators">
        <SectionEye>Built for the way you work</SectionEye>
        <div style={tabs}>
          {Object.entries(OPERATORS).map(([key, o]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveOp(key)}
              style={tab(activeOp === key, o.accent)}
            >{o.chip}</button>
          ))}
        </div>
        <article style={opCard}>
          <div style={opPhoto(op.photoGradient)}>
            <span style={opPhotoChip(op.accent)}>{op.chip}</span>
          </div>
          <div style={opBody}>
            <h3 style={opTitle} className="ml-serif">{op.title}</h3>
            <div style={opSub}>{op.sub}</div>
            <blockquote style={opQuote(op.accent)}>{op.quote}</blockquote>
            <ul style={opFeats}>
              {op.feats.map((f) => (
                <li key={f} style={opFeat}>
                  <span style={opFeatTick(op.accent)}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div style={opPrice}>
              <div>
                <span style={opAmt(op.accent)}>{op.price}</span>
                <span style={opPer}>/mo · USD</span>
              </div>
              <div style={opTier}>{op.tier}</div>
            </div>
            {op.demoModule ? (
              <button
                type="button"
                onClick={() => enterDemo(op.demoModule)}
                disabled={!!busy}
                style={opCta(op.accent)}
              >{busy === op.demoModule ? 'Opening demo…' : op.cta}</button>
            ) : (
              <Link to="/contact" style={opCta(op.accent)}>{op.cta}</Link>
            )}
          </div>
        </article>
      </section>

      {/* Thread */}
      <section style={threadSection}>
        <div style={threadEye}>Why we built this</div>
        <h2 style={threadH2} className="ml-serif">
          Made for the way <em style={{ fontStyle: 'italic', color: '#ffd480' }}>African operators</em> work.
        </h2>
        <div style={threadCards}>
          <ThreadCard num="01" title="Works at the till even when the network drops"
            text="Sales queue locally and sync the moment you're back online — built for the realities of African connectivity." />
          <ThreadCard num="02" title="Speaks the local tax authority"
            text="ZIMRA fiscal exports today. Other rails coming as we expand. Daily Z-Reports and device pairing baked in." />
          <ThreadCard num="03" title="Lives where suppliers live — WhatsApp"
            text="Reorder POs go straight to suppliers via WhatsApp. Loyalty members get receipts on the same number they DM you on." />
          <ThreadCard num="04" title="Mobile money + card, not just card"
            text="Subscription billing accepts EcoCash, M-Pesa, card and bank transfer through Pesepay and partners. We meet operators on the rails they already use." />
        </div>
      </section>

      {/* Parity accordion */}
      <section style={paritySection}>
        <SectionEye>What's on each plan</SectionEye>
        <SectionH2>Quick parity check.</SectionH2>
        <div style={accList}>
          {PARITY_ROWS.map((row, idx) => {
            const isOpen = openParity === idx;
            return (
              <div key={row.capability} style={accCard}>
                <button
                  type="button"
                  onClick={() => setOpenParity(isOpen ? -1 : idx)}
                  style={accQ}
                  aria-expanded={isOpen}
                >
                  <span>{row.capability}</span>
                  <span style={accChev(isOpen)}>⌄</span>
                </button>
                {isOpen && (
                  <div style={accA}>
                    <span style={accWho(T.green)}>Farmer</span>
                    <span style={accWhat}>{row.farmer}</span>
                    <span style={accWho(T.amber)}>Small shop</span>
                    <span style={accWhat}>{row.small}</span>
                    <span style={accWho(T.ink)}>Chain</span>
                    <span style={accWhat}>{row.chain}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Proof 2x2 */}
      <section style={proofSection}>
        <h2 style={proofH2} className="ml-serif">Numbers that justify the subscription.</h2>
        <p style={proofSub}>From operators piloting Pewil across the continent.</p>
        <div style={proofGrid}>
          <Stat tone="green" val="12 min"  label="to first sale"     meta="Signup → first receipt" />
          <Stat tone="amber" val="$48"     label="variance caught"   meta="Spaza pilot, Harare" />
          <Stat tone="ink"   val="98%"     label="offline sync rate" meta="Sales during outages" />
          <Stat tone="green" val="14 days" label="free, no card"     meta="Cancel from in-app" />
        </div>
      </section>

      {/* Final CTA */}
      <section style={finalCta}>
        <h2 style={finalCtaH2} className="ml-serif">
          Run your shop or farm{' '}
          <em style={{ fontStyle: 'italic', color: '#ffd480' }}>from your pocket</em>.
        </h2>
        <p style={finalCtaP}>14 days free, no card. Pay by mobile money or card after that.</p>
        <Link to="/register" style={finalCtaPrimary}>Start free trial</Link>
        <a href="#operators" style={finalCtaGhost}>▶ Watch the demo</a>
        <div style={finalCtaMicro}>Made in Harare. Used wherever there's a phone signal.</div>
      </section>

      {/* Footer */}
      <footer style={foot}>
        <div style={footBrand}>Pewil</div>
        <div style={footTag}>The operating system for African retailers and farmers.</div>
        <div style={footLinks}>
          <Link to="/pricing"  style={footLink}>Pricing</Link>
          <Link to="/contact"  style={footLink}>Support</Link>
          <Link to="/terms"    style={footLink}>Terms</Link>
          <Link to="/privacy"  style={footLink}>Privacy</Link>
          <Link to="/refunds"  style={footLink}>Refund policy</Link>
        </div>
        <div style={footBar}>© 2026 Pewil · Made in Harare</div>
      </footer>

      {/* Sticky bottom CTA */}
      <div style={stickyCta}>
        <Link to="/register" style={stickyCtaBtn}>Start 14-day free trial</Link>
      </div>

      <MobileInstallPrompt />
    </div>
  );
}

/* ── small components ─────────────────────────────────────────── */

function TrustItem({ icon, text }) {
  return (
    <div style={trustItem}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function SectionEye({ children }) {
  return <span style={sectionEye}>{children}</span>;
}

function SectionH2({ children }) {
  return <h2 style={sectionH2} className="ml-serif">{children}</h2>;
}

function ThreadCard({ num, title, text }) {
  return (
    <article style={threadCard}>
      <div style={threadNum}>{num}</div>
      <h4 style={threadCardH4} className="ml-serif">{title}</h4>
      <p style={threadCardP}>{text}</p>
    </article>
  );
}

function Stat({ tone, val, label, meta }) {
  const colors = { green: T.green, amber: T.amber, ink: T.ink };
  return (
    <div style={statBox}>
      <div style={statVal(colors[tone] || T.ink)}>{val}</div>
      <div style={statLabel}>{label}</div>
      <div style={statMeta}>{meta}</div>
    </div>
  );
}

/* ── styles ────────────────────────────────────────────────────── */

const stickyNav = {
  position: 'sticky', top: 0, zIndex: 9,
  background: 'rgba(255,255,255,0.94)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: `1px solid ${T.line}`,
  padding: '12px 22px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const brand = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 800, fontSize: 20,
  display: 'flex', alignItems: 'center', gap: 8,
  color: T.ink,
};
const brandDot = {
  width: 10, height: 10, borderRadius: '50%',
  background: `linear-gradient(135deg, ${T.green} 40%, ${T.amber} 60%)`,
  boxShadow: `0 0 0 3px rgba(26,107,58,0.12)`,
};
const navCta = {
  background: T.ink, color: '#fff',
  padding: '8px 14px', borderRadius: 999,
  fontSize: 12, fontWeight: 600, textDecoration: 'none',
};

const hero = {
  padding: '32px 22px 28px',
  background: `radial-gradient(ellipse 80% 50% at 100% 0%, ${T.amberLight}, transparent 60%),
               radial-gradient(ellipse 80% 50% at 0% 100%, #e8f5ee, transparent 60%),
               #fff`,
  textAlign: 'center',
};
const heroKick = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '5px 12px', borderRadius: 999,
  background: '#fff', border: `1px solid ${T.line}`,
  fontSize: 10, fontWeight: 700, color: T.muted,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  marginBottom: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const heroKickDot = {
  width: 6, height: 6, borderRadius: '50%',
  background: T.green,
};
const heroH1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 38, lineHeight: 1.04, fontWeight: 700,
  margin: '0 0 12px', letterSpacing: '-0.02em',
};
const heroSub = {
  fontSize: 15, color: T.inkSoft, lineHeight: 1.55,
  margin: '0 auto 22px',
};
const heroCta = {
  display: 'block', padding: '14px 22px',
  borderRadius: 999, background: T.ink, color: '#fff',
  fontWeight: 600, fontSize: 14, textAlign: 'center',
  boxShadow: '0 8px 24px rgba(17,24,39,0.18)',
  textDecoration: 'none',
};
const heroDemo = {
  marginTop: 14, fontSize: 12, color: T.muted,
};
const demoLink = {
  background: 'none', border: 'none', padding: 0,
  color: T.green, fontWeight: 600,
  textDecoration: 'underline', textUnderlineOffset: 3,
  fontFamily: 'inherit', cursor: 'pointer',
};

const trustStrip = {
  background: '#fff',
  borderTop: `1px solid ${T.line}`,
  borderBottom: `1px solid ${T.line}`,
  padding: '12px 22px',
  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
  textAlign: 'center',
  fontSize: 11, color: T.inkSoft, fontWeight: 600,
};
const trustItem = {
  display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
};

const personaSection = {
  padding: '32px 0 28px',
  background: T.bg2,
};
const sectionEye = {
  display: 'block', textAlign: 'center',
  fontSize: 11, letterSpacing: '0.22em',
  color: T.muted, textTransform: 'uppercase',
  fontWeight: 700, marginBottom: 8,
  padding: '0 22px',
};
const sectionH2 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  textAlign: 'center',
  fontSize: 26, fontWeight: 700,
  lineHeight: 1.15, margin: '0 0 18px',
  padding: '0 22px',
};
const personaRail = {
  display: 'flex', gap: 14,
  overflowX: 'auto',
  padding: '4px 22px 8px',
  scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch',
};
const personaTile = (gradient) => ({
  flex: '0 0 240px',
  scrollSnapAlign: 'start',
  aspectRatio: '5/6',
  borderRadius: 20,
  overflow: 'hidden',
  position: 'relative',
  background: gradient,
  textDecoration: 'none',
});
const personaScrim = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.7) 100%)',
};
const personaLabel = {
  position: 'absolute', zIndex: 2, left: 16, right: 16, bottom: 14,
  color: '#fff',
};
const personaChip = (key) => ({
  display: 'inline-block',
  padding: '3px 8px', borderRadius: 999,
  fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', fontWeight: 700,
  marginBottom: 8,
  background: key === 'farmer' ? T.green
            : key === 'small'  ? T.amber
            : '#fff',
  color: key === 'chain' ? T.ink : '#fff',
});
const personaName = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 18, lineHeight: 1.2,
};
const personaMeta = { fontSize: 11, opacity: 0.85, marginTop: 4 };

const threeOpsSection = { padding: '32px 22px 28px' };
const tabs = {
  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
  gap: 4, padding: 4,
  background: '#f3f4f6',
  borderRadius: 999,
  marginBottom: 18,
};
const tab = (active, accent) => ({
  padding: '8px 6px', borderRadius: 999,
  fontSize: 11, fontWeight: 700, textAlign: 'center',
  color: active ? accent : T.muted,
  background: active ? '#fff' : 'transparent',
  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
  border: 'none', cursor: 'pointer',
  fontFamily: 'inherit',
});
const opCard = {
  background: '#fff',
  border: `1px solid ${T.line}`,
  borderRadius: 18,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
};
const opPhoto = (gradient) => ({
  aspectRatio: '16/9',
  background: gradient,
  position: 'relative',
});
const opPhotoChip = (accent) => ({
  position: 'absolute', top: 14, left: 14,
  padding: '4px 10px', borderRadius: 999,
  background: '#fff', color: accent,
  fontSize: 10, fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase',
});
const opBody = { padding: '18px 18px 20px' };
const opTitle = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 22, margin: '0 0 4px',
};
const opSub = { fontSize: 12, color: T.muted, marginBottom: 14 };
const opQuote = (accent) => ({
  fontFamily: "'Playfair Display', Georgia, serif",
  fontStyle: 'italic',
  fontSize: 14, lineHeight: 1.45, color: T.inkSoft,
  padding: '12px 14px', borderLeft: `3px solid ${accent}`,
  background: T.amberLight,
  borderRadius: '0 8px 8px 0',
  marginBottom: 16, marginTop: 0,
});
const opFeats = { listStyle: 'none', padding: 0, margin: '0 0 16px' };
const opFeat = {
  display: 'flex', gap: 10, alignItems: 'flex-start',
  fontSize: 13, lineHeight: 1.4, color: T.inkSoft,
  padding: '6px 0',
};
const opFeatTick = (accent) => ({
  color: accent, fontWeight: 700,
  flexShrink: 0, width: 18, textAlign: 'center',
});
const opPrice = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  padding: '14px 0 0', borderTop: `1px solid ${T.line}`,
};
const opAmt = (accent) => ({
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 30, color: accent,
});
const opPer = { fontSize: 12, color: T.muted, marginLeft: 2 };
const opTier = {
  fontSize: 10, fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: T.muted,
};
const opCta = (accent) => ({
  display: 'block', marginTop: 14, padding: 12,
  borderRadius: 12, textAlign: 'center',
  background: accent, color: '#fff',
  fontWeight: 600, fontSize: 13,
  border: 'none', textDecoration: 'none',
  fontFamily: 'inherit', cursor: 'pointer',
  width: '100%',
});

const threadSection = {
  padding: '36px 22px 32px',
  background: T.ink, color: '#fff',
  position: 'relative', overflow: 'hidden',
};
const threadEye = {
  position: 'relative', textAlign: 'center',
  fontSize: 11, letterSpacing: '0.22em',
  color: T.amber, textTransform: 'uppercase', fontWeight: 700,
  marginBottom: 10,
};
const threadH2 = {
  position: 'relative',
  fontFamily: "'Playfair Display', Georgia, serif",
  textAlign: 'center',
  fontSize: 28, fontWeight: 700,
  lineHeight: 1.15, margin: '0 0 18px',
};
const threadCards = {
  position: 'relative',
  display: 'flex', flexDirection: 'column', gap: 12,
};
const threadCard = {
  padding: '18px 18px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
};
const threadNum = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 22, color: T.amber,
  lineHeight: 1, marginBottom: 8,
};
const threadCardH4 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 16, lineHeight: 1.3,
  margin: '0 0 6px',
};
const threadCardP = {
  fontSize: 13, lineHeight: 1.5,
  color: 'rgba(255,255,255,0.75)', margin: 0,
};

const paritySection = { padding: '32px 22px 28px' };
const accList = { display: 'flex', flexDirection: 'column', gap: 8 };
const accCard = {
  background: '#fff',
  border: `1px solid ${T.line}`,
  borderRadius: 14,
  overflow: 'hidden',
};
const accQ = {
  width: '100%', padding: '14px 16px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontWeight: 700, fontSize: 13,
  background: 'transparent', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  color: T.ink,
};
const accChev = (open) => ({
  color: T.muted, fontSize: 16,
  transition: 'transform .2s',
  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
});
const accA = {
  padding: '0 16px 14px',
  display: 'grid', gridTemplateColumns: 'auto 1fr',
  gap: '6px 12px',
  fontSize: 12, lineHeight: 1.45,
};
const accWho = (color) => ({
  fontSize: 10, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color,
});
const accWhat = { color: T.inkSoft };

const proofSection = {
  padding: '32px 22px 28px',
  background: T.bg2,
};
const proofH2 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  textAlign: 'center',
  fontSize: 24, fontWeight: 700, margin: '0 0 8px',
};
const proofSub = {
  textAlign: 'center', color: T.inkSoft,
  fontSize: 13, margin: '0 0 18px',
};
const proofGrid = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
};
const statBox = {
  background: '#fff',
  border: `1px solid ${T.line}`,
  borderRadius: 14,
  padding: '16px 14px',
};
const statVal = (color) => ({
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 26,
  lineHeight: 1, letterSpacing: '-0.02em',
  marginBottom: 6, color,
});
const statLabel = {
  fontSize: 12, fontWeight: 600,
  color: T.ink, lineHeight: 1.3, marginBottom: 2,
};
const statMeta = {
  fontSize: 11, color: T.muted, lineHeight: 1.3,
};

const finalCta = {
  padding: '40px 22px 36px',
  textAlign: 'center',
  background: 'linear-gradient(150deg, #0d4a22 0%, #111827 60%, #8b5200 100%)',
  color: '#fff',
  position: 'relative', overflow: 'hidden',
};
const finalCtaH2 = {
  position: 'relative',
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 30, fontWeight: 700,
  lineHeight: 1.1, margin: '0 0 12px',
};
const finalCtaP = {
  position: 'relative',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 14, lineHeight: 1.55,
  margin: '0 0 20px',
};
const finalCtaPrimary = {
  position: 'relative', display: 'block',
  background: '#fff', color: T.ink,
  padding: 14, borderRadius: 999,
  fontWeight: 600, fontSize: 14,
  marginBottom: 10, textDecoration: 'none',
  textAlign: 'center',
};
const finalCtaGhost = {
  position: 'relative', display: 'block',
  background: 'transparent', color: '#fff',
  padding: 14, borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.4)',
  fontWeight: 600, fontSize: 14,
  textDecoration: 'none', textAlign: 'center',
};
const finalCtaMicro = {
  position: 'relative', marginTop: 14,
  fontSize: 11, color: 'rgba(255,255,255,0.6)',
};

const foot = {
  background: T.ink, color: 'rgba(255,255,255,0.7)',
  padding: '28px 22px 22px',
  fontSize: 12,
};
const footBrand = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700, fontSize: 18, color: '#fff',
  marginBottom: 4,
};
const footTag = {
  color: 'rgba(255,255,255,0.55)', marginBottom: 16,
};
const footLinks = {
  display: 'grid', gridTemplateColumns: '1fr 1fr',
  gap: '6px 12px', marginBottom: 16,
};
const footLink = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12, textDecoration: 'none', padding: '4px 0',
};
const footBar = {
  borderTop: '1px solid rgba(255,255,255,0.12)',
  paddingTop: 14,
  fontSize: 10, color: 'rgba(255,255,255,0.5)',
};

const stickyCta = {
  position: 'sticky', bottom: 0, zIndex: 12,
  padding: '12px 22px calc(16px + env(safe-area-inset-bottom, 0px))',
  background: 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: `1px solid ${T.line}`,
};
const stickyCtaBtn = {
  display: 'block',
  background: T.ink, color: '#fff',
  padding: 14, borderRadius: 999,
  fontWeight: 600, fontSize: 14,
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(17,24,39,0.18)',
  textDecoration: 'none',
};
