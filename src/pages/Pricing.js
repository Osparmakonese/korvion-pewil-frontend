import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Public pricing page — pewil.org/pricing
 *
 * Shows the actual per-module plans seeded by
 * billing/migrations/0005_seed_per_module_plans.py.
 * Keep prices here in sync with that migration.
 */

const C = {
  green: '#1a6b3a', greenDark: '#0D4A22', green2: '#2d9e58', green3: '#e8f5ee',
  amber: '#c97d1a', ink: '#111827', ink2: '#374151', ink3: '#6b7280',
  surface: '#f9fafb', border: '#e5e7eb', white: '#ffffff',
};

const PLANS = {
  farm: [
    {
      tier: 'starter',
      name: 'Pewil Farm Starter',
      slug: 'farm-starter',
      price_monthly: 10,
      price_yearly: 100,
      max_users: 2,
      blurb: 'For small farms getting started.',
      features: [
        'Up to 2 users',
        '5 fields',
        '10 workers',
        '50 livestock records',
        'Costs, stock, sales, reports',
        'Email support',
      ],
    },
    {
      tier: 'growth',
      name: 'Pewil Farm Growth',
      slug: 'farm-growth',
      price_monthly: 25,
      price_yearly: 250,
      max_users: 5,
      popular: true,
      blurb: 'Most popular — for growing operations.',
      features: [
        'Up to 5 users',
        '20 fields',
        '30 workers',
        '500 livestock records',
        'Everything in Starter',
        'Basic AI insights',
        'WhatsApp alerts',
        'Priority email support',
      ],
    },
    {
      tier: 'enterprise',
      name: 'Pewil Farm Enterprise',
      slug: 'farm-enterprise',
      price_monthly: 60,
      price_yearly: 600,
      max_users: 'Unlimited',
      blurb: 'For large estates and multi-site farms.',
      features: [
        'Unlimited users',
        'Unlimited fields, workers, livestock',
        'Everything in Growth',
        'Advanced AI insights',
        'White-label branding',
        'Dedicated account manager',
        'Phone support',
      ],
    },
  ],
  retail: [
    {
      tier: 'starter',
      name: 'Pewil Retail Starter',
      slug: 'retail-starter',
      price_monthly: 15,
      price_yearly: 150,
      max_users: 2,
      blurb: 'For single-till shops.',
      features: [
        'Up to 2 users',
        '100 products',
        '200 customers',
        '1 cashier session',
        'POS, categories, discounts',
        'Email support',
      ],
    },
    {
      tier: 'growth',
      name: 'Pewil Retail Growth',
      slug: 'retail-growth',
      price_monthly: 45,
      price_yearly: 450,
      max_users: 5,
      popular: true,
      blurb: 'Most popular — multi-cashier shops and small chains.',
      features: [
        'Up to 5 users',
        'Up to 3 branches',
        '500 products',
        '2,000 customers',
        '3 cashier sessions',
        'Everything in Starter',
        'Multi-currency + ZIMRA fiscal',
        'Loyalty program',
        'Basic AI insights',
        'WhatsApp alerts',
      ],
    },
    {
      tier: 'enterprise',
      name: 'Pewil Retail Enterprise',
      slug: 'retail-enterprise',
      per_branch: true,
      price_monthly: 55,        // per branch, per month
      price_yearly: 550,        // per branch, per year
      min_branches: 4,
      max_users: 'Unlimited',
      blurb: 'For supermarket chains. Scales with every branch you open.',
      features: [
        '$55 per branch, per month',
        '4-branch minimum ($220/mo floor)',
        'Unlimited users across all branches',
        'Unlimited products, customers, sessions',
        'Chain rollup + per-branch P&L',
        'Everything in Growth',
        'Advanced AI insights',
        'White-label branding',
        'Dedicated account manager',
        'Phone support',
      ],
    },
  ],
};

