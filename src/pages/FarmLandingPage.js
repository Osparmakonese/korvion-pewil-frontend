import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * FarmLandingPage.js — Pewil Farm public marketing page.
 *
 * Lives at /farm. Mirrors the design system (Playfair + Inter, green
 * accent, same nav/footer shape) used by the retail homepage at / so
 * the masterbrand reads consistent across both, but the copy, persona
 * tiles, parity table, stats and CTA are tuned to the farmer ICP:
 * smallholder → mid-sized → commercial estate.
 *
 * Why a separate page (and not /pricing#farm or a tab on /):
 *   The retail and farm ICPs barely overlap. A unified homepage tries
 *   to address both and dulls both. Splitting funnels lets each landing
 *   page lead with sharp, single-buyer copy. See conversation 2026-05-16.
 *
 * Cross-links: nav has "Pewil Retail →" pointing to /, and the footer
 * keeps the same Product/Company/Legal columns the retail page uses so
 * SEO/discoverability across the masterbrand stays intact.
 */

function useDemoEntry() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [loadingModule, setLoadingModule] = useState(null);
  const [demoError, setDemoError] = useState('');
  async function enterDemo(module = 'farm') {
    if (loadingModule) return;
    setLoadingModule(module);
    setDemoError('');
    try {
      const ok = await demoLogin(module);
      if (ok) {
        navigate('/app');
      } else {
        setDemoError("Demo isn't available right now. Please try again shortly.");
      }
    } finally {
      setLoadingModule(null);
    }
  }
  return { enterDemo, loadingModule, demoError };
}

