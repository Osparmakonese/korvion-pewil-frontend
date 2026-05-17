import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Public pricing page — pewil.org/pricing
 *
 * Retail (2026-05-17 pricing revolution):
 *   Per-receipt model. Free up to 1,000 receipts/month, then half a cent
 *   per receipt above that, hard cap at $99/month. Optional opt-in to
 *   the data-share rebate cuts the bill 50%. No seats, no branches, no
 *   tier upgrades to navigate. The shop pays only when they actually use
 *   the system. See backend/billing/usage_pricing.py for the math.
 *
 * Farm:
 *   Still flat-fee tiers (Starter / Growth / Enterprise) — farms only
 *   produce a handful of sales per season so per-receipt would charge
 *   them too little to sustain. Numbers come from
 *   billing/migrations/0005_seed_per_module_plans.py.
 *
 * Keep both pricing surfaces honest with the server-side calc in
 * billing.usage_pricing.estimate_bill_from_receipt_count — the
 * calculator below mirrors that function exactly so prospects see
 * the same number they'll be billed.
 */

// ── Per-receipt pricing constants (mirror billing/usage_pricing.py) ──
const FREE_TIER_RECEIPTS = 1000;
const PER_RECEIPT_CHARGE = 0.005;   // half a cent
const MONTHLY_CAP = 99;             // dollars
const DATA_SHARE_REBATE_PCT = 50;   // when opted in

function estimateMonthlyBill(dailySales, daysOpenPerMonth = 26, dataShareOn = false) {
  const monthlyReceipts = Math.max(0, Math.round(dailySales * daysOpenPerMonth));
  const chargeable = Math.max(monthlyReceipts - FREE_TIER_RECEIPTS, 0);
  const gross = chargeable * PER_RECEIPT_CHARGE;
  const capped = Math.min(gross, MONTHLY_CAP);
  const final = dataShareOn ? capped * (1 - DATA_SHARE_REBATE_PCT / 100) : capped;
  return { monthlyReceipts, chargeable, gross, capped, final };
}

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
  { q: 'How does per-receipt pricing actually work for retail?', a: 'Your first 1,000 receipts every calendar month are free. After that, you pay half a US cent ($0.005) per receipt, with a hard cap of $99/month no matter how big you grow. The calculator above shows your exact monthly bill — there are no tiers to upgrade between, no per-seat fees, no per-branch fees.' },
  { q: 'What counts as a "receipt"?', a: 'A completed customer sale — one transaction at the till. Returns, voids, stock adjustments, cash drops, end-of-day reports and dashboard views are all free. Only customer-facing receipts count toward your bill.' },
  { q: 'What\'s the data-share rebate?', a: 'Opt in (anytime, from your Billing page) to share anonymized aggregate sales — category, hour, geography only. No customer data, no SKU prices, no individual receipts. In exchange we knock 50% off your monthly bill. We fund the discount by selling the aggregate dataset to FMCG brands and market-research firms, the same way Nielsen does — except we share the revenue with you.' },
  { q: 'Why is farm priced differently?', a: 'Farms only ring a handful of sales per season — tobacco, maize, livestock cycles — so per-receipt would charge them essentially nothing. Farm stays on flat-fee plans (Starter $10, Growth $25, Enterprise $60) that match actual value delivered.' },
  { q: 'Can I try Pewil for free?', a: 'Yes — sign up and start. Retail tenants pay $0 until they cross 1,000 receipts in a month; farm tenants get a 14-day free trial on any plan. No card required upfront.' },
  { q: 'What payment methods do you accept?', a: 'Visa and Mastercard via Pesepay for card payments, plus EcoCash and OneMoney via Paynow for mobile money in Zimbabwe. M-Pesa (Daraja) for Kenya. Pesepay also handles international cards from anywhere.' },
  { q: 'I already pay a flat subscription — what happens to me?', a: 'Existing tenants keep their current pricing until you choose to switch. From your Billing page you can see what you\'d pay under the per-receipt model and migrate yourself if it\'s cheaper. Most shops save money on the switch.' },
  { q: 'Can I combine Pewil Farm + Pewil Retail?', a: 'Each tenant runs one module (farm OR retail) — that\'s deliberate, the systems are deeply specialized. If you genuinely need both, register two separate tenants with the same email; you\'ll see both modules in one login.' },
  { q: 'Do you offer refunds?', a: 'You barely ever pay enough to need one — but yes, refunds within 7 days of your first payment, no questions asked. Email billing@pewil.org from your Billing page.' },
  { q: 'Is my data safe?', a: 'HTTPS everywhere, JWT authentication, optional 2FA, role-based access, full audit logs, and nightly automated backups. You can export all your data anytime as CSV or JSON.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Billing page. Your subscription stays active until the end of the current period — no immediate lockout. Per-receipt tenants are effectively always-cancellable: stop ringing sales and your bill stops growing.' },
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

