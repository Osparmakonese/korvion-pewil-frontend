/**
 * MobileLandingPage.js — phone-first marketing landing.
 *
 * Used by pages/LandingPage.js when window.innerWidth <= 500.
 *
 * REDESIGNED 2026-07-02 to match the approved "Variant A · Product-First"
 * mockup (mobile-mockups/PEWIL_MOBILE_REDESIGN_A_PRODUCT_FIRST_2026-07-02.html):
 *   - Sticky nav with hamburger → slide-down menu (Features / Operators /
 *     Plans / Farm / Contact + CTA). Previously the nav was a dead end
 *     with only "Sign in".
 *   - Hero leads with the PRODUCT: a pure-CSS phone mock of the till
 *     (offline chip, cart, Charge button, tender row) + fiscalised
 *     receipt slip. No images, no network cost.
 *   - SVG trust icons (emoji rendered inconsistently across devices).
 *   - Feature carousel: scroll-snap rail with synced dots.
 *   - Operators: segmented control with sliding thumb + swipeable panes
 *     (translateX transition, touch drag) + dots.
 *   - Parity accordion animates open/closed (grid-template-rows 0fr→1fr).
 *   - Proof stats count up when revealed.
 *   - SMART sticky CTA: hidden on the hero (it duplicated the hero CTA
 *     and burned viewport), slides in after the hero CTA scrolls away,
 *     hides again at the final CTA. Includes a Demo shortcut.
 *   - prefers-reduced-motion respected for count-up (Reveal handles its own).
 *
 * Same palette (green/amber/ink) and fonts (Inter + Playfair) as desktop.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileInstallPrompt from './MobileInstallPrompt';
import Reveal from './mobile/Reveal';
import haptics from '../utils/haptics';

/* Desktop palette — same tokens as PL_CSS in LandingPage.js. */
const T = {
  bg: '#ffffff',
  bg2: '#f9fafb',
  ink: '#111827',
  inkSoft: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
  green: '#1a6b3a',
  green2: '#2d9e58',
  amber: '#c77700',
  amber2: '#e09a2b',
  amberLight: '#fff4e1',
};
const SERIF = "'Playfair Display', Georgia, serif";
const EASE = 'cubic-bezier(.22,.9,.3,1)';

const OPERATORS = [
  {
    key: 'farmer',
    chip: 'Farmer',
    title: 'For farmers.',
    sub: 'Cattle, fields, crops, eggs.',
    quote: '"I can finally see which field paid for the diesel and which one cost me."',
    feats: [
      'Tag livestock — health, weight, vaccines',
      'Field calendar with planting reminders',
      'Wages, expenses, trip settlement',
    ],
    price: '$10',
    per: '/mo · USD',
    priceSub: 'up to $60/mo Enterprise',
    tier: 'Starter',
    accent: T.green,
    gradient: `linear-gradient(135deg, ${T.green}, ${T.green2})`,
    cta: 'Try farm demo →',
    demoModule: 'farm',
  },
  {
    key: 'small',
    chip: 'Small shop',
    title: 'For small shops.',
    sub: 'Spaza, hardware, pharmacy, boutique.',
    quote: '"My cashier rings up sales on her phone. Receipts print, books update."',
    feats: [
      'Mobile POS — cash, mobile money, card, split-tender',
      'Stock + reorder alerts + supplier WhatsApp',
      'Tax-compliant fiscalisation (ZIMRA, KRA, SARS, RRA & more)',
    ],
    price: '$10',
    per: '/mo · USD',
    priceSub: '14-day free trial · fiscalisation included',
    tier: 'per month',
    accent: T.amber,
    gradient: `linear-gradient(135deg, ${T.amber}, ${T.amber2})`,
    cta: 'Try retail demo →',
    demoModule: 'retail',
  },
  {
    key: 'chain',
    chip: 'Chain',
    title: 'For chains.',
    sub: 'Multi-branch, multi-cashier.',
    quote: '"All three branches close at 18:00 and head-office report is on my phone by 18:05."',
    feats: [
      'Per-branch dashboards rolled into HQ view',
      'Cashier perf, loss prevention, manager PIN',
      'Bulk WhatsApp purchase orders to suppliers',
    ],
    price: '$45',
    per: '/branch · mo',
    priceSub: 'unlimited tills & users',
    tier: 'Enterprise',
    accent: T.ink,
    gradient: 'linear-gradient(135deg, #111827, #374151)',
    cta: 'Talk to sales →',
    demoModule: null,
  },
];

const PARITY_ROWS = [
  {
    capability: 'Mobile POS · cash · mobile money · card',
    farmer: 'Light — for ad-hoc sales at the farm gate',
    small: 'Yes — full POS lane, split-tender included',
    chain: 'Yes — multi-lane, multi-cashier',
  },
  {
    capability: 'Stock with reorder alerts',
    farmer: 'Inputs & feed',
    small: 'Yes',
    chain: 'Yes — per branch',
  },
  {
    capability: 'Livestock + fields',
    farmer: 'Yes',
    small: '—',
    chain: '—',
  },
  {
    capability: 'Tax authority compliance',
    farmer: 'Yes (where local rails exist)',
    small: 'Yes',
    chain: 'Yes — across all branches',
  },
  {
    capability: 'Loss prevention dashboard',
    farmer: '—',
    small: 'Yes',
    chain: 'Yes — with cross-branch flags',
  },
];

