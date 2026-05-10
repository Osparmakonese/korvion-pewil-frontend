/**
 * PlanSimulator — Super-admin visual walkthrough of every plan tier.
 *
 * Purpose: give developers + investors a single-page view of what
 *          Starter / Growth / Enterprise looks like for each module
 *          (Farm + Retail) BEFORE shipping changes to real tenants.
 *
 * Data: reads /api/billing/plans/ (public endpoint, PlanSerializer).
 * Gating: visible only when user.is_super_admin is true.
 * Style: Pewil design tokens — Playfair titles, Inter body, green accents.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../api/billingApi';
import { useAuth } from '../context/AuthContext';

// ─── Design tokens (mirrors the rest of the app) ─────────────
const C = {
  green: '#1a6b3a',
  green2: '#2d9e58',
  green3: '#e8f5ee',
  amber: '#c97d1a',
  red: '#c0392b',
  ink: '#111827',
  ink2: '#374151',
  ink3: '#6b7280',
  border: '#e5e7eb',
  surface: '#f9fafb',
  white: '#ffffff',
};

const S = {
  page: { padding: '18px 6px 40px', maxWidth: 1200, margin: '0 auto' },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6,
    flexWrap: 'wrap',
  },
  h1: {
    fontSize: 28, fontWeight: 700, color: C.ink,
    fontFamily: "'Playfair Display', serif", margin: 0,
  },
  badge: {
    background: C.red, color: C.white, fontSize: 9, fontWeight: 700,
    padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sub: {
    fontSize: 13, color: C.ink3, marginBottom: 22, maxWidth: 780,
    lineHeight: 1.55,
  },
  controls: {
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}`,
  },
  moduleTabs: {
    display: 'inline-flex', background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: 4,
  },
  moduleTab: (active) => ({
    padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: 'none', borderRadius: 7,
    background: active ? C.green : 'transparent',
    color: active ? C.white : C.ink3,
    fontFamily: 'inherit', transition: 'all 0.15s',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }),
  cycleToggle: {
    display: 'inline-flex', background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: 4,
  },
  cycleBtn: (active) => ({
    padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: 7,
    background: active ? C.ink : 'transparent',
    color: active ? C.white : C.ink3,
    fontFamily: 'inherit', transition: 'all 0.15s',
  }),
  savings: {
    fontSize: 11, color: C.green, fontWeight: 600, marginLeft: 4,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
    marginBottom: 24,
  },
  card: (highlight) => ({
    background: C.white,
    border: highlight ? `2px solid ${C.green}` : `1px solid ${C.border}`,
    borderRadius: 14, padding: '22px 22px 26px',
    boxShadow: highlight
      ? '0 4px 18px rgba(26,107,58,0.14)'
      : '0 1px 4px rgba(0,0,0,0.04)',
    position: 'relative', display: 'flex', flexDirection: 'column',
    minHeight: 520,
  }),
  recommended: {
    position: 'absolute', top: -10, right: 18,
    background: C.green, color: C.white, fontSize: 9, fontWeight: 700,
    padding: '4px 10px', borderRadius: 10, textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  tierLabel: {
    fontSize: 10, fontWeight: 700, color: C.ink3,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
  },
  tierName: {
    fontSize: 22, fontWeight: 700, color: C.ink,
    fontFamily: "'Playfair Display', serif", marginBottom: 10,
  },
  priceRow: {
    display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4,
  },
  priceNum: {
    fontSize: 38, fontWeight: 700, color: C.ink,
    fontFamily: "'Playfair Display', serif", lineHeight: 1,
  },
  priceSuffix: { fontSize: 13, color: C.ink3, fontWeight: 500 },
  priceNote: {
    fontSize: 11, color: C.ink3, marginTop: 2, marginBottom: 18,
    minHeight: 15,
  },
  perBranchNote: {
    fontSize: 11, color: C.amber, fontWeight: 600, marginTop: 2,
  },
  divider: {
    height: 1, background: C.border, margin: '8px 0 14px',
  },
  featureList: {
    listStyle: 'none', padding: 0, margin: 0, flex: 1,
  },
  feature: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0',
    fontSize: 12.5, color: C.ink2, lineHeight: 1.45,
  },
  check: {
    flexShrink: 0, width: 16, height: 16, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, marginTop: 1,
  },
  checkOn: { background: C.green3, color: C.green },
  checkOff: { background: '#f3f4f6', color: '#9ca3af' },
  featureMuted: { color: '#9ca3af', textDecoration: 'line-through' },
  limitsBox: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 12px', marginTop: 14,
  },
  limitsTitle: {
    fontSize: 10, fontWeight: 700, color: C.ink3, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 8,
  },
  limitRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11.5, padding: '2px 0', color: C.ink2,
  },
  missingCard: {
    background: C.white, border: `2px dashed ${C.border}`, borderRadius: 14,
    padding: 28, textAlign: 'center', color: C.ink3, fontSize: 13,
    minHeight: 180, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexDirection: 'column', gap: 6,
  },
  summaryStrip: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: '14px 18px', display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 6,
  },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  summaryLabel: {
    fontSize: 10, color: C.ink3, textTransform: 'uppercase',
    letterSpacing: '0.06em', fontWeight: 700,
  },
  summaryValue: { fontSize: 14, fontWeight: 700, color: C.ink },
  denied: {
    maxWidth: 520, margin: '80px auto', textAlign: 'center',
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: 40,
  },
  deniedIcon: { fontSize: 38, marginBottom: 10 },
  deniedTitle: {
    fontSize: 20, fontWeight: 700, color: C.ink,
    fontFamily: "'Playfair Display', serif", marginBottom: 8,
  },
  deniedBody: { fontSize: 13, color: C.ink3, lineHeight: 1.55 },
  loading: {
    padding: 60, textAlign: 'center', color: C.ink3, fontSize: 13,
  },
  error: {
    padding: 40, textAlign: 'center', color: C.red, fontSize: 13,
    background: '#fff5f4', border: `1px solid ${C.red}`, borderRadius: 12,
  },
};

// ─── Feature catalog ─────────────────────────────────────────
// Human-readable feature strings shown on every card. Keyed by module
// so Farm and Retail cards show module-specific capabilities.
const FARM_FEATURES = [
  { key: 'fields', label: 'Field management' },
  { key: 'harvest', label: 'Harvest logging' },
  { key: 'water', label: 'Water & irrigation logs' },
  { key: 'stock', label: 'Stock & inventory' },
  { key: 'expenses', label: 'Expenses & costs' },
  { key: 'workers', label: 'Workers & attendance' },
  { key: 'pay', label: 'Hours & pay' },
  { key: 'assets', label: 'Farm assets + depreciation' },
  { key: 'loans', label: 'Loans & repayments' },
  { key: 'livestock', label: 'Livestock (cattle, goats, pigs, poultry)', growth: true },
  { key: 'market', label: 'Market trips & direct income', growth: true },
  { key: 'reports', label: 'Financial reports (P&L)' },
  { key: 'ai', label: 'AI insights & Smart Analysis', requires: 'ai' },
  { key: 'whatsapp', label: 'WhatsApp daily briefing', requires: 'whatsapp' },
  { key: 'whitelabel', label: 'White-label branding', requires: 'white_label' },
];
const RETAIL_FEATURES = [
  { key: 'products', label: 'Products & categories' },
  { key: 'pos', label: 'Point of Sale (POS)' },
  { key: 'barcode', label: 'Barcode generation' },
  { key: 'customers', label: 'Customer CRM' },
  { key: 'loyalty', label: 'Loyalty & rewards' },
  { key: 'discounts', label: 'Discounts & promotions' },
  { key: 'suppliers', label: 'Suppliers & purchase orders' },
  { key: 'cashiers', label: 'Cashier sessions & shift reports' },
  { key: 'eod', label: 'End-of-day reports' },
  { key: 'inventory', label: 'Advanced inventory & reorder' },
  { key: 'multibranch', label: 'Multi-branch / chain support', growth: true },
  { key: 'theft', label: 'AI theft-pattern scan', requires: 'ai' },
  { key: 'pricedrift', label: 'AI price-drift monitor', requires: 'ai' },
  { key: 'whatsapp', label: 'WhatsApp supplier PO parser', requires: 'whatsapp' },
  { key: 'whitelabel', label: 'White-label branding', requires: 'white_label' },
];

// Human labels for row-limit keys
const LIMIT_LABELS = {
  fields: 'Fields',
  workers: 'Workers',
  products: 'Products',
  branches: 'Branches',
  users: 'Users',
  transactions_per_month: 'Transactions / month',
  sales_per_month: 'Sales / month',
  ai_queries_per_month: 'AI queries / month',
};

// Format a USD price — shows '—' for zero
const fmtPrice = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Turn a row_limits dict into rendered rows
function renderLimits(rowLimits) {
  if (!rowLimits || typeof rowLimits !== 'object') return null;
  const entries = Object.entries(rowLimits).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) {
    return (
      <div style={S.limitsBox}>
        <div style={S.limitsTitle}>Limits</div>
        <div style={{ ...S.limitRow, color: C.green, fontWeight: 600 }}>
          <span>All tables</span><span>Unlimited</span>
        </div>
      </div>
    );
  }
  return (
    <div style={S.limitsBox}>
      <div style={S.limitsTitle}>Row limits</div>
      {entries.map(([k, v]) => (
        <div key={k} style={S.limitRow}>
          <span>{LIMIT_LABELS[k] || k.replace(/_/g, ' ')}</span>
          <span style={{ fontWeight: 600 }}>
            {v === 0 || v === -1 ? 'Unlimited' : Number(v).toLocaleString('en-US')}
          </span>
        </div>
      ))}
    </div>
  );
}

// Is a feature actually enabled on this plan?
function featureEnabled(feat, plan, tier) {
  if (feat.requires === 'ai') return plan.ai_included;
  if (feat.requires === 'whatsapp') return plan.whatsapp_included;
  if (feat.requires === 'white_label') return plan.white_label;
  if (feat.growth) return tier === 'growth' || tier === 'enterprise';
  return true; // baseline features
}

// ─── Individual plan card ─────────────────────────────────────
function PlanCard({ plan, module, cycle, highlight }) {
  if (!plan) {
    return (
      <div style={S.missingCard}>
        <div style={{ fontSize: 24 }}>⚠️</div>
        <div>No Plan row seeded for this tier.</div>
        <div style={{ fontSize: 11 }}>
          Run <code>python manage.py seed_plans</code> on the backend.
        </div>
      </div>
    );
  }
  const tier = plan.tier;
  const features = module === 'farm' ? FARM_FEATURES : RETAIL_FEATURES;
  const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const cycleLabel = cycle === 'yearly' ? '/year' : '/month';

  let priceNote = '';
  if (Number(price) === 0) priceNote = 'Free tier — no card required';
  else if (cycle === 'yearly') priceNote = `Effective $${fmtPrice(Number(price) / 12)}/month`;
  else priceNote = `Billed monthly in USD`;

  return (
    <div style={S.card(highlight)}>
      {highlight && <span style={S.recommended}>Most popular</span>}
      <div style={S.tierLabel}>{module === 'farm' ? 'Pewil Farm' : 'Pewil Retail'}</div>
      <div style={S.tierName}>{plan.name || tier}</div>

      <div style={S.priceRow}>
        <span style={S.priceNum}>${fmtPrice(price)}</span>
        <span style={S.priceSuffix}>{cycleLabel}</span>
      </div>
      <div style={S.priceNote}>{priceNote}</div>
      {plan.is_per_branch && (
        <div style={S.perBranchNote}>
          Per-branch pricing · min {plan.min_branches || 1} branch
          {(plan.min_branches || 1) > 1 ? 'es' : ''}
        </div>
      )}

      <div style={S.divider} />

      <ul style={S.featureList}>
        <li style={S.feature}>
          <span style={{ ...S.check, ...S.checkOn }}>✓</span>
          <span><strong>Up to {plan.max_users}</strong> users</span>
        </li>
        {features.map((feat) => {
          const on = featureEnabled(feat, plan, tier);
          return (
            <li key={feat.key} style={S.feature}>
              <span style={{ ...S.check, ...(on ? S.checkOn : S.checkOff) }}>
                {on ? '✓' : '—'}
              </span>
              <span style={on ? undefined : S.featureMuted}>{feat.label}</span>
            </li>
          );
        })}
      </ul>

      {renderLimits(plan.row_limits)}

      <div style={{ ...S.summaryStrip, marginTop: 14, padding: '10px 12px' }}>
        <div style={S.summaryItem}>
          <span style={S.summaryLabel}>AI</span>
          <span style={S.summaryValue}>
            {plan.ai_included ? (plan.ai_tier || 'basic') : 'no'}
          </span>
        </div>
        <div style={S.summaryItem}>
          <span style={S.summaryLabel}>WhatsApp</span>
          <span style={S.summaryValue}>{plan.whatsapp_included ? 'yes' : 'no'}</span>
        </div>
        <div style={S.summaryItem}>
          <span style={S.summaryLabel}>White label</span>
          <span style={S.summaryValue}>{plan.white_label ? 'yes' : 'no'}</span>
        </div>
        <div style={S.summaryItem}>
          <span style={S.summaryLabel}>Slug</span>
          <span style={{ ...S.summaryValue, fontSize: 11, fontFamily: 'monospace' }}>
            {plan.slug}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Top-level page ──────────────────────────────────────────
export default function PlanSimulator() {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_super_admin;

  const [module, setModule] = useState('farm');
  const [cycle, setCycle] = useState('monthly');

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: getPlans,
    staleTime: 60_000,
    enabled: isSuperAdmin,
  });

  // PlanViewSet returns a bare list OR a paginated { results: [...] } shape
  const plans = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }, [data]);

  const plansForModule = useMemo(
    () => plans.filter((p) => p.module === module),
    [plans, module]
  );
  const byTier = useMemo(() => {
    const map = { starter: null, growth: null, enterprise: null };
    plansForModule.forEach((p) => {
      if (map.hasOwnProperty(p.tier)) map[p.tier] = p;
    });
    return map;
  }, [plansForModule]);

  if (!isSuperAdmin) {
    return (
      <div style={S.denied}>
        <div style={S.deniedIcon}>🔒</div>
        <div style={S.deniedTitle}>Super admin only</div>
        <div style={S.deniedBody}>
          The Plan Simulator is a developer preview of every Pewil subscription tier.
          It is only accessible to platform super admins so regular tenants never see
          plans they cannot buy yet.
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>Plan Simulator</h1>
        <span style={S.badge}>Super Admin · Dev Preview</span>
      </div>
      <p style={S.sub}>
        Visual walkthrough of every Pewil plan tier — Starter, Growth, and Enterprise
        for both Farm and Retail modules. Use this to verify pricing, limits, and
        feature gating before shipping changes to real tenants. Numbers are read
        live from <code>/api/billing/plans/</code>.
      </p>

      <div style={S.controls}>
        <div style={S.moduleTabs}>
          {[
            { key: 'farm', label: 'Pewil Farm' },
            { key: 'retail', label: 'Pewil Retail' },
          ].map((m) => (
            <button
              key={m.key}
              style={S.moduleTab(module === m.key)}
              onClick={() => setModule(m.key)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={S.cycleToggle}>
          <button
            style={S.cycleBtn(cycle === 'monthly')}
            onClick={() => setCycle('monthly')}
            type="button"
          >
            Monthly
          </button>
          <button
            style={S.cycleBtn(cycle === 'yearly')}
            onClick={() => setCycle('yearly')}
            type="button"
          >
            Yearly
          </button>
        </div>
        {cycle === 'yearly' && <span style={S.savings}>~2 months free</span>}
      </div>

      {isLoading && <div style={S.loading}>Loading plans…</div>}
      {error && (
        <div style={S.error}>
          Failed to load plans: {error.message || String(error)}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div style={S.grid}>
            <PlanCard
              plan={byTier.starter}
              module={module}
              cycle={cycle}
              highlight={false}
            />
            <PlanCard
              plan={byTier.growth}
              module={module}
              cycle={cycle}
              highlight={true}
            />
            <PlanCard
              plan={byTier.enterprise}
              module={module}
              cycle={cycle}
              highlight={false}
            />
          </div>

          <div style={S.summaryStrip}>
            <div style={S.summaryItem}>
              <span style={S.summaryLabel}>Plans loaded</span>
              <span style={S.summaryValue}>{plans.length}</span>
            </div>
            <div style={S.summaryItem}>
              <span style={S.summaryLabel}>Module filter</span>
              <span style={S.summaryValue}>{module}</span>
            </div>
            <div style={S.summaryItem}>
              <span style={S.summaryLabel}>Tiers shown</span>
              <span style={S.summaryValue}>
                {Object.values(byTier).filter(Boolean).length} / 3
              </span>
            </div>
            <div style={S.summaryItem}>
              <span style={S.summaryLabel}>Endpoint</span>
              <span style={{ ...S.summaryValue, fontSize: 11, fontFamily: 'monospace' }}>
                /api/billing/plans/
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
