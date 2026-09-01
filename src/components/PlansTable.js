import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../api/billingApi';

// ─── STYLES ───────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '2px solid #e3e8e4',
  borderRadius: 14,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s',
};

const cardActive = { ...card, border: '2px solid #1a6b3a', background: '#f4fbf6' };

const btn = (primary) => ({
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: primary ? 'none' : '1px solid #1a6b3a',
  background: primary ? '#1a6b3a' : '#fff',
  color: primary ? '#fff' : '#1a6b3a',
  transition: 'all 0.15s',
  width: '100%',
});

const tabBtn = (active) => ({
  padding: '8px 18px',
  borderRadius: 20,
  border: active ? '1px solid #1a6b3a' : '1px solid #e3e8e4',
  background: active ? '#1a6b3a' : '#fff',
  color: active ? '#fff' : '#374151',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

// ─── HELPERS ──────────────────────────────────────────────
// Retail is the product (2026-09-01). A farm tenant Pewil provisioned still
// reaches its farm plans via lockedModule='farm'; the public tab row shows
// retail only.
const MODULES = [
  { key: 'retail', label: 'Pewil Retail' },
  { key: 'farm', label: 'Pewil Farm', hidden: true },
];

const TIER_ORDER = { starter: 0, growth: 1, enterprise: 2 };

function formatLimits(limits, module) {
  if (!limits) return [];
  const out = [];
  const mapping = module === 'retail'
    ? [['products', 'Products'], ['customers', 'Customers'], ['cashier_sessions', 'Cashier sessions']]
    : [['fields', 'Fields'], ['workers', 'Workers'], ['livestock', 'Livestock']];
  for (const [k, label] of mapping) {
    const v = limits[k];
    if (v === null || v === undefined) continue;
    out.push({ label, value: v === -1 || v === 'unlimited' ? 'Unlimited' : v });
  }
  return out;
}

function aiLabel(tier) {
  if (!tier || tier === 'none') return null;
  if (tier === 'basic') return 'AI: Basic';
  if (tier === 'advanced') return 'AI: Advanced';
  return `AI: ${tier}`;
}

// ─── COMPONENT ────────────────────────────────────────────
/**
 * Props:
 *  - activeSubscriptions: { farm?: { plan: { slug } }, retail?: { plan: { slug } } }
 *  - onSelectPlan: ({ plan, billingCycle }) => void
 *  - defaultModule?: 'farm' | 'retail'  — initial tab when both modules are visible
 *  - lockedModule?: 'farm' | 'retail'   — single-module rule: hide the module
 *      switcher entirely and show ONLY this module's plans. When set, the
 *      tenant can't browse the other module's plans — they don't have that
 *      module and shouldn't see it. Preferred over defaultModule.
 */
export default function PlansTable({ activeSubscriptions = {}, onSelectPlan, defaultModule = 'retail', lockedModule = null }) {
  const [module, setModule] = useState(lockedModule || defaultModule);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // If a lockedModule is passed in later (or changes), keep state in sync.
  React.useEffect(() => {
    if (lockedModule && lockedModule !== module) setModule(lockedModule);
  }, [lockedModule]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: plansResp, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 300000,
  });

  // Plans come back as { count, results: [...] } OR as array — support both
  const allPlans = useMemo(() => {
    if (!plansResp) return [];
    if (Array.isArray(plansResp)) return plansResp;
    return plansResp.results || [];
  }, [plansResp]);

  const plansForModule = useMemo(() => {
    return allPlans
      .filter(p => p.module === module)
      .sort((a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99));
  }, [allPlans, module]);

  const activeSlug = activeSubscriptions[module]?.plan?.slug;

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading plans…</div>;
  }
  if (error) {
    return <div style={{ padding: 20, color: '#991B1B' }}>Failed to load plans.</div>;
  }

  return (
    <div>
      {/* Module tabs + cycle toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Module switcher is hidden when locked — single-module tenants
              should never see the other module's tab. */}
          {!lockedModule && MODULES.filter(m => !m.hidden).map(m => (
            <button key={m.key} onClick={() => setModule(m.key)} style={tabBtn(module === m.key)}>
              {m.label}
            </button>
          ))}
          {lockedModule && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', padding: '8px 0' }}>
              {MODULES.find(m => m.key === lockedModule)?.label || lockedModule} plans
            </div>
          )}
        </div>
        <div style={{
          display: 'inline-flex',
          background: '#f3f4f6',
          borderRadius: 20,
          padding: 3,
          position: 'relative',
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '6px 14px',
              borderRadius: 18,
              border: 'none',
              background: billingCycle === 'monthly' ? '#fff' : 'transparent',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#111827',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '6px 14px',
              borderRadius: 18,
              border: 'none',
              background: billingCycle === 'yearly' ? '#fff' : 'transparent',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#111827',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Yearly
            <span style={{
              fontSize: 8,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              background: '#e8f5ee',
              color: '#1a6b3a',
              letterSpacing: '0.02em',
            }}>
              SAVE 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {plansForModule.map(p => {
          const isActive = p.slug === activeSlug;
          const priceMonthly = Number(p.price_monthly || 0);
          const priceYearly = Number(p.price_yearly || (priceMonthly * 12));
          const displayPrice = billingCycle === 'yearly'
            ? (priceYearly / 12).toFixed(2)
            : priceMonthly.toFixed(2);
          const totalBilled = billingCycle === 'yearly' ? priceYearly : priceMonthly;

          const limits = formatLimits(p.row_limits, p.module);
          const ai = aiLabel(p.ai_tier);

          return (
            <div key={p.id} style={isActive ? cardActive : card}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {p.tier}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>{p.name}</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 30, fontWeight: 700, color: '#1a6b3a' }}>
                  ${displayPrice}
                  <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Inter', fontWeight: 400 }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                  {billingCycle === 'yearly'
                    ? `$${totalBilled.toFixed(2)} billed yearly`
                    : 'Billed monthly'}
                </div>
              </div>

              {/* Row limits */}
              <div style={{ flex: 1, marginBottom: 14 }}>
                {limits.map(lim => (
                  <div key={lim.label} style={{ fontSize: 12, padding: '4px 0', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#1a6b3a', fontWeight: 700 }}>{'\u2713'}</span>
                    <strong>{lim.value}</strong>
                    <span style={{ color: '#6b7280' }}>{lim.label.toLowerCase()}</span>
                  </div>
                ))}
                {ai && (
                  <div style={{ fontSize: 12, padding: '4px 0', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#1a6b3a', fontWeight: 700 }}>{'\u2713'}</span>
                    {ai}
                  </div>
                )}
              </div>

              {/* CTA */}
              {isActive ? (
                <div style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#e8f5ee',
                  color: '#1a6b3a',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'center',
                }}>
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => onSelectPlan && onSelectPlan({ plan: p, billingCycle })}
                  style={btn(true)}
                >
                  Choose {p.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {plansForModule.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          No plans available for {module} module.
        </div>
      )}
    </div>
  );
}
