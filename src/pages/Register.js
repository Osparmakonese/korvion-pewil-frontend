import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Register.js — Pewil signup, persona-aware.
 *
 * Redesigned 2026-05-16 to match the new retail-led / farm-led landing
 * pages (Playfair Display headings + Inter body, green accent for farm,
 * amber/ink for retail). Layout: hero-left (persona-tuned copy + trust
 * strip), form-right (single-step form, no friction).
 *
 * Persona resolution:
 *   - URL ?persona=farm   → green-led farm signup
 *   - URL ?persona=retail → amber/ink-led retail signup
 *   - no URL persona      → default retail (homepage is retail-led)
 *
 * Single-module rule: a tenant is FARM or RETAIL, never both. The
 * persona picked here writes to form.module which the backend honors.
 * If the operator wants both, they create two accounts. A small
 * cross-link at the bottom of the form lets them re-route to the
 * other side's funnel before committing.
 *
 * Trial: defaults to the Growth tier 14-day trial for both modules
 * (see memory: default_trial_growth). Plan picker is intentionally
 * NOT shown at signup — passive confirmation card on the hero side.
 */

const COLORS = {
  ink: '#111827', muted: '#6b7280', line: '#e5e7eb',
  // Retail accent — amber/ink, matches retail homepage
  retail: '#c77700', retailDark: '#8b5200', retailSoft: '#fff4e1',
  // Farm accent — green, matches /farm page
  farm: '#1a6b3a', farmDark: '#0d4a22', farmSoft: '#e8f5ee',
};

const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, sans-serif";

