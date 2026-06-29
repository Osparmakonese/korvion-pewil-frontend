/**
 * Country localisation — so the app speaks each tenant's local terms.
 *
 * The backend sends a `localization` block on the tenant (currency symbol,
 * fiscal authority, mobile-money provider names, tax labels). We cache it and
 * expose a synchronous getter so any component can render the right words —
 * e.g. a Zambian shop sees "K / ZRA Smart Invoice / MTN MoMo" instead of
 * "$ / ZIMRA / EcoCash".
 */

const KEY = 'pewil_localization';

// Zimbabwe defaults — used until the tenant's block has loaded.
const DEFAULT = {
  country: 'ZW',
  country_name: 'Zimbabwe',
  currency: 'USD',
  currency_symbol: '$',
  tax_label: 'VAT',
  tax_id_label: 'BPN',
  authority_name: 'Zimbabwe Revenue Authority (ZIMRA)',
  authority_short: 'ZIMRA',
  authority_url: 'https://www.zimra.co.zw',
  fiscal_system: 'ZIMRA FDMS',
  mobile_money: ['EcoCash', 'OneMoney'],
  is_realtime: true,
};

export function setLocalization(loc) {
  if (loc && typeof loc === 'object' && loc.country) {
    try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch (e) { /* ignore */ }
  }
}

export function getLocalization() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return DEFAULT;
}

/** First (primary) mobile-money provider name, e.g. "MTN MoMo" / "EcoCash". */
export function momoPrimary() {
  const l = getLocalization();
  return (l.mobile_money && l.mobile_money[0]) || 'Mobile Money';
}

/** A short combined label for the mobile-money tender, e.g. "MTN MoMo / Airtel". */
export function momoLabel() {
  const l = getLocalization();
  const m = l.mobile_money || [];
  if (m.length === 0) return 'Mobile Money';
  if (m.length === 1) return m[0];
  return `${m[0]} / ${m[1].replace(' Money', '').replace(' MoMo', '')}`;
}

/** The fiscal-system name, e.g. "ZRA Smart Invoice" / "ZIMRA FDMS". */
export function fiscalSystem() {
  return getLocalization().fiscal_system;
}

export default getLocalization;
