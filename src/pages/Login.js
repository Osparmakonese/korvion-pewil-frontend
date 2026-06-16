import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login.js — Pewil sign-in, two-step (creds → 2FA when enabled).
 *
 * Redesigned 2026-05-16 to match the new retail-led / farm-led landing
 * pages (Playfair Display headings + Inter body, ink hero with a subtle
 * green→amber accent so login stays persona-AGNOSTIC — returning users
 * already have a module tied to their tenant).
 *
 * Two-step state machine (preserved from the previous design):
 *   step='creds' → username + password → useAuth().login()
 *     - on ok → /app
 *     - on requires2fa → step='2fa' with pendingToken
 *   step='2fa'   → 6-digit authenticator OR 8-char recovery code →
 *                  useAuth().loginWith2fa(pendingToken, code)
 *     - on ok → /app
 *     - on expired → back to step='creds' (and the password is cleared
 *                     defensively so the user re-enters it)
 *
 * Cross-links: footer offers /register for new accounts, /forgot-password
 * for password reset, and a "Lost authenticator + recovery codes?" path
 * that also drops to /forgot-password.
 */

const COLORS = {
  ink: '#111827', muted: '#6b7280', line: '#e5e7eb',
  farm: '#1a6b3a', retail: '#c77700',
};

const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, sans-serif";

