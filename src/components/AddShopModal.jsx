import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscribeAddon, initializePayment, getBillingSummary } from '../api/billingApi';

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

const SHOP_ADDON_SLUG = 'retail-extra-shop';

export default function AddShopModal({ open, onClose, currentShops, module = 'retail' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { data: summary } = useQuery({
    queryKey: ['billingSummary', module],
    queryFn: () => getBillingSummary(module),
    staleTime: 60000,
    enabled: open,
  });

  if (!open) return null;

  const addons = summary?.addons || {};
  const catalogue = addons.available || [];
  const shopAddon = catalogue.find((a) => (a.slug || a.addon?.slug) === SHOP_ADDON_SLUG) || null;

  // Fall back to the seeded price if the catalogue hasn't loaded — better a
  // correct-looking number than a blank while the request is in flight.
  const addonPrice = Number(shopAddon?.price_monthly ?? 8);
  const planPrice = Number(summary?.plan?.price_monthly ?? 0);
  const currency = summary?.currency_symbol || '$';
  const money = (n) => `${currency}${Number(n || 0).toFixed(2)}`;

  const newBill = planPrice + addonPrice;
  const shopsNow = Number(currentShops || 0);

  const handleBuy = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Create the pending add-on + its invoice.
      const sub = await subscribeAddon(SHOP_ADDON_SLUG);
      const invoiceId = sub?.invoice_id || sub?.invoice?.id;
      if (!invoiceId) {
        // The add-on may already be pending from an abandoned attempt — send
        // them to Billing rather than silently doing nothing.
        setError('Your shop add-on is set up but needs paying. Open Billing to complete it.');
        setBusy(false);
        return;
      }
      // 2. Pay it immediately — no hunting for an invoice.
      const pay = await initializePayment({ invoice_id: invoiceId });
      if (pay?.redirect_url) {
        window.location.href = pay.redirect_url;
        return;
      }
      if (pay?.instructions) {
        // Local rail not live (e.g. Zambia before Lenco) — manual collection.
        setError(pay.instructions);
        setBusy(false);
        return;
      }
      setError('Could not start the payment. Please try again from Billing.');
      setBusy(false);
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
          {planPrice > 0 && (
            <div style={S.row}>
              <span style={S.muted}>{summary?.plan?.name || 'Current plan'}</span>
              <span>{money(planPrice)}</span>
            </div>
          )}
          <div style={S.row}>
            <span style={S.muted}>Extra shop &times; 1</span>
            <span>{money(addonPrice)}</span>
          </div>
          <div style={{
            ...S.row, borderTop: '1px solid #e5e7eb', marginTop: 7,
            paddingTop: 9, fontSize: 14, fontWeight: 700,
          }}>
            <span>New monthly bill</span>
            <span>{money(newBill)}</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#4b5563', margin: '0 0 14px', lineHeight: 1.5 }}>
          You{'’'}ll pay {money(addonPrice)} now to activate it. Your shop limit rises as
          soon as the payment clears.
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
          {busy ? 'Starting payment…' : `Pay ${money(addonPrice)} and add shop`}
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
