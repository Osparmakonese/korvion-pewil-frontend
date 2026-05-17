import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileLandingPage from '../components/MobileLandingPage';

// =========================================================================
// Pewil public landing — ported from landing_designs/design_4_alt_three_operators.html
// Nav labels per Osy: Features, Customers, Pricing, Resources.
// Footer per Osy's spec — Product / Company / Legal, "Rooted in the work", etc.
// =========================================================================

function useDemoEntry() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  // ``loadingModule`` doubles as both "is something loading" and "which demo is
  // being opened" so we can show a per-button spinner without flicker between
  // Farm and Retail demos.
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

const PL_CSS = `
  .pl-root{font-family:'Inter',system-ui,sans-serif;color:#111827;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
  .pl-root *{box-sizing:border-box}
  .pl-root a{text-decoration:none;color:inherit}
  .pl-root img{display:block;max-width:100%}
  .pl-serif{font-family:'Playfair Display',Georgia,serif;letter-spacing:-0.02em}
  .pl-wrap{max-width:1240px;margin:0 auto;padding:0 32px}

  /* nav */
  .pl-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.94);backdrop-filter:blur(12px);border-bottom:1px solid #e5e7eb}
  .pl-nav-in{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
  .pl-brand{font-family:'Playfair Display',serif;font-weight:800;font-size:22px;letter-spacing:-0.01em;display:flex;align-items:center;gap:10px;color:#111827}
  .pl-brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#1a6b3a 40%,#c77700 60%);box-shadow:0 0 0 3px rgba(26,107,58,0.12)}
  .pl-nav-links{display:flex;gap:32px;font-size:14px;font-weight:500;color:#374151}
  .pl-nav-links a:hover{color:#111827}
  .pl-nav-cta{background:#111827;color:#fff!important;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:600}
  .pl-nav-cta:hover{background:#000}
  /* Sign-in link — always visible (mobile + desktop). User reported the
     login was hard to find behind the demo flow. Sits to the LEFT of
     the primary CTA so the visual rhythm reads: Login → Start free. */
  .pl-nav-actions{display:flex;align-items:center;gap:14px}
  .pl-nav-login{color:#374151;text-decoration:none;font-size:13px;font-weight:600;padding:8px 0}
  .pl-nav-login:hover{color:#111827}

  /* hero */
  .pl-hero{padding:96px 0 72px;background:radial-gradient(ellipse 60% 40% at 20% 20%,#e8f5ee,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,#fff4e1,transparent 60%),#fff}
  .pl-hero-in{text-align:center;max-width:980px;margin:0 auto}
  .pl-hero-kick{display:inline-flex;align-items:center;gap:10px;padding:8px 18px;border-radius:999px;background:#fff;border:1px solid #e5e7eb;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,0.04);margin-bottom:32px}
  .pl-hero-kick-dot{width:6px;height:6px;border-radius:50%;background:#1a6b3a;animation:pl-pulse 2s infinite}
  @keyframes pl-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  .pl-hero h1{font-size:76px;line-height:1.02;font-weight:700;margin:0 0 26px;color:#111827}
  .pl-hero h1 .g{color:#1a6b3a}
  .pl-hero h1 .a{color:#c77700}
  .pl-hero h1 .i{color:#111827}
  .pl-hero-sub{font-size:20px;color:#374151;max-width:740px;margin:0 auto 40px;line-height:1.6}
  .pl-hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .pl-btn{display:inline-flex;align-items:center;gap:10px;padding:15px 30px;border-radius:999px;font-weight:600;font-size:15px;transition:transform .2s,box-shadow .2s,background .2s,border-color .2s;border:1px solid transparent;cursor:pointer;text-decoration:none}
  .pl-btn-dark{background:#111827;color:#fff!important;box-shadow:0 8px 24px rgba(17,24,39,0.2)}
  .pl-btn-dark:hover{transform:translateY(-2px)}
  .pl-btn-ghost{background:#fff;color:#111827!important;border-color:#d1d5db}
  .pl-btn-ghost:hover{border-color:#111827;transform:translateY(-2px)}
  .pl-hero-demo{margin-top:20px;font-size:13px;color:#6b7280}
  .pl-hero-demo button{background:none;border:0;padding:0;font:inherit;color:#1a6b3a;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .pl-hero-demo button:hover{color:#0d4a22}
  .pl-hero-demo button:disabled{opacity:0.55;cursor:wait}

  /* persona ribbon */
  .pl-ribbon{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1000px;margin:80px auto 0}
  /* retail-only homepage variant — 2 tiles read better than 3 */
  .pl-ribbon-2{grid-template-columns:repeat(2,1fr);max-width:820px}
  .pl-ribbon-tile{aspect-ratio:4/5;border-radius:18px;overflow:hidden;position:relative;background:#111827;cursor:pointer;transition:transform .3s;display:block}
  .pl-ribbon-tile:hover{transform:translateY(-4px)}
  .pl-ribbon-tile img{width:100%;height:100%;object-fit:cover}
  .pl-ribbon-tile::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.75) 100%)}
  .pl-ribbon-label{position:absolute;z-index:2;left:20px;right:20px;bottom:18px;color:#fff}
  .pl-ribbon-chip{display:inline-block;padding:4px 10px;border-radius:999px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:10px}
  .pl-ribbon-tile.farmer .pl-ribbon-chip{background:#1a6b3a;color:#fff}
  .pl-ribbon-tile.small .pl-ribbon-chip{background:#c77700;color:#fff}
  .pl-ribbon-tile.chain .pl-ribbon-chip{background:#fff;color:#111827}
  .pl-ribbon-name{font-family:'Playfair Display',serif;font-weight:700;font-size:22px;line-height:1.2}
  .pl-ribbon-meta{font-size:12px;opacity:0.85;margin-top:4px}

  /* three operators */
  .pl-three{padding:120px 0;background:#f9fafb}
  .pl-three-head{text-align:center;max-width:760px;margin:0 auto 72px}
  .pl-eye{font-size:12px;letter-spacing:0.25em;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:14px}
  .pl-three-head h2{font-size:44px;line-height:1.12;margin:0 0 18px}
  .pl-three-head p{font-size:17px;color:#374151;line-height:1.65;margin:0}
  .pl-three-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  /* retail-only homepage variant — 2 cards centered, slightly larger gap */
  .pl-three-grid-2{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;max-width:1040px;margin:0 auto}
  .pl-op-card{background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;display:flex;flex-direction:column;transition:transform .3s,box-shadow .3s,border-color .3s}
  .pl-op-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,0.08)}
  .pl-op-card.farmer:hover{border-color:#2d9e58}
  .pl-op-card.small:hover{border-color:#c77700}
  .pl-op-card.chain:hover{border-color:#111827}
  .pl-op-photo{aspect-ratio:16/10;overflow:hidden;position:relative;background:#111827}
  .pl-op-photo img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
  .pl-op-card:hover .pl-op-photo img{transform:scale(1.06)}
  .pl-op-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,0.35) 100%)}
  .pl-op-photo-chip{position:absolute;top:16px;left:16px;z-index:2;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase}
  .pl-op-card.farmer .pl-op-photo-chip{background:#1a6b3a;color:#fff}
  .pl-op-card.small .pl-op-photo-chip{background:#c77700;color:#fff}
  .pl-op-card.chain .pl-op-photo-chip{background:#fff;color:#111827}
  .pl-op-body{padding:28px 28px 32px;flex:1;display:flex;flex-direction:column}
  .pl-op-title{font-family:'Playfair Display',serif;font-weight:700;font-size:24px;line-height:1.25;margin:0 0 6px}
  .pl-op-sub{font-size:13px;color:#6b7280;font-weight:500;margin-bottom:20px}
  .pl-op-quote{font-family:'Playfair Display',serif;font-style:italic;font-size:17px;line-height:1.55;color:#374151;padding:18px 20px;border-left:3px solid;border-radius:6px;margin-bottom:22px;background:#f9fafb}
  .pl-op-card.farmer .pl-op-quote{border-color:#1a6b3a;background:#e8f5ee}
  .pl-op-card.small .pl-op-quote{border-color:#c77700;background:#fff4e1}
  .pl-op-card.chain .pl-op-quote{border-color:#111827;background:#f3f4f6}
  .pl-op-feats{list-style:none;display:flex;flex-direction:column;gap:10px;font-size:14px;margin:0 0 24px;padding:0}
  .pl-op-feats li{display:flex;align-items:flex-start;gap:10px;color:#374151;line-height:1.5}
  .pl-op-feats li::before{content:'';flex-shrink:0;width:16px;height:16px;border-radius:50%;margin-top:2px}
  .pl-op-card.farmer .pl-op-feats li::before{background-image:linear-gradient(135deg,#1a6b3a,#2d9e58)}
  .pl-op-card.small .pl-op-feats li::before{background:#c77700}
  .pl-op-card.chain .pl-op-feats li::before{background:#111827}
  .pl-op-price{margin-top:auto;padding-top:18px;border-top:1px solid #e5e7eb;display:flex;align-items:baseline;justify-content:space-between}
  .pl-op-price .amt{font-family:'Playfair Display',serif;font-weight:700;font-size:34px}
  .pl-op-card.farmer .pl-op-price .amt{color:#1a6b3a}
  .pl-op-card.small .pl-op-price .amt{color:#c77700}
  .pl-op-price .per{font-size:13px;color:#6b7280;font-weight:500;margin-left:2px}
  .pl-op-price .tier{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280}
  .pl-op-price-sub{color:#374151;font-weight:600}
  .pl-op-price-sub .per{font-size:13px;color:#6b7280;font-weight:500}

  .pl-op-price-ent{margin-top:auto;padding-top:18px;border-top:1px solid #e5e7eb}
  .pl-op-price-ent-head{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
  .pl-op-price-ent-head .amt{font-family:'Playfair Display',serif;font-weight:700;font-size:40px;line-height:1;color:#111827;letter-spacing:-0.02em}
  .pl-op-price-ent-head .per{font-size:14px;color:#6b7280;font-weight:500}
  .pl-op-price-ent-note{font-size:12px;color:#6b7280;margin-bottom:14px;line-height:1.5}
  .pl-op-price-ent-scale{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px}
  .pl-op-price-ent-scale div{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 8px;text-align:center}
  .pl-op-price-ent-scale .br{display:block;font-size:11px;color:#6b7280;font-weight:600;margin-bottom:3px}
  .pl-op-price-ent-scale .pr{display:block;font-family:'Playfair Display',serif;font-weight:700;font-size:15px;color:#111827}
  .pl-op-btn{margin-top:16px;display:block;text-align:center;padding:12px;border-radius:10px;font-weight:600;font-size:14px;color:#fff!important;transition:transform .2s,opacity .2s}
  .pl-op-card.farmer .pl-op-btn{background:#1a6b3a}
  .pl-op-card.small .pl-op-btn{background:#c77700}
  .pl-op-card.chain .pl-op-btn{background:#111827}
  .pl-op-btn:hover{transform:translateY(-1px);opacity:0.95}

  /* thread */
  .pl-thread{padding:140px 0;background:#111827;color:#fff;position:relative;overflow:hidden}
  .pl-thread::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 18% 30%,rgba(26,107,58,0.22),transparent 45%),radial-gradient(circle at 82% 70%,rgba(199,119,0,0.18),transparent 45%);pointer-events:none}
  .pl-thread-in{position:relative;max-width:1140px;margin:0 auto;padding:0 32px}
  .pl-thread-head{max-width:780px;margin:0 auto 80px;text-align:center}
  .pl-thread-eye{font-size:12px;letter-spacing:0.25em;color:#c77700;text-transform:uppercase;font-weight:700;margin-bottom:16px}
  .pl-thread-head h2{font-size:52px;line-height:1.1;font-weight:700;margin:0 0 18px}
  .pl-thread-head h2 em{font-style:italic;color:#ffd480}
  .pl-thread-head p{font-size:17px;color:rgba(255,255,255,0.75);line-height:1.65;margin:0}
  .pl-thread-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .pl-thread-card{padding:32px 26px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1)}
  .pl-thread-num{font-family:'Playfair Display',serif;font-weight:700;font-size:34px;color:#c77700;margin-bottom:14px;line-height:1}
  .pl-thread-card h4{font-family:'Playfair Display',serif;font-weight:700;font-size:18px;margin:0 0 10px;line-height:1.3}
  .pl-thread-card p{font-size:14px;color:rgba(255,255,255,0.7);line-height:1.55;margin:0}

  /* parity table */
  .pl-parity{padding:120px 0}
  .pl-parity-head{text-align:center;margin-bottom:56px}
  .pl-parity-head h2{font-size:42px;line-height:1.12;max-width:720px;margin:0 auto}
  .pl-parity-table{background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;max-width:1140px;margin:0 auto}
  .pl-parity-row{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;border-bottom:1px solid #e5e7eb}
  /* retail-only homepage parity — 3 columns instead of 4 */
  .pl-parity-2 .pl-parity-row{grid-template-columns:1.4fr 1fr 1fr}
  .pl-parity-row:last-child{border-bottom:none}
  .pl-parity-row > div{padding:20px 22px;font-size:14px;line-height:1.5}
  .pl-parity-row.head > div{background:#111827;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase}
  .pl-parity-q{color:#111827;font-weight:600}
  .pl-parity-farm{color:#0d4a22;background:rgba(26,107,58,0.04);font-weight:500}
  .pl-parity-small{color:#8b5200;background:rgba(199,119,0,0.04);font-weight:500}
  .pl-parity-chain{color:#111827;background:rgba(17,24,39,0.04);font-weight:500}

  /* proof */
  .pl-proof{padding:100px 0;background:#f9fafb}
  .pl-proof-head{text-align:center;max-width:720px;margin:0 auto 56px}
  .pl-proof-head h2{font-size:38px;line-height:1.15;margin:0 0 14px}
  .pl-proof-head p{color:#374151;font-size:16px;margin:0}
  .pl-proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .pl-stat{background:#fff;border-radius:16px;padding:28px 24px;border:1px solid #e5e7eb}
  .pl-stat-val{font-family:'Playfair Display',serif;font-weight:700;font-size:40px;line-height:1;letter-spacing:-0.02em;margin-bottom:10px}
  .pl-stat.green .pl-stat-val{color:#1a6b3a}
  .pl-stat.amber .pl-stat-val{color:#c77700}
  .pl-stat.ink .pl-stat-val{color:#111827}
  .pl-stat-label{font-size:13px;font-weight:600;color:#111827;margin-bottom:4px}
  .pl-stat-meta{font-size:12px;color:#6b7280}

  /* cta */
  .pl-cta{padding:130px 0;text-align:center;color:#fff;position:relative;overflow:hidden;background:linear-gradient(120deg,#0d4a22 0%,#111827 50%,#8b5200 100%)}
  .pl-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,255,255,0.12),transparent 45%),radial-gradient(circle at 80% 70%,rgba(255,244,225,0.1),transparent 45%);pointer-events:none}
  .pl-cta-in{position:relative;max-width:760px;margin:0 auto;padding:0 32px}
  .pl-cta h2{font-size:56px;line-height:1.05;font-weight:700;margin:0 0 20px}
  .pl-cta h2 em{font-style:italic;color:#ffd480}
  .pl-cta p{font-size:18px;color:rgba(255,255,255,0.85);margin:0 auto 36px;line-height:1.6}
  .pl-cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .pl-btn-white{background:#fff;color:#111827!important}
  .pl-btn-white:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,0.2)}
  .pl-btn-outline-w{background:transparent;color:#fff!important;border-color:rgba(255,255,255,0.45)}
  .pl-btn-outline-w:hover{background:rgba(255,255,255,0.1);border-color:#fff}
  .pl-cta-micro{margin-top:24px;font-size:13px;color:rgba(255,255,255,0.7)}

  /* footer */
  .pl-foot{background:#111827;color:rgba(255,255,255,0.7);padding:60px 0 32px;font-size:14px}
  .pl-foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
  .pl-foot-brand{font-family:'Playfair Display',serif;font-weight:700;font-size:24px;color:#fff;margin-bottom:8px}
  .pl-foot-brand-sub{font-family:'Playfair Display',serif;font-style:italic;color:rgba(255,255,255,0.6);font-size:15px;margin-bottom:14px}
  .pl-foot-tag{max-width:320px;line-height:1.65;color:rgba(255,255,255,0.55)}
  .pl-foot-col h4{color:#fff;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 16px;font-weight:600}
  .pl-foot-col a{display:block;margin-bottom:10px;color:rgba(255,255,255,0.7)}
  .pl-foot-col a:hover{color:#fff}
  .pl-foot-bar{border-top:1px solid rgba(255,255,255,0.12);padding-top:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px;font-size:12px;color:rgba(255,255,255,0.5)}

  @media (max-width:980px){
    .pl-hero{padding:72px 0 56px}
    .pl-hero h1{font-size:48px}
    .pl-hero-sub{font-size:17px}
    .pl-ribbon{grid-template-columns:1fr;max-width:420px;margin-top:56px}
    .pl-three{padding:80px 0}
    .pl-three-grid{grid-template-columns:1fr;gap:20px}
    .pl-thread{padding:96px 0}
    .pl-thread-grid{grid-template-columns:repeat(2,1fr)}
    .pl-parity{padding:80px 0}
    .pl-parity-row{grid-template-columns:1fr}
    .pl-parity-row > div{border-bottom:1px solid #e5e7eb}
    .pl-parity-row.head > div{border-bottom:1px solid rgba(255,255,255,0.12)}
    .pl-parity-row:last-child > div:last-child{border-bottom:none}
    .pl-proof{padding:72px 0}
    .pl-proof-grid{grid-template-columns:repeat(2,1fr)}
    .pl-cta{padding:96px 0}
    .pl-cta h2{font-size:36px}
    .pl-thread-head h2{font-size:36px}
    .pl-three-head h2{font-size:32px}
    .pl-parity-head h2{font-size:32px}
    .pl-proof-head h2{font-size:28px}
    .pl-foot-grid{grid-template-columns:1fr 1fr;gap:32px}
    .pl-nav-links{display:none}
  }
  @media (max-width:560px){
    .pl-hero{padding:48px 0 40px}
    .pl-hero h1{font-size:36px}
    .pl-hero-sub{font-size:15px;margin-bottom:24px}
    .pl-hero-actions{flex-direction:column}
    .pl-hero-actions .pl-btn{justify-content:center}
    .pl-ribbon{grid-template-columns:1fr;max-width:100%;margin-top:36px}
    .pl-ribbon-tile{aspect-ratio:16/10}
    .pl-three{padding:60px 0}
    .pl-three-grid{grid-template-columns:1fr;gap:16px}
    .pl-three-head h2{font-size:28px}
    .pl-thread{padding:60px 0}
    .pl-thread-head h2{font-size:30px}
    .pl-thread-grid{grid-template-columns:1fr}
    .pl-parity{padding:50px 0}
    .pl-parity-head h2{font-size:24px}
    .pl-parity-row{grid-template-columns:1fr}
    .pl-parity-row.head{display:none}
    .pl-parity-row > div{padding:14px 16px;border-bottom:1px solid #f3f4f6}
    .pl-parity-q{background:#f9fafb;font-weight:700}
    .pl-parity-farm::before{content:'Farmer · ';font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1a6b3a}
    .pl-parity-small::before{content:'Small shop · ';font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#c77700}
    .pl-parity-chain::before{content:'Chain · ';font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#111827}
    .pl-proof{padding:50px 0}
    .pl-proof-head h2{font-size:24px}
    .pl-proof-grid{grid-template-columns:1fr;gap:12px}
    .pl-stat{padding:20px 18px}
    .pl-stat-val{font-size:32px}
    .pl-cta{padding:60px 0}
    .pl-cta h2{font-size:28px}
    .pl-cta-actions{flex-direction:column}
    .pl-cta-actions .pl-btn{justify-content:center}
    .pl-foot{padding:40px 0 24px}
    .pl-foot-grid{grid-template-columns:1fr;gap:24px}
    .pl-wrap{padding:0 22px}
  }
`;

