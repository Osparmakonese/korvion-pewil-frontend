import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { initials, avatarColor } from '../utils/format';
import { listBranches, listFuelTanks } from '../api/retailApi';
import Logo from './Logo';

// localStorage key for persisting per-section expand/collapse state.
// One blob per user so tabs on different accounts don't fight.
const EXPAND_STATE_KEY = 'pewil-sidebar-expanded-v1';

function loadExpandedState() {
  try {
    const raw = window.localStorage.getItem(EXPAND_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

function saveExpandedState(state) {
  try {
    window.localStorage.setItem(EXPAND_STATE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage disabled — fall through silently */
  }
}

/* ─── Design 3 — Living Africa tokens ─── */
const TOKENS = {
  amber: '#f4a743', terra: '#d9562c', forest: '#1f3d26', forest2: '#2d5a37',
  sand: '#fff7ec', sand2: '#fdeedd', cream: '#fffcf7',
  ink: '#1b1b1b', muted: '#6b5d50',
  line: 'rgba(27,27,27,.10)', line2: 'rgba(27,27,27,.06)',
  danger: '#b1291b',
};
const SANS = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

const S = {
  sidebar: {
    position: 'fixed', top: 0, left: 0, width: 220, height: '100vh',
    background: TOKENS.cream, borderRight: `1px solid ${TOKENS.line}`,
    display: 'flex', flexDirection: 'column', zIndex: 60,
    fontFamily: SANS,
  },
  brand: {
    padding: '16px 14px 12px', borderBottom: `1px solid ${TOKENS.line}`,
    display: 'flex', alignItems: 'center', gap: 10,
  },
  /* Tenant switcher */
  tsw: {
    margin: '8px 8px 4px', padding: '9px 11px',
    border: `1px solid ${TOKENS.line}`, borderRadius: 10,
    background: '#fff',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  tswName: { fontWeight: 700, fontSize: 12, color: TOKENS.ink },
  tswPlan: { fontSize: 9, color: TOKENS.muted, marginTop: 1 },
  tswLabel: { fontSize: 8, color: TOKENS.forest, fontWeight: 600, marginTop: 2 },
  /* Tenant dropdown */
  tdd: (open) => ({
    display: open ? 'block' : 'none',
    position: 'absolute', left: 8, top: 118, width: 204,
    background: '#fff', border: `1px solid ${TOKENS.line}`, borderRadius: 12,
    boxShadow: '0 12px 28px rgba(27,27,27,0.10)', zIndex: 200, overflow: 'hidden',
  }),
  tdo: (active) => ({
    padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s',
    borderBottom: `1px solid ${TOKENS.line2}`,
    background: active ? TOKENS.sand : 'transparent',
    borderLeft: active ? `3px solid ${TOKENS.terra}` : '3px solid transparent',
  }),
  tdoName: { fontWeight: 600, fontSize: 11, color: TOKENS.ink },
  tdoType: { fontSize: 9, color: TOKENS.muted },
  nav: { flex: 1, overflowY: 'auto', padding: '4px 8px' },
  sectionGroup: { marginBottom: 2, paddingBottom: 2 },
  sectionDivider: { height: 1, background: TOKENS.line2, margin: '4px 10px' },
  sectionHeader: (isCollapsible) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 10px 3px', cursor: isCollapsible ? 'pointer' : 'default',
    userSelect: 'none', borderRadius: 4, transition: 'background 0.15s',
    fontSize: 8, fontWeight: 700, color: TOKENS.muted, textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }),
  sectionChevron: (expanded) => ({
    fontSize: 10, color: TOKENS.muted, transition: 'transform 0.2s',
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
  }),
  sectionCount: {
    fontSize: 8, fontWeight: 600, color: '#fff', background: TOKENS.muted,
    borderRadius: 8, padding: '1px 5px', marginLeft: 4, minWidth: 14,
    textAlign: 'center', lineHeight: '14px',
  },
  sectionActiveDot: {
    width: 6, height: 6, borderRadius: '50%', background: TOKENS.terra, marginLeft: 4,
  },
  sectionItems: (expanded) => ({
    overflow: 'hidden', maxHeight: expanded ? 500 : 0,
    transition: 'max-height 0.25s ease-in-out', opacity: expanded ? 1 : 0,
  }),
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 10px', borderRadius: 8, fontSize: 11,
    fontWeight: active ? 700 : 500, cursor: 'pointer',
    background: active ? TOKENS.sand : 'transparent',
    color: active ? TOKENS.forest : TOKENS.ink,
    transition: 'all 0.15s', border: 'none', width: '100%', textAlign: 'left',
    position: 'relative', fontFamily: 'inherit', margin: '1px 0',
    borderLeft: active ? `3px solid ${TOKENS.terra}` : '3px solid transparent',
  }),
  navEmoji: { width: 16, textAlign: 'center', fontSize: 13 },
  badge: {
    position: 'absolute', right: 8, background: TOKENS.terra, color: '#fff',
    fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
    animation: 'badgePulse 2s infinite',
  },
  userSection: {
    borderTop: `1px solid ${TOKENS.line}`, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  avatar: (bg) => ({
    width: 30, height: 30, borderRadius: '50%', background: bg,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  }),
  userName: { fontSize: 11, fontWeight: 600, color: TOKENS.ink },
  userRole: { fontSize: 9, color: TOKENS.muted, textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none', border: 'none', color: TOKENS.muted, cursor: 'pointer',
    fontSize: 16, padding: 4, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s',
  },
};

export const NAV_ITEMS = [
  { section: 'MAIN', collapsible: false, items: [
    { key: 'Dashboard', emoji: '\u{1F4CA}', label: 'Dashboard' },
    { key: 'Fields', emoji: '\u{1F33E}', label: 'Fields' },
    { key: 'Sales & Market', emoji: '\u{1F69A}', label: 'Sales & Market' },
    { key: 'Costs', emoji: '\u{1F4B8}', label: 'Costs' },
    { key: 'Farm Assets', emoji: '\u{1F3D7}', label: 'Farm Assets' },
    { key: 'Stock', emoji: '\u{1F4E6}', label: 'Stock', showBadge: true },
  ]},
  { section: 'LIVESTOCK', collapsible: true, items: [
    { key: 'Cattle', emoji: '\u{1F404}', label: 'Cattle' },
    { key: 'Goats', emoji: '\u{1F410}', label: 'Goats' },
    { key: 'Sheep', emoji: '\u{1F411}', label: 'Sheep' },
    { key: 'Pigs', emoji: '\u{1F437}', label: 'Pigs' },
    { key: 'Broilers', emoji: '\u{1F414}', label: 'Broilers' },
    { key: 'Layers', emoji: '\u{1F95A}', label: 'Layers' },
  ]},
  { section: 'ECONOMICS', collapsible: true, items: [
    { key: 'Harvest', emoji: '\u{1F33E}', label: 'Harvest' },
    { key: 'Budget', emoji: '\u{1F4CB}', label: 'Budget' },
    { key: 'Water', emoji: '\u{1F4A7}', label: 'Water' },
    { key: 'Loans', emoji: '\u{1F3E6}', label: 'Loans' },
    { key: 'Market Prices', emoji: '\u{1F4CA}', label: 'Market Prices' },
    { key: 'Economics', emoji: '\u{1F4C8}', label: 'Economics' },
  ]},
  { section: 'PEOPLE', collapsible: false, items: [
    { key: 'Workers', emoji: '\u{1F477}', label: 'Workers' },
    { key: 'Hours & Pay', emoji: '\u23F1', label: 'Hours & Pay' },
  ]},
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // RETAIL \u2014 sidebar redesign 2026-05-19. Eleven sections collapsed
  // to six themed groups so a tenant doesn't see a wall of nav on
  // first load. Section keys: MAIN, DAILY, STOCK, OPERATIONS,
  // MONEY & INSIGHTS, LOSS PREVENTION, SETUP. Everything except DAILY
  // is collapsible (and collapsed by default \u2014 open state persists in
  // localStorage). OPERATIONS only renders when the tenant has
  // multi-branch OR fuel (signalled via showWhen \u2014 see render below).
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { section: 'MAIN', module: 'retail', collapsible: false, items: [
    { key: 'Retail', emoji: '\u{1F4CA}', label: 'Dashboard' },
  ]},
  { section: 'DAILY', module: 'retail', collapsible: false, items: [
    { key: 'POS', emoji: '\u{1F6D2}', label: 'Point of Sale' },
    { key: 'Products', emoji: '\u{1F3F7}\uFE0F', label: 'Products' },
    { key: 'Customers', emoji: '\u{1F465}', label: 'Customers' },
    { key: 'Sales History', emoji: '\u{1F4CB}', label: 'Sales History' },
    { key: 'Cashier Sessions', emoji: '\u{1F4B5}', label: 'Sessions' },
    { key: 'Returns', emoji: '\u{1F504}', label: 'Returns & Refunds' },
    { key: 'Layby', emoji: '\u{1F4E5}', label: 'Layby', feature: 'layby' },
    { key: 'Discounts', emoji: '\u{1F3F7}\uFE0F', label: 'Discounts' },
  ]},
  // OPERATIONS — multi-branch + forecourt. Two "entry-point" items
  // (Branches and Forecourt) are ALWAYS visible for retail tenants
  // so the user can reach the setup flow without a chicken-and-egg
  // (can't reach Branches because no 2nd branch exists; can't reach
  // Forecourt because no tank exists). Downstream items (Stock
  // Transfers, Chain Rollup, Tanks, Grades, etc.) stay gated so they
  // don't clutter the sidebar for tenants who don't use them.
  // Fuel items are gated by the tenant's business type (feature keys), not by
  // "does a tank exist yet" — so fuel tools never appear for non-fuel shops.
  { section: 'OPERATIONS', module: 'retail', collapsible: true, items: [
    { key: 'Branches', emoji: '\u{1F3EA}', label: 'Branches', ownerOnly: true },
    { key: 'Stock Transfers', emoji: '\u{1F4E6}', label: 'Stock Transfers', showWhen: 'multibranch' },
    { key: 'Chain Rollup', emoji: '\u{1F30D}', label: 'Chain Rollup', ownerOnly: true, showWhen: 'multibranch' },
    { key: 'Forecourt', emoji: '⛽', label: 'Forecourt', feature: 'fuel_forecourt' },
    { key: 'Fuel Tanks', emoji: '\u{1F6E2}️', label: 'Tanks', feature: 'fuel_tanks' },
    { key: 'Fuel Grades', emoji: '\u{1F539}', label: 'Grades', feature: 'fuel_tanks' },
    { key: 'Fuel Deliveries', emoji: '\u{1F69B}', label: 'Deliveries', feature: 'fuel_deliveries' },
    { key: 'Dip Readings', emoji: '\u{1F4CF}', label: 'Dip Log', feature: 'fuel_dips' },
    { key: 'Fleet Cards', emoji: '\u{1F4B3}', label: 'Fleet Cards', feature: 'fleet_cards' },
    { key: 'Regulator Returns', emoji: '\u{1F4DC}', label: 'Regulator Returns', ownerOnly: true, feature: 'regulator_returns' },
  ]},
  // Pharmacy vertical — only shows for pharmacy business type (feature-gated).
  { section: 'PHARMACY', module: 'retail', collapsible: true, items: [
    { key: 'Batches', emoji: '\u{1F4E6}', label: 'Batches & Expiry', feature: 'batch_tracking' },
    { key: 'Prescriptions', emoji: '\u{1F48A}', label: 'Prescriptions', feature: 'prescriptions' },
    { key: 'Controlled Register', emoji: '\u{1F512}', label: 'Controlled Register', ownerOnly: true, feature: 'controlled_substances' },
  ]},
  // Restaurant vertical — only shows for restaurant business type (feature-gated).
  { section: 'RESTAURANT', module: 'retail', collapsible: true, items: [
    { key: 'Tables', emoji: '\u{1F37D}️', label: 'Tables', feature: 'tables' },
    { key: 'Kitchen', emoji: '\u{1F373}', label: 'Kitchen', feature: 'kitchen_orders' },
    { key: 'Modifiers', emoji: '➕', label: 'Modifiers', feature: 'modifiers' },
  ]},
  // Liquor / bottle store (Phase 3).
  { section: 'LIQUOR', module: 'retail', collapsible: true, items: [
    { key: 'Excise', emoji: '\u{1F37E}', label: 'Excise Returns', ownerOnly: true, feature: 'excise_notes' },
  ]},
  // Hardware / building supplies (Phase 3).
  { section: 'HARDWARE', module: 'retail', collapsible: true, items: [
    { key: 'Quotations', emoji: '\u{1F4DD}', label: 'Quotations', feature: 'quotations' },
    { key: 'Bulk Units', emoji: '\u{1F4E6}', label: 'Bulk / Pack Units', feature: 'bulk_units' },
  ]},
  // Wholesale / distributor (Phase 3).
  { section: 'WHOLESALE', module: 'retail', collapsible: true, items: [
    { key: 'Price Tiers', emoji: '\u{1F4CA}', label: 'Volume Pricing', feature: 'price_tiers' },
    { key: 'Credit Accounts', emoji: '\u{1F9FE}', label: 'Credit Accounts', feature: 'credit_accounts' },
  ]},
  // Electronics / phones (Phase 3).
  { section: 'ELECTRONICS', module: 'retail', collapsible: true, items: [
    { key: 'Serials', emoji: '\u{1F516}', label: 'Serial / IMEI', feature: 'serial_tracking' },
    { key: 'Warranties', emoji: '\u{1F6E1}️', label: 'Warranties', feature: 'warranty' },
  ]},
  // Payments — mobile money + change wallet (every retail tenant).
  { section: 'PAYMENTS', module: 'retail', collapsible: true, items: [
    { key: 'Mobile Money', emoji: '\u{1F4F2}', label: 'Mobile Money', feature: 'mobile_money' },
    { key: 'Wallets', emoji: '\u{1F45B}', label: 'Customer Wallets', feature: 'change_wallet' },
    { key: 'Vending', emoji: '\u{1F4F6}', label: 'Vending (airtime/ZESA)', feature: 'vending' },
    { key: 'Reconciliation', emoji: '\u{1F9FE}', label: 'Reconciliation', ownerOnly: true, feature: 'mobile_money' },
    { key: 'Payment Setup', emoji: '\u{1F517}', label: 'Payment Setup', ownerOnly: true, feature: 'mobile_money' },
    { key: 'Vending Setup', emoji: '\u{1F50C}', label: 'Vending Setup', ownerOnly: true, feature: 'vending' },
  ]},
  { section: 'STOCK', module: 'retail', collapsible: true, items: [
    { key: 'Categories', emoji: '\u{1F5C2}', label: 'Categories' },
    { key: 'Suppliers', emoji: '\u{1F4E6}', label: 'Suppliers & POs' },
    { key: 'WhatsApp PO', emoji: '\u{1F4AC}', label: 'WhatsApp PO' },
    { key: 'Stock Adjustments', emoji: '\u{1F504}', label: 'Stock Adjustments' },
    { key: 'Stocktake', emoji: '\u{1F4CB}', label: 'Stocktake', feature: 'stocktake' },
    { key: 'Goods Received', emoji: '\u{1F4E5}', label: 'Goods Received (GRV)' },
    { key: 'Low Stock Alerts', emoji: '\u{1F6A8}', label: 'Low Stock Alerts' },
    { key: 'Barcode Labels', emoji: '\u{1F4CF}', label: 'Barcode & Labels' },
  ]},
  { section: 'MONEY & INSIGHTS', module: 'retail', collapsible: true, items: [
    { key: 'End of Day', emoji: '\u{1F4C4}', label: 'End of Day' },
    { key: 'Retail Report', emoji: '\u{1F4CA}', label: 'Reports', ownerOnly: true },
    { key: 'Financial Reports', emoji: '\u{1F9FE}', label: 'Financial Reports', ownerOnly: true, feature: 'financials' },
    { key: 'Recurring Invoices', emoji: '\u{1F501}', label: 'Recurring Invoices', feature: 'recurring_billing' },
    { key: 'Profit Margins', emoji: '\u{1F4C8}', label: 'Profit Margins', ownerOnly: true },
    { key: 'Journal Entries', emoji: '\u{1F4D2}', label: 'Journal Entries' },
    { key: 'Retail Payroll', emoji: '\u{1F4B0}', label: 'Payroll' },
    { key: 'Customer Loyalty', emoji: '⭐', label: 'Loyalty' },
    { key: 'Cashier Performance', emoji: '\u{1F3C6}', label: 'Cashier Performance' },
  ]},
  { section: 'LOSS PREVENTION', module: 'retail', collapsible: true, items: [
    { key: 'Loss Prevention', emoji: '\u{1F6E1}\uFE0F', label: 'LP Dashboard' },
    { key: 'Theft Scan', emoji: '\u{1F50D}', label: 'Theft Scan', ownerOnly: true },
    { key: 'Price Drift', emoji: '\u{1F4B0}', label: 'Price Drift', ownerOnly: true },
  ]},
  // MARKETING items moved to MONEY & INSIGHTS in the 2026-05-19 redesign.
  // Retail SYSTEM section is intentionally minimal — everything that used to
  // live here as a dedicated sidebar entry (Device Config, ZIMRA Fiscal,
  // Multi-Currency, Receipt Setup, POS Settings, Manager PIN, Tax Config) now
  // lives as a sub-tab inside the Retail Settings page. This keeps the retail
  // sidebar focused on daily operations rather than configuration plumbing.
  { section: 'SETUP', module: 'retail', collapsible: true, items: [
    { key: 'Retail Settings', emoji: '\u2699\uFE0F', label: 'Settings' },
    // Tax Compliance \u2014 country-aware fiscal credentials grid.
    // Promoted to the sidebar (rather than a sub-tab inside Retail Settings)
    // because investors / owners hit it from day one when onboarding their
    // tax-authority credentials. Owners + managers only.
    { key: 'Tax Compliance', emoji: '\u{1F4CB}', label: 'Tax Compliance' },
    { key: 'Retail Billing', emoji: '\u{1F4B3}', label: 'Billing' },
  ]},
  { section: 'OWNER ONLY', module: 'farm', ownerOnly: true, collapsible: false, items: [
    { key: 'Report', emoji: '\u{1F4C8}', label: 'Report' },
    { key: 'Team', emoji: '\u{1F465}', label: 'Team' },
    { key: 'Billing', emoji: '\u{1F4B3}', label: 'Billing' },
    { key: 'Data Export', emoji: '\u{1F4E4}', label: 'Data Export' },
    { key: 'Audit Log', emoji: '\u{1F4DC}', label: 'Audit Log' },
    { key: 'Settings', emoji: '\u2699\uFE0F', label: 'Settings' },
    { key: 'Import', emoji: '\u{1F4E5}', label: 'Import' },
  ]},
  // Super Admin section — gated on user.is_super_admin (not just owner).
  // The Plan Simulator shows every plan tier for dev/investor preview.
  { section: 'SUPER ADMIN', module: 'any', superOnly: true, collapsible: false, items: [
    { key: 'Platform', emoji: '\u{1F4C8}', label: 'Platform Analytics' },
    { key: 'Partners', emoji: '\u{1F91D}', label: 'Partners' },
    { key: 'Plan Simulator', emoji: '\u{1F9EA}', label: 'Plan Simulator' },
  ]},
  // Admin Panel is cross-module. Available to owners in either module.
  { section: 'ADMINISTRATION', module: 'any', ownerOnly: true, collapsible: false, items: [
    { key: 'Admin Panel', emoji: '\u{1F6E1}', label: 'Team & Access' },
  ]},
  // Help is available to everyone in any module
  { section: 'SUPPORT', module: 'any', collapsible: false, items: [
    { key: 'Help', emoji: '\u2753', label: 'Help & Support' },
  ]},
];

export default function Sidebar({ activeTab, onTabChange, user, onLogout, lowStockCount = 0 }) {
  const role = user?.role || 'worker';
  const isSuperAdmin = !!user?.is_super_admin;
  const ac = avatarColor(user?.username || '');
  // Expand state is persisted to localStorage so a returning user sees
  // the sidebar in the same shape they left it. Default: everything
  // collapsed except MAIN + DAILY, which are non-collapsible anyway.
  const [expanded, setExpanded] = useState(() => loadExpandedState());

  // Get tenant info from JWT stored in localStorage
  const tenantName = user?.tenant_name || 'Pewil';
  const tenantPlan = user?.plan || 'free';
  const planLabel = tenantPlan.charAt(0).toUpperCase() + tenantPlan.slice(1) + ' Plan';
  // SINGLE-MODULE RULE (April 2026): every tenant runs exactly one module.
  const modules = user?.modules || ['farm'];
  const tenantModule = (modules[0] === 'retail') ? 'retail' : 'farm';
  const hasFarm = tenantModule === 'farm';
  const hasRetail = tenantModule === 'retail';

  // ─── Conditional rendering signals (2026-05-19 sidebar redesign) ───
  // OPERATIONS section + its items only render when the tenant has
  // multi-branch (>1 active branch) OR fuel (>=1 active tank). Use the
  // existing list endpoints — they're already fetched by Branches /
  // FuelTanks pages so react-query dedupes the call.
  const { data: branches = [] } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    enabled: hasRetail,
    staleTime: 60_000,
  });
  const { data: fuelTanks = [] } = useQuery({
    queryKey: ['fuel-tanks'],
    queryFn: () => listFuelTanks(),
    enabled: hasRetail,
    staleTime: 60_000,
  });
  const hasMultibranch = (branches?.length || 0) > 1;
  const hasFuel = (fuelTanks?.length || 0) > 0;

  // Business-type feature set (from the JWT). When absent (older cached token)
  // we don't feature-gate, preserving prior behaviour until the next login.
  const features = Array.isArray(user?.features) ? user.features : null;
  const hasFeature = (key) => !key || !features || features.includes(key);

  // showWhen filter — applies to both section-level and item-level
  // `showWhen` properties. Strings: 'multibranch', 'fuel',
  // 'multibranch_or_fuel'. Items without showWhen always render.
  const meetsShowWhen = (showWhen) => {
    if (!showWhen) return true;
    if (showWhen === 'multibranch') return hasMultibranch;
    if (showWhen === 'fuel') return hasFuel;
    if (showWhen === 'multibranch_or_fuel') return hasMultibranch || hasFuel;
    return true;
  };

  const shouldShowSection = (section) => {
    if (section.module === 'retail' && !hasRetail) return false;
    if (section.module === 'farm' && !hasFarm) return false;
    // `module: 'any'` and untagged: defer to module check.
    if (section.module && section.module !== 'any' && section.module !== 'retail' && section.module !== 'farm') {
      return false;
    }
    if (!section.module) {
      // Untagged sections default to farm.
      if (!hasFarm) return false;
    }
    // Conditional rendering — section-level showWhen.
    if (!meetsShowWhen(section.showWhen)) return false;
    return true;
  };

  // Brand display: show the tenant's one module, no switching
  const brandModuleLabel = hasRetail ? 'Pewil Retail' : 'Pewil Farm';

  // Auto-expand the section that contains the active tab. Runs every
  // time the active tab changes so navigating into a collapsed section
  // doesn't visually orphan the user.
  useEffect(() => {
    NAV_ITEMS.forEach(section => {
      if (section.collapsible && section.items.some(item => item.key === activeTab)) {
        setExpanded(prev => {
          if (prev[section.section]) return prev;
          const next = { ...prev, [section.section]: true };
          saveExpandedState(next);
          return next;
        });
      }
    });
  }, [activeTab]);

  const toggleSection = (sectionName) => {
    setExpanded(prev => {
      const next = { ...prev, [sectionName]: !prev[sectionName] };
      saveExpandedState(next);
      return next;
    });
  };
  const sectionHasActive = (section) => section.items.some(item => item.key === activeTab);

  return (
    <div style={S.sidebar}>
      {/* Brand */}
      <div style={S.brand}>
        <Logo size={36} showText={false} />
      </div>

      {/* Tenant brand — single-module, no switcher */}
      <div style={{ ...S.tsw, cursor: 'default' }}>
        <div style={S.tswName}>{tenantName}</div>
        <div style={S.tswPlan}>{brandModuleLabel} {'\u2022'} {planLabel}</div>
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        {NAV_ITEMS.map((section, idx) => {
          if (section.ownerOnly && role !== 'owner') return null;
          if (section.superOnly && !isSuperAdmin) return null;
          if (!shouldShowSection(section)) return null;
          // Filter items by ownerOnly + item-level showWhen so the
          // section knows its real visible count for the badge.
          const visibleItems = section.items.filter(item =>
            (!item.ownerOnly || role === 'owner')
            && meetsShowWhen(item.showWhen)
            && hasFeature(item.feature)
          );
          // Skip the section entirely if every item got filtered out
          // (e.g. OPERATIONS for a tenant with only fuel hides Branches).
          if (visibleItems.length === 0) return null;
          // Sidebar redesign 2026-05-19: any section with collapsible: true
          // is now actually collapsible, regardless of module. Previously the
          // `&& !section.module` clause forced every retail section flat.
          const isCollapsible = section.collapsible === true;
          const isExpanded = isCollapsible ? !!expanded[section.section] : true;
          const hasActive = visibleItems.some(item => item.key === activeTab);

          return (
            <React.Fragment key={section.section}>
              {idx > 0 && <div style={S.sectionDivider} />}
              <div style={S.sectionGroup}>
                <div
                  style={S.sectionHeader(isCollapsible)}
                  onClick={isCollapsible ? () => toggleSection(section.section) : undefined}
                  onMouseEnter={e => { if (isCollapsible) e.currentTarget.style.background = TOKENS.line2; }}
                  onMouseLeave={e => { if (isCollapsible) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {section.section}
                    {isCollapsible && !isExpanded && (
                      <span style={S.sectionCount}>{visibleItems.length}</span>
                    )}
                    {isCollapsible && !isExpanded && hasActive && (
                      <span style={S.sectionActiveDot} />
                    )}
                  </span>
                  {isCollapsible && (
                    <span style={S.sectionChevron(isExpanded)}>{'\u25B6'}</span>
                  )}
                </div>
                <div style={S.sectionItems(isExpanded)}>
                  {visibleItems.map(item => (
                    <button
                      key={item.key}
                      style={S.navItem(activeTab === item.key)}
                      onClick={() => onTabChange(item.key)}
                      onMouseEnter={e => { if (activeTab !== item.key) e.currentTarget.style.background = TOKENS.line2; }}
                      onMouseLeave={e => { if (activeTab !== item.key) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={S.navEmoji}>{item.emoji}</span>
                      {item.label}
                      {item.showBadge && lowStockCount > 0 && (
                        <span style={S.badge}>{lowStockCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={S.userSection}>
        <div style={S.avatar(ac.bg)}>{initials(user?.username || '')}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.userName}>{user?.username || 'User'}</div>
          <div style={S.userRole}>{role}</div>
        </div>
        <button
          style={S.logoutBtn}
          onClick={onLogout}
          title="Logout"
          onMouseEnter={e => { e.currentTarget.style.color = TOKENS.danger; }}
          onMouseLeave={e => { e.currentTarget.style.color = TOKENS.muted; }}
        >
          {'\u21E5'}
        </button>
      </div>
    </div>
  );
}