const FAQ = [
  { q: 'Can I try Pewil for free?', a: 'Yes — Starter and Growth plans include a 14-day free trial with full access, no card required. Retail Enterprise is sales-assisted, so our team sets up a personalised onboarding instead of a self-serve trial.' },
  { q: 'What payment methods do you accept?', a: 'Visa and Mastercard via Pesepay for card payments, plus EcoCash and OneMoney via Paynow for mobile money. Pesepay also works for international cards.' },
  { q: 'How does Retail Enterprise pricing work?', a: 'Enterprise is priced per branch: $55 per branch per month, with a 4-branch minimum ($220/mo floor). A 12-branch chain pays $660/mo. A 50-branch chain pays $2,750/mo. Unlimited users across all branches. Yearly billing (10 × monthly) gives you 2 months free.' },
  { q: 'Can I combine Pewil Farm + Pewil Retail?', a: 'Yes. Each module has its own subscription so you only pay for what you use. Combine any farm plan with any retail plan.' },
  { q: 'What is the yearly pricing?', a: 'Yearly is billed as 10 × monthly, giving you 2 months free versus paying monthly.' },
  { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade anytime from your Billing page. Proration is handled automatically on your next invoice.' },
  { q: 'Do you offer refunds?', a: 'We offer refunds within 7 days of your first payment, no questions asked. Reach out from your Billing page.' },
  { q: 'Is my data safe?', a: 'HTTPS everywhere, JWT authentication, optional 2FA, role-based access, full audit logs, and nightly automated backups. You can export all your data anytime.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Billing page. Your subscription stays active until the end of the current period — no immediate lockout.' },
];

const S = {
  page: { minHeight: '100vh', background: C.white, color: C.ink, fontFamily: "'Inter', sans-serif" },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', borderBottom: `1px solid ${C.border}`, background: C.white,
    position: 'sticky', top: 0, zIndex: 10,
  },
  navLogo: {
    background: C.greenDark, borderRadius: 8, padding: '6px 14px',
    color: C.amber, fontWeight: 800, fontSize: 18,
    fontFamily: "'Playfair Display', serif", letterSpacing: 1,
    textDecoration: 'none',
  },
  navLinks: { display: 'flex', gap: 24, alignItems: 'center' },
  navLink: { color: C.ink2, textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navCta: {
    background: C.green, color: C.white, padding: '10px 20px', borderRadius: 8,
    textDecoration: 'none', fontWeight: 600, fontSize: 14,
  },

  hero: { padding: '80px 24px 40px', textAlign: 'center', maxWidth: 900, margin: '0 auto' },
  heroTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700,
    margin: '0 0 20px', letterSpacing: '-1.5px', color: C.ink,
  },
  heroSub: { fontSize: 18, color: C.ink2, lineHeight: 1.6, marginBottom: 32 },
  pill: {
    display: 'inline-block', background: C.green3, color: C.green,
    padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 20,
  },
  toggleRow: {
    display: 'inline-flex', background: C.surface, borderRadius: 999,
    padding: 4, border: `1px solid ${C.border}`, marginBottom: 16,
  },
  toggleBtn: (active) => ({
    padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: active ? C.green : 'transparent', color: active ? C.white : C.ink2,
    fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
  }),
  save: { fontSize: 12, color: C.green, fontWeight: 600, marginLeft: 10 },

  moduleTabs: {
    display: 'flex', justifyContent: 'center', gap: 12,
    padding: '0 24px 24px', maxWidth: 900, margin: '0 auto',
  },
  moduleTab: (active) => ({
    padding: '14px 28px', borderRadius: 12, cursor: 'pointer',
    background: active ? C.green3 : C.white, color: active ? C.green : C.ink2,
    border: active ? `2px solid ${C.green}` : `2px solid ${C.border}`,
    fontWeight: 700, fontSize: 15, transition: 'all 0.15s',
  }),

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
    maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
  },
  card: (popular) => ({
    background: C.white, borderRadius: 16,
    padding: 32,
    border: popular ? `2px solid ${C.green}` : `1px solid ${C.border}`,
    position: 'relative', boxShadow: popular ? '0 20px 40px rgba(26,107,58,0.1)' : 'none',
  }),
  popularBadge: {
    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
    background: C.green, color: C.white, padding: '4px 14px', borderRadius: 999,
    fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
  },
  cardName: {
    fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
    color: C.ink, margin: '0 0 4px',
  },
  cardBlurb: { fontSize: 14, color: C.ink3, marginBottom: 20, minHeight: 40 },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  priceBig: { fontSize: 44, fontWeight: 800, color: C.ink, lineHeight: 1 },
  priceUnit: { fontSize: 14, color: C.ink3 },
  priceYearNote: { fontSize: 12, color: C.ink3, marginBottom: 20 },
  perBranchUnit: { fontSize: 13, color: C.ink3, fontWeight: 500 },
  scalePreview: {
    background: C.green3, border: `1px solid ${C.green}33`, borderRadius: 10,
    padding: '12px 14px', marginBottom: 20,
  },
  scalePreviewTitle: {
    fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.05em',
    textTransform: 'uppercase', marginBottom: 8,
  },
  scaleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 0', fontSize: 13,
  },
  scaleRowBranches: { color: C.ink2, fontWeight: 500 },
  scaleRowPrice: { color: C.green, fontWeight: 700, fontFamily: "'Playfair Display', serif" },
  userLimit: { fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 20 },
  featuresList: { listStyle: 'none', padding: 0, margin: '0 0 24px' },
  featureItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '8px 0', fontSize: 14, color: C.ink2, lineHeight: 1.5,
  },
  check: { color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 },
  cta: (popular) => ({
    display: 'block', width: '100%', padding: '14px',
    background: popular ? C.green : C.white, color: popular ? C.white : C.green,
    border: popular ? 'none' : `1.5px solid ${C.green}`, borderRadius: 10,
    fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
    cursor: 'pointer', transition: 'all 0.15s',
  }),

  combineSection: {
    background: C.surface, padding: '60px 24px', textAlign: 'center',
  },
  combineInner: { maxWidth: 800, margin: '0 auto' },
  combineTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700,
    color: C.ink, margin: '0 0 12px',
  },
  combineSub: { fontSize: 16, color: C.ink2, marginBottom: 24, lineHeight: 1.6 },

  faq: { maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px' },
  faqTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700,
    color: C.ink, textAlign: 'center', margin: '0 0 36px',
  },
  faqItem: {
    border: `1px solid ${C.border}`, borderRadius: 10, padding: 18,
    marginBottom: 12, cursor: 'pointer', transition: 'all 0.15s',
  },
  faqQ: {
    fontSize: 15, fontWeight: 600, color: C.ink,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  faqA: { fontSize: 14, color: C.ink2, marginTop: 10, lineHeight: 1.6 },

  footer: {
    background: C.greenDark, color: C.white, padding: '40px 24px',
    textAlign: 'center', fontSize: 13,
  },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 },
  footerLink: { color: C.white, textDecoration: 'none', opacity: 0.8 },
};

