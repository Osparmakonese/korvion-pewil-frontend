// Client-side mirror of the backend password policy (core/password_policy.py).
// Used only for live hints + early validation; the backend remains the
// authoritative check and returns an `errors` array on rejection.

export const DEFAULT_POLICY = {
  min_length: 8,
  require_uppercase: false,
  require_lowercase: false,
  require_number: false,
  require_symbol: false,
  block_common: true,
  expiry_days: 0,
  history_count: 0,
};

// Build the visible requirement list for a given policy.
export function buildRequirements(policy) {
  const p = { ...DEFAULT_POLICY, ...(policy || {}) };
  const reqs = [
    { key: 'len', label: `At least ${p.min_length} characters`, test: (v) => v.length >= p.min_length },
  ];
  if (p.require_uppercase) reqs.push({ key: 'upper', label: 'An uppercase letter (A–Z)', test: (v) => /[A-Z]/.test(v) });
  if (p.require_lowercase) reqs.push({ key: 'lower', label: 'A lowercase letter (a–z)', test: (v) => /[a-z]/.test(v) });
  if (p.require_number) reqs.push({ key: 'num', label: 'A number (0–9)', test: (v) => /[0-9]/.test(v) });
  if (p.require_symbol) reqs.push({ key: 'sym', label: 'A symbol (! @ # $ %)', test: (v) => /[^A-Za-z0-9\s]/.test(v) });
  return reqs;
}

// Evaluate a candidate password -> [{ label, ok }]
export function evaluatePassword(pw, policy) {
  const v = pw || '';
  return buildRequirements(policy).map((r) => ({ label: r.label, ok: r.test(v) }));
}

// True when every requirement is satisfied.
export function allSatisfied(pw, policy) {
  return evaluatePassword(pw, policy).every((r) => r.ok);
}

// Pull a readable error string out of a backend rejection.
export function backendPasswordError(err, fallback) {
  const d = err?.response?.data;
  if (d) {
    if (Array.isArray(d.errors) && d.errors.length) return d.errors.join(' ');
    if (Array.isArray(d.password) && d.password.length) return d.password.join(' ');
    if (Array.isArray(d.new_password) && d.new_password.length) return d.new_password.join(' ');
    if (typeof d.detail === 'string') return d.detail;
  }
  return fallback || 'Could not update password.';
}