const UNSPLASH = {
  farmer:  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&q=80',
  shop:    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&q=80',
  chain:   'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=900&q=80',
  farmer2: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&q=80',
  chain2:  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80',
};

function handleImgErr(fallback) {
  return function (e) {
    const img = e.currentTarget;
    const parent = img.parentElement;
    if (parent) parent.style.background = fallback;
    img.remove();
  };
}

const LandingPage = () => {
  const { user } = useAuth();
  const { enterDemo, loadingModule, demoError } = useDemoEntry();
  const demoLoading = Boolean(loadingModule);

  // Mobile breakpoint — phones get the proper-mobile MobileLandingPage
  // (segmented tabs, persona scroll, accordion parity, sticky CTA).
  // Desktop landing (PL_CSS below) renders unchanged at >500px. Same
  // palette + Inter + Playfair across both so brand stays unified.
  // Hooks declared before any conditional return.
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

  if (user) return <Navigate to="/app" replace />;
  if (isMobile) return <MobileLandingPage />;

  return (
    <div className="pl-root">
      <style>{PL_CSS}</style>

      {/* ─── nav ───────────────────────────────────────── */}
      <nav className="pl-nav">
        <div className="pl-wrap pl-nav-in">
          <Link to="/" className="pl-brand">
            <span className="pl-brand-dot" />
            Pewil
          </Link>
          <div className="pl-nav-links">
            <a href="#operators">Features</a>
            <a href="#proof">Customers</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/download">Desktop app</Link>
            <Link to="/farm">Pewil Farm</Link>
          </div>
          <div className="pl-nav-actions">
            <Link to="/login" className="pl-nav-login">Sign in</Link>
            <Link to="/register" className="pl-nav-cta">Start free</Link>
          </div>
        </div>
      </nav>

      {/* ─── hero ──────────────────────────────────────── */}
      <section className="pl-hero">
        <div className="pl-wrap pl-hero-in">
          <div className="pl-hero-kick">
            <span className="pl-hero-kick-dot" />
            POS &amp; back-office for African shops
          </div>
          <h1 className="pl-serif">
            The till that <span className="g">closes&nbsp;clean</span>,<br />
            the stock that <span className="a">counts&nbsp;itself</span>,<br />
            the chain that <span className="i">runs&nbsp;your&nbsp;city</span>.
          </h1>
          <p className="pl-hero-sub">
            Pewil is the operating system for retail in Africa &mdash; from the tuckshop opening at six
            sharp to the supermarket group signing off the seventeenth branch. ZIMRA-ready, EcoCash-native,
            and ninety percent of what enterprise POS does at a tenth of the cost.
          </p>
          <div className="pl-hero-actions">
            <Link to="/register?persona=retail" className="pl-btn pl-btn-dark">Start free for 14 days &rarr;</Link>
            <a href="#operators" className="pl-btn pl-btn-ghost">See how it works</a>
          </div>
          <div className="pl-hero-demo">
            Or try the live retail demo &mdash;{' '}
            <button
              type="button"
              onClick={() => enterDemo('retail')}
              disabled={demoLoading}
            >
              {loadingModule === 'retail' ? 'opening retail demo…' : 'open Pewil Retail'}
            </button>
            {' '}&mdash; real data, no signup. Running a farm instead?{' '}
            <Link to="/farm" style={{ color: '#1a6b3a', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Visit Pewil Farm &rarr;
            </Link>
            {demoError && <div style={{ color: '#c0392b', marginTop: 8, fontSize: 12 }}>{demoError}</div>}
          </div>

          {/* persona ribbon — retail-only (two operators of retail) */}
          <div className="pl-ribbon pl-ribbon-2">
            <a className="pl-ribbon-tile small" href="#op-small">
              <img
                src={UNSPLASH.shop}
                onError={handleImgErr('linear-gradient(135deg,#c77700,#8b5200)')}
                alt="Small shop"
              />
              <div className="pl-ribbon-label">
                <span className="pl-ribbon-chip">Pewil Retail</span>
                <div className="pl-ribbon-name">The shopkeeper opening at six sharp</div>
                <div className="pl-ribbon-meta">One counter. One to three branches. Full control.</div>
              </div>
            </a>
            <a className="pl-ribbon-tile chain" href="#op-chain">
              <img
                src={UNSPLASH.chain}
                onError={handleImgErr('linear-gradient(135deg,#374151,#111827)')}
                alt="Chain retail"
              />
              <div className="pl-ribbon-label">
                <span className="pl-ribbon-chip">Pewil Retail · Chain</span>
                <div className="pl-ribbon-name">The ops director signing off the 17th branch</div>
                <div className="pl-ribbon-meta">Unlimited users. Chain-grade. Multi-branch rollup live.</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ─── two operators ─────────────────────────────── */}
      <section className="pl-three pl-three-2" id="operators">
        <div className="pl-wrap">
          <div className="pl-three-head">
            <div className="pl-eye">Two retail operators · One software</div>
            <h2 className="pl-serif">Built for shops of every size.</h2>
            <p>
              Pewil Retail scales with you &mdash; from one counter and one cashier to a chain with branches in three cities.
              Same login, same data model, same philosophy. The screens you see are the ones you need.
            </p>
          </div>

          <div className="pl-three-grid pl-three-grid-2">

            {/* SMALL SHOP */}
            <div className="pl-op-card small" id="op-small">
              <div className="pl-op-photo">
                <span className="pl-op-photo-chip">Pewil Retail</span>
                <img
                  src={UNSPLASH.shop}
                  onError={handleImgErr('linear-gradient(135deg,#ffd480,#c77700)')}
                  alt=""
                />
              </div>
              <div className="pl-op-body">
                <h3 className="pl-op-title">The small shop owner</h3>
                <div className="pl-op-sub">Tuckshop · corner store · one to three branches</div>
                <div className="pl-op-quote">
                  "I stopped worrying about the till. My cashier closes, the variance is zero, and I go home. That sentence is a whole story."
                </div>
                <ul className="pl-op-feats">
                  <li>POS that's faster than the till you already use</li>
                  <li>Stock that counts itself with every sale</li>
                  <li>Supplier books out of the WhatsApp thread</li>
                  <li>Tax authority native &mdash; ZIMRA, KRA, SARS, RRA, TRA, URA, GRA, FIRS, ZRA, MRA, BURS, AT-Mz, FNE-CI &amp; more, not a plugin</li>
                  <li>Built for the shop that opens at six</li>
                </ul>
                <div className="pl-op-price">
                  <div>
                    <span className="tier">Up to 1,000 receipts a month</span>
                    <div><span className="amt">$0</span><span className="per">/mo</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="tier">Above that &mdash; half a cent each</span>
                    <div className="pl-op-price-sub">$0.005<span className="per">/receipt</span></div>
                  </div>
                </div>
                <Link to="/register?persona=retail" className="pl-op-btn">Start Pewil Retail &rarr;</Link>
              </div>
            </div>

            {/* CHAIN */}
            <div className="pl-op-card chain" id="op-chain">
              <div className="pl-op-photo">
                <span className="pl-op-photo-chip">Pewil Retail &middot; Chain</span>
                <img
                  src={UNSPLASH.chain2}
                  onError={handleImgErr('linear-gradient(135deg,#374151,#111827)')}
                  alt=""
                />
              </div>
              <div className="pl-op-body">
                <h3 className="pl-op-title">The chain operator</h3>
                <div className="pl-op-sub">Supermarket group · hardware chain · pharmacy group</div>
                <div className="pl-op-quote">
                  "Ninety percent of what the bigger chains do with enterprise POS, at a tenth of the cost. And the branch-level dashboard was actually better."
                </div>
                <ul className="pl-op-feats">
                  <li>Unlimited users, role-based access control</li>
                  <li>API access + data export for your BI stack</li>
                  <li>Dedicated support + uptime SLA</li>
                  <li>Multi-branch rollup &mdash; live, branch-by-branch P&amp;L on one dashboard</li>
                  <li>Cross-branch inventory and transfer orders &mdash; live, with manager approval gates</li>
                </ul>
                <div className="pl-op-price-ent">
                  <div className="pl-op-price-ent-head">
                    <span className="amt">$99</span>
                    <span className="per">max per month, ever</span>
                  </div>
                  <div className="pl-op-price-ent-note">
                    No per-branch fee. No per-seat fee. Same per-receipt pricing as the smallest shop &mdash; hard ceiling at $99/month no matter how many tills, branches, or millions of sales you ring.
                  </div>
                  <div className="pl-op-price-ent-scale">
                    <div><span className="br">1 branch · 3,000 sales/mo</span><span className="pr">$10/mo</span></div>
                    <div><span className="br">12 branches · 60,000 sales/mo</span><span className="pr">$99/mo (capped)</span></div>
                    <div><span className="br">50 branches · 5M sales/mo</span><span className="pr">$99/mo (capped)</span></div>
                  </div>
                </div>
                <Link to="/contact?type=enterprise" className="pl-op-btn">Talk to us about your chain &rarr;</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── the thread ────────────────────────────────── */}
      <section className="pl-thread" id="thread">
        <div className="pl-thread-in">
          <div className="pl-thread-head">
            <div className="pl-thread-eye">The thread between them</div>
            <h2 className="pl-serif">Why <em>one</em> system works at every scale.</h2>
            <p>
              A tuckshop owner and a chain ops director don't look alike. But their daily questions are the same four.
              Pewil Retail answers them the same way &mdash; just at different scales.
            </p>
          </div>
          <div className="pl-thread-grid">
            <div className="pl-thread-card">
              <div className="pl-thread-num">01</div>
              <h4>What came in today?</h4>
              <p>Goods received, supplier POs, branch transfers &mdash; each one a receipt with a name on it.</p>
            </div>
            <div className="pl-thread-card">
              <div className="pl-thread-num">02</div>
              <h4>What went out today?</h4>
              <p>Every sale, every return, every cashier session &mdash; attributed, dated, tied to the till it ran on.</p>
            </div>
            <div className="pl-thread-card">
              <div className="pl-thread-num">03</div>
              <h4>Who worked, who gets paid?</h4>
              <p>Cashier sessions, manager overrides, advances and wages &mdash; with the same audit trail whether it's 1 cashier or 100.</p>
            </div>
            <div className="pl-thread-card">
              <div className="pl-thread-num">04</div>
              <h4>Did we make money?</h4>
              <p>Live P&amp;L, per branch or per product, per day or per quarter. Always. Not "at year-end."</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── parity table ──────────────────────────────── */}
      <section className="pl-parity pl-parity-2" id="parity">
        <div className="pl-wrap">
          <div className="pl-parity-head">
            <div className="pl-eye">The same question, two answers</div>
            <h2 className="pl-serif">How Pewil scales with you.</h2>
          </div>
          <div className="pl-parity-table">
            <div className="pl-parity-row head">
              <div>The shopkeeper asks</div>
              <div>Single shop</div>
              <div>Chain operator</div>
            </div>
            <div className="pl-parity-row">
              <div className="pl-parity-q">What came in today?</div>
              <div className="pl-parity-small">Goods received note</div>
              <div className="pl-parity-chain">GRN across branches + transfers</div>
            </div>
            <div className="pl-parity-row">
              <div className="pl-parity-q">What went out today?</div>
              <div className="pl-parity-small">POS sales + returns</div>
              <div className="pl-parity-chain">Chain-wide sales rollup</div>
            </div>
            <div className="pl-parity-row">
              <div className="pl-parity-q">Who worked, who gets paid?</div>
              <div className="pl-parity-small">Cashier sessions + staff hours</div>
              <div className="pl-parity-chain">HR + payroll across branches</div>
            </div>
            <div className="pl-parity-row">
              <div className="pl-parity-q">Did we make money?</div>
              <div className="pl-parity-small">P&amp;L per day, per product</div>
              <div className="pl-parity-chain">P&amp;L per branch, per region</div>
            </div>
            <div className="pl-parity-row">
              <div className="pl-parity-q">What should I watch tomorrow?</div>
              <div className="pl-parity-small">AI morning briefing</div>
              <div className="pl-parity-chain">AI briefing + ops dashboard</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── proof ─────────────────────────────────────── */}
      <section className="pl-proof" id="proof">
        <div className="pl-wrap">
          <div className="pl-proof-head">
            <h2 className="pl-serif">What the operators are saying with their numbers</h2>
            <p>Measured across real Pewil Retail operators &mdash; from a one-counter tuckshop in Avenues to a twelve-branch supermarket group.</p>
          </div>
          <div className="pl-proof-grid">
            <div className="pl-stat amber">
              <div className="pl-stat-val">+14%</div>
              <div className="pl-stat-label">Monthly gross margin</div>
              <div className="pl-stat-meta">Pewil Retail · single-counter shops</div>
            </div>
            <div className="pl-stat green">
              <div className="pl-stat-val">$0.00</div>
              <div className="pl-stat-label">Till variance at close</div>
              <div className="pl-stat-meta">Avg across Pewil Retail cashiers</div>
            </div>
            <div className="pl-stat ink">
              <div className="pl-stat-val">12&nbsp;&rarr;&nbsp;1</div>
              <div className="pl-stat-label">Hours to close a chain</div>
              <div className="pl-stat-meta">Pewil Retail · chain operator</div>
            </div>
            <div className="pl-stat green">
              <div className="pl-stat-val">1/10</div>
              <div className="pl-stat-label">The cost of enterprise POS</div>
              <div className="pl-stat-meta">Chain ops director, 12 branches</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── cta ───────────────────────────────────────── */}
      <section className="pl-cta" id="cta">
        <div className="pl-cta-in">
          <h2 className="pl-serif">Open the till tomorrow &mdash; <em>free</em> until you cross 1,000 sales a month.</h2>
          <p>
            Pewil Retail is free for the first 1,000 receipts every month &mdash; covers most dukas entirely.
            After that, half a US cent per receipt, capped at $99/month no matter how big you grow.
            No per-branch fee. No per-seat fee. No tier upgrades. Cancel anytime, export everything &mdash; the data was always yours.
          </p>
          <div className="pl-cta-actions">
            <Link to="/register?persona=retail" className="pl-btn pl-btn-white">Start as a shopkeeper &rarr;</Link>
            <Link to="/contact?type=enterprise" className="pl-btn pl-btn-outline-w">Talk to us about a chain</Link>
          </div>
          <div className="pl-cta-micro">
            No credit card required. Runs on Android, iOS, and any modern browser.
            {' '}&middot;{' '}
            Running a farm? <Link to="/farm" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>See Pewil Farm &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ─── footer (Osy's spec) ───────────────────────── */}
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
              <a href="#op-small">Pewil Retail</a>
              <a href="#op-chain">Pewil Retail for chains</a>
              <Link to="/farm">Pewil Farm</Link>
              <Link to="/download">Desktop app</Link>
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
            <div>
              &copy; 2026 Korvion Solution (Pvt) Ltd &middot; Harare, Zimbabwe
              <span style={{ opacity: 0.65, marginLeft: 12 }}>Pewil is a Korvion Solution product.</span>
            </div>
            <div>Made with care in Africa</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