const CSS = `
  .rg-root{font-family:${SANS};color:${COLORS.ink};background:#fff;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
  .rg-root *{box-sizing:border-box}
  .rg-root a{color:inherit;text-decoration:none}
  .rg-serif{font-family:${SERIF};letter-spacing:-0.02em}
  .rg-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);min-height:100vh}

  /* HERO column — persona-tuned background + copy */
  .rg-hero{padding:56px 56px 48px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;position:relative;overflow:hidden}
  .rg-hero.farm{background:linear-gradient(135deg,${COLORS.farm} 0%,${COLORS.farmDark} 100%)}
  .rg-hero.retail{background:linear-gradient(135deg,${COLORS.ink} 0%,#2a2018 100%)}
  .rg-hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 80% 15%,rgba(255,255,255,0.08),transparent 60%);pointer-events:none}
  .rg-brand{display:inline-flex;align-items:center;gap:10px;font-family:${SERIF};font-weight:800;font-size:22px;color:#fff;position:relative;z-index:1}
  .rg-brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#f4a743 40%,#c77700 60%);box-shadow:0 0 0 3px rgba(255,255,255,0.12)}
  .rg-brand-sub{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin-left:8px;font-weight:600;opacity:0.7}

  .rg-hero-body{position:relative;z-index:1;margin:48px 0 0}
  .rg-eye{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;opacity:0.7;margin-bottom:16px}
  .rg-hero h1{font-family:${SERIF};font-size:48px;line-height:1.08;font-weight:700;margin:0 0 22px;color:#fff;letter-spacing:-0.02em}
  .rg-hero h1 em{font-style:normal;color:#ffd47a}
  .rg-hero.retail h1 em{color:#ffd47a}
  .rg-hero p{font-size:16px;color:rgba(255,255,255,0.85);line-height:1.65;max-width:480px;margin:0}

  /* Trust strip on hero */
  .rg-trust{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:36px;max-width:480px}
  .rg-trust-item{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px}
  .rg-trust-title{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
  .rg-trust-sub{font-size:11.5px;color:rgba(255,255,255,0.65);line-height:1.5}

  /* Trial card pinned to bottom of hero */
  .rg-trial{position:relative;z-index:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:18px 20px;margin-top:auto;display:flex;gap:14px;align-items:flex-start}
  .rg-trial-dot{width:10px;height:10px;border-radius:50%;background:#a3e7b8;margin-top:5px;flex:none;animation:rg-pulse 2s infinite}
  @keyframes rg-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  .rg-trial-title{font-size:13px;font-weight:700;color:#fff;margin-bottom:3px}
  .rg-trial-body{font-size:12px;color:rgba(255,255,255,0.75);line-height:1.55}

  /* FORM column */
  .rg-form-wrap{background:#fff;padding:56px 56px 48px;display:flex;flex-direction:column;justify-content:center;overflow-y:auto}
  .rg-form{max-width:460px;width:100%;margin:0 auto}
  .rg-form-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px}
  .rg-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:${COLORS.muted};font-weight:500}
  .rg-back:hover{color:${COLORS.ink}}
  .rg-signin{font-size:13px;color:${COLORS.muted}}
  .rg-signin a{color:${COLORS.ink};font-weight:600;border-bottom:1px solid ${COLORS.line};padding-bottom:1px}
  .rg-signin a:hover{border-color:${COLORS.ink}}

  .rg-form h2{font-family:${SERIF};font-size:36px;line-height:1.1;font-weight:700;margin:0 0 10px;color:${COLORS.ink};letter-spacing:-0.02em}
  .rg-form h2 em{font-style:normal}
  .rg-form h2.farm em{color:${COLORS.farm}}
  .rg-form h2.retail em{color:${COLORS.retail}}
  .rg-sub{font-size:14px;color:${COLORS.muted};margin:0 0 28px;line-height:1.55}

  /* Persona pill (locked, not toggleable) */
  .rg-persona{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;margin-bottom:24px;border:1px solid ${COLORS.line}}
  .rg-persona.farm{background:${COLORS.farmSoft};border-color:rgba(26,107,58,0.18)}
  .rg-persona.retail{background:${COLORS.retailSoft};border-color:rgba(199,119,0,0.2)}
  .rg-persona-icon{font-size:20px;flex:none}
  .rg-persona-name{font-size:13px;font-weight:700;color:${COLORS.ink};line-height:1.3}
  .rg-persona-sub{font-size:11.5px;color:${COLORS.muted};line-height:1.4;margin-top:1px}
  .rg-persona-switch{font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
  .rg-persona.farm .rg-persona-switch{color:${COLORS.farmDark}}
  .rg-persona.retail .rg-persona-switch{color:${COLORS.retailDark}}

  /* Inputs */
  .rg-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .rg-field{margin-bottom:16px}
  .rg-label{display:block;font-size:11.5px;font-weight:600;color:${COLORS.ink};margin-bottom:6px;letter-spacing:0.01em}
  .rg-input,.rg-select{width:100%;padding:11px 14px;border:1px solid ${COLORS.line};border-radius:10px;font-size:14px;font-family:${SANS};background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;color:${COLORS.ink}}
  .rg-input:focus,.rg-select:focus{border-color:var(--rg-accent);box-shadow:0 0 0 4px var(--rg-accent-soft)}
  .rg-input::placeholder{color:#9ca3af}

  /* Password strength */
  .rg-pw-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
  .rg-pw-bar{height:3px;border-radius:99px;background:${COLORS.line};transition:background .2s}
  .rg-pw-bar.on{background:var(--rg-accent)}
  .rg-pw-bar.strong{background:${COLORS.farm}}
  .rg-pw-label{font-size:11px;color:${COLORS.muted};margin-top:6px;letter-spacing:0.01em}

  /* Terms */
  .rg-terms{display:flex;align-items:flex-start;gap:10px;margin:22px 0 22px;font-size:12.5px;color:${COLORS.muted};line-height:1.55}
  .rg-terms input{margin-top:3px;flex:none;width:16px;height:16px;accent-color:var(--rg-accent);cursor:pointer}
  .rg-terms a{color:${COLORS.ink};font-weight:600;border-bottom:1px solid ${COLORS.line}}
  .rg-terms a:hover{border-color:${COLORS.ink}}

  /* Submit */
  .rg-submit{width:100%;padding:14px 20px;border-radius:999px;border:none;font-family:${SANS};font-size:14px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .15s;color:#fff}
  .rg-submit.farm{background:${COLORS.farm};box-shadow:0 10px 24px -8px rgba(26,107,58,0.45)}
  .rg-submit.retail{background:${COLORS.ink};box-shadow:0 10px 24px -8px rgba(17,24,39,0.45)}
  .rg-submit:not(:disabled):hover{transform:translateY(-1px)}
  .rg-submit:disabled{opacity:0.55;cursor:not-allowed;box-shadow:none}

  .rg-cross{margin-top:18px;text-align:center;font-size:12.5px;color:${COLORS.muted}}
  .rg-cross a{color:${COLORS.ink};font-weight:600;text-decoration:underline;text-underline-offset:3px}

  .rg-error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px;line-height:1.5}

  /* Responsive — collapse hero on tablet, full single-column on mobile */
  @media (max-width:1024px){
    .rg-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)}
    .rg-hero{padding:40px 36px 36px}
    .rg-form-wrap{padding:40px 36px}
    .rg-hero h1{font-size:38px}
  }
  @media (max-width:760px){
    .rg-grid{grid-template-columns:1fr}
    .rg-hero{padding:32px 24px 28px;min-height:auto}
    .rg-hero h1{font-size:30px}
    .rg-hero p{font-size:14px}
    .rg-trust{display:none}
    .rg-trial{margin-top:24px}
    .rg-form-wrap{padding:32px 24px 40px}
    .rg-form h2{font-size:28px}
  }
`;

