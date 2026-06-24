import api from './axios';

// Platform (founder) analytics — super-admin only
export const getPlatformAnalytics = () => api.get('/core/platform/').then(r => r.data);

// Tenant
export const getMyTenant = () => api.get('/core/tenants/my-tenant/').then(r => r.data);
export const updateMyTenant = (data) => api.patch('/core/tenants/my-tenant/update/', data).then(r => r.data);

// Tenant switching
export const getMyTenants = () => api.get('/core/tenants/my-tenants/').then(r => r.data);
export const switchTenant = (tenantId) => api.post('/core/tenants/switch/', { tenant_id: tenantId }).then(r => r.data);

// Usage stats
export const getUsageStats = () => api.get('/core/tenants/usage/').then(r => r.data);

// Business type / vertical + first-run setup
export const getVerticals = (module) =>
  api.get('/core/tenants/verticals/', { params: module ? { module } : {} }).then(r => r.data);
// Accepts a single slug or an array of slugs (a business can be several types,
// e.g. a service station that's both fuel and general retail).
export const setBusinessType = (types) =>
  api.patch('/core/tenants/business-type/',
    { business_types: Array.isArray(types) ? types : [types] }).then(r => r.data);
export const completeSetup = (payload) =>
  api.post('/core/tenants/complete-setup/', payload || {}).then(r => r.data);

// User management (owner)
export const getTenantUsers = () => api.get('/core/tenants/users/').then(r => r.data);
export const inviteUser = (data) => api.post('/core/tenants/invite/', data).then(r => r.data);
export const updateUserPermissions = (userId, data) =>
  api.patch(`/core/tenants/users/${userId}/permissions/`, data).then(r => r.data);
