import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import BillingLocked from '../pages/BillingLocked';

/**
 * BillingLockoutGate — sits between <ProtectedRoute> and <FarmApp>.
 *
 * On every authenticated session:
 *   1. Fetches /billing/billing/current_plan/?module=<active module>.
 *   2. If `is_active_subscription` is false, renders <BillingLocked />
 *      instead of children.
 *   3. Otherwise, renders children (normal app).
 *
 * Also listens for a window event `pewil:payment-required` that the
 * axios response interceptor dispatches on any 402. That lets a write
 * that slips past the optimistic UI (e.g. cashier in mid-shift when
 * the trial flips at midnight) flip the gate without a hard reload.
 *
 * Demo tenants bypass the gate — demo accounts have no real billing
 * lifecycle, and the existing DemoWriteGuard already handles their
 * read-only mode separately.
 *
 * Super admins also bypass: they're internal Pewil staff, not paying
 * tenants, and their billing rows (if any) are noise.
 */
export default function BillingLockoutGate({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // The active module (single-module-per-tenant rule).
  const module = (user?.modules && user.modules[0] === 'retail') ? 'retail' : 'farm';

  // Override that the 402 interceptor can flip. Defaults to whatever
  // the /current_plan/ query says; the override forces lockout even
  // if the query is still cached as "active" (e.g. the trial expired
  // a minute ago and the cache hasn't refreshed yet).
  const [lockOverride, setLockOverride] = useState(null);

  // Listen for 402s from anywhere in the app. The axios interceptor
  // dispatches this with the 402 response body so we can carry over
  // the reason code without an extra round-trip.
  useEffect(() => {
    const onPaymentRequired = (e) => {
      setLockOverride({
        reason: e.detail?.reason || null,
        subscription: e.detail?.subscription || null,
      });
      // Invalidate the cached current_plan so the next render fetches
      // the real subscription row (and confirms the lockout).
      queryClient.invalidateQueries({ queryKey: ['current-plan', module] });
    };
    window.addEventListener('pewil:payment-required', onPaymentRequired);
    return () => window.removeEventListener('pewil:payment-required', onPaymentRequired);
  }, [module, queryClient]);

  const fetchCurrentPlan = useCallback(async () => {
    try {
      const res = await api.get(`/billing/billing/current_plan/?module=${module}`);
      return res.data;
    } catch (e) {
      // 404 = no sub for this module yet (onboarding hasn't run, etc).
      // Treat as "not locked" — let the normal app render so the
      // onboarding flow / trial-signal signal can take over. The
      // PlanEnforcementMiddleware also passes through when no sub
      // exists, so there's no risk of a free-pass for unpaid writes.
      if (e?.response?.status === 404) return null;
      throw e;
    }
  }, [module]);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['current-plan', module],
    queryFn: fetchCurrentPlan,
    // 5-minute stale window — a trial expiry doesn't need sub-minute
    // accuracy; the axios 402 interceptor handles the precise moment.
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!user,
  });

  // Demo + super admin bypass.
  if (!user) return children;
  // AuthContext flattens demo + super_admin onto the user object — see
  // _extractUserData(). Demo accounts have no real billing lifecycle
  // (DemoWriteGuard already locks their writes), and super admins are
  // internal Pewil staff, so neither should ever hit lockout.
  if (user.is_demo || user.is_super_admin) return children;

  // Still fetching the first time → render children. A brief flash of
  // the dashboard for an unpaid tenant is acceptable; the middleware
  // will block any writes they attempt in that window, and the gate
  // will catch up within milliseconds.
  if (isLoading && !lockOverride) return children;

  // No subscription row for this module → treat as not-locked.
  // (Could be a freshly-created tenant whose signal hasn't fired yet.)
  if (!subscription && !lockOverride) return children;

  // Decide: is this subscription in good standing?
  const isActive = subscription?.is_active_subscription === true;
  const reason = lockOverride?.reason || deriveReason(subscription);

  if (lockOverride || !isActive) {
    return (
      <BillingLocked
        subscription={lockOverride?.subscription || subscription}
        reason={reason}
      />
    );
  }

  return children;
}

function deriveReason(sub) {
  if (!sub) return null;
  if (sub.status === 'trialing') return 'trial_expired';
  if (sub.status === 'past_due') return 'past_due';
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status === 'active') return 'period_expired';
  return null;
}
