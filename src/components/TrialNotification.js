/**
 * TrialNotification — show a one-time-per-login toast telling the user
 * how many days are left in their free trial.
 *
 * Why this exists
 * ---------------
 * Operators sign up, use the app for a few days, then the trial ends and
 * they're surprised by the lockout. Before this component there was no
 * in-app reminder of where they were in the 14-day clock — the only place
 * showing trial state was the Billing page, which most operators never
 * visit until something goes wrong.
 *
 * Behaviour
 * ---------
 *   - Fetches `/billing/billing/current_plan/` for each module the user
 *     has access to (farm, retail, or both).
 *   - If ANY active subscription has status==='trialing', renders a
 *     dismissible toast at the top-right of the app shell.
 *   - Toast copy:
 *       Trial active     → "Your free trial ends in 9 days — upgrade
 *                          anytime to keep going."
 *       Trial expiring   → "Trial ends today" or "ends tomorrow"
 *                          (1 day or less).
 *       Trial expired    → "Your trial ended X days ago. Upgrade to
 *                          re-enable saving." (only shows if
 *                          subscription is still on trialing-but-expired,
 *                          which the trial gate lockout handles
 *                          server-side; this is the visual nudge.)
 *   - "Once-per-login" gating uses sessionStorage. sessionStorage clears
 *     when the browser tab closes; so the next fresh login surfaces the
 *     toast again. localStorage would silence the warning permanently
 *     across sessions which is the opposite of what we want.
 *   - If the user explicitly dismisses, set a sessionStorage flag so it
 *     doesn't pop up again until they log out and back in.
 *   - Demo tenants are skipped — they have a separate DemoBanner.
 *
 * Hook this into App.js once at the top of the authed shell. The
 * component is self-contained — no props required for the basic toast.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const SHOWN_KEY = 'pewil-trial-notif-shown';
const DISMISSED_KEY = 'pewil-trial-notif-dismissed';

export default function TrialNotification() {
  const { user } = useAuth() || {};
  const [trial, setTrial] = useState(null); // { days_remaining, expired, plan_name }
  const [dismissed, setDismissed] = useState(false);

  // Skip entirely for demo / unauthenticated / once-already-shown-this-session
  const skip = useMemo(() => {
    if (!user) return true;
    if (user.is_demo) return true;
    if (sessionStorage.getItem(DISMISSED_KEY) === '1') return true;
    return false;
  }, [user]);

  useEffect(() => {
    if (skip) return;
    if (sessionStorage.getItem(SHOWN_KEY) === '1') {
      // We've already evaluated trial state in this session — re-check the
      // cached result so the toast persists across navigations within the
      // same session, but doesn't refetch on every page change.
      const cached = sessionStorage.getItem(SHOWN_KEY + ':data');
      if (cached) {
        try { setTrial(JSON.parse(cached)); } catch (_) {}
      }
      return;
    }
    let cancelled = false;
    const modules = (user.modules && user.modules.length) ? user.modules : ['farm'];
    (async () => {
      // Pick the trial with the SOONEST end date — if a tenant has both
      // farm + retail subscriptions, the next-to-expire is the one that
      // matters first.
      let best = null;
      for (const mod of modules) {
        try {
          const res = await api.get(
            `/billing/billing/current_plan/?module=${encodeURIComponent(mod)}`
          );
          const sub = res.data;
          if (!sub || sub.status !== 'trialing') continue;
          const days = Number(sub.trial_days_remaining ?? 0);
          const planName = sub.plan_name || sub.plan_display || 'Pewil';
          const candidate = {
            module: mod,
            days_remaining: days,
            expired: days < 0,
            plan_name: planName,
            trial_end: sub.trial_end,
          };
          if (!best || candidate.days_remaining < best.days_remaining) {
            best = candidate;
          }
        } catch (_) {
          // 404 = no active sub for this module = not on trial. Skip.
        }
      }
      // Fallback: some tenants (older signups, hand-provisioned accounts)
      // don't have a Subscription record but DO have Tenant.trial_ends_at
      // set. The Tenant serializer returns is_trial + trial_days_remaining
      // directly. If we found nothing via the billing endpoint, try the
      // tenant record.
      if (!best) {
        try {
          const res = await api.get('/core/tenants/my-tenant/');
          const tn = res.data;
          if (tn && tn.is_trial) {
            const days = Number(tn.trial_days_remaining ?? 0);
            best = {
              module: (tn.modules && tn.modules[0]) || 'pewil',
              days_remaining: days,
              expired: days < 0,
              plan_name: tn.plan || 'Trial',
              trial_end: tn.trial_ends_at,
            };
          }
        } catch (_) { /* swallow */ }
      }
      if (cancelled) return;
      sessionStorage.setItem(SHOWN_KEY, '1');
      if (best) {
        sessionStorage.setItem(SHOWN_KEY + ':data', JSON.stringify(best));
      }
      setTrial(best);
    })();
    return () => { cancelled = true; };
  }, [skip, user]);

  if (skip || !trial || dismissed) return null;

  const { days_remaining, expired } = trial;
  const isUrgent = expired || days_remaining <= 3;

  const message = expired
    ? `Your free trial ended ${Math.abs(days_remaining)} day${Math.abs(days_remaining) === 1 ? '' : 's'} ago.`
    : days_remaining === 0
      ? 'Your free trial ends today.'
      : days_remaining === 1
        ? 'Your free trial ends tomorrow.'
        : `Your free trial ends in ${days_remaining} days.`;

  const cta = expired ? 'Upgrade to re-enable' : 'Upgrade now';

  const palette = isUrgent
    ? { bg: '#fef2f2', border: '#fecaca', accent: '#b91c1c', accentBg: '#b91c1c' }
    : { bg: '#fffbea', border: '#fde68a', accent: '#92400e', accentBg: '#c77700' };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 16, right: 16,
        maxWidth: 380,
        zIndex: 1200,
        background: '#fff',
        border: `1px solid ${palette.border}`,
        borderLeft: `4px solid ${palette.accent}`,
        borderRadius: 12,
        boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
        padding: '14px 16px 14px 14px',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#111827',
        display: 'flex', gap: 12,
      }}
    >
      <div style={{
        flex: '0 0 32px', height: 32, borderRadius: '50%',
        background: palette.bg, color: palette.accent,
        display: 'grid', placeItems: 'center',
        fontSize: 18,
      }} aria-hidden>
        {expired ? '⚠️' : '⏳'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.35 }}>
          {message}
        </div>
        <div style={{
          fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.4,
        }}>
          {expired
            ? 'Saving is paused until you pick a plan. You can still browse your data.'
            : 'Pick a plan anytime — Pewil keeps every record you\'ve added so far.'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <Link
            to="/app/billing"
            onClick={() => {
              sessionStorage.setItem(DISMISSED_KEY, '1');
              setDismissed(true);
            }}
            style={{
              padding: '6px 12px', borderRadius: 999,
              background: palette.accentBg, color: '#fff',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}
          >{cta} →</Link>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISSED_KEY, '1');
              setDismissed(true);
            }}
            style={{
              padding: '6px 10px', borderRadius: 999,
              background: 'transparent', color: '#6b7280',
              fontSize: 12, fontWeight: 600, border: 0, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >Dismiss</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper called by AuthContext on logout — clears the once-per-session flags
 * so the next login sees the toast again.
 */
export function clearTrialNotificationState() {
  try {
    sessionStorage.removeItem(SHOWN_KEY);
    sessionStorage.removeItem(SHOWN_KEY + ':data');
    sessionStorage.removeItem(DISMISSED_KEY);
  } catch (_) { /* best effort */ }
}
