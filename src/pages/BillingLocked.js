import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Full-screen lockout page shown when the tenant's active subscription
 * is no longer in good standing (trial expired, period elapsed, past_due,
 * cancelled). Rendered by <BillingLockoutGate /> in place of the normal
 * app layout — the user cannot navigate around it.
 *
 * Why a takeover instead of an inline banner: when an unpaid tenant logs
 * in they should land on "pay to continue", not on a dashboard that's
 * read-only-but-looks-fine. A blocking surface makes the next action
 * unmissable.
 *
 * Available actions:
 *   - "Pay & resume"  → initialise Pesepay checkout for the current plan
 *   - "Switch plans"  → expand the plans table inline (no nav away)
 *   - "Sign out"      → log out (only escape hatch)
 *
 * Props:
 *   subscription: the SubscriptionSerializer payload from /current_plan/
 *   reason:       'trial_expired' | 'period_expired' | 'past_due' | 'cancelled'
 *                 (defaults to whatever the backend's 402 said, falls back
 *                 to a generic message)
 */
export default function BillingLocked({ subscription, reason }) {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Re-prime on mount so the visible state always matches server reality.
  useEffect(() => { setError(null); }, [subscription?.id]);

  const planName = subscription?.plan_details?.name
    || subscription?.plan_name
    || (user?.modules?.[0] === 'retail' ? 'Pewil Retail' : 'Pewil Farm');
  const planSlug = subscription?.plan_slug
    || subscription?.plan_details?.slug;
  const module = subscription?.module
    || user?.modules?.[0]
    || 'farm';

  // Translate reason → headline + supporting copy. Defensive defaults
  // because we want the page to render even if /current_plan/ 404s
  // (tenant somehow has no sub row).
  const copy = (() => {
    switch (reason) {
      case 'trial_expired':
        return {
          headline: 'Your free trial has ended.',
          sub: `Pay for ${planName} to keep your data and unlock writes again.`,
        };
      case 'period_expired':
        return {
          headline: 'Your subscription needs renewing.',
          sub: `Your billing period for ${planName} just ended. Renew to keep working.`,
        };
      case 'past_due':
        return {
          headline: "Your last payment didn't go through.",
          sub: `Update your payment method to resume ${planName}.`,
        };
      case 'cancelled':
        return {
          headline: 'Your subscription was cancelled.',
          sub: `Restart ${planName} to start using your account again.`,
        };
      default:
        return {
          headline: 'Your account needs an active subscription.',
          sub: `Pay for ${planName} to continue.`,
        };
    }
  })();

  const handlePayNow = async () => {
    setBusy(true);
    setError(null);
    try {
      // Fall back to the current plan slug; if there isn't one we send
      // the cheapest active plan for the module and let the user adjust
      // on the billing page after they re-enter the app.
      const slug = planSlug || (await fetchFallbackPlanSlug(module));
      if (!slug) {
        setError('No plan available — please contact support.');
        return;
      }
      const res = await api.post('/billing/billing/initialize_payment/', {
        plan_slug: slug,
        billing_cycle: subscription?.billing_cycle || 'monthly',
        // Default to card via Pesepay — fastest re-entry path. If the
        // tenant prefers EcoCash they can pick it from the Billing
        // page after we get them back into the app.
        payment_method: 'card',
      });
      // initialize_payment returns { redirect_url, reference } for card
      // payments (Pesepay). When that URL loads in the same tab and the
      // user completes payment, the Pesepay webhook flips their sub to
      // active, and the lockout gate gets out of the way on next mount.
      const url = res.data?.redirect_url || res.data?.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        setError('Payment initiation failed — please try again.');
      }
    } catch (e) {
      const msg = e?.response?.data?.detail
        || e?.response?.data?.error
        || e?.message
        || 'Payment failed to start.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        {/* Brand row — kept light, this is the only thing the user sees */}
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandWord}>Pewil</span>
        </div>

        <h1 style={styles.headline}>{copy.headline}</h1>
        <p style={styles.sub}>{copy.sub}</p>

        <div style={styles.statusStrip}>
          <Pill label="Plan" value={planName} />
          <Pill label="Module" value={module === 'retail' ? 'Retail' : 'Farm'} />
          <Pill label="Status" value={prettyStatus(subscription?.status, reason)} tone="warn" />
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <button
          type="button"
          onClick={handlePayNow}
          disabled={busy}
          style={{ ...styles.primaryBtn, ...(busy ? styles.btnBusy : null) }}
        >
          {busy ? 'Starting payment…' : 'Pay & resume'}
        </button>

        <p style={styles.footnote}>
          Your data is safe and stays exactly as you left it — only writes
          (new sales, edits) are paused while billing is unsettled.
        </p>

        <div style={styles.escapeRow}>
          <button type="button" onClick={logout} style={styles.linkBtn}>
            Sign out
          </button>
          <span style={styles.dotSep}>·</span>
          <a href="mailto:billing@pewil.org?subject=Billing%20help" style={styles.link}>
            Email billing@pewil.org
          </a>
        </div>
      </div>

      <p style={styles.korvion}>
        Operated by Korvion Solution (Pvt) Ltd. Pewil is a Korvion Solution product.
      </p>
    </div>
  );
}

