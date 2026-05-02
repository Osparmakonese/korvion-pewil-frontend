/**
 * BackLink — one consistent back affordance for the whole app.
 *
 * Why this exists
 * ---------------
 * The app had ~5 different back-button shapes:
 *   - DemoBanner: "← Home" pill, white-on-orange
 *   - Login: "← Back to home" plain text
 *   - Register: "← Back to home" plain text
 *   - PrivacyPolicy/RefundPolicy: "Back to home" green link, no arrow
 *   - MobileCustomerDetail: "← Back" pill, white-on-green
 * User reported sometimes failing to find the back affordance because
 * each page placed and styled it differently.
 *
 * What this is
 * ------------
 * A single component that accepts:
 *   - `to` (default '/') — destination route
 *   - `label` (default 'Back to home')
 *   - `variant` ('subtle' | 'pill' — default 'pill')
 *   - extra style overrides via `style`
 *
 * Pill variant is a soft outlined chip that's findable at a glance on
 * any background. Subtle is a quiet text link for situations where a
 * pill would be visually heavy (e.g. inside a modal that already has
 * its own header chrome).
 *
 * If this component grows, keep the constraint: ONE component, ONE
 * shape per variant. Don't reintroduce per-page styling.
 */
import React from 'react';
import { Link } from 'react-router-dom';

const STYLES = {
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
  },
  subtle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#6b7280',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: 'transparent',
    border: 0,
    padding: 0,
  },
};

export default function BackLink({
  to = '/',
  label = 'Back to home',
  variant = 'pill',
  onClick,
  style,
  ariaLabel,
}) {
  const base = STYLES[variant] || STYLES.pill;
  // If `onClick` is supplied (e.g. logout-then-navigate from DemoBanner),
  // render as a plain Link; the click handler runs first, then react-router
  // navigates.
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel || label}
      style={{ ...base, ...(style || {}) }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>{'←'}</span>
      {label}
    </Link>
  );
}