const CSS = `
  .lg-root{font-family:${SANS};color:${COLORS.ink};background:#fff;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
  .lg-root *{box-sizing:border-box}
  .lg-root a{color:inherit;text-decoration:none}
  .lg-serif{font-family:${SERIF};letter-spacing:-0.02em}
  .lg-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);min-height:100vh}

  /* HERO column — ink with both accents (login is persona-agnostic) */
  .lg-hero{position:relative;overflow:hidden;padding:56px 56px 48px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(135deg,${COLORS.ink} 0%,#1a1d2e 100%)}
  .lg-hero::before{content:'';position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(26,107,58,0.32),transparent 60%);top:-160px;left:-160px;pointer-events:none}
  .lg-hero::after{content:'';position:absolute;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(199,119,0,0.30),transparent 60%);bottom:-200px;right:-180px;pointer-events:none}
  .lg-brand{display:inline-flex;align-items:center;gap:10px;font-family:${SERIF};font-weight:800;font-size:22px;color:#fff;position:relative;z-index:1}
  .lg-brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,${COLORS.farm} 40%,${COLORS.retail} 60%);box-shadow:0 0 0 3px rgba(255,255,255,0.12)}
  .lg-brand-sub{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin-left:8px;font-weight:600;opacity:0.62}

  .lg-hero-body{position:relative;z-index:1;margin:48px 0 0}
  .lg-eye{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;opacity:0.7;margin-bottom:16px;color:rgba(255,255,255,0.7)}
  .lg-hero h1{font-family:${SERIF};font-size:48px;line-height:1.08;font-weight:700;margin:0 0 22px;color:#fff;letter-spacing:-0.02em}
  .lg-hero h1 em{font-style:normal;color:#ffd47a}
  .lg-hero p{font-size:16px;color:rgba(255,255,255,0.82);line-height:1.65;max-width:480px;margin:0}

  /* Quiet rotating quote / trust card */
  .lg-trust{position:relative;z-index:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:22px 24px;margin-top:auto;max-width:480px}
  .lg-trust-eye{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#a3e7b8;margin-bottom:10px}
  .lg-trust-quote{font-family:${SERIF};font-size:18px;line-height:1.4;color:#fff;font-weight:500;letter-spacing:-0.01em}
  .lg-trust-attrib{font-size:12px;color:rgba(255,255,255,0.6);margin-top:10px}

  /* FORM column */
  .lg-form-wrap{background:#fff;padding:56px 56px 48px;display:flex;flex-direction:column;justify-content:center}
  .lg-form{max-width:420px;width:100%;margin:0 auto}
  .lg-form-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px}
  .lg-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:${COLORS.muted};font-weight:500;background:transparent;border:0;cursor:pointer;padding:0;font-family:${SANS}}
  .lg-back:hover{color:${COLORS.ink}}
  .lg-newacct{font-size:13px;color:${COLORS.muted}}
  .lg-newacct a{color:${COLORS.ink};font-weight:600;border-bottom:1px solid ${COLORS.line};padding-bottom:1px}
  .lg-newacct a:hover{border-color:${COLORS.ink}}

  .lg-form h2{font-family:${SERIF};font-size:36px;line-height:1.1;font-weight:700;margin:0 0 10px;color:${COLORS.ink};letter-spacing:-0.02em}
  .lg-form h2 em{font-style:normal;color:${COLORS.farm}}
  .lg-sub{font-size:14px;color:${COLORS.muted};margin:0 0 28px;line-height:1.55}

  .lg-field{margin-bottom:16px}
  .lg-label{display:block;font-size:11.5px;font-weight:600;color:${COLORS.ink};margin-bottom:6px}
  .lg-label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
  .lg-label-row .lg-label{margin-bottom:0}
  .lg-forgot{font-size:11.5px;color:${COLORS.muted};text-decoration:underline;text-underline-offset:3px}
  .lg-forgot:hover{color:${COLORS.ink}}
  .lg-input{width:100%;padding:11px 14px;border:1px solid ${COLORS.line};border-radius:10px;font-size:14px;font-family:${SANS};background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;color:${COLORS.ink}}
  .lg-input:focus{border-color:${COLORS.ink};box-shadow:0 0 0 4px rgba(17,24,39,0.08)}
  .lg-input::placeholder{color:#9ca3af}
  .lg-otp{letter-spacing:0.36em;text-align:center;font-size:20px;font-weight:600;font-family:${SANS}}
  .lg-otp.recovery{letter-spacing:0.18em;font-size:16px;text-transform:uppercase}

  .lg-submit{width:100%;padding:14px 20px;border-radius:999px;border:none;font-family:${SANS};font-size:14px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .15s;color:#fff;background:${COLORS.ink};box-shadow:0 10px 24px -8px rgba(17,24,39,0.4);margin-top:8px}
  .lg-submit:not(:disabled):hover{transform:translateY(-1px)}
  .lg-submit:disabled{opacity:0.55;cursor:not-allowed;box-shadow:none}

  .lg-secondary{display:block;margin-top:14px;text-align:center;font-size:12.5px;color:${COLORS.muted};background:transparent;border:0;cursor:pointer;font-family:${SANS};width:100%;padding:6px;text-decoration:underline;text-underline-offset:3px}
  .lg-secondary:hover{color:${COLORS.ink}}

  .lg-note{margin-top:22px;display:flex;gap:10px;background:#fff4e1;border:1px solid rgba(199,119,0,0.18);border-radius:12px;padding:12px 14px;font-size:12px;color:#7a4a00;line-height:1.5}
  .lg-note-icon{font-size:16px;flex:none}

  .lg-error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px;line-height:1.5}

  .lg-foot{margin-top:24px;text-align:center;font-size:12.5px;color:${COLORS.muted}}
  .lg-foot a{color:${COLORS.ink};font-weight:600;text-decoration:underline;text-underline-offset:3px}

  @media (max-width:1024px){
    .lg-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)}
    .lg-hero{padding:40px 36px 36px}
    .lg-form-wrap{padding:40px 36px}
    .lg-hero h1{font-size:38px}
  }
  @media (max-width:760px){
    .lg-grid{grid-template-columns:1fr}
    .lg-hero{padding:28px 24px;min-height:auto}
    .lg-hero h1{font-size:28px}
    .lg-hero p{font-size:14px}
    .lg-trust{display:none}
    .lg-form-wrap{padding:32px 24px 40px}
    .lg-form h2{font-size:26px}
  }
`;

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWith2fa, loading, error } = useAuth();

  // Two-step state machine
  const [step, setStep] = useState('creds'); // 'creds' | '2fa'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 2FA step state
  const [pendingToken, setPendingToken] = useState('');
  const [twofaUsername, setTwofaUsername] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  // Inject Playfair + Inter once (shared with landing + signup pages).
  useEffect(() => {
    const id = 'pewil-landing-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  // SEO/title per step — restored on unmount.
  useEffect(() => {
    const prev = document.title;
    document.title = step === '2fa' ? 'Verify — Pewil' : 'Sign in — Pewil';
    return () => { document.title = prev; };
  }, [step]);

  async function handleCredsSubmit(e) {
    e.preventDefault();
    const res = await login(username, password);
    if (res && res.ok) {
      navigate('/app');
      return;
    }
    if (res && res.requires2fa) {
      setPendingToken(res.pendingToken);
      setTwofaUsername(res.username || username);
      setCode('');
      setUseRecovery(false);
      setStep('2fa');
    }
  }

  async function handle2faSubmit(e) {
    e.preventDefault();
    const cleaned = useRecovery ? code.trim().toUpperCase() : code.replace(/\D/g, '');
    const res = await loginWith2fa(pendingToken, cleaned);
    if (res.ok) {
      navigate('/app');
      return;
    }
    if (res.expired) {
      setStep('creds');
      setPendingToken('');
      setCode('');
    }
  }

  function cancelTwoFa() {
    setStep('creds');
    setPendingToken('');
    setCode('');
    setPassword('');  // force re-entry — safer
  }

  return (
    <div className="lg-root">
      <style>{CSS}</style>
      <div className="lg-grid">

        {/* HERO column — ink with both accents (login is persona-agnostic) */}
        <aside className="lg-hero">
          <Link to="/" className="lg-brand">
            <span className="lg-brand-dot" />
            Pewil <span className="lg-brand-sub">Rooted in the work</span>
          </Link>

          <div className="lg-hero-body">
            <div className="lg-eye">Welcome back</div>
            <h1 className="lg-serif">
              Your fields, your shop, your team &mdash;{' '}
              <em>waiting where you left them</em>.
            </h1>
            <p>
              Pewil keeps the numbers quiet so you can hear the work. Sign in and pick up where the team left off.
            </p>
          </div>

          <div className="lg-trust">
            <div className="lg-trust-eye">From a Pewil operator</div>
            <div className="lg-trust-quote">
              &ldquo;I stopped worrying about the till. My cashier closes, the variance is zero, and I go home. That sentence is a whole story.&rdquo;
            </div>
            <div className="lg-trust-attrib">— Pewil Retail, single-counter shop · Avenues, Harare</div>
          </div>
        </aside>

        {/* FORM column */}
        <main className="lg-form-wrap">
          {step === 'creds' ? (
            <form className="lg-form" onSubmit={handleCredsSubmit} noValidate>
              <div className="lg-form-top">
                <Link to="/" className="lg-back">&larr; Back</Link>
                <div className="lg-newacct">
                  New to Pewil? <Link to="/register">Create account</Link>
                </div>
              </div>

              <h2 className="lg-serif">
                Welcome back, <em>friend</em>.
              </h2>
              <p className="lg-sub">Sign in and pick up where the team left off.</p>

              {error && <div className="lg-error">{error}</div>}

              <div className="lg-field">
                <label className="lg-label" htmlFor="username">Username or email</label>
                <input
                  id="username"
                  className="lg-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="you@shop.co.zw"
                  required
                />
              </div>

              <div className="lg-field">
                <div className="lg-label-row">
                  <label className="lg-label" htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="lg-forgot">Forgot?</Link>
                </div>
                <input
                  id="password"
                  className="lg-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="lg-submit">
                {loading ? 'Signing in…' : 'Sign in to Pewil →'}
              </button>

              <div className="lg-note">
                <span className="lg-note-icon">🔐</span>
                <span>
                  <strong>2FA enabled?</strong> You{'’'}ll be asked for your authenticator code after this step.
                </span>
              </div>

              <div className="lg-foot">
                Don{'’'}t have an account yet?{' '}
                <Link to="/register">Get started free &rarr;</Link>
              </div>
            </form>
          ) : (
            /* ─── 2FA step ─── */
            <form className="lg-form" onSubmit={handle2faSubmit} noValidate>
              <div className="lg-form-top">
                <button type="button" className="lg-back" onClick={cancelTwoFa}>
                  &larr; Use a different account
                </button>
              </div>

              <h2 className="lg-serif">
                One more step, <em>{twofaUsername || 'there'}</em>.
              </h2>
              <p className="lg-sub">
                {useRecovery
                  ? 'Enter one of the 8-character recovery codes you saved when you enabled 2FA.'
                  : 'Open your authenticator app and enter the 6-digit code for Pewil.'}
              </p>

              {error && <div className="lg-error">{error}</div>}

              <div className="lg-field">
                <label className="lg-label" htmlFor="code">
                  {useRecovery ? 'Recovery code' : 'Authentication code'}
                </label>
                <input
                  id="code"
                  className={`lg-input lg-otp ${useRecovery ? 'recovery' : ''}`}
                  type="text"
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  pattern={useRecovery ? undefined : '[0-9]*'}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={useRecovery ? 10 : 6}
                  placeholder={useRecovery ? 'A1B2C3D4' : '123456'}
                />
              </div>

              <button type="submit" disabled={loading} className="lg-submit">
                {loading ? 'Verifying…' : 'Verify and sign in →'}
              </button>

              <button
                type="button"
                className="lg-secondary"
                onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}
              >
                {useRecovery ? 'Use authenticator app instead' : 'Use a recovery code instead'}
              </button>

              <div className="lg-foot">
                Lost your authenticator and recovery codes?{' '}
                <Link to="/forgot-password">Reset via email &rarr;</Link>
              </div>
            </form>
          )}
        </main>

      </div>
    </div>
  );
}
