import api from './axios';

// Plans
export const getPlans = () => api.get('/billing/plans/').then(r => r.data);

// Current Plan
// module: 'farm' | 'retail' (optional — omit to get all active subs)
export const getCurrentPlan = (module) => {
  const url = module
    ? `/billing/billing/current_plan/?module=${encodeURIComponent(module)}`
    : '/billing/billing/current_plan/';
  return api.get(url).then(r => r.data);
};
export const changePlan = (data) => api.post('/billing/billing/change_plan/', data).then(r => r.data);

// Invoices
export const getInvoices = () => api.get('/billing/billing/invoices/').then(r => r.data);

// Receipts (Phase 5)
// Download a paid invoice's receipt PDF — returns a Blob for client-side save.
export const downloadReceipt = (invoiceId) =>
  api.get(`/billing/billing/${invoiceId}/receipt/`, { responseType: 'blob' })
     .then(r => r.data);
// Request the server to email the receipt PDF to the authenticated user.
export const emailReceipt = (invoiceId) =>
  api.post(`/billing/billing/${invoiceId}/email-receipt/`).then(r => r.data);

// Usage
export const getUsage = () => api.get('/billing/billing/usage/').then(r => r.data);

// Canonical billing summary — single source of truth for the billing UI.
// Returns { module, billing_model, subscription, usage?, pricing?, addons }.
export const getBillingSummary = (module) => {
  const url = module
    ? `/billing/billing/summary/?module=${encodeURIComponent(module)}`
    : '/billing/billing/summary/';
  return api.get(url).then(r => r.data);
};

// Add-ons (Pewil AI, Pewil Enterprise)
export const getAddons = (module) => {
  const url = module
    ? `/billing/billing/addons/?module=${encodeURIComponent(module)}`
    : '/billing/billing/addons/';
  return api.get(url).then(r => r.data);
};
// Start an add-on subscription — returns { invoice_id, amount, addon }.
// Pay the returned invoice via initializePayment({ invoice_id }).
export const subscribeAddon = (addon_slug) =>
  api.post('/billing/billing/subscribe_addon/', { addon_slug }).then(r => r.data);
export const cancelAddon = (addon_slug) =>
  api.post('/billing/billing/cancel_addon/', { addon_slug }).then(r => r.data);

// Payment methods — which providers are configured
export const getPaymentMethods = () => api.get('/billing/billing/payment_methods/').then(r => r.data);

// Initialize payment (multi-provider)
// body: {
//   plan_slug,
//   payment_method: 'card'|'ecocash'|'onemoney'|'mobile_money',
//   billing_cycle: 'monthly'|'yearly',
//   phone_number?
// }
export const initializePayment = (data) =>
  api.post('/billing/billing/initialize_payment/', data).then(r => r.data);

// Verify payment status (for mobile money polling)
// body: { reference, provider: 'paynow'|'pesepay' }
export const verifyPayment = (data) =>
  api.post('/billing/billing/verify_payment/', data).then(r => r.data);

// Legacy: Paystack subscription
export const createSubscription = (data) =>
  api.post('/billing/billing/create_subscription/', data).then(r => r.data);