const AUTHORITIES = ['ZIMRA', 'KRA', 'SARS', 'RRA', 'TRA', 'URA', 'GRA', 'FIRS', 'ZRA', 'MRA', 'BURS', 'AT-Mz', 'FNE-CI', 'DGI-SN'];

/* ── tiny SVG icon set (stroke icons, no emoji) ─────────────────── */
function Icon({ d, stroke, size = 20, rect }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {rect && <rect x="7" y="2" width="10" height="20" rx="2.5" />}
      {d && <path d={d} />}
    </svg>
  );
}
const IC = {
  offline: 'M2 8.5a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.5a5 5 0 0 1 6 0M12 20h.01',
  tax: 'M9 12l2 2 4-4m5.6 2a9.6 9.6 0 1 1-19.2 0 9.6 9.6 0 0 1 19.2 0z',
  phone: 'M11 18h2',
  chat: 'M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l2-5.4a8.3 8.3 0 0 1-1-4A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z',
  chev: 'M6 9l6 6 6-6',
};

/* ── count-up stat ──────────────────────────────────────────────── */
function Stat({ color, end, prefix = '', suffix = '', label, meta }) {
  const ref = useRef(null);
  const [val, setVal] = useState(end); // render final value by default (no-JS/SSR safe)
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 900;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        setVal(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setVal(0);
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [end]);
  return (
    <div style={S.stat}>
      <div ref={ref} style={{ ...S.statVal, color }}>{prefix}{val}{suffix}</div>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statMeta}>{meta}</div>
    </div>
  );
}

