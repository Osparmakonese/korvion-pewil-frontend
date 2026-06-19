import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../api/authApi';
import PasswordChecklist from '../components/PasswordChecklist';
import { DEFAULT_POLICY, allSatisfied, backendPasswordError } from '../utils/passwordPolicy';

const S = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 420, maxWidth: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  logo: { display: 'inline-block', background: '#1a6b3a', color: '#c97d1a', fontWeight: 800, fontSize: 14, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', letterSpacing: 1, marginBottom: 28 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 8px' },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6, marginTop: 14 },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px 0', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 20 },
  msg: { padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
};

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const expired = params.get('expired') === '1';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    if (!allSatisfied(pw, DEFAULT_POLICY)) { setError('Your password does not meet the requirements below.'); return; }
    setLoading(true); setError('');
    try {
      await confirmPasswordReset(token, pw);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(backendPasswordError(err, 'Invalid or expired link.'));
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div style={S.wrapper}><div style={S.card}>
      <Link to="/" style={S.logo}>PEWIL</Link>
      <h1 style={S.title}>Invalid link</h1>
      <p style={S.sub}>This password reset link is missing or malformed.</p>
      <Link to="/forgot-password" style={{ color: '#1a6b3a', fontSize: 14 }}>Request a new link</Link>
    </div></div>
  );

  return (
    <div style={S.wrapper}>
      <div style={S.card}>
        <Link to="/" style={S.logo}>PEWIL</Link>
        <h1 style={S.title}>Set new password</h1>
        <p style={S.sub}>Choose a strong password for your account.</p>
        {expired && !done && (
          <div style={{ ...S.msg, background: '#fffbeb', color: '#92400e' }}>
            Your password has expired under your organization's policy. Set a new one to sign in.
          </div>
        )}
        {error && <div style={{ ...S.msg, background: '#fef2f2', color: '#991b1b' }}>{error}</div>}
        {done ? (
          <div style={{ ...S.msg, background: '#e8f5ee', color: '#1a6b3a' }}>
            Password reset! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={S.label}>New password</label>
            <input style={S.input} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder={`At least ${DEFAULT_POLICY.min_length} characters`} required />
            <PasswordChecklist value={pw} policy={DEFAULT_POLICY} />
            <label style={S.label}>Confirm password</label>
            <input style={S.input} type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" required />
            <button style={S.btn} disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
