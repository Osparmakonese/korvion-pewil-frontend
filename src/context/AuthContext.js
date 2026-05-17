import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function _extractUserData(res, username) {
    // Decode claims from JWT payload
    let role = 'worker';
    let tenant_id = null;
    let tenant_slug = '';
    let tenant_name = '';
    let modules = ['farm'];
    let plan = 'free';
    let retail_perms = {};
    let farm_perms = {};
    let is_demo = false;
    let is_super_admin = false;
    try {
      const payload = JSON.parse(atob(res.data.access.split('.')[1]));
      role = payload.role || 'owner';
      tenant_id = payload.tenant_id || null;
      tenant_slug = payload.tenant_slug || '';
      tenant_name = payload.tenant_name || '';
      modules = payload.modules || ['farm'];
      plan = payload.plan || 'free';
      retail_perms = payload.retail_perms || {};
      farm_perms = payload.farm_perms || {};
      is_demo = !!payload.is_demo;
      is_super_admin = !!payload.is_super_admin;
    } catch { /* fallback */ }

    return {
      username: username || res.data.username,
      user_id: res.data.user_id,
      role: res.data.role || role,
      tenant_id: res.data.tenant_id || tenant_id,
      tenant_slug: res.data.tenant_slug || tenant_slug,
      tenant_name: res.data.tenant_name || tenant_name,
      modules: res.data.modules || modules,
      plan: res.data.plan || plan,
      retail_perms: res.data.retail_perms || retail_perms,
      farm_perms: res.data.farm_perms || farm_perms,
      is_demo: res.data.is_demo === true ? true : is_demo,
      is_super_admin: res.data.is_super_admin === true ? true : is_super_admin,
    };
  }

  function _commitSession(res, username) {
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    const userData = _extractUserData(res, username);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  /**
   * Step 1 of login.
   *
   * Returns one of:
   *   { ok: true }                              normal login, session committed
   *   { ok: false, requires2fa: true,           2FA gate hit - caller must
   *     pendingToken, username, expiresIn }     prompt for code and call loginWith2fa
   *   { ok: false }                             error already set on `error`
   */
  async function login(username, password) {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/token/', { username, password });
      if (res.data && res.data.requires_2fa) {
        return {
          ok: false,
          requires2fa: true,
          pendingToken: res.data.pending_token,
          username: res.data.username,
          expiresIn: res.data.expires_in_seconds || 300,
        };
      }
      _commitSession(res, username);
      return { ok: true };
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password');
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  /**
   * Step 2 of login. Exchanges the pending token + 6-digit (or recovery)
   * code for the real JWT and commits the session.
   */
  async function loginWith2fa(pendingToken, code) {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/core/auth/login_2fa/', {
        pending_token: pendingToken,
        code,
      });
      _commitSession(res, res.data.username);
      return { ok: true, recoveryUsed: !!res.data.recovery_code_used };
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Invalid 2FA code.');
      const expired = typeof detail === 'string' && /expired|sign in again/i.test(detail);
      return { ok: false, expired };
    } finally {
      setLoading(false);
    }
  }

  async function register(formData) {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/core/tenants/register/', formData);
      _commitSession(res, formData.username);
      return true;
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'object' && detail !== null) {
        const messages = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('. ');
        setError(messages);
      } else {
        setError(detail?.detail || 'Registration failed. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(module = 'farm') {
    // ``module`` picks which seeded demo tenant to log into:
    //   'farm'   -> Pewil Farm Live Demo (slug=demo)
    //   'retail' -> Pewil Retail Live Demo (slug=demo-retail)
    // Each demo tenant has its own dedicated user so the single-module rule
    // (one product lane per account) keeps working for demo sessions too.
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/core/auth/demo_login/', { module });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh || '');

      const userData = _extractUserData(res, res.data.username);
      userData.is_demo = true;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Live demo is temporarily unavailable. Try again in a moment.'
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  /* 2FA management (Settings > Security panel) */

  async function getTotpStatus() {
    const res = await api.get('/core/auth/totp_status/');
    return res.data;
  }

  async function setupTotp() {
    const res = await api.post('/core/auth/totp_setup/', {});
    return res.data;
  }

  async function confirmTotp(code) {
    const res = await api.post('/core/auth/totp_confirm/', { code });
    return res.data;
  }

  async function disableTotp(password) {
    const res = await api.post('/core/auth/totp_disable/', { password });
    return res.data;
  }

  async function regenerateRecoveryCodes(code) {
    const res = await api.post('/core/auth/totp_regenerate_recovery/', { code });
    return res.data;
  }

  function switchTenant(tokenData) {
    localStorage.setItem('access_token', tokenData.access);
    localStorage.setItem('refresh_token', tokenData.refresh);
    const userData = {
      ...user,
      tenant_id: tokenData.tenant_id,
      tenant_slug: tokenData.tenant_slug,
      tenant_name: tokenData.tenant_name,
      modules: tokenData.modules,
      plan: tokenData.plan,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Clear the once-per-session trial-notification flags so the toast
    // surfaces again on the next login. sessionStorage normally clears
    // when the tab closes, but explicit logout while the tab stays open
    // also needs to reset state — without this, signing out and back in
    // in the same tab would silently swallow the trial reminder.
    try {
      sessionStorage.removeItem('pewil-trial-notif-shown');
      sessionStorage.removeItem('pewil-trial-notif-shown:data');
      sessionStorage.removeItem('pewil-trial-notif-dismissed');
    } catch (_) { /* best effort */ }
    // Wipe the offline product catalog so a different tenant signing
    // in on the same browser doesn't see ghost products from the
    // previous tenant. IndexedDB writes are async — fire-and-forget.
    try {
      import('../utils/productCatalogCache')
        .then(({ clearCatalog }) => clearCatalog())
        .catch(() => {});
    } catch (_) { /* best effort */ }
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWith2fa,
        register,
        demoLogin,
        switchTenant,
        logout,
        loading,
        error,
        getTotpStatus,
        setupTotp,
        confirmTotp,
        disableTotp,
        regenerateRecoveryCodes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