export default function MobileLandingPage() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth() || {};
  const [busy, setBusy] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [opIndex, setOpIndex] = useState(1); // small shop first — main audience
  const [openParity, setOpenParity] = useState(0);
  const [featDot, setFeatDot] = useState(0);
  const [stickyShow, setStickyShow] = useState(false);

  const featRailRef = useRef(null);
  const panesRef = useRef(null);
  const heroCtaRef = useRef(null);
  const finalRef = useRef(null);
  const heroGone = useRef(false);
  const finalSeen = useRef(false);
  const touch = useRef({ x: 0, y: 0, dragging: false, locked: false });

  const enterDemo = async (module) => {
    if (busy || !module) return;
    haptics.tap();
    setBusy(module);
    try {
      const ok = await demoLogin?.(module);
      if (ok) navigate('/app');
    } finally { setBusy(null); }
  };

  /* feature rail dots — sync to scroll-snap position */
  useEffect(() => {
    const rail = featRailRef.current;
    if (!rail) return undefined;
    const cards = [...rail.children];
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setFeatDot(cards.indexOf(e.target)); });
    }, { root: rail, threshold: 0.6 });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  /* smart sticky CTA — appears after hero CTA leaves, hides at final CTA */
  useEffect(() => {
    const sync = () => setStickyShow(heroGone.current && !finalSeen.current);
    const io1 = new IntersectionObserver((es) => { heroGone.current = !es[0].isIntersecting; sync(); }, { threshold: 0 });
    const io2 = new IntersectionObserver((es) => { finalSeen.current = es[0].isIntersecting; sync(); }, { threshold: 0.15 });
    if (heroCtaRef.current) io1.observe(heroCtaRef.current);
    if (finalRef.current) io2.observe(finalRef.current);
    return () => { io1.disconnect(); io2.disconnect(); };
  }, []);

  const setOp = (i, animate = true) => {
    const idx = Math.max(0, Math.min(OPERATORS.length - 1, i));
    const el = panesRef.current;
    if (el) {
      el.style.transition = animate ? `transform .38s ${EASE}` : 'none';
      el.style.transform = `translateX(-${idx * (100 / OPERATORS.length)}%)`;
    }
    setOpIndex(idx);
  };
  const pickOp = (i) => { haptics.select(); setOp(i); };

  /* swipe between operator panes */
  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dragging: true, locked: false };
  };
  const onTouchMove = (e) => {
    const t = touch.current;
    if (!t.dragging) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (!t.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      t.locked = true;
      if (Math.abs(dy) > Math.abs(dx)) { t.dragging = false; return; } // vertical scroll wins
    }
    const el = panesRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateX(calc(-${opIndex * (100 / OPERATORS.length)}% + ${dx / 3}px))`;
    }
  };
  const onTouchEnd = (e) => {
    const t = touch.current;
    if (!t.dragging) return;
    t.dragging = false;
    const dx = e.changedTouches[0].clientX - t.x;
    if (dx < -48) setOp(opIndex + 1);
    else if (dx > 48) setOp(opIndex - 1);
    else setOp(opIndex);
  };

  const toggleParity = (idx) => { haptics.tap(); setOpenParity(openParity === idx ? -1 : idx); };
  const closeMenu = () => setMenuOpen(false);

  return (
    <div style={S.root}>
      {/* ── Sticky nav + slide-down menu ── */}
      <nav style={S.nav}>
        <a href="#top" style={S.brand} onClick={closeMenu}>
          <span style={S.brandDot} /> Pewil
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/login" style={S.navSignin}>Sign in</Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => { haptics.tap(); setMenuOpen(!menuOpen); }}
            style={S.burger}
          >
            <span style={{ ...S.burgerBar, transform: menuOpen ? 'translateY(0) rotate(45deg)' : 'translateY(-5px)' }} />
            <span style={{ ...S.burgerBar, opacity: menuOpen ? 0 : 1 }} />
            <span style={{ ...S.burgerBar, transform: menuOpen ? 'translateY(-4px) rotate(-45deg)' : 'translateY(3px)' }} />
          </button>
        </div>
        <div style={{ ...S.menu, gridTemplateRows: menuOpen ? '1fr' : '0fr' }}>
          <div style={{ overflow: 'hidden' }}>
            <a href="#features" style={S.menuLink} onClick={closeMenu}>Features <small style={S.menuSub}>Offline POS · fiscal · WhatsApp</small></a>
            <a href="#operators" style={S.menuLink} onClick={closeMenu}>Who it's for <small style={S.menuSub}>Farmer · shop · chain</small></a>
            <a href="#plans" style={S.menuLink} onClick={closeMenu}>Plans <small style={S.menuSub}>From $10/mo</small></a>
            <Link to="/farm" style={S.menuLink} onClick={closeMenu}>Pewil Farm <small style={S.menuSub}>Fields · livestock · harvest</small></Link>
            <Link to="/contact" style={S.menuLink} onClick={closeMenu}>Contact & support</Link>
            <Link to="/register" style={S.menuCta} onClick={() => { haptics.tap(); closeMenu(); }}>Start your 14-day free trial</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header style={S.hero} id="top">
        <div style={S.kick}><i style={S.kickDot} /> Built in Africa, for African operators</div>
        <h1 style={S.heroH1} className="ml-serif">
          Run your <span style={{ color: T.green }}>shop</span> &amp;{' '}
          your <span style={{ color: T.amber }}>farm</span> from one place.
        </h1>
        <p style={S.heroSub}>Sell, track stock, close the till — all on the phone in your hand.</p>
        <Link ref={heroCtaRef} to="/register" onClick={() => haptics.tap()} style={S.heroCta}>Start your 14-day free trial</Link>
        <div style={S.heroDemo}>
          Or try it instantly —{' '}
          <button type="button" onClick={() => enterDemo('retail')} disabled={!!busy} style={S.demoLink}>
            {busy === 'retail' ? 'opening…' : 'retail demo'}
          </button>
          {' · '}
          <button type="button" onClick={() => enterDemo('farm')} disabled={!!busy} style={S.demoLink}>
            {busy === 'farm' ? 'opening…' : 'farm demo'}
          </button>
        </div>

        {/* CSS phone mock of the till — overlaps into the trust band below */}
        <div style={S.mockWrap}>
          <div style={S.mock} className="mlp-float">
            <div style={S.mockScreen}>
              <div style={S.msTop}><b style={{ fontSize: 9.5 }}>Till 1 · Adaeze</b><span style={S.msChip}>● Offline — 3 queued</span></div>
              <div style={S.msItems}>
                {[['Mealie meal 10kg', '2 × $5.80', '$11.60'], ['Cooking oil 2L', '1 × $4.20', '$4.20'], ['Sugar 2kg', '1 × $2.65', '$2.65']].map(([n, q, tot]) => (
                  <div key={n} style={S.msItem}>
                    <div><b style={{ fontSize: 8.5 }}>{n}</b><small style={S.msItemQ}>{q}</small></div>
                    <span style={{ fontWeight: 700, fontSize: 8.5 }}>{tot}</span>
                  </div>
                ))}
              </div>
              <div style={S.msTotal}><span>Total</span><span>$18.45</span></div>
              <div style={S.msPay}>Charge $18.45</div>
              <div style={S.msTenders}>{['CASH', 'ECOCASH', 'CARD', 'SPLIT'].map((x) => <i key={x} style={S.msTender}>{x}</i>)}</div>
            </div>
          </div>
          <div style={S.slip}>
            <b style={S.slipHead}>Receipt #04211 ✓</b>
            Fiscalised · ZIMRA<br />Z-report queued<br />
            <span style={{ color: T.green, fontWeight: 700 }}>Synced 18:02</span>
          </div>
        </div>
      </header>

      {/* ── Trust band (dark, SVG icons) ── */}
      <div style={S.trust}>
        <div style={S.trustItem}><Icon d={IC.offline} stroke={T.amber2} />Works offline</div>
        <div style={S.trustItem}><Icon d={IC.tax} stroke={T.amber2} />Tax-compliant</div>
        <div style={S.trustItem}><Icon d={IC.phone} rect stroke={T.amber2} />Mobile money + card</div>
      </div>

      {/* ── Feature carousel ── */}
      <section id="features" style={{ padding: '34px 0 30px' }}>
        <Reveal><span style={S.eye}>Everything the till needs</span></Reveal>
        <Reveal><h2 style={S.h2} className="ml-serif">Swipe through what's inside.</h2></Reveal>
        <Reveal><p style={S.sub}>Four things operators use every single day.</p></Reveal>
        <div ref={featRailRef} style={S.rail} className="mlp-rail">
          <article style={S.fcard}>
            <div style={{ ...S.fic, background: '#e8f5ee' }}><Icon d={IC.offline} stroke={T.green} size={19} /></div>
            <h3 style={S.fcardH3} className="ml-serif">Sells even when the network drops</h3>
            <p style={S.fcardP}>Sales queue locally and sync the moment you're back online — built for the realities of African connectivity. 98% offline sync rate during outages.</p>
          </article>
          <article style={S.fcard}>
            <div style={{ ...S.fic, background: T.amberLight }}><Icon d={IC.tax} stroke={T.amber} size={19} /></div>
            <h3 style={S.fcardH3} className="ml-serif">Speaks your local tax authority</h3>
            <p style={S.fcardP}>14 country adapters with daily Z-reports and device pairing baked in.</p>
            <div style={S.chips}>{AUTHORITIES.slice(0, 11).map((a) => <i key={a} style={S.chip}>{a}</i>)}<i style={S.chip}>+3</i></div>
          </article>
          <article style={S.fcard}>
            <div style={{ ...S.fic, background: '#e8f5ee' }}><Icon d={IC.chat} stroke={T.green} size={19} /></div>
            <h3 style={S.fcardH3} className="ml-serif">Lives where suppliers live — WhatsApp</h3>
            <p style={S.fcardP}>Reorder POs go straight to suppliers via WhatsApp. Loyalty members get receipts on the same number they DM you on.</p>
          </article>
          <article style={S.fcard}>
            <div style={{ ...S.fic, background: T.amberLight }}><Icon d={IC.phone} rect stroke={T.amber} size={19} /></div>
            <h3 style={S.fcardH3} className="ml-serif">Mobile money + card, not just card</h3>
            <p style={S.fcardP}>Pay for Pewil itself with EcoCash, MTN, Airtel, M-Pesa, card or bank transfer — through Pesepay, Lenco and partners.</p>
          </article>
        </div>
        <div style={S.dots}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ ...S.dot, ...(featDot === i ? S.dotOn : null) }} />
          ))}
        </div>
      </section>

      {/* ── Operators: segmented control + swipeable panes ── */}
      <section id="operators" style={{ padding: '26px 0 30px' }}>
        <Reveal><span style={S.eye}>Built for the way you work</span></Reveal>
        <Reveal><h2 style={S.h2} className="ml-serif">One product. Three operators.</h2></Reveal>
        <Reveal><p style={S.sub}>Tap a tab — or swipe the card.</p></Reveal>

        <div style={S.seg}>
          <div style={{ ...S.segThumb, transform: `translateX(${opIndex * 100}%)` }} />
          {OPERATORS.map((o, i) => (
            <button key={o.key} type="button" onClick={() => pickOp(i)}
              style={{ ...S.segBtn, color: i === opIndex ? o.accent : T.muted }}>
              {o.chip}
            </button>
          ))}
        </div>

        <div style={{ overflow: 'hidden' }}>
          <div
            ref={panesRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ ...S.panes, transform: `translateX(-${opIndex * (100 / OPERATORS.length)}%)` }}
          >
            {OPERATORS.map((o) => (
              <div key={o.key} style={S.pane}>
                <article style={S.opCard}>
                  <div style={{ ...S.opHead, background: o.gradient }}>
                    <span style={{ ...S.opChip, color: o.accent }}>{o.chip}</span>
                  </div>
                  <div style={S.opBody}>
                    <h3 style={S.opTitle} className="ml-serif">{o.title}</h3>
                    <div style={S.opSub}>{o.sub}</div>
                    <blockquote style={{ ...S.quote, borderLeft: `3px solid ${o.accent}` }} className="ml-serif">{o.quote}</blockquote>
                    {o.feats.map((f) => (
                      <div key={f} style={S.feat}><b style={{ ...S.featTick, color: o.accent }}>✓</b><span>{f}</span></div>
                    ))}
                    <div style={S.opPrice}>
                      <div>
                        <span style={{ ...S.opAmt, color: o.accent }} className="ml-serif">{o.price}</span>
                        <span style={S.opPer}>{o.per}</span>
                        <div style={S.opPriceSub}>{o.priceSub}</div>
                      </div>
                      <div style={S.opTier}>{o.tier}</div>
                    </div>
                    {o.demoModule ? (
                      <button type="button" onClick={() => enterDemo(o.demoModule)} disabled={!!busy}
                        style={{ ...S.opCta, background: o.accent }}>
                        {busy === o.demoModule ? 'Opening demo…' : o.cta}
                      </button>
                    ) : (
                      <Link to="/contact" style={{ ...S.opCta, background: o.accent }}>{o.cta}</Link>
                    )}
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...S.dots, marginTop: 12 }}>
          {OPERATORS.map((o, i) => (
            <i key={o.key} style={{ ...S.dot, ...(opIndex === i ? S.dotOn : null) }} />
          ))}
        </div>
      </section>

      {/* ── Why (dark) ── */}
      <section style={S.why}>
        <Reveal><span style={{ ...S.eye, color: T.amber2 }}>Why we built this</span></Reveal>
        <Reveal>
          <h2 style={{ ...S.h2, color: '#fff' }} className="ml-serif">
            Made for the way <em style={{ fontStyle: 'italic', color: '#ffd480' }}>African operators</em> work.
          </h2>
        </Reveal>
        <div style={S.wlist}>
          <Reveal><article style={S.wcard}>
            <div style={S.wnum}>01</div>
            <h4 style={S.wh4} className="ml-serif">Works at the till even when the network drops</h4>
            <p style={S.wp}>Sales queue locally and sync the moment you're back online.</p>
          </article></Reveal>
          <Reveal><article style={S.wcard}>
            <div style={S.wnum}>02</div>
            <h4 style={S.wh4} className="ml-serif">Speaks the local tax authority</h4>
            <p style={S.wp}>Daily Z-reports + device pairing baked in, across 14 countries.</p>
            <div style={S.chips}>{AUTHORITIES.map((a) => <i key={a} style={S.wchip}>{a}</i>)}</div>
          </article></Reveal>
          <Reveal><article style={S.wcard}>
            <div style={S.wnum}>03</div>
            <h4 style={S.wh4} className="ml-serif">Lives where suppliers live — WhatsApp</h4>
            <p style={S.wp}>POs to suppliers and receipts to loyalty members, on the numbers they already use.</p>
          </article></Reveal>
          <Reveal><article style={S.wcard}>
            <div style={S.wnum}>04</div>
            <h4 style={S.wh4} className="ml-serif">Mobile money + card, not just card</h4>
            <p style={S.wp}>EcoCash, MTN, Airtel, M-Pesa, card and bank transfer through Pesepay, Lenco and partners.</p>
          </article></Reveal>
        </div>
      </section>

      {/* ── Parity accordion (animated) ── */}
      <section id="plans" style={{ padding: '32px 0 28px' }}>
        <Reveal><span style={S.eye}>What's on each plan</span></Reveal>
        <Reveal><h2 style={S.h2} className="ml-serif">Quick parity check.</h2></Reveal>
        <Reveal><p style={S.sub}>Tap a capability to compare across plans.</p></Reveal>
        <div style={S.accList}>
          {PARITY_ROWS.map((row, idx) => {
            const isOpen = openParity === idx;
            return (
              <div key={row.capability} style={S.accCard}>
                <button type="button" onClick={() => toggleParity(idx)} style={S.accQ} aria-expanded={isOpen}>
                  <span>{row.capability}</span>
                  <span style={{ ...S.accChev, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <Icon d={IC.chev} stroke={T.muted} size={16} />
                  </span>
                </button>
                <div style={{ ...S.accBody, gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={S.accGrid}>
                      <span style={{ ...S.accWho, color: T.green }}>Farmer</span><span style={S.accWhat}>{row.farmer}</span>
                      <span style={{ ...S.accWho, color: T.amber }}>Small shop</span><span style={S.accWhat}>{row.small}</span>
                      <span style={{ ...S.accWho, color: T.ink }}>Chain</span><span style={S.accWhat}>{row.chain}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Proof (count-up stats) ── */}
      <section style={{ padding: '32px 0 28px', background: T.bg2 }}>
        <Reveal><h2 style={{ ...S.h2, fontSize: 23 }} className="ml-serif">Numbers that justify the subscription.</h2></Reveal>
        <Reveal><p style={S.sub}>From operators piloting Pewil across the continent.</p></Reveal>
        <div style={S.pgrid}>
          <Stat color={T.green} end={12} suffix=" min" label="to first sale" meta="Signup → first receipt" />
          <Stat color={T.amber} end={48} prefix="$" label="variance caught" meta="Spaza pilot, Harare" />
          <Stat color={T.ink} end={98} suffix="%" label="offline sync rate" meta="Sales during outages" />
          <Stat color={T.green} end={14} suffix=" days" label="free trial" meta="No card — then from $10/mo" />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section ref={finalRef} style={S.final}>
        <Reveal>
          <h2 style={S.finalH2} className="ml-serif">
            Run your shop or farm <em style={{ fontStyle: 'italic', color: '#ffd480' }}>from your pocket</em>.
          </h2>
        </Reveal>
        <Reveal><p style={S.finalP}>14-day free trial, no card. Then one simple flat price from $10/month — pay by mobile money or card.</p></Reveal>
        <Reveal><Link to="/register" style={S.finalPrimary} onClick={() => haptics.tap()}>Start free</Link></Reveal>
        <Reveal><a href="#operators" style={S.finalGhost}>▶ See it in action</a></Reveal>
        <div style={S.finalMicro}>Made in Africa. Used wherever there's a phone signal.</div>
      </section>

      {/* ── Footer ── */}
      <footer style={S.foot}>
        <div style={S.footBrand} className="ml-serif">Pewil</div>
        <div style={S.footTag}>The operating system for African retailers and farmers.</div>
        <div style={S.footLinks}>
          <Link to="/pricing" style={S.footLink}>Pricing</Link>
          <Link to="/contact" style={S.footLink}>Support</Link>
          <Link to="/terms" style={S.footLink}>Terms</Link>
          <Link to="/privacy" style={S.footLink}>Privacy</Link>
          <Link to="/refunds" style={S.footLink}>Refund policy</Link>
          <Link to="/status" style={S.footLink}>Status</Link>
        </div>
        <div style={S.footBar}>© 2026 Pewil · Made in Africa</div>
      </footer>

      {/* ── Smart sticky CTA ── */}
      <div style={{ ...S.sticky, transform: stickyShow ? 'none' : 'translateY(110%)' }}>
        <button type="button" onClick={() => enterDemo('retail')} disabled={!!busy} style={S.stickyDemo}>
          {busy === 'retail' ? '…' : 'Demo'}
        </button>
        <Link to="/register" onClick={() => haptics.tap()} style={S.stickyGo}>Start your 14-day free trial</Link>
      </div>

      {/* float animation + hidden scrollbar for the rail */}
      <style>{`
        @keyframes mlp-float { 0%,100% { transform: rotate(-2deg) translateY(0); } 50% { transform: rotate(-2deg) translateY(-7px); } }
        .mlp-float { animation: mlp-float 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mlp-float { animation: none; } }
        .mlp-rail { scrollbar-width: none; }
        .mlp-rail::-webkit-scrollbar { display: none; }
      `}</style>

      <MobileInstallPrompt />
    </div>
  );
}

/* ── styles ────────────────────────────────────────────────────── */
const S = {
  root: {
    position: 'fixed', inset: 0,
    background: T.bg, color: T.ink,
    fontFamily: "'Inter', system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    overflowY: 'auto', overflowX: 'hidden',
  },

  nav: {
    position: 'sticky', top: 0, zIndex: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 18px',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    borderBottom: `1px solid ${T.line}`,
  },
  brand: {
    fontFamily: SERIF, fontWeight: 800, fontSize: 20,
    display: 'flex', alignItems: 'center', gap: 8,
    color: T.ink, textDecoration: 'none',
  },
  brandDot: {
    width: 11, height: 11, borderRadius: '50%',
    background: `linear-gradient(135deg, ${T.green} 40%, ${T.amber} 60%)`,
    boxShadow: '0 0 0 3px rgba(26,107,58,0.12)',
  },
  navSignin: { fontSize: 12.5, fontWeight: 600, color: T.inkSoft, textDecoration: 'none', padding: '8px 4px' },
  burger: {
    width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.line}`,
    background: '#fff', cursor: 'pointer', position: 'relative',
    display: 'grid', placeItems: 'center',
  },
  burgerBar: {
    position: 'absolute', width: 16, height: 2, background: T.ink, borderRadius: 2,
    transition: `transform .25s ${EASE}, opacity .2s`,
  },
  menu: {
    position: 'absolute', left: 0, right: 0, top: '100%',
    background: '#fff', borderBottom: `1px solid ${T.line}`,
    display: 'grid', transition: `grid-template-rows .35s ${EASE}`,
    boxShadow: '0 12px 30px rgba(17,24,39,0.08)',
  },
  menuLink: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 20px', fontSize: 14.5, fontWeight: 600, color: T.ink,
    textDecoration: 'none', borderTop: `1px solid ${T.bg2}`,
  },
  menuSub: { color: T.muted, fontWeight: 500, fontSize: 11 },
  menuCta: {
    display: 'block', margin: '10px 18px 16px', background: T.ink, color: '#fff',
    borderRadius: 999, textAlign: 'center', padding: 14, fontWeight: 700,
    fontSize: 14, textDecoration: 'none',
  },

  hero: {
    padding: '30px 22px 0', textAlign: 'center', overflow: 'hidden',
    background: `radial-gradient(ellipse 80% 50% at 100% 0%, ${T.amberLight}, transparent 60%),
                 radial-gradient(ellipse 80% 50% at 0% 100%, #e8f5ee, transparent 60%), #fff`,
  },
  kick: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 13px', borderRadius: 999,
    background: '#fff', border: `1px solid ${T.line}`,
    fontSize: 10, fontWeight: 700, color: T.muted,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  kickDot: { width: 6, height: 6, borderRadius: '50%', background: T.green },
  heroH1: {
    fontFamily: SERIF, fontSize: 'clamp(30px, 9vw, 37px)', lineHeight: 1.06,
    fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px',
  },
  heroSub: { fontSize: 14.5, color: T.inkSoft, lineHeight: 1.55, maxWidth: 300, margin: '0 auto 18px' },
  heroCta: {
    display: 'block', padding: '15px 22px', borderRadius: 999,
    background: T.ink, color: '#fff', fontWeight: 700, fontSize: 14.5,
    textAlign: 'center', boxShadow: '0 10px 26px rgba(17,24,39,0.22)', textDecoration: 'none',
  },
  heroDemo: { marginTop: 12, fontSize: 12, color: T.muted },
  demoLink: {
    background: 'none', border: 'none', padding: 0,
    color: T.green, fontWeight: 700, fontSize: 12,
    textDecoration: 'underline', textUnderlineOffset: 3,
    fontFamily: 'inherit', cursor: 'pointer',
  },

  mockWrap: { margin: '26px auto -74px', width: 242, position: 'relative', zIndex: 2 },
  mock: {
    borderRadius: 30, background: '#0f1420', padding: 9,
    boxShadow: '0 24px 60px rgba(17,24,39,0.35)',
  },
  mockScreen: { borderRadius: 22, background: '#fff', overflow: 'hidden', fontSize: 9, textAlign: 'left' },
  msTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 10px', borderBottom: `1px solid ${T.line}`,
  },
  msChip: { background: '#e8f5ee', color: T.green, fontWeight: 700, fontSize: 7.5, padding: '2px 7px', borderRadius: 999 },
  msItems: { padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 5 },
  msItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: '6px 8px',
  },
  msItemQ: { color: T.muted, fontSize: 7, display: 'block' },
  msTotal: { display: 'flex', justifyContent: 'space-between', padding: '8px 10px 4px', fontWeight: 800, fontSize: 10 },
  msPay: {
    margin: '6px 10px 10px', background: T.green, color: '#fff',
    borderRadius: 9, textAlign: 'center', padding: 8, fontWeight: 700, fontSize: 9,
  },
  msTenders: { display: 'flex', gap: 4, padding: '0 10px 10px' },
  msTender: {
    flex: 1, fontStyle: 'normal', textAlign: 'center', fontSize: 6.5, fontWeight: 700,
    color: T.inkSoft, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 6, padding: '4px 2px',
  },
  slip: {
    position: 'absolute', right: -46, top: 38, width: 92,
    background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10,
    boxShadow: '0 12px 30px rgba(17,24,39,0.14)', padding: 8,
    fontSize: 7, color: T.muted, transform: 'rotate(5deg)', textAlign: 'left', lineHeight: 1.5,
  },
  slipHead: { display: 'block', color: T.ink, fontSize: 7.5, marginBottom: 3 },

  trust: {
    position: 'relative', zIndex: 1,
    background: T.ink, color: '#fff',
    padding: '88px 18px 16px',
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center',
  },
  trustItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
  },

  eye: {
    display: 'block', textAlign: 'center',
    fontSize: 10.5, letterSpacing: '0.22em',
    color: T.muted, textTransform: 'uppercase',
    fontWeight: 700, marginBottom: 8, padding: '0 22px',
  },
  h2: {
    fontFamily: SERIF, textAlign: 'center',
    fontSize: 25, fontWeight: 800, lineHeight: 1.14,
    margin: '0 0 6px', padding: '0 22px',
  },
  sub: { color: T.muted, fontSize: 13, textAlign: 'center', padding: '0 26px', margin: '0 0 18px' },

  rail: {
    display: 'flex', gap: 12, overflowX: 'auto',
    padding: '4px 22px 6px',
    scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
  },
  fcard: {
    flex: '0 0 82%', scrollSnapAlign: 'center',
    borderRadius: 18, border: `1px solid ${T.line}`, background: '#fff',
    padding: '20px 18px 18px', boxShadow: '0 2px 10px rgba(17,24,39,0.04)',
  },
  fic: { width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', marginBottom: 12 },
  fcardH3: { fontFamily: SERIF, fontSize: 17.5, fontWeight: 800, lineHeight: 1.25, margin: '0 0 6px' },
  fcardP: { fontSize: 12.5, lineHeight: 1.55, color: T.inkSoft, margin: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  chip: {
    fontStyle: 'normal', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
    background: T.bg2, border: `1px solid ${T.line}`, color: T.inkSoft,
    borderRadius: 999, padding: '3px 8px',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 999, background: '#d1d5db', transition: 'all .3s ease' },
  dotOn: { width: 18, background: T.green },

  seg: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', position: 'relative',
    margin: '0 22px 16px', background: '#f3f4f6', borderRadius: 999, padding: 4,
  },
  segThumb: {
    position: 'absolute', top: 4, bottom: 4, left: 4,
    width: 'calc((100% - 8px) / 3)',
    background: '#fff', borderRadius: 999,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: `transform .3s ${EASE}`,
  },
  segBtn: {
    position: 'relative', zIndex: 1, padding: '9px 4px',
    fontSize: 11.5, fontWeight: 700, textAlign: 'center',
    background: 'transparent', border: 'none', borderRadius: 999,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'color .25s',
  },
  panes: { display: 'flex', width: '300%', touchAction: 'pan-y' },
  pane: { width: `${100 / 3}%`, padding: '0 22px', flexShrink: 0, boxSizing: 'border-box' },
  opCard: {
    border: `1px solid ${T.line}`, borderRadius: 18, overflow: 'hidden',
    background: '#fff', boxShadow: '0 2px 10px rgba(17,24,39,0.04)',
  },
  opHead: { aspectRatio: '21/9', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 14 },
  opChip: {
    background: '#fff', padding: '4px 11px', borderRadius: 999,
    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
  },
  opBody: { padding: '16px 16px 18px' },
  opTitle: { fontFamily: SERIF, fontSize: 21, fontWeight: 800, margin: '0 0 2px' },
  opSub: { fontSize: 12, color: T.muted, marginBottom: 12 },
  quote: {
    fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5,
    color: T.inkSoft, background: T.amberLight,
    borderRadius: '0 10px 10px 0', padding: '11px 13px', margin: '0 0 13px',
  },
  feat: { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.45, color: T.inkSoft, padding: '5px 0' },
  featTick: { flexShrink: 0, width: 17, textAlign: 'center', fontWeight: 800 },
  opPrice: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    borderTop: `1px solid ${T.line}`, marginTop: 12, paddingTop: 12,
  },
  opAmt: { fontFamily: SERIF, fontWeight: 800, fontSize: 28 },
  opPer: { fontSize: 11.5, color: T.muted, marginLeft: 2 },
  opPriceSub: { fontSize: 10.5, color: T.inkSoft, fontWeight: 600, marginTop: 4, lineHeight: 1.4 },
  opTier: { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted },
  opCta: {
    display: 'block', width: '100%', marginTop: 13, padding: 13,
    borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13,
    textAlign: 'center', border: 'none', textDecoration: 'none',
    fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box',
  },

  why: { background: T.ink, color: '#fff', marginTop: 6, padding: '34px 0 30px' },
  wlist: { display: 'flex', flexDirection: 'column', gap: 11, padding: '6px 22px 0' },
  wcard: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '17px 17px 15px',
  },
  wnum: { fontFamily: SERIF, fontWeight: 800, fontSize: 20, color: T.amber2, marginBottom: 7 },
  wh4: { fontFamily: SERIF, fontSize: 15.5, fontWeight: 700, lineHeight: 1.3, margin: '0 0 5px' },
  wp: { fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', margin: 0 },
  wchip: {
    fontStyle: 'normal', fontSize: 8.5, fontWeight: 700,
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.8)', borderRadius: 999, padding: '3px 8px',
  },

  accList: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 22px' },
  accCard: { background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' },
  accQ: {
    width: '100%', padding: '14px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    fontWeight: 700, fontSize: 12.5, background: 'transparent', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: T.ink,
  },
  accChev: { display: 'flex', transition: 'transform .3s ease', flexShrink: 0 },
  accBody: { display: 'grid', transition: `grid-template-rows .35s ${EASE}` },
  accGrid: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px',
    padding: '0 16px 14px', fontSize: 12, lineHeight: 1.45,
  },
  accWho: { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: 1 },
  accWhat: { color: T.inkSoft },

  pgrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 22px' },
  stat: { background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 14px' },
  statVal: { fontFamily: SERIF, fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 },
  statLabel: { fontSize: 12, fontWeight: 700, color: T.ink, lineHeight: 1.3, marginBottom: 2 },
  statMeta: { fontSize: 10.5, color: T.muted, lineHeight: 1.35 },

  final: {
    padding: '44px 22px 40px', textAlign: 'center', color: '#fff',
    background: 'linear-gradient(150deg, #0d4a22 0%, #111827 60%, #8b5200 100%)',
  },
  finalH2: { fontFamily: SERIF, fontSize: 29, fontWeight: 800, lineHeight: 1.12, margin: '0 0 11px' },
  finalP: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 20px' },
  finalPrimary: {
    display: 'block', background: '#fff', color: T.ink,
    padding: 14, borderRadius: 999, fontWeight: 700, fontSize: 14,
    marginBottom: 10, textDecoration: 'none', textAlign: 'center',
  },
  finalGhost: {
    display: 'block', background: 'transparent', color: '#fff',
    padding: 14, borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)',
    fontWeight: 700, fontSize: 13.5, textDecoration: 'none', textAlign: 'center',
  },
  finalMicro: { marginTop: 14, fontSize: 10.5, color: 'rgba(255,255,255,0.6)' },

  foot: { background: T.ink, color: 'rgba(255,255,255,0.7)', padding: '28px 22px 22px', fontSize: 12 },
  footBrand: { fontFamily: SERIF, fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 },
  footTag: { color: 'rgba(255,255,255,0.55)', marginBottom: 16 },
  footLinks: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 16 },
  footLink: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecoration: 'none', padding: '4px 0' },
  footBar: { borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  sticky: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
    padding: '10px 18px calc(12px + env(safe-area-inset-bottom, 0px))',
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    borderTop: `1px solid ${T.line}`,
    display: 'flex', gap: 10,
    transition: `transform .38s ${EASE}`,
  },
  stickyDemo: {
    flex: '0 0 auto', padding: '13px 16px', borderRadius: 999,
    border: `1.5px solid ${T.line}`, background: '#fff',
    fontWeight: 700, fontSize: 13, color: T.ink, cursor: 'pointer', fontFamily: 'inherit',
  },
  stickyGo: {
    flex: 1, padding: 13, borderRadius: 999,
    background: T.ink, color: '#fff', fontWeight: 700, fontSize: 13.5,
    textAlign: 'center', textDecoration: 'none',
  },
};