// Reuses the same PL_CSS palette + class prefixes as LandingPage.js so the
// design system stays unified. Tweaks are minimal: pl-hero gradient leans
// green (vs retail's amber+green mix) to telegraph "this is the farm page"
// without breaking the masterbrand look.
const FL_CSS = `
  .pl-root{font-family:'Inter',system-ui,sans-serif;color:#111827;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
  .pl-root *{box-sizing:border-box}
  .pl-root a{text-decoration:none;color:inherit}
  .pl-root img{display:block;max-width:100%}
  .pl-serif{font-family:'Playfair Display',Georgia,serif;letter-spacing:-0.02em}
  .pl-wrap{max-width:1240px;margin:0 auto;padding:0 32px}

  .pl-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.94);backdrop-filter:blur(12px);border-bottom:1px solid #e5e7eb}
  .pl-nav-in{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
  .pl-brand{font-family:'Playfair Display',serif;font-weight:800;font-size:22px;letter-spacing:-0.01em;display:flex;align-items:center;gap:10px;color:#111827}
  .pl-brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#1a6b3a 40%,#c77700 60%);box-shadow:0 0 0 3px rgba(26,107,58,0.12)}
  .pl-nav-links{display:flex;gap:32px;font-size:14px;font-weight:500;color:#374151}
  .pl-nav-links a:hover{color:#111827}
  .pl-nav-cta{background:#1a6b3a;color:#fff!important;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:600}
  .pl-nav-cta:hover{background:#0d4a22}
  .pl-nav-actions{display:flex;align-items:center;gap:14px}
  .pl-nav-login{color:#374151;text-decoration:none;font-size:13px;font-weight:600;padding:8px 0}
  .pl-nav-login:hover{color:#111827}

  /* hero — green-led for the farm page */
  .pl-hero{padding:96px 0 72px;background:radial-gradient(ellipse 65% 45% at 25% 25%,#e8f5ee,transparent 60%),radial-gradient(ellipse 55% 35% at 80% 75%,#fff4e1,transparent 60%),#fff}
  .pl-hero-in{text-align:center;max-width:980px;margin:0 auto}
  .pl-hero-kick{display:inline-flex;align-items:center;gap:10px;padding:8px 18px;border-radius:999px;background:#fff;border:1px solid #d1e7d8;font-size:12px;font-weight:700;color:#1a6b3a;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,0.04);margin-bottom:32px}
  .pl-hero-kick-dot{width:6px;height:6px;border-radius:50%;background:#1a6b3a;animation:pl-pulse 2s infinite}
  @keyframes pl-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  .pl-hero h1{font-size:72px;line-height:1.04;font-weight:700;margin:0 0 26px;color:#111827}
  .pl-hero h1 .g{color:#1a6b3a}
  .pl-hero h1 .a{color:#c77700}
  .pl-hero-sub{font-size:20px;color:#374151;max-width:740px;margin:0 auto 40px;line-height:1.6}
  .pl-hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .pl-btn{display:inline-flex;align-items:center;gap:10px;padding:15px 30px;border-radius:999px;font-weight:600;font-size:15px;transition:transform .2s,box-shadow .2s,background .2s,border-color .2s;border:1px solid transparent;cursor:pointer;text-decoration:none}
  .pl-btn-dark{background:#1a6b3a;color:#fff!important;box-shadow:0 8px 24px rgba(26,107,58,0.25)}
  .pl-btn-dark:hover{transform:translateY(-2px);background:#0d4a22}
  .pl-btn-ghost{background:#fff;color:#111827!important;border-color:#d1d5db}
  .pl-btn-ghost:hover{border-color:#1a6b3a;transform:translateY(-2px)}
  .pl-btn-white{background:#fff;color:#1a6b3a!important}
  .pl-btn-white:hover{transform:translateY(-2px)}
  .pl-btn-outline-w{background:transparent;color:#fff!important;border-color:rgba(255,255,255,0.55)}
  .pl-btn-outline-w:hover{border-color:#fff;background:rgba(255,255,255,0.08)}
  .pl-hero-demo{margin-top:20px;font-size:13px;color:#6b7280}
  .pl-hero-demo button{background:none;border:0;padding:0;font:inherit;color:#1a6b3a;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .pl-hero-demo button:hover{color:#0d4a22}
  .pl-hero-demo button:disabled{opacity:0.55;cursor:wait}

  /* features section — 3 columns of feature cards */
  .pl-three{padding:120px 0;background:#f9fafb}
  .pl-three-head{text-align:center;max-width:760px;margin:0 auto 72px}
  .pl-eye{font-size:12px;letter-spacing:0.25em;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:14px;color:#1a6b3a}
  .pl-three-head h2{font-size:44px;line-height:1.12;margin:0 0 18px;color:#111827}
  .pl-three-head p{font-size:17px;color:#374151;line-height:1.65;margin:0}
  .pl-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1140px;margin:0 auto}
  .pl-feat-card{background:#fff;border-radius:18px;border:1px solid #e5e7eb;padding:32px 28px;transition:transform .3s,box-shadow .3s,border-color .3s}
  .pl-feat-card:hover{transform:translateY(-4px);box-shadow:0 18px 36px rgba(0,0,0,0.07);border-color:#2d9e58}
  .pl-feat-icon{font-size:30px;margin-bottom:18px}
  .pl-feat-title{font-family:'Playfair Display',serif;font-weight:700;font-size:22px;line-height:1.25;margin:0 0 10px;color:#111827}
  .pl-feat-body{font-size:14px;line-height:1.6;color:#374151;margin:0}

  /* tier / pricing section */
  .pl-tier{padding:120px 0;background:#fff}
  .pl-tier-head{text-align:center;max-width:760px;margin:0 auto 64px}
  .pl-tier-head h2{font-size:42px;line-height:1.12;margin:0 0 14px;color:#111827}
  .pl-tier-head p{font-size:16px;color:#374151;line-height:1.6;margin:0}
  .pl-tier-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1080px;margin:0 auto}
  .pl-tier-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:30px 28px;display:flex;flex-direction:column;transition:transform .3s,border-color .3s,box-shadow .3s}
  .pl-tier-card:hover{transform:translateY(-4px);border-color:#1a6b3a;box-shadow:0 18px 36px rgba(0,0,0,0.06)}
  .pl-tier-card.featured{border-color:#1a6b3a;background:linear-gradient(180deg,#f7fbf8 0%,#fff 60%)}
  .pl-tier-card.featured::before{content:'Most chosen';position:absolute;margin-top:-44px;background:#1a6b3a;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
  .pl-tier-name{font-family:'Playfair Display',serif;font-weight:700;font-size:22px;margin:0 0 4px;color:#111827}
  .pl-tier-tag{font-size:12px;color:#6b7280;margin-bottom:18px}
  .pl-tier-amt{font-size:42px;font-weight:700;color:#1a6b3a;line-height:1;letter-spacing:-0.02em}
  .pl-tier-per{font-size:13px;color:#6b7280;margin-left:4px;font-weight:500}
  .pl-tier-feats{list-style:none;padding:18px 0 22px;margin:0 0 22px;border-top:1px solid #f3f4f6;flex:1;font-size:13px;line-height:1.6;color:#374151}
  .pl-tier-feats li{padding:6px 0;display:flex;gap:9px;align-items:flex-start}
  .pl-tier-feats li::before{content:'';width:14px;height:14px;border-radius:50%;background:#e8f5ee;color:#1a6b3a;flex:none;margin-top:4px;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 14 14' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%231a6b3a' d='M5.5 9.2 3.5 7.2 2.4 8.3l3.1 3.1 6-6L10.4 4.3z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
  .pl-tier-btn{display:inline-flex;justify-content:center;padding:11px 16px;border-radius:999px;font-weight:600;font-size:13px;border:1px solid #d1d5db;color:#111827;background:#fff;transition:transform .15s,border-color .15s,background .15s}
  .pl-tier-card.featured .pl-tier-btn{background:#1a6b3a;color:#fff;border-color:#1a6b3a}
  .pl-tier-btn:hover{transform:translateY(-1px)}

  /* proof / stats */
  .pl-proof{padding:120px 0;background:#0f3322;color:#fff}
  .pl-proof-head{text-align:center;max-width:760px;margin:0 auto 56px}
  .pl-proof-head h2{font-size:38px;line-height:1.16;margin:0 0 14px;color:#fff}
  .pl-proof-head p{font-size:16px;color:rgba(255,255,255,0.78);line-height:1.6;margin:0}
  .pl-proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;max-width:1140px;margin:0 auto}
  .pl-stat{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px 22px}
  .pl-stat-val{font-family:'Playfair Display',serif;font-weight:700;font-size:44px;line-height:1;letter-spacing:-0.02em;color:#a3e7b8;margin-bottom:8px}
  .pl-stat-label{font-size:14px;color:#fff;margin-bottom:6px;font-weight:600}
  .pl-stat-meta{font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.04em}

  /* cta */
  .pl-cta{padding:110px 0;background:linear-gradient(135deg,#1a6b3a 0%,#0d4a22 100%);color:#fff;text-align:center}
  .pl-cta-in{max-width:880px;margin:0 auto;padding:0 32px}
  .pl-cta h2{font-size:42px;line-height:1.16;margin:0 0 18px;color:#fff}
  .pl-cta h2 em{color:#ffd47a;font-style:normal}
  .pl-cta p{font-size:16px;color:rgba(255,255,255,0.85);line-height:1.65;margin:0 auto 32px;max-width:680px}
  .pl-cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .pl-cta-micro{margin-top:24px;font-size:12px;color:rgba(255,255,255,0.65)}
  .pl-cta-micro a{color:#fff;text-decoration:underline}

  /* footer (mirrors retail) */
  .pl-foot{background:#0a1a12;color:rgba(255,255,255,0.78);padding:64px 0 32px}
  .pl-foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px}
  .pl-foot-brand{font-family:'Playfair Display',serif;font-weight:800;font-size:24px;color:#fff;letter-spacing:-0.01em}
  .pl-foot-brand-sub{font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600}
  .pl-foot-tag{font-size:13px;line-height:1.6;color:rgba(255,255,255,0.65);margin-top:18px;max-width:380px}
  .pl-foot-col h4{font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin:0 0 14px}
  .pl-foot-col a{display:block;padding:5px 0;font-size:14px;color:rgba(255,255,255,0.85)}
  .pl-foot-col a:hover{color:#fff}
  .pl-foot-bar{margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.5)}

  /* responsive */
  @media (max-width:900px){
    .pl-nav-links{display:none}
    .pl-hero{padding:64px 0 56px}
    .pl-hero h1{font-size:44px}
    .pl-hero-sub{font-size:16px}
    .pl-three,.pl-tier,.pl-proof,.pl-cta{padding:64px 0}
    .pl-three-head h2,.pl-tier-head h2,.pl-proof-head h2,.pl-cta h2{font-size:30px}
    .pl-feat-grid,.pl-tier-grid{grid-template-columns:1fr}
    .pl-proof-grid{grid-template-columns:repeat(2,1fr)}
    .pl-foot-grid{grid-template-columns:1fr;gap:28px}
    .pl-wrap{padding:0 22px}
  }
  @media (max-width:500px){
    .pl-hero h1{font-size:36px}
    .pl-proof-grid{grid-template-columns:1fr}
    .pl-cta-actions{flex-direction:column}
    .pl-cta-actions .pl-btn{justify-content:center}
  }
`;

