import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBillingSummary, getCurrentPlan } from '../api/billingApi';

/**
 * AddShopModal — buy one extra shop and pay for it in a single action.
 *
 * Why this exists
 * ---------------
 * Adding a shop used to be a dead end. `PLAN_CAPS` in Branches.js was set to
 * Infinity for every tier, so the client never knew a limit existed: the owner
 * filled in the whole branch form, pressed save, and got a browser alert()
 * carrying the backend's 403. Nothing told them how to pay, and the page that
 * could take their money was three screens away — Billing → Add-ons →
 * subscribe → then hunt down the pending invoice and pay it separately.
 *
 * The backend flow was always sound: `subscribe_addon` creates a pending
 * invoice plus a pending TenantAddon and RETURNS the invoice_id, and the
 * webhook activates the add-on once it's paid. The invoice simply was never
 * handed to the payment step. This modal chains the two calls that already
 * exist, so "add a shop" is one button rather than a treasure hunt.
 *
 * Deliberately shows the NEW MONTHLY BILL, not just the charge. "$8" doesn't
 * tell an owner what they're committing to; "$25 → $33 a month" does.
 */

export default function AddShopModal({ open, onClose, currentShops, module = 'retail' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { data: summary } = useQuery({
    queryKey: ['billingSummary', module],
    queryFn: () => getBillingSummary(module),
    staleTime: 60000,
    enabled: open,
  });

  const { data: currentPlan } = useQuery({
    queryKey: ['currentPlanForAddon'],
    queryFn: getCurrentPlan,
    staleTime: 60000,
    enabled: open,
  });

  if (!open) return null;

  // Shapes below were read off the live API, not assumed:
  //   summary  → { module, billing_model, subscription, addons }
  //              NOTE: no `plan` and no `currency_symbol` at the top level, and
  //              `subscription` is null while a tenant is still trialing.
  //   addon    → { slug, name, price_monthly: "8.00", local: { currency_symbol } }
  //   plan     → current_plan → subscriptions[].plan_details.price_monthly ("25.00")
  // Prices arrive as STRINGS, hence Number() on each.
  const addons = summary?.addons || {};
  const currency = addons?.local?.currency_symbol
    || summary?.subscription?.local?.currency_symbol || '$';
  const money = (n) => `${currency}${Number(n || 0).toFixed(2)}`;

  // The plan price is NOT on the summary. Pull it from current_plan and match
  // the module. If we can't determine it we must not invent a total — telling
  // an owner their "new monthly bill" is $8 when they're on a $25 plan would be
  // a false statement about money.
  const subs = currentPlan?.subscriptions || [];
  const mySub = subs.find((s) => s.module === module) || null;
  const planPrice = Number(mySub?.plan_details?.price_monthly ?? 0);
  const planName = mySub?.plan_details?.name || mySub?.plan_name || null;
  const knowsPlanPrice = planPrice > 0;

  const shopsNow = Number(currentShops || 0);
  // Every tier is billed PER SHOP, so the new bill is the plan rate times the
  // new shop count — not plan + a flat add-on.
  const newBill = planPrice * (shopsNow + 1);

  // DO NOT sell the `retail-extra-shop` add-on here.
  //
  // Pricing changed in billing/0017: every tier is billed PER SHOP
  // ($10 Starter / $15 Growth / $25 Enterprise) and every tier may run as
  // many shops as it likes. That migration DEACTIVATED the extra-shop
  // add-on, and retail/views.py::_enforce_branch_cap no longer caps anyone.
  //
  // This modal used to call subscribeAddon('retail-extra-shop') — a retired
  // add-on — and then charge for it. Adding a shop costs nothing up front;
  // the shop is created immediately and the next invoice simply reflects the
  // new shop count. Selling an add-on for it would be charging twice.
  const handleBuy = async () => {
    setBusy(true);
    setError(null);
    try {
      onClose?.();          // caller can simply retry creating the branch
      return;
    } catch (err) {
      const data = err?.response?.data;
      setError(
        (typeof data === 'string' && data) ||
        data?.detail ||
        'Could not add the shop. Please try again.'
      );
      setBusy(false);
    }
  };

  const S = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    },
    card: {
      background: '#fff', borderRadius: 14, padding: 22,
      width: '100%', maxWidth: 360, boxSizing: 'border-box',
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    row: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' },
    muted: { color: '#6b7280' },
  };

  return (
    <div style={S.overlay} onClick={busy ? undefined : onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: '#111827' }}>
          Add a shop
        </h3>

        <div style={{ background: '#f9fafb', borderRadius: 9, padding: 13, marginBottom: 14 }}>
          <div style={S.row}>
            <span style={S.muted}>Shops</span>
            <span>{shopsNow} &rarr; <strong>{shopsNow + 1}</strong></span>
          </div>
          {knowsPlanPrice && (
            <div style={S.row}>
              <span style={S.muted}>{planName || 'Current plan'}</span>
              <span>{money(planPrice)} per shop</span>
            </div>
          )}
          {knowsPlanPrice && (
            <div style={{
              ...S.row, borderTop: '1px solid #e5e7eb', marginTop: 7,
              paddingTop: 9, fontSize: 14, fontWeight: 700,
            }}>
              <span>New monthly bill</span>
              <span>{money(newBill)}</span>
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: '#4b5563', margin: '0 0 14px', lineHeight: 1.5 }}>
          {knowsPlanPrice
            ? <>Nothing to pay now — the shop is added straight away. Your plan is billed
               per shop, so your next invoice becomes {money(newBill)} a month for
               {' '}{shopsNow + 1} shops.</>
            /* Still trialing, so `subscription` is null and we don't know the
               rate. Don't invent a total. */
            : <>Nothing to pay now — the shop is added straight away. Your plan is billed
               per shop, so your next invoice will cover {shopsNow + 1} shops.</>}
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: 8, padding: '9px 11px', fontSize: 12, marginBottom: 12,
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={busy}
          style={{
            width: '100%', padding: 13, borderRadius: 9, border: 'none',
            background: '#1a6b3a', color: '#fff', fontSize: 14, fontWeight: 700,
            fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1, marginBottom: 8,
          }}
        >
          {busy ? 'Adding…' : 'Add shop'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            width: '100%', padding: 9, borderRadius: 9, border: 'none',
            background: 'transparent', color: '#6b7280', fontSize: 12.5,
            fontWeight: 600, fontFamily: 'inherit',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