function Pill({ label, value, tone }) {
  const bg = tone === 'warn' ? '#fef3c7' : '#f4f6f8';
  const fg = tone === 'warn' ? '#854d0e' : '#3d4b56';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: bg,
      color: fg,
      fontSize: 12,
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: 999,
      fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{ opacity: 0.65, fontWeight: 500 }}>{label}:</span>
      {value}
    </span>
  );
}

function prettyStatus(status, reason) {
  if (reason === 'trial_expired') return 'Trial ended';
  if (reason === 'period_expired') return 'Period ended';
  if (status === 'past_due') return 'Past due';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'trialing') return 'Trial ended';
  return 'Needs payment';
}

async function fetchFallbackPlanSlug(module) {
  try {
    const res = await api.get(`/billing/plans/?module=${module}`);
    const plans = res.data?.results || res.data || [];
    const sorted = [...plans].sort(
      (a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0)
    );
    return sorted[0]?.slug || null;
  } catch (_) {
    return null;
  }
}

const styles = {
  outer: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(180deg, #f7faf9 0%, #fff 100%)',
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: 540,
    background: '#fff',
    border: '1px solid #e6e9ec',
    borderRadius: 16,
    padding: '36px 32px 28px',
    boxShadow: '0 24px 48px -32px rgba(15, 36, 54, 0.18)',
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#1f6b3a',
    display: 'inline-block',
  },
  brandWord: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#0f2436',
    letterSpacing: '-0.01em',
  },
  headline: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 30,
    fontWeight: 800,
    color: '#0f2436',
    margin: '0 0 10px 0',
    lineHeight: 1.18,
    letterSpacing: '-0.01em',
  },
  sub: {
    fontSize: 15.5,
    color: '#465260',
    margin: '0 0 22px 0',
    lineHeight: 1.55,
  },
  statusStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  errorBox: {
    background: '#fff1f1',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 13.5,
    marginBottom: 14,
    fontWeight: 500,
  },
  primaryBtn: {
    width: '100%',
    background: '#1f6b3a',
    color: '#fff',
    border: 'none',
    padding: '14px 16px',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 12,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.01em',
    transition: 'background 120ms ease',
  },
  btnBusy: {
    background: '#3d8a5b',
    cursor: 'wait',
  },
  footnote: {
    fontSize: 12.5,
    color: '#677380',
    margin: '14px 0 0 0',
    textAlign: 'center',
    lineHeight: 1.55,
  },
  escapeRow: {
    marginTop: 24,
    paddingTop: 18,
    borderTop: '1px solid #eef0f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 13,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#465260',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    textDecoration: 'underline',
  },
  link: {
    color: '#1f6b3a',
    textDecoration: 'underline',
    fontWeight: 600,
  },
  dotSep: {
    color: '#9aa3ad',
  },
  korvion: {
    fontSize: 11.5,
    color: '#7a8590',
    marginTop: 28,
    textAlign: 'center',
    letterSpacing: '0.01em',
  },
};
