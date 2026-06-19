import { useState, useEffect } from 'react';
import { totpSetup, totpConfirm, totpDisable, totpStatus, changePassword, sendVerificationEmail, getPasswordPolicy } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import PasswordChecklist from './PasswordChecklist';
import PasswordPolicyPanel from './PasswordPolicyPanel';
import { DEFAULT_POLICY, allSatisfied, backendPasswordError } from '../utils/passwordPolicy';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 };
const cardTitle = { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 };
const fl = { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 10 };
const fi = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' };
const btnP = { padding: '8px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const btnD = { ...btnP, background: '#991b1b' };
const msg = (ok) => ({ padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12, background: ok ? '#e8f5ee' : '#fef2f2', color: ok ? '#1a6b3a' : '#991b1b' });

export default function SecuritySettings() {
  const { user } = useAuth();
  const [twoFA, setTwoFA] = useState(null); // null=loading, { enabled, qr, secret, recovery }
  const [totpCode, setTotpCode] = useState('');
  const [twoFAMsg, setTwoFAMsg] = useState({ ok: false, text: '' });
  const [setupData, setSetupData] = useState(null); // { qr_uri, secret, recovery_codes }

  // Change password
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState({ ok: false, text: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Email verification
  const [emailSent, setEmailSent] = useState(false);

  // Tenant policy — used to drive the live checklist on the change form.
  const [policy, setPolicy] = useState(DEFAULT_POLICY);

  useEffect(() => {
    totpStatus()
      .then(res => setTwoFA({ enabled: res.data.totp_verified }))
      .catch(() => setTwoFA({ enabled: false }));
    getPasswordPolicy()
      .then(p => setPolicy(p))
      .catch(() => setPolicy(DEFAULT_POLICY));
  }, []);

  const handleSetup2FA = async () => {
    setTwoFAMsg({ ok: false, text: '' });
    try {
      const res = await totpSetup();
      setSetupData(res.data);
    } catch (err) {
      setTwoFAMsg({ ok: false, text: err.response?.data?.detail || 'Setup failed.' });
    }
  };

  const handleConfirm2FA = async () => {
    setTwoFAMsg({ ok: false, text: '' });
    try {
      await totpConfirm(totpCode);
      setTwoFA({ enabled: true });
      setSetupData(null);
      setTotpCode('');
      setTwoFAMsg({ ok: true, text: '2FA enabled successfully!' });
    } catch (err) {
      setTwoFAMsg({ ok: false, text: err.response?.data?.detail || 'Invalid code.' });
    }
  };

  const handleDisable2FA = async () => {
    setTwoFAMsg({ ok: false, text: '' });
    try {
      await totpDisable(totpCode);
      setTwoFA({ enabled: false });
      setTotpCode('');
      setTwoFAMsg({ ok: true, text: '2FA has been disabled.' });
    } catch (err) {
      setTwoFAMsg({ ok: false, text: err.response?.data?.detail || 'Failed to disable 2FA.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== newPw2) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    if (!allSatisfied(newPw, policy)) {
      setPwMsg({ ok: false, text: 'Your new password does not meet the requirements below.' });
      return;
    }
    setPwLoading(true); setPwMsg({ ok: false, text: '' });
    try {
      await changePassword(oldPw, newPw);
      setPwMsg({ ok: true, text: 'Password changed successfully!' });
      setOldPw(''); setNewPw(''); setNewPw2('');
    } catch (err) {
      setPwMsg({ ok: false, text: backendPasswordError(err, 'Failed to change password.') });
    } finally { setPwLoading(false); }
  };

  const handleSendVerification = async () => {
    try {
      await sendVerificationEmail();
      setEmailSent(true);
    } catch {}
  };

  return (
    <div>
      {/* Email Verification */}
      {user && !user.email_verified && (
        <div style={{ ...card, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <h3 style={{ ...cardTitle, color: '#92400e' }}>Verify Your Email</h3>
          <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
            Your email is not yet verified. Verify it to enable password reset and important notifications.
          </p>
          {emailSent ? (
            <p style={{ fontSize: 12, color: '#1a6b3a', fontWeight: 600 }}>Verification email sent! Check your inbox.</p>
          ) : (
            <button style={btnP} onClick={handleSendVerification}>Send Verification Email</button>
          )}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div style={card}>
        <h3 style={cardTitle}>Two-Factor Authentication (2FA)</h3>
        {twoFA === null ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading 2FA status...</p>
        ) : twoFA.enabled ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a6b3a' }} />
              <span style={{ fontSize: 12, color: '#1a6b3a', fontWeight: 600 }}>2FA is enabled</span>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              Enter a code from your authenticator app to disable 2FA.
            </p>
            <label style={fl}>TOTP Code</label>
            <input style={fi} value={totpCode} onChange={e => setTotpCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
            <button style={btnD} onClick={handleDisable2FA}>Disable 2FA</button>
          </>
        ) : setupData ? (
          <>
            <p style={{ fontSize: 12, color: '#374151', marginBottom: 10 }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, textAlign: 'center', marginBottom: 12 }}>
              {/* QR as text URI — user should scan or manually enter secret */}
              <code style={{ fontSize: 10, wordBreak: 'break-all', color: '#374151' }}>{setupData.qr_uri || setupData.secret}</code>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>Manual entry key: {setupData.secret}</p>
            </div>
            {setupData.recovery_codes && setupData.recovery_codes.length > 0 && (
              <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Save these recovery codes securely:</p>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#991b1b', lineHeight: 1.8 }}>
                  {setupData.recovery_codes.map((c, i) => <div key={i}>{c}</div>)}
                </div>
              </div>
            )}
            <label style={fl}>Enter code from app to confirm</label>
            <input style={fi} value={totpCode} onChange={e => setTotpCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
            <button style={btnP} onClick={handleConfirm2FA}>Confirm & Enable</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              Add an extra layer of security with a time-based one-time password (TOTP).
            </p>
            <button style={btnP} onClick={handleSetup2FA}>Set Up 2FA</button>
          </>
        )}
        {twoFAMsg.text && <div style={msg(twoFAMsg.ok)}>{twoFAMsg.text}</div>}
      </div>

      {/* Change Password */}
      <div style={card}>
        <h3 style={cardTitle}>Change Password</h3>
        {pwMsg.text && <div style={msg(pwMsg.ok)}>{pwMsg.text}</div>}
        <form onSubmit={handleChangePassword}>
          <label style={fl}>Current password</label>
          <input style={fi} type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required />
          <label style={fl}>New password</label>
          <input style={fi} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={`At least ${policy.min_length} characters`} required />
          <PasswordChecklist value={newPw} policy={policy} />
          <label style={fl}>Confirm new password</label>
          <input style={fi} type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} required />
          <button style={btnP} disabled={pwLoading}>{pwLoading ? 'Changing...' : 'Change Password'}</button>
        </form>
      </div>

      {/* Password policy — owner-configurable (shared component) */}
      <PasswordPolicyPanel />

      {/* Active Sessions info */}
      <div style={card}>
        <h3 style={cardTitle}>Session Security</h3>
        <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>
          Your session is secured with JWT tokens that expire automatically. For maximum security, log out when using shared devices.
          If you suspect unauthorized access, change your password immediately and enable 2FA.
        </p>
      </div>
    </div>
  );
}

