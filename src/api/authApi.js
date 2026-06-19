import api from './axios';

// 2FA
export const totpSetup = () => api.post('/core/auth/totp_setup/').then(r => r.data);
export const totpConfirm = (code) => api.post('/core/auth/totp_confirm/', { code }).then(r => r.data);
export const totpVerify = (code) => api.post('/core/auth/totp_verify/', { code }).then(r => r.data);
export const totpDisable = (password) => api.post('/core/auth/totp_disable/', { password }).then(r => r.data);
export const totpStatus = () => api.get('/core/auth/totp_status/').then(r => r.data);

// Password reset
export const requestPasswordReset = (email) =>
  api.post('/core/auth/password_reset_request/', { email }).then(r => r.data);
export const confirmPasswordReset = (token, new_password) =>
  api.post('/core/auth/password_reset_confirm/', { token, new_password }).then(r => r.data);

// Email verification
export const sendVerificationEmail = () =>
  api.post('/core/auth/send_verification_email/').then(r => r.data);
export const verifyEmailConfirm = (token) =>
  api.post('/core/auth/verify_email_confirm/', { token }).then(r => r.data);

// Change password (logged in)
export const changePassword = (current_password, new_password) =>
  api.post('/core/auth/change_password/', { current_password, new_password }).then(r => r.data);

// Password policy (per-tenant). GET = any signed-in user; PUT = owner only.
export const getPasswordPolicy = () =>
  api.get('/core/auth/password_policy/').then(r => r.data);
export const updatePasswordPolicy = (policy) =>
  api.put('/core/auth/password_policy/', policy).then(r => r.data);

// Data export
export const exportData = (format = 'json') =>
  api.get(`/core/export/?format=${format}`, { responseType: 'blob' }).then(r => r.data);

// Audit log — accepts either positional (page, limit) for back-compat OR an
// options object { page, limit, action }.  Callers used to pass a plain
// object here by mistake (it rendered as '[object Object]' in the URL and
// blew up the backend int parse — see Sentry PYTHON-DJANGO-10).
export const getAuditLog = (pageOrOpts = 1, limit = 50) => {
  const opts = (pageOrOpts && typeof pageOrOpts === 'object')
    ? pageOrOpts
    : { page: pageOrOpts, limit };
  const page = Number.isFinite(Number(opts.page)) ? Number(opts.page) : 1;
  const lim = Number.isFinite(Number(opts.limit)) ? Number(opts.limit) : 50;
  const qs = new URLSearchParams({ page: String(page), limit: String(lim) });
  if (opts.action) qs.set('action', String(opts.action));
  return api.get(`/core/audit/?${qs.toString()}`).then(r => r.data);
};

// Billing extras
export const cancelSubscription = (module = 'farm') =>
  api.post('/billing/billing/cancel_subscription/', { module }).then(r => r.data);
export const requestRefund = (invoiceId) =>
  api.post(`/billing/billing/${invoiceId}/request-refund/`).then(r => r.data);