export default function Pricing() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState('monthly');
  const [module, setModule] = useState('farm');
  const [openFaq, setOpenFaq] = useState(null);

  if (user) return <Navigate to="/app" replace />;

  const plans = PLANS[module];

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <Link to="/" style={S.navLogo}>PEWIL</Link>
        <div style={S.navLinks}>
          <Link to="/" style={S.navLink}>Home</Link>
          <Link to="/pricing" style={{ ...S.navLink, color: C.green, fontWeight: 600 }}>Pricing</Link>
          <Link to="/status" style={S.navLink}>Status</Link>
          <Link to="/login" style={S.navLink}>Sign in</Link>
          <Link to="/register" style={S.navCta}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={S.hero}>
        <div style={S.pill}>Starter &amp; Growth: 14-day free trial · No card required</div>
        <h1 style={S.heroTitle}>Simple pricing. Pay for what you use.</h1>
        <p style={S.heroSub}>
          Farm and Retail are priced independently so you only pay for the modules you actually use.
          Starter and Growth plans include a 14-day free trial. Retail Enterprise is sales-assisted — talk to our team.
        </p>

        <div style={S.toggleRow}>
          <button style={S.toggleBtn(cycle === 'monthly')} onClick={() => setCycle('monthly')}>
            Monthly
          </button>
          <button style={S.toggleBtn(cycle === 'yearly')} onClick={() => setCycle('yearly')}>
            Yearly<span style={S.save}>Save 17%</span>
          </button>
        </div>
      </section>

      {/* Module tabs */}
      <div style={S.moduleTabs}>
        <div style={S.moduleTab(module === 'farm')} onClick={() => setModule('farm')}>
          Farm
        </div>
        <div style={S.moduleTab(module === 'retail')} onClick={() => setModule('retail')}>
          Retail
        </div>
      </div>

      {/* Plan cards */}
      <div style={S.grid}>
        {plans.map((plan) => {
          const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const unit = cycle === 'yearly' ? '/year' : '/month';
          const isPerBranch = !!plan.per_branch;
          return (
            <div key={plan.slug} style={S.card(plan.popular)}>
              {plan.popular && <div style={S.popularBadge}>MOST POPULAR</div>}
              <h3 style={S.cardName}>{plan.name}</h3>
              <p style={S.cardBlurb}>{plan.blurb}</p>
              <div style={S.priceRow}>
                <span style={S.priceBig}>${price}</span>
                {isPerBranch ? (
                  <span style={S.perBranchUnit}>per branch{unit}</span>
                ) : (
                  <span style={S.priceUnit}>{unit}</span>
                )}
              </div>
              {isPerBranch && cycle === 'monthly' && (
                <div style={S.priceYearNote}>
                  {plan.min_branches}-branch minimum — floor ${plan.price_monthly * plan.min_branches}/mo
                </div>
              )}
              {isPerBranch && cycle === 'yearly' && (
                <div style={S.priceYearNote}>
                  {plan.min_branches}-branch minimum — floor ${plan.price_yearly * plan.min_branches}/yr (2 months free)
                </div>
              )}
              {!isPerBranch && cycle === 'yearly' && (
                <div style={S.priceYearNote}>
                  That's ${(plan.price_yearly / 12).toFixed(2)}/month — 2 months free
                </div>
              )}
              {!isPerBranch && cycle === 'monthly' && <div style={{ height: 20 }} />}

              {isPerBranch && (
                <div style={S.scalePreview}>
                  <div style={S.scalePreviewTitle}>At a glance</div>
                  {[4, 12, 50].map((n) => (
                    <div key={n} style={S.scaleRow}>
                      <span style={S.scaleRowBranches}>{n} branches</span>
                      <span style={S.scaleRowPrice}>
                        ${(plan.price_monthly * n).toLocaleString()}/mo
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={S.userLimit}>
                {typeof plan.max_users === 'number'
                  ? `Up to ${plan.max_users} users`
                  : plan.max_users + ' users'}
              </div>
              <ul style={S.featuresList}>
                {plan.features.map((f, i) => (
                  <li key={i} style={S.featureItem}>
                    <span style={S.check}>{'\u2713'}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={isPerBranch ? '/contact' : '/register'} style={S.cta(plan.popular)}>
                {isPerBranch ? 'Talk to sales' : 'Start 14-day free trial'}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Combine section */}
      <section style={S.combineSection}>
        <div style={S.combineInner}>
          <h2 style={S.combineTitle}>Running a farm AND a shop?</h2>
          <p style={S.combineSub}>
            Subscribe to both Farm and Retail and manage everything from one login. Each module
            bills independently — cancel either one at any time without losing the other.
          </p>
          <Link to="/register" style={{ ...S.cta(true), display: 'inline-block', width: 'auto', padding: '14px 32px' }}>
            Try Farm + Retail Free
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={S.faq}>
        <h2 style={S.faqTitle}>Frequently asked questions</h2>
        {FAQ.map((item, i) => (
          <div
            key={i}
            style={S.faqItem}
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
          >
            <div style={S.faqQ}>
              {item.q}
              <span style={{ color: C.green, fontSize: 20 }}>
                {openFaq === i ? '\u2212' : '+'}
              </span>
            </div>
            {openFaq === i && <div style={S.faqA}>{item.a}</div>}
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerLinks}>
          <Link to="/" style={S.footerLink}>Home</Link>
          <Link to="/pricing" style={S.footerLink}>Pricing</Link>
          <Link to="/status" style={S.footerLink}>Status</Link>
          <Link to="/terms" style={S.footerLink}>Terms</Link>
          <Link to="/privacy" style={S.footerLink}>Privacy</Link>
        </div>
        <div style={{ opacity: 0.7 }}>&copy; {new Date().getFullYear()} Pewil. All rights reserved.</div>
      </footer>
    </div>
  );
}