const FarmLandingPage = () => {
  const { user } = useAuth();
  const { enterDemo, loadingModule, demoError } = useDemoEntry();
  const demoLoading = Boolean(loadingModule);

  // Mobile responsive handled by FL_CSS @media queries — no separate
  // MobileLandingPage fork. The PL_CSS-derived design degrades cleanly
  // on phone widths per the May 2026 "mobile palette unified with desktop"
  // direction.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 500
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Per-page SEO + OG meta. The base index.html ships retail-led copy;
  // when this page mounts we swap the title and the OG tags so social
  // shares of pewil.org/farm preview as farm content, not retail.
  // Helmet isn't installed in this repo so we mutate the live <head>
  // directly. Cleanup restores the previous values on unmount so we
  // don't leak farm copy back onto the retail homepage.
  useEffect(() => {
    const prev = {
      title: document.title,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      ogDesc: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
      twTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      twDesc: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
      desc: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    };
    const set = (selector, content) => {
      const el = document.querySelector(selector);
      if (el && content != null) el.setAttribute('content', content);
    };
    const farmTitle = 'Pewil Farm — Run your farm from your pocket | African agribusiness software';
    const farmDesc = 'Pewil Farm: fields, crops, livestock, attendance, wages, AI briefing. Built for African farmers — smallholder to commercial estate. 14-day free trial, no card.';
    document.title = farmTitle;
    set('meta[property="og:title"]', farmTitle);
    set('meta[property="og:description"]', farmDesc);
    set('meta[property="og:url"]', 'https://pewil.org/farm');
    set('meta[name="twitter:title"]', farmTitle);
    set('meta[name="twitter:description"]', farmDesc);
    set('meta[name="description"]', farmDesc);
    return () => {
      document.title = prev.title;
      set('meta[property="og:title"]', prev.ogTitle);
      set('meta[property="og:description"]', prev.ogDesc);
      set('meta[property="og:url"]', prev.ogUrl);
      set('meta[name="twitter:title"]', prev.twTitle);
      set('meta[name="twitter:description"]', prev.twDesc);
      set('meta[name="description"]', prev.desc);
    };
  }, []);

  if (user) return <Navigate to="/app" replace />;

  return (
    <div className="pl-root">
      <style>{FL_CSS}</style>

      {/* ─── nav ───────────────────────────────────────── */}
      <nav className="pl-nav">
        <div className="pl-wrap pl-nav-in">
          <Link to="/farm" className="pl-brand">
            <span className="pl-brand-dot" />
            Pewil <span style={{ color: '#1a6b3a', marginLeft: 4 }}>Farm</span>
          </Link>
          <div className="pl-nav-links">
            <a href="#features">Features</a>
            <a href="#tiers">Pricing</a>
            <a href="#proof">Results</a>
            <Link to="/">Pewil Retail</Link>
          </div>
          <div className="pl-nav-actions">
            <Link to="/login" className="pl-nav-login">Sign in</Link>
            <Link to="/register?persona=farm" className="pl-nav-cta">Start free</Link>
          </div>
        </div>
      </nav>

      {/* ─── hero ──────────────────────────────────────── */}
      <section className="pl-hero">
        <div className="pl-wrap pl-hero-in">
          <div className="pl-hero-kick">
            <span className="pl-hero-kick-dot" />
            Built for African farmers
          </div>
          <h1 className="pl-serif">
            Run the farm <span className="g">from your pocket</span>.<br />
            Close the season <span className="a">on the numbers</span>.
          </h1>
          <p className="pl-hero-sub">
            Pewil Farm is the operating system for African agribusiness &mdash; 2 hectares or 2,000. Every input costed
            to the field it went on. Every hour tied to a worker. Every season decided by data, not by luck.
          </p>
          <div className="pl-hero-actions">
            <Link to="/register?persona=farm" className="pl-btn pl-btn-dark">Start free for 14 days &rarr;</Link>
            <a href="#features" className="pl-btn pl-btn-ghost">See how it works</a>
          </div>
          <div className="pl-hero-demo">
            Or try the live farm demo &mdash;{' '}
            <button
              type="button"
              onClick={() => enterDemo('farm')}
              disabled={demoLoading}
            >
              {loadingModule === 'farm' ? 'opening farm demo…' : 'open Pewil Farm'}
            </button>
            {' '}&mdash; 3 years of real data, no signup. Running a shop?{' '}
            <Link to="/" style={{ color: '#c77700', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Visit Pewil Retail &rarr;
            </Link>
            {demoError && <div style={{ color: '#c0392b', marginTop: 8, fontSize: 12 }}>{demoError}</div>}
          </div>
        </div>
      </section>

      {/* ─── features ──────────────────────────────────── */}
      <section className="pl-three" id="features">
        <div className="pl-wrap">
          <div className="pl-three-head">
            <div className="pl-eye">What Pewil Farm does</div>
            <h2 className="pl-serif">The whole farm, on one screen.</h2>
            <p>
              Six modules, one login. Built around the questions a farmer actually asks at the end of the day &mdash;
              not the questions a software vendor wants to sell you a dashboard for.
            </p>
          </div>
          <div className="pl-feat-grid">
            <div className="pl-feat-card">
              <div className="pl-feat-icon">🌾</div>
              <h3 className="pl-feat-title">Fields &amp; crops</h3>
              <p className="pl-feat-body">Plan, plant, harvest. Every input you spray, every kilo you pick &mdash; logged to the field it belongs to, with real P&amp;L per field per season.</p>
            </div>
            <div className="pl-feat-card">
              <div className="pl-feat-icon">🐄</div>
              <h3 className="pl-feat-title">Livestock</h3>
              <p className="pl-feat-body">Cattle, goats, sheep, pigs &mdash; tagged, weighed, vaccinated, sold. Mortality, breeding, weight gain, all tied to a single animal.</p>
            </div>
            <div className="pl-feat-card">
              <div className="pl-feat-icon">👷</div>
              <h3 className="pl-feat-title">Workers &amp; wages</h3>
              <p className="pl-feat-body">Attendance in the morning, advances during the week, wages on Friday. The whole pay-day done in 15 minutes instead of three hours of paper.</p>
            </div>
            <div className="pl-feat-card">
              <div className="pl-feat-icon">📦</div>
              <h3 className="pl-feat-title">Stock &amp; inputs</h3>
              <p className="pl-feat-body">Seed, fertilizer, fuel, chemicals &mdash; counted as you use them. Reorder alerts before you run out. Costs that follow the input to the field.</p>
            </div>
            <div className="pl-feat-card">
              <div className="pl-feat-icon">📱</div>
              <h3 className="pl-feat-title">WhatsApp digest</h3>
              <p className="pl-feat-body">Daily summary at 6am or 6pm &mdash; whichever you prefer. Yields, wages owed, stock running low, market prices. In your pocket, on the same WhatsApp you already use.</p>
            </div>
            <div className="pl-feat-card">
              <div className="pl-feat-icon">🤖</div>
              <h3 className="pl-feat-title">AI morning briefing</h3>
              <p className="pl-feat-body">"You're 3 days off harvest on field 4. Rain is forecast Thursday. You haven't ordered fuel since Monday." A daily nudge from a co-manager that never sleeps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── tiers ─────────────────────────────────────── */}
      <section className="pl-tier" id="tiers">
        <div className="pl-wrap">
          <div className="pl-tier-head">
            <div className="pl-eye">Three sizes · One philosophy</div>
            <h2 className="pl-serif">From two hectares to two thousand.</h2>
            <p>
              No tier cliffs, no surprise invoices. Pewil Farm scales with you &mdash; smallholder, mid-sized, commercial.
              Yearly billing gets 2 months free. Cancel anytime, export everything.
            </p>
          </div>
          <div className="pl-tier-grid">
            <div className="pl-tier-card">
              <h3 className="pl-tier-name">Starter</h3>
              <div className="pl-tier-tag">Smallholder · up to 5 fields</div>
              <div><span className="pl-tier-amt">$10</span><span className="pl-tier-per">/month</span></div>
              <ul className="pl-tier-feats">
                <li>Fields, crops, harvest log</li>
                <li>3 workers · attendance + wages</li>
                <li>Stock + inputs costed to fields</li>
                <li>Daily WhatsApp digest</li>
                <li>14-day free trial, no card</li>
              </ul>
              <Link to="/register?persona=farm&plan=farm-starter" className="pl-tier-btn">Start free &rarr;</Link>
            </div>
            <div className="pl-tier-card featured">
              <h3 className="pl-tier-name">Growth</h3>
              <div className="pl-tier-tag">Mid-sized · unlimited fields</div>
              <div><span className="pl-tier-amt">$30</span><span className="pl-tier-per">/month</span></div>
              <ul className="pl-tier-feats">
                <li>Everything in Starter</li>
                <li>Unlimited workers + livestock</li>
                <li>Per-field, per-season P&amp;L</li>
                <li>AI morning briefing</li>
                <li>Market trips + revenue tracking</li>
              </ul>
              <Link to="/register?persona=farm&plan=farm-growth" className="pl-tier-btn">Start Growth &rarr;</Link>
            </div>
            <div className="pl-tier-card">
              <h3 className="pl-tier-name">Enterprise</h3>
              <div className="pl-tier-tag">Commercial estate · multi-site</div>
              <div><span className="pl-tier-amt">$60</span><span className="pl-tier-per">/month</span></div>
              <ul className="pl-tier-feats">
                <li>Everything in Growth</li>
                <li>Unlimited users, role-based</li>
                <li>API + data export to your BI</li>
                <li>Multi-site rollup</li>
                <li>Dedicated support + SLA</li>
              </ul>
              <Link to="/contact?type=farm-enterprise" className="pl-tier-btn">Talk to us &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── proof ─────────────────────────────────────── */}
      <section className="pl-proof" id="proof">
        <div className="pl-wrap">
          <div className="pl-proof-head">
            <h2 className="pl-serif">What changes when the farm runs on Pewil</h2>
            <p>Measured across Pewil Farm operators &mdash; from a two-hectare smallholder in Chinhoyi to a 600-hectare commercial estate in Mashonaland Central.</p>
          </div>
          <div className="pl-proof-grid">
            <div className="pl-stat">
              <div className="pl-stat-val">&minus;31%</div>
              <div className="pl-stat-label">Time on wages day</div>
              <div className="pl-stat-meta">Pewil Farm · all tiers</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-val">+22%</div>
              <div className="pl-stat-label">Yield per hectare</div>
              <div className="pl-stat-meta">Smallholder, season 2 vs 1</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-val">15&nbsp;min</div>
              <div className="pl-stat-label">Pay day, from start to closed</div>
              <div className="pl-stat-meta">Was 3+ hours on paper</div>
            </div>
            <div className="pl-stat">
              <div className="pl-stat-val">0</div>
              <div className="pl-stat-label">Inputs left uncosted</div>
              <div className="pl-stat-meta">Every spray tied to a field</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── cta ───────────────────────────────────────── */}
      <section className="pl-cta">
        <div className="pl-cta-in">
          <h2 className="pl-serif">Run your next season on <em>Pewil&nbsp;Farm</em>.</h2>
          <p>
            14 days free, no card, no charge. Pewil Farm from $10/mo (smallholder) to $60/mo (commercial estate).
            Yearly billing gets 2 months free. Cancel anytime, export everything &mdash; the data was always yours.
          </p>
          <div className="pl-cta-actions">
            <Link to="/register?persona=farm" className="pl-btn pl-btn-white">Start Pewil Farm &rarr;</Link>
            <Link to="/contact?type=farm-enterprise" className="pl-btn pl-btn-outline-w">Talk to us about an estate</Link>
          </div>
          <div className="pl-cta-micro">
            No credit card required. Runs on Android, iOS, and any modern browser.
            {' '}&middot;{' '}
            Running a shop? <Link to="/">Visit Pewil Retail &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ─── footer (mirrors retail homepage) ──────────── */}
      <footer className="pl-foot">
        <div className="pl-wrap">
          <div className="pl-foot-grid">
            <div>
              <div className="pl-foot-brand">Pewil</div>
              <div className="pl-foot-brand-sub">Rooted in the work.</div>
              <p className="pl-foot-tag">
                The operating system for African retail and agribusiness. Built in Harare. Shipped with love across borders.
              </p>
            </div>
            <div className="pl-foot-col">
              <h4>Product</h4>
              <Link to="/farm">Pewil Farm</Link>
              <Link to="/">Pewil Retail</Link>
              <Link to="/">Pewil Retail Enterprise</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="pl-foot-col">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <a href="#proof">Stories</a>
              <Link to="/contact">Careers</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="pl-foot-col">
              <h4>Legal</h4>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/refunds">Refunds</Link>
              <Link to="/status">Status</Link>
            </div>
          </div>
          <div className="pl-foot-bar">
            <div>&copy; 2026 Pewil Technologies Pvt Ltd · Harare, Zimbabwe</div>
            <div>Made with care in Africa</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FarmLandingPage;
