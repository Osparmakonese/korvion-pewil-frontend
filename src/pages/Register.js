import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackLink from '../components/BackLink';

// Exact palette from pewil-design-3-living-africa.html
const C = {
  amber: '#f4a743',
  terra: '#d9562c',
  clay: '#b13b17',
  forest: '#1f3d26',
  forest2: '#2d5a37',
  sand: '#fff7ec',
  sand2: '#fdeedd',
  cream: '#fffcf7',
  ink: '#1b1b1b',
  muted: '#6b5d50',
  line: 'rgba(27,27,27,.12)',
};

const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

const S = {
  wrapper: {
    minHeight: '100vh', background: C.cream, fontFamily: SANS,
    display: 'grid', gridTemplateColumns: '1.1fr 1fr',
  },
  wrapperMobile: {
    minHeight: '100vh', background: C.cream, fontFamily: SANS,
    display: 'flex', flexDirection: 'column',
  },
  side: {
    position: 'relative', overflow: 'hidden', padding: 44,
    backgroundImage: 'linear-gradient(180deg,rgba(31,61,38,.15),rgba(31,61,38,.7) 75%), url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1400&q=75&auto=format&fit=crop)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  sideMobile: {
    position: 'relative', overflow: 'hidden', padding: '32px 24px', minHeight: 260,
    backgroundImage: 'linear-gradient(180deg,rgba(31,61,38,.25),rgba(31,61,38,.8) 85%), url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=75&auto=format&fit=crop)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.01em',
    textDecoration: 'none',
  },
  logoMark: {
    width: 34, height: 34, borderRadius: 12, background: '#fff',
    position: 'relative', boxShadow: '0 4px 14px rgba(217,86,44,.3)',
  },
  logoDot: {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
    width: 14, height: 14, borderRadius: '50%', background: C.clay, opacity: 0.9,
  },
  quoteCard: {
    background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,.25)',
    borderRadius: 24, padding: '28px 30px', maxWidth: 440,
  },
  quoteText: {
    fontFamily: SERIF, fontWeight: 600, fontStyle: 'italic',
    fontSize: 26, lineHeight: 1.25, letterSpacing: '-0.01em',
  },
  quoteNote: { marginTop: 16, fontSize: 14.5, opacity: 0.9, lineHeight: 1.55 },

  // ===== right form side =====
  formWrap: {
    padding: '56px 48px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: C.cream, overflowY: 'auto',
  },
  formWrapMobile: {
    padding: '36px 22px', display: 'flex', flex: 1,
    alignItems: 'flex-start', justifyContent: 'center',
    background: C.cream, overflowY: 'auto',
  },
  form: { width: '100%', maxWidth: 460 },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: C.muted, fontSize: 14, marginBottom: 30, fontWeight: 500,
    textDecoration: 'none',
  },
  title: {
    fontFamily: SERIF, fontWeight: 700, fontSize: 44,
    letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 10,
    color: C.ink,
  },
  titleEm: { color: C.clay, fontStyle: 'italic', fontWeight: 600 },
  sub: {
    color: C.muted, fontSize: 15.5, marginBottom: 30, lineHeight: 1.55,
  },
  error: {
    background: '#fce0d6', color: '#a53815', fontSize: 13,
    padding: '12px 14px', borderRadius: 14, marginBottom: 18,
    borderLeft: `3px solid ${C.terra}`,
  },
  field: { marginBottom: 16 },
  label: {
    display: 'block', fontSize: 13.5, fontWeight: 600,
    marginBottom: 7, color: C.ink,
  },
  input: {
    width: '100%', padding: '14px 16px', border: `1.5px solid ${C.line}`,
    borderRadius: 14, background: '#fff', fontSize: 15.5,
    fontFamily: SANS, color: C.ink, outline: 'none',
    boxSizing: 'border-box', transition: 'border .15s, box-shadow .15s',
  },
  select: {
    width: '100%', padding: '14px 16px', border: `1.5px solid ${C.line}`,
    borderRadius: 14, background: '#fff', fontSize: 15.5,
    fontFamily: SANS, color: C.ink, outline: 'none', cursor: 'pointer',
    boxSizing: 'border-box', transition: 'border .15s, box-shadow .15s',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  // module chooser — styled to feel like HTML warm cards
  modGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
  modCard: (active) => ({
    padding: '16px 14px',
    border: active ? `2px solid ${C.terra}` : `1.5px solid ${C.line}`,
    borderRadius: 18,
    background: active ? 'linear-gradient(135deg,#fdeedd,#fff7ec)' : '#fff',
    cursor: 'pointer', textAlign: 'center',
    transition: 'all .15s',
    boxShadow: active ? '0 10px 20px -12px rgba(217,86,44,.4)' : 'none',
  }),
  modIcon: { fontSize: 26, marginBottom: 6 },
  modName: (active) => ({
    fontFamily: SERIF, fontWeight: 700, fontSize: 16,
    color: active ? C.clay : C.ink, letterSpacing: '-0.01em',
  }),
  modDesc: { fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.4 },

  // password strength
  pwStrength: { display: 'flex', gap: 4, marginTop: 8 },
  pwBar: (active, color) => ({
    flex: 1, height: 4, borderRadius: 2,
    background: active ? color : C.line, transition: 'background .15s',
  }),
  pwLabel: (strength) => {
    const colors = { weak: C.clay, medium: '#c98a2f', strong: C.forest };
    return { fontSize: 12, marginTop: 6, color: colors[strength] || C.muted, fontWeight: 600 };
  },

  authRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    fontSize: 13.5, margin: '4px 0 22px',
  },
  chk: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    color: C.muted, cursor: 'pointer', fontSize: 12.5, lineHeight: 1.5,
  },
  checkbox: {
    width: 16, height: 16, cursor: 'pointer', accentColor: C.terra,
    marginTop: 2, flexShrink: 0,
  },
  chkLink: { color: C.clay, fontWeight: 600, textDecoration: 'none' },
  submit: {
    width: '100%', padding: 15,
    background: `linear-gradient(135deg, ${C.amber}, ${C.terra})`,
    color: '#fff', borderRadius: 999, fontWeight: 700, fontSize: 15,
    border: 'none', cursor: 'pointer', fontFamily: SANS,
    boxShadow: '0 10px 24px -8px rgba(217,86,44,.6)',
    transition: 'transform .12s, box-shadow .15s',
  },
  switch: {
    textAlign: 'center', fontSize: 14, color: C.muted, marginTop: 24,
  },
  switchLink: { color: C.clay, fontWeight: 700, textDecoration: 'none' },
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const personaParam = searchParams.get('persona');
  const persona = personaParam === 'retail' ? 'retail' : personaParam === 'farm' ? 'farm' : null;
  const { register, loading, error } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1000);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 1000);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = 'pewil-livingafrica-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  // SINGLE-MODULE RULE (April 2026): a tenant is either farm OR retail, never
  // both. If the operator wants both, they create two separate accounts.
  const [form, setForm] = useState({
    business_name: '',
    module: persona === 'retail' ? 'retail' : 'farm',
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
  // Picking a module is a hard switch, not a toggle — single-module rule
  const pickModule = (mod) => setForm(p => ({ ...p, module: mod }));

  const calcStrength = (pwd) => {
    if (pwd.length < 6) return 'weak';
    if (pwd.length < 10) return 'medium';
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*]/.test(pwd);
    if (hasUpper && hasLower && hasNum && hasSpecial) return 'strong';
    return 'medium';
  };

  const strength = calcStrength(form.password);
  const strengthColor = strength === 'weak' ? C.clay : strength === 'medium' ? '#c98a2f' : C.forest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.terms_agreed) {
      alert('Please agree to the terms');
      return;
    }
    // Trim user-entered strings before submit — stops leading/trailing
    // whitespace ("      Ops") from leaking into tenant name, username,
    // email, and every downstream artefact (invoices, receipts, audit log).
    const trimmed = { ...form };
    for (const k of Object.keys(trimmed)) {
      if (typeof trimmed[k] === 'string') trimmed[k] = trimmed[k].trim();
    }
    const ok = await register(trimmed);
    if (ok) navigate('/app');
  };

  const canSubmit = form.business_name && form.email && form.username && form.password.length >= 6 && form.terms_agreed && !loading;

  const fx = e => { e.target.style.borderColor = C.clay; e.target.style.boxShadow = '0 0 0 4px rgba(217,86,44,.1)'; };
  const fb = e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = 'none'; };

  return (
    <div style={isMobile ? S.wrapperMobile : S.wrapper}>
      {/* Left photo side */}
      <aside style={isMobile ? S.sideMobile : S.side}>
        <Link to="/" style={S.logo}>
          <span style={S.logoMark}><span style={S.logoDot} /></span>
          Pewil
        </Link>
        <div style={S.quoteCard}>
          <div style={S.quoteText}>
            Ship your first dashboard before the kettle boils.
          </div>
          <div style={S.quoteNote}>
            Free forever for solo farms. 30-day Growth trial. No credit card up front. Cancel straight from your dashboard whenever you like.
          </div>
        </div>
      </aside>

      {/* Right form side */}
      <main style={isMobile ? S.formWrapMobile : S.formWrap}>
        <form style={S.form} onSubmit={handleSubmit}>
          <BackLink to="/" label="Back to home" style={{ marginBottom: 24 }} />
          <h2 style={S.title}>
            {persona === 'retail'
              ? <>Open your <span style={S.titleEm}>shop</span>.</>
              : persona === 'farm'
                ? <>Start your <span style={S.titleEm}>farm</span>.</>
                : <>Let's <span style={S.titleEm}>grow</span> yours.</>}
          </h2>
          <p style={S.sub}>
            {persona
              ? '14-day free trial. No card. Cancel anytime from your dashboard.'
              : '14-day free trial on Starter and Growth. No card. Cancel anytime.'}
          </p>

          {error && <div style={S.error}>{error}</div>}

          <div style={S.row2}>
            <div style={S.field}>
              <label style={S.label}>First name</label>
              <input
                style={S.input}
                type="text"
                placeholder="Tendai"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                onFocus={fx}
                onBlur={fb}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Last name</label>
              <input
                style={S.input}
                type="text"
                placeholder="Mujuru"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                onFocus={fx}
                onBlur={fb}
              />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Work email</label>
            <input
              style={S.input}
              type="email"
              placeholder="you@farm.co.zw"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              onFocus={fx}
              onBlur={fb}
              required
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Business name</label>
            <input
              style={S.input}
              type="text"
              placeholder="e.g. Chikomo Organic Farm"
              value={form.business_name}
              onChange={e => set('business_name', e.target.value)}
              onFocus={fx}
              onBlur={fb}
              required
            />
          </div>

          {!persona && (
          <div style={S.field}>
            <label style={S.label}>Pick one — you can run the other on a separate account</label>
            <div style={S.modGrid}>
              <div
                style={S.modCard(form.module === 'farm')}
                onClick={() => pickModule('farm')}
                role="radio"
                aria-checked={form.module === 'farm'}
              >
                <div style={S.modIcon}>🌱</div>
                <div style={S.modName(form.module === 'farm')}>Farm</div>
                <div style={S.modDesc}>Fields · stock · livestock · workers</div>
              </div>
              <div
                style={S.modCard(form.module === 'retail')}
                onClick={() => pickModule('retail')}
                role="radio"
                aria-checked={form.module === 'retail'}
              >
                <div style={S.modIcon}>🛒</div>
                <div style={S.modName(form.module === 'retail')}>Retail</div>
                <div style={S.modDesc}>POS · products · cashier · sales</div>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
              One account = one module. Need both? Sign up a second account after this one.
            </div>
          </div>
          )}
          {persona && (
            <div style={{
              background: 'rgba(244,167,67,.12)', border: '1px solid rgba(244,167,67,.35)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ fontSize: 22 }}>{persona === 'retail' ? '🛒' : '🌱'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                  {persona === 'retail' ? 'Pewil Retail' : 'Pewil Farm'}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  {persona === 'retail'
                    ? 'POS · products · cashier · sales'
                    : 'Fields · stock · livestock · workers'}
                </div>
              </div>
              <Link to="/#persona" style={{ fontSize: 12.5, color: C.clay, fontWeight: 700, textDecoration: 'none' }}>Change</Link>
            </div>
          )}

          <div style={S.row2}>
            <div style={S.field}>
              <label style={S.label}>Phone</label>
              <input
                style={S.input}
                type="tel"
                placeholder="+263 77 000 0000"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                onFocus={fx}
                onBlur={fb}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Username</label>
              <input
                style={S.input}
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                onFocus={fx}
                onBlur={fb}
                required
              />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="At least 12 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              onFocus={fx}
              onBlur={fb}
              autoComplete="new-password"
              required
            />
            {form.password && (
              <>
                <div style={S.pwStrength}>
                  <div style={S.pwBar(true, strengthColor)} />
                  <div style={S.pwBar(strength !== 'weak', strengthColor)} />
                  <div style={S.pwBar(strength === 'strong', C.forest)} />
                  <div style={S.pwBar(false, C.line)} />
                </div>
                <div style={S.pwLabel(strength)}>
                  {strength === 'weak' && 'Weak password'}
                  {strength === 'medium' && 'Medium strength'}
                  {strength === 'strong' && 'Strong password'}
                </div>
              </>
            )}
          </div>

          <div style={S.row2}>
            <div style={S.field}>
              <label style={S.label}>Country</label>
              <select
                style={S.select}
                value={form.country}
                onChange={e => {
                  const code = e.target.value;
                  set('country', code);
                  const match = countries.find(c => c.code === code);
                  if (match && match.currency) set('currency', match.currency);
                }}
                onFocus={fx}
                onBlur={fb}
              >
                {countries.length === 0 && <option value="ZW">Zimbabwe</option>}
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Currency</label>
              <select
                style={S.select}
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                onFocus={fx}
                onBlur={fb}
              >
                <option value="USD">USD</option>
                <option value="ZWL">ZWL</option>
                <option value="ZAR">ZAR</option>
                <option value="KES">KES</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
              </select>
            </div>
          </div>

          <div style={S.authRow}>
            <label style={S.chk}>
              <input
                type="checkbox"
                checked={form.terms_agreed}
                onChange={e => set('terms_agreed', e.target.checked)}
                style={S.checkbox}
              />
              <span>
                I agree to Pewil's{' '}
                <Link to="/terms" style={S.chkLink}>Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" style={S.chkLink}>Privacy Policy</Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...S.submit,
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => {
              if (!canSubmit) return;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 14px 30px -8px rgba(217,86,44,.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 10px 24px -8px rgba(217,86,44,.6)';
            }}
          >
            {loading ? 'Creating account…' : 'Create my account →'}
          </button>

          <div style={S.switch}>
            Already with us?{' '}
            <Link to="/login" style={S.switchLink}>Sign in →</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
