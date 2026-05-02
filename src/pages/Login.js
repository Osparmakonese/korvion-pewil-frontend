import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    backgroundImage: 'linear-gradient(180deg,rgba(31,61,38,.15),rgba(177,59,23,.55) 75%), url(https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1400&q=75&auto=format&fit=crop)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  sideMobile: {
    position: 'relative', overflow: 'hidden', padding: '32px 24px', minHeight: 260,
    backgroundImage: 'linear-gradient(180deg,rgba(31,61,38,.25),rgba(177,59,23,.7) 85%), url(https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=75&auto=format&fit=crop)',
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.01em',
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
  formWrap: {
    padding: '56px 48px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: C.cream,
  },
  formWrapMobile: {
    padding: '36px 22px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: C.cream, flex: 1,
  },
  form: { width: '100%', maxWidth: 440 },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: C.muted, fontSize: 14, marginBottom: 36, fontWeight: 500,
    textDecoration: 'none', background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
  },
  title: {
    fontFamily: SERIF, fontWeight: 700, fontSize: 44,
    letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 10,
    color: C.ink,
  },
  titleEm: { color: C.clay, fontStyle: 'italic', fontWeight: 600 },
  sub: {
    color: C.muted, fontSize: 15.5, marginBottom: 32, lineHeight: 1.55,
  },
  error: {
    background: '#fce0d6', color: '#a53815', fontSize: 13,
    padding: '12px 14px', borderRadius: 14, marginBottom: 18,
    borderLeft: '3px solid ' + C.terra,
  },
  info: {
    background: '#e7f2ea', color: C.forest, fontSize: 13,
    padding: '12px 14px', borderRadius: 14, marginBottom: 18,
    borderLeft: '3px solid ' + C.forest,
  },
  oauth: { display: 'grid', gap: 10, margin: '4px 0 20px' },
  oauthBtn: {
    width: '100%', padding: '13px', border: '1.5px solid ' + C.line,
    borderRadius: 999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontSize: 14.5, fontWeight: 600,
    background: '#fff', color: C.ink, cursor: 'not-allowed',
    fontFamily: SANS, transition: 'border-color 0.15s, background 0.15s',
    opacity: 0.7,
  },
  oauthNote: {
    fontSize: 11.5, color: C.muted, textAlign: 'center', marginTop: -4,
  },
  dividerLine: {
    display: 'flex', alignItems: 'center', gap: 12,
    color: C.muted, fontSize: 12.5, textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dividerRule: { flex: 1, height: 1, background: C.line },
  field: { marginBottom: 16 },
  label: {
    display: 'block', fontSize: 13.5, fontWeight: 600,
    marginBottom: 7, color: C.ink,
  },
  labelRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  forgotLink: {
    color: C.muted, fontWeight: 500, fontSize: 12.5, textDecoration: 'none',
  },
  input: {
    width: '100%', padding: '14px 16px', border: '1.5px solid ' + C.line,
    borderRadius: 14, background: '#fff', fontSize: 15.5,
    fontFamily: SANS, color: C.ink, outline: 'none',
    boxSizing: 'border-box', transition: 'border .15s, box-shadow .15s',
  },
  otpInput: {
    width: '100%', padding: '16px 16px', border: '1.5px solid ' + C.line,
    borderRadius: 14, background: '#fff', fontSize: 22,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    color: C.ink, outline: 'none', letterSpacing: 8, textAlign: 'center',
    boxSizing: 'border-box', transition: 'border .15s, box-shadow .15s',
  },
  submit: {
    width: '100%', padding: 15,
    background: 'linear-gradient(135deg, ' + C.amber + ', ' + C.terra + ')',
    color: '#fff', borderRadius: 999, fontWeight: 700, fontSize: 15,
    border: 'none', cursor: 'pointer', fontFamily: SANS,
    boxShadow: '0 10px 24px -8px rgba(217,86,44,.6)',
    transition: 'transform .12s, box-shadow .15s',
  },
  secondaryLink: {
    display: 'inline-block', marginTop: 12, fontSize: 13,
    color: C.clay, fontWeight: 600, cursor: 'pointer',
    background: 'transparent', border: 0, padding: 0, fontFamily: SANS,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  switch: {
    textAlign: 'center', fontSize: 14, color: C.muted, marginTop: 24,
  },
  switchLink: { color: C.clay, fontWeight: 700, textDecoration: 'none' },
  /* ── Design 5: 2FA callout card (shows on the creds step) ── */
  twofaNote: {
    marginTop: 18,
    padding: '12px 14px',
    background: C.sand2,
    borderLeft: `3px solid ${C.amber}`,
    borderRadius: 8,
    display: 'flex', gap: 10, alignItems: 'flex-start',
  },
  twofaNoteIcon: {
    fontSize: 16, color: C.clay, flexShrink: 0, lineHeight: 1,
  },
  twofaNoteText: {
    fontSize: 11.5, color: C.ink, lineHeight: 1.5, fontFamily: SANS,
  },
  twofaNoteStrong: {
    color: C.clay, fontWeight: 700,
  },
};

export default function Login() {
  // Two-step state machine
  const [step, setStep] = useState('creds'); // 'creds' | '2fa'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 2FA step state
  const [pendingToken, setPendingToken] = useState('');
  const [twofaUsername, setTwofaUsername] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1000);
  const { login, loginWith2fa, loading, error } = useAuth();
  const navigate = useNavigate();

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

  const fx = e => { e.target.style.borderColor = C.clay; e.target.style.boxShadow = '0 0 0 4px rgba(217,86,44,.1)'; };
  const fb = e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = 'none'; };

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
      // Send them back to step 1 with a helpful error already set by context
      setStep('creds');
      setPendingToken('');
      setCode('');
    }
  }

  function cancelTwoFa() {
    setStep('creds');
    setPendingToken('');
    setCode('');
    setPassword(''); // force re-entry of password \u2014 safer
  }

  const LogoLink = (
    <Link to="/" style={{ ...S.logo, textDecoration: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="31" height="34" viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pewil">
          <path d="M 55 4 C 89 4, 105 28, 105 56 C 105 88, 83 108, 55 108 C 27 108, 5 88, 5 56 C 5 28, 21 4, 55 4 Z" fill="#fff7ec" />
          <path d="M 55 34 L 55 86" stroke="#1f3d26" strokeWidth="5" strokeLinecap="round" />
          <path d="M 55 48 C 45 48, 39 40, 39 32" stroke="#1f3d26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M 55 60 C 67 60, 75 52, 75 44" stroke="#1f3d26" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
        Pewil
      </span>
      <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 14, opacity: 0.88, letterSpacing: '0.01em' }}>
        Rooted in the work.
      </span>
    </Link>
  );

  return (
    <div style={isMobile ? S.wrapperMobile : S.wrapper}>
      {/* Left photo side */}
      <aside style={isMobile ? S.sideMobile : S.side}>
        {LogoLink}
        <div style={S.quoteCard}>
          <div style={S.quoteText}>
            Welcome back. Your fields, your shop, your team {'\u2014'} all waiting exactly where you left them.
          </div>
          <div style={{ marginTop: 18, fontSize: 14, opacity: 0.88, lineHeight: 1.55 }}>
            Pewil keeps the numbers quiet so you can hear the work.
          </div>
        </div>
      </aside>

      {/* Right form side */}
      <main style={isMobile ? S.formWrapMobile : S.formWrap}>
        {step === 'creds' ? (
          <form style={S.form} onSubmit={handleCredsSubmit}>
            <BackLink to="/" label="Back to home" style={{ marginBottom: 36 }} />
            <h2 style={S.title}>
              Welcome back, <span style={S.titleEm}>friend</span>.
            </h2>
            <p style={S.sub}>Sign in and pick up where the team left off.</p>

            {error && <div style={S.error}>{error}</div>}

            {/* Google SSO is on the roadmap but not wired — the prior
                disabled button plus "arrives in the next update" copy was
                setting expectations we weren't meeting in v1. Hide until
                we have a working OAuth handshake. */}


            <div style={S.field}>
              <label style={S.label} htmlFor="username">Username or email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={fx}
                onBlur={fb}
                autoComplete="username"
                required
                style={S.input}
                placeholder="you@farm.co.zw"
              />
            </div>

            <div style={S.field}>
              <div style={S.labelRow}>
                <label style={S.label} htmlFor="password">Password</label>
                <Link to="/forgot-password" style={S.forgotLink}>Forgot?</Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={fx}
                onBlur={fb}
                autoComplete="current-password"
                required
                style={S.input}
                placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...S.submit,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (loading) return;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 14px 30px -8px rgba(217,86,44,.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 10px 24px -8px rgba(217,86,44,.6)';
              }}
            >
              {loading ? 'Signing in\u2026' : 'Sign in to Pewil \u2192'}
            </button>

            {/* Design 5: amber 2FA callout */}
            <div style={S.twofaNote}>
              <div style={S.twofaNoteIcon}>{'\u{1F510}'}</div>
              <div style={S.twofaNoteText}>
                <span style={S.twofaNoteStrong}>2FA enabled.</span>{' '}
                If you{'\u2019'}ve turned it on, you{'\u2019'}ll be asked for your authenticator code after this step.
              </div>
            </div>

            <div style={S.switch}>
              New to Pewil?{' '}
              <Link to="/register" style={S.switchLink}>Create an account {'\u2192'}</Link>
            </div>
          </form>
        ) : (
          /* ─── 2FA step ─── */
          <form style={S.form} onSubmit={handle2faSubmit}>
            <button type="button" style={S.back} onClick={cancelTwoFa}>
              {'\u2190'} Use a different account
            </button>
            <h2 style={S.title}>
              One more step, <span style={S.titleEm}>{twofaUsername || 'there'}</span>.
            </h2>
            <p style={S.sub}>
              {useRecovery
                ? 'Enter one of the 8-character recovery codes you saved when you enabled 2FA.'
                : 'Open your authenticator app and enter the 6-digit code for Pewil.'}
            </p>

            {error && <div style={S.error}>{error}</div>}

            <div style={S.field}>
              <label style={S.label} htmlFor="code">
                {useRecovery ? 'Recovery code' : 'Authentication code'}
              </label>
              <input
                id="code"
                type="text"
                inputMode={useRecovery ? 'text' : 'numeric'}
                pattern={useRecovery ? undefined : '[0-9]*'}
                value={code}
                onChange={e => setCode(e.target.value)}
                onFocus={fx}
                onBlur={fb}
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={useRecovery ? 10 : 6}
                style={S.otpInput}
                placeholder={useRecovery ? 'A1B2C3D4' : '123456'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...S.submit,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (loading) return;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 14px 30px -8px rgba(217,86,44,.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 10px 24px -8px rgba(217,86,44,.6)';
              }}
            >
              {loading ? 'Verifying\u2026' : 'Verify and sign in \u2192'}
            </button>

            <button
              type="button"
              style={S.secondaryLink}
              onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}
            >
              {useRecovery ? 'Use authenticator app instead' : 'Use a recovery code instead'}
            </button>

            <div style={S.switch}>
              Lost your authenticator and recovery codes?{' '}
              <Link to="/forgot-password" style={S.switchLink}>Reset via email {'\u2192'}</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