function PersonaCopy({ persona }) {
  if (persona === 'farm') {
    return (
      <>
        <div className="rg-eye">Pewil Farm · 14-day free trial</div>
        <h1 className="rg-serif">Open the gate &mdash; <em>start the season on data</em>.</h1>
        <p>
          Pewil Farm gives you fields, livestock, attendance, wages and the daily AI briefing on one screen.
          From your two-hectare plot to a 600-hectare estate &mdash; same tools.
        </p>
        <div className="rg-trust">
          <div className="rg-trust-item">
            <div className="rg-trust-title">No card up front</div>
            <div className="rg-trust-sub">14 days free, cancel from the dashboard</div>
          </div>
          <div className="rg-trust-item">
            <div className="rg-trust-title">WhatsApp ready</div>
            <div className="rg-trust-sub">Daily digest to your phone, on the app you already use</div>
          </div>
          <div className="rg-trust-item">
            <div className="rg-trust-title">Export anytime</div>
            <div className="rg-trust-sub">Your data, in CSV/Excel, whenever you want it</div>
          </div>
          <div className="rg-trust-item">
            <div className="rg-trust-title">Built in Africa</div>
            <div className="rg-trust-sub">Designed for African farms, by an African team</div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="rg-eye">Pewil Retail · 14-day free trial</div>
      <h1 className="rg-serif">Open the till &mdash; <em>close the day clean</em>.</h1>
      <p>
        Pewil Retail is the operating system for African shops &mdash; ZIMRA-ready, EcoCash-native, multi-branch
        out of the box. The till that closes clean, the stock that counts itself, the chain that runs your city.
      </p>
      <div className="rg-trust">
        <div className="rg-trust-item">
          <div className="rg-trust-title">No card up front</div>
          <div className="rg-trust-sub">14 days free, cancel from the dashboard</div>
        </div>
        <div className="rg-trust-item">
          <div className="rg-trust-title">Tax authority native</div>
          <div className="rg-trust-sub">ZIMRA, KRA, SARS, FIRS and 10+ more</div>
        </div>
        <div className="rg-trust-item">
          <div className="rg-trust-title">EcoCash + card</div>
          <div className="rg-trust-sub">Mobile money, card, cash &mdash; same till</div>
        </div>
        <div className="rg-trust-item">
          <div className="rg-trust-title">Multi-branch ready</div>
          <div className="rg-trust-sub">Scale from 1 counter to a 50-branch chain</div>
        </div>
      </div>
    </>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const personaParam = searchParams.get('persona');
  // Default to retail since pewil.org/ is now retail-led. Visitors arriving
  // at /register without a persona almost certainly came from the retail
  // homepage or a retail ad.
  const persona = personaParam === 'farm' ? 'farm' : 'retail';
  const otherPersona = persona === 'farm' ? 'retail' : 'farm';
  const accent = persona === 'farm' ? COLORS.farm : COLORS.retail;
  const accentSoft = persona === 'farm' ? 'rgba(26,107,58,0.10)' : 'rgba(199,119,0,0.12)';

  const { register, loading, error } = useAuth();

  // Inject Playfair + Inter once (shared with the landing pages).
  useEffect(() => {
    const id = 'pewil-landing-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  // SEO/title per persona — restored on unmount so the next page doesn't
  // inherit signup copy.
  useEffect(() => {
    const prev = document.title;
    document.title = persona === 'farm'
      ? 'Start your farm — Pewil Farm signup'
      : 'Start your shop — Pewil Retail signup';
    return () => { document.title = prev; };
  }, [persona]);

  const [form, setForm] = useState({
    business_name: '',
    module: persona,            // honors single-module rule
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    country: 'ZW',
    currency: 'USD',
    terms_agreed: false,
  });

  const [countries, setCountries] = useState([]);
  useEffect(() => {
    const API = process.env.REACT_APP_API_URL || '';
    fetch(`${API}/api/core/countries/`)
      .then(r => r.ok ? r.json() : { countries: [] })
      .then(body => setCountries(body.countries || []))
      .catch(() => {
        setCountries([
          { code: 'ZW', name: 'Zimbabwe', currency: 'USD' },
          { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
          { code: 'KE', name: 'Kenya', currency: 'KES' },
          { code: 'NG', name: 'Nigeria', currency: 'NGN' },
          { code: 'GH', name: 'Ghana', currency: 'GHS' },
        ]);
      });
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const calcStrength = (pwd) => {
    if (pwd.length < 6) return 'weak';
    if (pwd.length < 10) return 'medium';
    const c = /[A-Z]/.test(pwd) + /[a-z]/.test(pwd) + /\d/.test(pwd) + /[!@#$%^&*]/.test(pwd);
    return c >= 4 ? 'strong' : 'medium';
  };
  const strength = calcStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.terms_agreed) return;
    const trimmed = { ...form };
    for (const k of Object.keys(trimmed)) {
      if (typeof trimmed[k] === 'string') trimmed[k] = trimmed[k].trim();
    }
    // Keep module aligned with chosen persona — defensive in case anything
    // mutated it.
    trimmed.module = persona;
    const ok = await register(trimmed);
    if (ok) navigate('/app');
  };

  const canSubmit = (
    form.business_name && form.email && form.username
    && form.password.length >= 8 && form.terms_agreed && !loading
  );

  return (
    <div className="rg-root" style={{ '--rg-accent': accent, '--rg-accent-soft': accentSoft }}>
      <style>{CSS}</style>
      <div className="rg-grid">

        {/* HERO column — persona-tuned */}
        <aside className={`rg-hero ${persona}`}>
          <Link to={persona === 'farm' ? '/farm' : '/'} className="rg-brand">
            <span className="rg-brand-dot" />
            Pewil <span className="rg-brand-sub">{persona === 'farm' ? 'Farm' : 'Retail'}</span>
          </Link>

          <div className="rg-hero-body">
            <PersonaCopy persona={persona} />
          </div>

          <div className="rg-trial">
            <span className="rg-trial-dot" />
            <div>
              <div className="rg-trial-title">Starts on the Growth trial</div>
              <div className="rg-trial-body">
                14 days free on Growth &mdash; the full feature set. No card now, switch tiers anytime from
                Settings → Billing.
              </div>
            </div>
          </div>
        </aside>

        {/* FORM column */}
        <main className="rg-form-wrap">
          <form className="rg-form" onSubmit={handleSubmit} noValidate>
            <div className="rg-form-top">
              <Link to={persona === 'farm' ? '/farm' : '/'} className="rg-back">&larr; Back</Link>
              <div className="rg-signin">
                Already with us? <Link to="/login">Sign in</Link>
              </div>
            </div>

            <h2 className={`rg-serif ${persona}`}>
              {persona === 'farm'
                ? <>Start your <em>farm</em>.</>
                : <>Open your <em>shop</em>.</>}
            </h2>
            <p className="rg-sub">14-day free trial on Growth. No card. Cancel anytime from your dashboard.</p>

            {/* Persona pill — locked, with a cross-link to switch */}
            <div className={`rg-persona ${persona}`}>
              <div className="rg-persona-icon">{persona === 'farm' ? '🌱' : '🛒'}</div>
              <div style={{ flex: 1 }}>
                <div className="rg-persona-name">{persona === 'farm' ? 'Pewil Farm' : 'Pewil Retail'}</div>
                <div className="rg-persona-sub">
                  {persona === 'farm'
                    ? 'Fields · livestock · attendance · wages · AI digest'
                    : 'POS · stock · cashier sessions · multi-branch · fiscal'}
                </div>
              </div>
              <Link to={`/register?persona=${otherPersona}`} className="rg-persona-switch">
                Switch to {otherPersona === 'farm' ? 'Farm' : 'Retail'}
              </Link>
            </div>

            {error && <div className="rg-error">{error}</div>}

            <div className="rg-row2">
              <div className="rg-field">
                <label className="rg-label">First name</label>
                <input className="rg-input" type="text" placeholder="Tendai"
                  value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div className="rg-field">
                <label className="rg-label">Last name</label>
                <input className="rg-input" type="text" placeholder="Mujuru"
                  value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>

            <div className="rg-field">
              <label className="rg-label">Business name</label>
              <input className="rg-input" type="text"
                placeholder={persona === 'farm' ? 'e.g. Chikomo Organic Farm' : 'e.g. Avenues Supermarket'}
                value={form.business_name} onChange={e => set('business_name', e.target.value)} required />
            </div>

            <div className="rg-field">
              <label className="rg-label">Work email</label>
              <input className="rg-input" type="email"
                placeholder={persona === 'farm' ? 'you@farm.co.zw' : 'you@shop.co.zw'}
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div className="rg-row2">
              <div className="rg-field">
                <label className="rg-label">Phone</label>
                <input className="rg-input" type="tel" placeholder="+263 77 000 0000"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="rg-field">
                <label className="rg-label">Username</label>
                <input className="rg-input" type="text" placeholder="Choose a username"
                  value={form.username} onChange={e => set('username', e.target.value)} required />
              </div>
            </div>

            <div className="rg-field">
              <label className="rg-label">Password</label>
              <input className="rg-input" type="password" placeholder="At least 8 characters"
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password" required minLength={8} />
              {form.password && (
                <>
                  <div className="rg-pw-bars">
                    <span className={`rg-pw-bar on`} />
                    <span className={`rg-pw-bar ${strength !== 'weak' ? 'on' : ''}`} />
                    <span className={`rg-pw-bar ${strength === 'strong' ? 'strong' : ''}`} />
                    <span className={`rg-pw-bar ${strength === 'strong' ? 'strong' : ''}`} />
                  </div>
                  <div className="rg-pw-label">
                    {strength === 'weak' && 'Weak — add letters, numbers, or symbols'}
                    {strength === 'medium' && 'Medium — almost there'}
                    {strength === 'strong' && 'Strong'}
                  </div>
                </>
              )}
            </div>

            <div className="rg-row2">
              <div className="rg-field">
                <label className="rg-label">Country</label>
                <select className="rg-select" value={form.country}
                  onChange={e => {
                    const code = e.target.value;
                    set('country', code);
                    const m = countries.find(c => c.code === code);
                    if (m && m.currency) set('currency', m.currency);
                  }}>
                  {countries.length === 0 && <option value="ZW">Zimbabwe</option>}
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="rg-field">
                <label className="rg-label">Currency</label>
                <select className="rg-select" value={form.currency}
                  onChange={e => set('currency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="ZWL">ZWL</option>
                  <option value="ZAR">ZAR</option>
                  <option value="KES">KES</option>
                  <option value="NGN">NGN</option>
                  <option value="GHS">GHS</option>
                </select>
              </div>
            </div>

            <label className="rg-terms">
              <input type="checkbox" checked={form.terms_agreed}
                onChange={e => set('terms_agreed', e.target.checked)} />
              <span>
                I agree to Pewil's <Link to="/terms">Terms of Service</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </span>
            </label>

            <button type="submit" disabled={!canSubmit}
              className={`rg-submit ${persona}`}>
              {loading
                ? 'Creating account…'
                : (persona === 'farm' ? 'Start Pewil Farm →' : 'Start Pewil Retail →')}
            </button>

            <div className="rg-cross">
              Running a {otherPersona === 'farm' ? 'farm' : 'shop'} instead?{' '}
              <Link to={otherPersona === 'farm' ? '/farm' : '/'}>
                Visit Pewil {otherPersona === 'farm' ? 'Farm' : 'Retail'} &rarr;
              </Link>
            </div>
          </form>
        </main>

      </div>
    </div>
  );
}