/**
 * RetailReceiptPricing — the calculator + explainer block we show on
 * the Retail tab. Replaces the old fixed-price plan cards entirely.
 *
 * Why the calculator is the headline: every shopkeeper we talked to
 * said the same thing — they don't want to compare three tiers, they
 * want to know what they will pay. Show them.
 */
function RetailReceiptPricing() {
  const [dailySales, setDailySales] = useState(50);
  const [dataShareOn, setDataShareOn] = useState(false);
  const result = estimateMonthlyBill(dailySales, 26, dataShareOn);

  const RC = {
    wrap: { maxWidth: 980, margin: '0 auto', padding: '0 24px 40px' },
    headlineRow: { textAlign: 'center', marginBottom: 32 },
    headlineKicker: {
      display: 'inline-block', background: '#e8f5ee', color: '#1a6b3a',
      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      letterSpacing: '0.05em', marginBottom: 14,
    },
    headline: {
      fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700,
      letterSpacing: '-0.5px', margin: '0 0 12px',
    },
    headlineSub: { color: '#374151', fontSize: 16, lineHeight: 1.6, maxWidth: 640, margin: '0 auto' },

    calc: {
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '32px 28px', marginBottom: 24,
    },
    calcRow: { marginBottom: 24 },
    calcLabel: { fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' },
    calcValue: { fontSize: 36, fontWeight: 800, color: '#111827', fontFamily: "'Playfair Display', serif" },
    slider: { width: '100%', accentColor: '#1a6b3a' },
    tick: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 4 },

    resultBox: {
      background: 'linear-gradient(180deg, #f4faf6 0%, #fffefb 100%)',
      border: '1px solid #d1e8d8', borderRadius: 14, padding: '22px 24px',
    },
    monthlyBig: {
      fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 800,
      color: '#0D4A22', letterSpacing: '-1.5px', lineHeight: 1,
    },
    monthlyUnit: { color: '#6b7280', fontSize: 14, fontWeight: 600, marginLeft: 8 },
    breakdown: { fontSize: 13, color: '#374151', marginTop: 10, lineHeight: 1.6 },
    breakdownStrong: { color: '#0D4A22', fontWeight: 700 },

    toggle: {
      display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, padding: '12px 14px',
      background: '#fff', border: '1px solid #d1e8d8', borderRadius: 12,
    },
    toggleSwitch: (on) => ({
      width: 40, height: 22, borderRadius: 999, background: on ? '#1a6b3a' : '#d1d5db',
      position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
    }),
    toggleKnob: (on) => ({
      width: 16, height: 16, borderRadius: 999, background: '#fff', position: 'absolute',
      top: 3, left: on ? 21 : 3, transition: 'left 0.15s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }),
    toggleLabel: { flex: 1 },
    toggleTitle: { fontSize: 14, fontWeight: 700, color: '#111827' },
    toggleHelp: { fontSize: 12, color: '#6b7280', marginTop: 2 },

    rulesGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18,
      marginTop: 32, marginBottom: 32,
    },
    rule: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' },
    ruleNum: { color: '#1a6b3a', fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, marginBottom: 6 },
    ruleTitle: { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 },
    ruleBody: { fontSize: 13.5, color: '#374151', lineHeight: 1.55 },

    ctaRow: { textAlign: 'center', marginTop: 28 },
    cta: {
      display: 'inline-block', background: '#1a6b3a', color: '#fff',
      padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
      fontWeight: 700, fontSize: 15,
    },
    smallNote: { fontSize: 12, color: '#9ca3af', marginTop: 14, lineHeight: 1.5 },
  };

  return (
    <div style={RC.wrap}>
      <div style={RC.headlineRow}>
        <span style={RC.headlineKicker}>RETAIL — PAY ONLY WHEN YOU RING SALES</span>
        <h2 style={RC.headline}>Free until you sell. Then half a cent each.</h2>
        <p style={RC.headlineSub}>
          No monthly subscription. No seats. No per-branch fee. Your first 1,000 receipts every
          month are free — that covers most dukas entirely. After that, you pay half a US cent
          per receipt, capped at $99/month no matter how big you grow.
        </p>
      </div>

      <div style={RC.calc}>
        <div style={RC.calcRow}>
          <div style={RC.calcLabel}>Sales you ring per day</div>
          <div style={RC.calcValue}>{dailySales} sales</div>
          <input
            type="range" min={0} max={500} step={5}
            value={dailySales}
            onChange={(e) => setDailySales(Number(e.target.value))}
            style={RC.slider}
          />
          <div style={RC.tick}>
            <span>0</span>
            <span>50</span>
            <span>150</span>
            <span>300</span>
            <span>500+</span>
          </div>
        </div>

        <div style={RC.resultBox}>
          <div>
            <span style={RC.monthlyBig}>${result.final.toFixed(2)}</span>
            <span style={RC.monthlyUnit}>per month</span>
          </div>
          <div style={RC.breakdown}>
            That's ~<span style={RC.breakdownStrong}>{result.monthlyReceipts.toLocaleString()}</span> receipts
            a month at 26 working days.&nbsp;
            {result.monthlyReceipts <= FREE_TIER_RECEIPTS && (
              <>You're inside the <span style={RC.breakdownStrong}>1,000-receipt free tier</span> — no bill at all.</>
            )}
            {result.monthlyReceipts > FREE_TIER_RECEIPTS && result.capped < MONTHLY_CAP && (
              <>{result.chargeable.toLocaleString()} receipts above the free tier × $0.005 each.</>
            )}
            {result.capped >= MONTHLY_CAP && (
              <>You'd hit the <span style={RC.breakdownStrong}>$99 monthly cap</span> — that's the most you'll ever pay, even at 50,000 sales/month.</>
            )}
            {dataShareOn && result.capped > 0 && (
              <> Data-share rebate cuts your bill by 50%.</>
            )}
          </div>

          <div style={RC.toggle}>
            <div
              style={RC.toggleSwitch(dataShareOn)}
              onClick={() => setDataShareOn((v) => !v)}
            >
              <div style={RC.toggleKnob(dataShareOn)} />
            </div>
            <div style={RC.toggleLabel}>
              <div style={RC.toggleTitle}>Opt in to data-share rebate — get 50% off</div>
              <div style={RC.toggleHelp}>
                Share anonymized aggregate sales (category × hour × geography) with the Pewil dataset.
                No customer data, no SKU prices. Cancel anytime.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={RC.rulesGrid}>
        <div style={RC.rule}>
          <div style={RC.ruleNum}>1,000</div>
          <div style={RC.ruleTitle}>Free receipts every month</div>
          <div style={RC.ruleBody}>
            That's around 33 sales a day. A typical neighborhood duka pays $0, forever. The free tier
            resets on the 1st of every month.
          </div>
        </div>
        <div style={RC.rule}>
          <div style={RC.ruleNum}>$0.005</div>
          <div style={RC.ruleTitle}>Per receipt above the free tier</div>
          <div style={RC.ruleBody}>
            Half a US cent per chargeable sale — less than the cost of the till roll the receipt prints on.
            Returns, voids, stock adjustments, cash drops never count.
          </div>
        </div>
        <div style={RC.rule}>
          <div style={RC.ruleNum}>$99</div>
          <div style={RC.ruleTitle}>Maximum monthly bill</div>
          <div style={RC.ruleBody}>
            Hard ceiling. A 10-branch supermarket chain doing 50,000 sales/month pays the same as
            Pick n Pay scale would — $99. No per-branch fee, no enterprise tier to negotiate.
          </div>
        </div>
        <div style={RC.rule}>
          <div style={RC.ruleNum}>50%</div>
          <div style={RC.ruleTitle}>Data-share rebate</div>
          <div style={RC.ruleBody}>
            Opt in to anonymized aggregate data sharing and cut your bill in half. Most months even a
            busy shop pays $0 net — your data funds your own subscription.
          </div>
        </div>
      </div>

      <div style={RC.ctaRow}>
        <Link to="/register?persona=retail" style={RC.cta}>
          Start free — no card needed
        </Link>
        <div style={RC.smallNote}>
          Same pricing for every country, every shop size. The calculator is the price list.
        </div>
      </div>
    </div>
  );
}


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

      {/* Retail per-receipt section (only when module === 'retail') */}
      {module === 'retail' && <RetailReceiptPricing />}

      {/* Plan cards — farm only (retail uses the calculator above) */}
      {module === 'farm' && <div style={S.grid}>
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
      </div>}

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
