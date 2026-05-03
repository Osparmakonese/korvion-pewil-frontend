import damImg from '../assets/images/dam.jpeg';
import tomatoImg from '../assets/images/Tomato.jpeg';
import tobaccoImg from '../assets/images/Tobacco_field.webp';
import maizeImg from '../assets/images/maize.jpeg';
import truckImg from '../assets/images/truck_with_crates.webp';
import workersImg from '../assets/images/workers.jpg';
import costImg from '../assets/images/cost.png';
import reportImg from '../assets/images/finacial_report.jpeg';
import hoursImg from '../assets/images/hours_and_pay.png';
import stockImg from '../assets/images/stock.jpg';
import teaImg from '../assets/images/tanganda-tea-farm-golden-hour-260nw-2470209317.jpg';

export const IMAGES = { dam: damImg, tomato: tomatoImg, tobacco: tobaccoImg, maize: maizeImg, truck: truckImg, workers: workersImg, cost: costImg, report: reportImg, hours: hoursImg, stock: stockImg, tea: teaImg };

/**
 * Hero images for the Dashboard — module-aware, tenant-neutral.
 * Sourced from Unsplash's free CDN. Each URL is fronted by a stable photo ID
 * and requests a 1600-wide variant — safe for hero banners. If a photo is
 * ever deprecated swap the ID here; no other file changes needed.
 */
export const HERO_IMAGES = {
  // Green farmland at golden hour — neutral, not tied to any region
  farm: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&q=80&auto=format&fit=crop',
  // Bright, clean retail shop interior with stocked shelves
  retail: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1600&q=80&auto=format&fit=crop',
  // Fallback / neutral sunrise landscape for tenants with both modules
  neutral: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=80&auto=format&fit=crop',
  // Market-trip / logistics banner replacement
  logistics: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80&auto=format&fit=crop',
  // Generic water / irrigation banner replacement
  water: 'https://images.unsplash.com/photo-1589995186011-a7b485edc4bf?w=1200&q=80&auto=format&fit=crop',
};

/**
 * Pick the right hero image for the current module.
 * Falls back to the neutral landscape if the caller passes something unknown.
 */
export function getHeroImage(activeModule) {
  if (activeModule === 'retail') return HERO_IMAGES.retail;
  if (activeModule === 'farm') return HERO_IMAGES.farm;
  return HERO_IMAGES.neutral;
}

export function cropImage(crop) {
  const c = (crop || '').toLowerCase();
  if (c.includes('tomato')) return tomatoImg;
  if (c.includes('tobacco')) return tobaccoImg;
  if (c.includes('maize') || c.includes('corn')) return maizeImg;
  return teaImg;
}

/**
 * Currency table for the 14-country Pewil rollout (May 2026).
 *
 * Each entry has:
 *   - symbol: short prefix shown on receipts and tiles (e.g. R, ₦, KSh)
 *   - intl_code: ISO-4217 code Intl.NumberFormat understands; used for
 *     locale-aware number formatting (decimal separator, grouping).
 *   - decimals: how many fraction digits the currency conventionally uses
 *     in retail. Most are 2; UGX, RWF, MWK, XOF, ETB are typically 0.
 *
 * The legacy 'zwd' shortcut (Pewil's USD-or-ZiG dual-currency code) is
 * preserved so existing call sites (`fmt(n, 'zwd')`) keep working —
 * see the dispatch in fmt() below.
 */
