import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

// Living Africa palette — matches LandingPage.js
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

const SALES_EMAIL = 'sales@pewil.org';

export default function Contact() {
  const [searchParams] = useSearchParams();
  const isEnterprise = searchParams.get('type') === 'enterprise';

  useEffect(() => {
    const id = 'pewil-livingafrica-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    branches: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      isEnterprise
        ? `Enterprise enquiry — ${form.company || form.name}`
        : `Pewil enquiry — ${form.company || form.name}`
    );
    const body = encodeURIComponent(
      `Name: ${form.name}\n` +
      `Company: ${form.company}\n` +
      `Email: ${form.email}\n` +
      `Phone: ${form.phone}\n` +
      (isEnterprise ? `Number of branches: ${form.branches}\n` : '') +
      `\nMessage:\n${form.message}\n`
    );
    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const label = { display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 };
  const input = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `1.5px solid ${C.line}`, background: '#fff',
    fontSize: 15, color: C.ink, fontFamily: SANS,
    outline: 'none', transition: 'border .15s, box-shadow .15s',
    boxSizing: 'border-box',
  };
  const fx = e => { e.target.style.borderColor = C.clay; e.target.style.boxShadow = '0 0 0 4px rgba(217,86,44,.1)'; };
  const fb = e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{
      minHeight: '100vh', background: C.sand2,
      fontFamily: SANS, color: C.ink,
    }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', background: 'rgba(255,252,247,.9)',
        backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}`,
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 800, fontSize: 20, color: C.ink, textDecoration: 'none',
          letterSpacing: '-.01em',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10, background: C.clay,
            display: 'grid', placeItems: 'center', color: '#fff',
            fontFamily: SERIF, fontWeight: 700,
          }}>P</span>
          Pewil
        </Link>
        <Link to="/pricing" style={{
          color: C.muted, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>See pricing</Link>
      </nav>

      <section style={{
        maxWidth: 960, margin: '0 auto', padding: '56px 24px',
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 14px', borderRadius: 999,
          background: 'rgba(217,86,44,.12)', color: C.clay,
          fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
          marginBottom: 18,
        }}>{isEnterprise ? 'Enterprise · sales-assisted' : 'Talk to us'}</div>

        <h1 style={{
          fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(32px, 5vw, 52px)',
          lineHeight: 1.05, letterSpacing: '-.025em', margin: 0,
        }}>
          {isEnterprise
            ? <>Running a chain? <em style={{ color: C.clay, fontStyle: 'italic', fontWeight: 600 }}>Let's talk.</em></>
            : <>We'd love to <em style={{ color: C.clay, fontStyle: 'italic', fontWeight: 600 }}>hear from you.</em></>}
        </h1>
        <p style={{ marginTop: 16, color: C.muted, fontSize: 17, lineHeight: 1.55, maxWidth: '56ch' }}>
          {isEnterprise
            ? 'The Enterprise plan is priced per branch — $45/branch/month ($450/branch/year, 2 months free) — with unlimited tills and users per branch, multi-branch rollup, fuel forecourt and white-label branding. For 20+ branches we offer volume pricing. Tell us about your operation and we\'ll set up a personalised quote and onboarding — usually within two business days.'
            : 'Send us a note and someone from our team will reply within one business day.'}
        </p>

        {submitted ? (
          <div style={{
            marginTop: 36, padding: 30, borderRadius: 18,
            background: '#fff', border: `1px solid ${C.line}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, margin: 0 }}>Your email client should be opening now.</h2>
            <p style={{ marginTop: 10, color: C.muted, fontSize: 15, lineHeight: 1.55 }}>
              If nothing opened, email us directly at <a href={`mailto:${SALES_EMAIL}`} style={{ color: C.clay, fontWeight: 700 }}>{SALES_EMAIL}</a>.
            </p>
            <Link to="/" style={{
              display: 'inline-block', marginTop: 20, padding: '12px 24px',
              borderRadius: 999, background: C.clay, color: '#fff',
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}>Back to home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            marginTop: 40, padding: 32, borderRadius: 20,
            background: '#fff', border: `1px solid ${C.line}`,
            boxShadow: '0 14px 30px -18px rgba(177,59,23,.2)',
            display: 'grid', gap: 18,
          }}>
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={label}>Your name</label>
                <input style={input} value={form.name} onChange={e => set('name', e.target.value)}
                  onFocus={fx} onBlur={fb} required placeholder="Tendai Mujuru" />
              </div>
              <div>
                <label style={label}>Company / chain name</label>
                <input style={input} value={form.company} onChange={e => set('company', e.target.value)}
                  onFocus={fx} onBlur={fb} placeholder="Mujuru Supermarkets" />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={label}>Work email</label>
                <input style={input} type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  onFocus={fx} onBlur={fb} required placeholder="you@company.com" />
              </div>
              <div>
                <label style={label}>Phone / WhatsApp</label>
                <input style={input} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  onFocus={fx} onBlur={fb} placeholder="+263 77 000 0000" />
              </div>
            </div>
            {isEnterprise && (
              <div>
                <label style={label}>Number of branches</label>
                <input style={input} type="number" min="1" value={form.branches}
                  onChange={e => set('branches', e.target.value)}
                  onFocus={fx} onBlur={fb} placeholder="e.g. 12" />
                <p style={{ marginTop: 6, fontSize: 12.5, color: C.muted }}>
                  Enterprise $69/mo · unlimited users, tills &amp; branches · 2 months free yearly
                </p>
              </div>
            )}
            <div>
              <label style={label}>What should we know?</label>
              <textarea style={{ ...input, minHeight: 140, fontFamily: SANS, resize: 'vertical' }}
                value={form.message}
                onChange={e => set('message', e.target.value)}
                onFocus={fx} onBlur={fb}
                placeholder={isEnterprise
                  ? 'Tell us about your operation — industries, locations, headcount, biggest pain right now.'
                  : 'How can we help?'} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" style={{
                padding: '14px 28px', borderRadius: 999,
                background: `linear-gradient(135deg, ${C.terra}, ${C.clay})`,
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 15, letterSpacing: '.01em',
                boxShadow: '0 10px 24px -8px rgba(217,86,44,.6)',
              }}>Send enquiry →</button>
              <span style={{ fontSize: 13, color: C.muted }}>
                Or email <a href={`mailto:${SALES_EMAIL}`} style={{ color: C.clay, fontWeight: 700 }}>{SALES_EMAIL}</a>
              </span>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