const CURRENCIES = {
  USD: { symbol: '$',     intl_code: 'USD', decimals: 2 },
  ZWG: { symbol: 'ZiG ',  intl_code: 'USD', decimals: 2 },   // ZiG → USD-formatted with prefix
  ZAR: { symbol: 'R ',    intl_code: 'ZAR', decimals: 2 },
  KES: { symbol: 'KSh ',  intl_code: 'KES', decimals: 2 },
  NGN: { symbol: '₦ ', intl_code: 'NGN', decimals: 2 }, // ₦
  ZMW: { symbol: 'K ',    intl_code: 'ZMW', decimals: 2 },
  MZN: { symbol: 'MT ',   intl_code: 'MZN', decimals: 2 },
  TZS: { symbol: 'TSh ',  intl_code: 'TZS', decimals: 0 },
  UGX: { symbol: 'USh ',  intl_code: 'UGX', decimals: 0 },
  MWK: { symbol: 'MK ',   intl_code: 'MWK', decimals: 0 },
  BWP: { symbol: 'P ',    intl_code: 'BWP', decimals: 2 },
  RWF: { symbol: 'FRw ',  intl_code: 'RWF', decimals: 0 },
  ETB: { symbol: 'Br ',   intl_code: 'ETB', decimals: 2 },
  GHS: { symbol: '₵ ', intl_code: 'GHS', decimals: 2 }, // ₵
  XOF: { symbol: 'CFA ',  intl_code: 'XOF', decimals: 0 },
  EUR: { symbol: '€',  intl_code: 'EUR', decimals: 2 },
  GBP: { symbol: '£',  intl_code: 'GBP', decimals: 2 },
};

/**
 * Format number as currency.
 *
 * Reads preferred currency from explicit arg → localStorage → 'USD'.
 * The legacy 'zwd' code maps to whatever's in localStorage (Pewil
 * stores the tenant currency at login under 'currency').
 *
 * Renders with the right number of decimal places per currency
 * convention (e.g. UGX has none, USD has two).
 */
export function fmt(n, currency) {
  if (n == null || isNaN(n)) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  let cur = currency || localStorage.getItem('currency') || 'USD';
  if (cur === 'zwd') {
    // Legacy Pewil-internal alias: "the tenant's display currency".
    cur = localStorage.getItem('currency') || 'USD';
  }
  cur = String(cur).toUpperCase();
  const meta = CURRENCIES[cur] || CURRENCIES.USD;
  let formatted;
  try {
    formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(num);
  } catch (_) {
    formatted = num.toFixed(meta.decimals);
  }
  return meta.symbol + formatted;
}

/**
 * Currency code → human label. Used by FiscalSettings + TaxConfig pages.
 */
export function currencyLabel(code) {
  const c = String(code || '').toUpperCase();
  const meta = CURRENCIES[c];
  if (!meta) return c;
  return `${c} (${meta.symbol.trim()})`;
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES);

/**
 * Format a quantity — strips trailing zeros.
 * qty(4.000) → "4", qty(3.500) → "3.5", qty(0.250) → "0.25"
 */
export function qty(n) {
  if (n == null || isNaN(n)) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return num.toString();
}

/** Today as YYYY-MM-DD */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Crop emoji lookup */
export function cropEmoji(crop) {
  const map = {
    tomatoes: '🍅',
    maize: '🌽',
    tobacco: '🌿',
    vegetables: '🥬',
    other: '🌱',
  };
  return map[(crop || '').toLowerCase()] || '🌱';
}

/** Initials from name (max 2 chars) */
export function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/** Avatar color palette */
export const avatarColors = [
  { bg: '#1a6b3a', text: '#ffffff' },
  { bg: '#0369a1', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#c97d1a', text: '#ffffff' },
  { bg: '#c0392b', text: '#ffffff' },
  { bg: '#374151', text: '#ffffff' },
];

export function avatarColor(name) {
  const idx = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[idx];
}

/** Crop background gradients */
export function cropGradient(crop) {
  const map = {
    tomatoes: 'linear-gradient(135deg, #1a6b3a 0%, #2d9e58 100%)',
    tobacco: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    maize: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    vegetables: 'linear-gradient(135deg, #1a6b3a 0%, #2d9e58 100%)',
  };
  return map[(crop || '').toLowerCase()] || 'linear-gradient(135deg, #1a6b3a 0%, #2d9e58 100%)';
}
