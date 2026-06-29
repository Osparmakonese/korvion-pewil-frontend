import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Public pricing page — pewil.org/pricing
 *
 * Flat-tier subscriptions in USD (2026 repricing — per-receipt model retired).
 * Fiscalisation, mobile money and the core POS are included in every retail tier;
 * tiers differ by branches/tills/users and advanced tools. Every plan starts with
 * a 14-day free trial. Yearly = 10× monthly (2 months free).
 *
 * The in-app Billing page reads live prices from the API; these cards mirror the
 * seeded plans (billing/migrations/0005 + 0012). Keep them in sync if prices change.
 */

const C = {
  green: '#1a6b3a', greenDark: '#0D4A22', green2: '#2d9e58', green3: '#e8f5ee',
  amber: '#c97d1a', ink: '#111827', ink2: '#374151', ink3: '#6b7280',
  surface: '#f9fafb', border: '#e5e7eb', white: '#ffffff',
};

const PLANS = {
  retail: [
    {
      tier: 'starter', name: 'Retail Starter', slug: 'retail-starter',
      price_monthly: 10, price_yearly: 100, blurb: 'For a single shop or restaurant.',
      features: [
        '1 branch · 1 till', 'Up to 2 users', 'Tax-authority fiscal receipts',
        'Mobile money, card & cash', 'Products, stock & basic reports',
        'Email & WhatsApp receipts', 'Email support',
      ],
    },
    {
      tier: 'growth', name: 'Retail Growth', slug: 'retail-growth',
      price_monthly: 25, price_yearly: 250, popular: true,
      blurb: 'Most popular — for a busy or multi-till shop.',
      features: [
        'Up to 2 branches · 3 tills', 'Up to 5 users', 'Everything in Starter',
        'Financial reports & VAT return', 'Layby & customer credit',
        'WhatsApp assistant + AI insights', 'Loyalty & multi-currency', 'Priority support',
      ],
    },
    {
      tier: 'enterprise', name: 'Retail Enterprise', slug: 'retail-enterprise',
      price_monthly: 45, price_yearly: 450, per_branch: true,
      blurb: 'For chains and service stations — priced per branch.',
      features: [
        'Unlimited tills & users per branch', 'Everything in Growth',
        'Multi-branch chain rollup', 'Fuel forecourt & fleet cards',
        'White-label branding', 'API access', 'Dedicated account manager',
        '20+ branches — contact us for volume pricing',
      ],
    },
  ],
  farm: [
    {
      tier: 'starter', name: 'Pewil Farm Starter', slug: 'farm-starter',
      price_monthly: 10, price_yearly: 100, blurb: 'For small farms getting started.',
      features: ['Up to 2 users', '5 fields', '10 workers', '50 livestock records',
        'Costs, stock, sales, reports', 'Email support'],
    },
    {
      tier: 'growth', name: 'Pewil Farm Growth', slug: 'farm-growth',
      price_monthly: 25, price_yearly: 250, popular: true,
      blurb: 'Most popular — for growing operations.',
      features: ['Up to 5 users', '20 fields', '30 workers', '500 livestock records',
        'Everything in Starter', 'Basic AI insights', 'WhatsApp alerts', 'Priority email support'],
    },
    {
      tier: 'enterprise', name: 'Pewil Farm Enterprise', slug: 'farm-enterprise',
      price_monthly: 60, price_yearly: 600, blurb: 'For large estates and multi-site farms.',
      features: ['Unlimited users', 'Unlimited fields, workers, livestock', 'Everything in Growth',
        'Advanced AI insights', 'White-label branding', 'Dedicated account manager', 'Phone support'],
    },
  ],
};

// Local-currency overlay for the public pricing page. Mirrors the backend
// billing/pricing.py table so marketing and in-app prices never disagree.
// USD stays the default; visitors in a priced market can switch currency.
const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', label: 'USD ($)' },
  ZMW: { code: 'ZMW', symbol: 'K', label: 'Kwacha (K)' },
};

// slug → { <currency>: [monthly, yearly] }. Only non-USD currencies listed;
// USD always falls back to the plan's own price_monthly / price_yearly.
const LOCAL_PRICES = {
  'retail-starter':    { ZMW: [199, 1990] },
  'retail-growth':     { ZMW: [499, 4990] },
  'retail-enterprise': { ZMW: [899, 8990] },
  'farm-starter':      { ZMW: [199, 1990] },
  'farm-growth':       { ZMW: [499, 4990] },
  'farm-enterprise':   { ZMW: [1099, 10990] },
};

// Thousands separator so K4,990 reads cleanly.
const fmtMoney = (n) => Number(n).toLocaleString('en-US');

function priceFor(plan, currency) {
  const tbl = LOCAL_PRICES[plan.slug];
  if (currency !== 'USD' && tbl && tbl[currency]) {
    return { monthly: tbl[currency][0], yearly: tbl[currency][1], symbol: CURRENCIES[currency].symbol };
  }
  return { monthly: plan.price_monthly, yearly: plan.price_yearly, symbol: '$' };
}

const FAQ = [
  { q: 'How does the free trial work?', a: 'Every new shop gets a 14-day free trial on the Starter plan — no card required upfront. You get the full till, fiscal receipts and mobile money from day one. At the end of the trial you pick a plan and pay by EcoCash, OneMoney or card.' },
  { q: 'Is ZIMRA fiscalisation included?', a: 'Yes — fiscalisation is built into every tier, including Starter. Every sale is reported to ZIMRA and the receipt carries the QR and verification code. There is no separate fiscalisation fee.' },
  { q: 'Why a flat monthly price instead of per-receipt?', a: 'A flat price is simpler to budget and means you are never surprised by a bill. You pay for the system — the till, stock, reports and compliance — not for how many sales you ring. A quiet day costs the same as a busy one.' },
  { q: 'What if I have more than one branch or till?', a: 'Starter covers 1 branch and 1 till; Growth covers up to 2 branches and 3 tills; Enterprise is unlimited. Need an extra branch or two on Growth? Add-on branches are available from your Billing page.' },
  { q: 'Do you offer a yearly discount?', a: 'Yes — pay yearly and get 2 months free (about 17% off). Starter is $100/yr, Growth $250/yr, Enterprise $690/yr.' },
  { q: 'What payment methods do you accept?', a: 'EcoCash and OneMoney via Paynow, plus Visa and Mastercard via Pesepay. You can pay your subscription with mobile money — no card required.' },
  { q: 'Why is farm priced differently?', a: 'Farm is a separate module with its own tools (fields, livestock, harvest). Its tiers (Starter $10, Growth $25, Enterprise $60) match the value a farm gets. Each tenant runs one module — farm OR retail.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Billing page; your subscription stays active until the end of the current period — no immediate lockout.' },
  { q: 'Is my data safe?', a: 'HTTPS everywhere, JWT authentication, role-based access, full audit logs and automated backups. You can export your data anytime as Excel.' },
];

const S = {
  page: { fontFamily: "'Inter', system-ui, sans-serif", color: C.ink, background: C.white, minHeight: '100vh' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.white, zIndex: 10 },
  navLogo: { fontWeight: 800, fontSize: 20, color: C.green, textDecoration: 'none', letterSpacing: '.02em' },
  navLinks: { display: 'flex', gap: 22, alignItems: 'center' },
  navLink: { color: C.ink2, textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navCta: { background: C.green, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '9px 16px', borderRadius: 8 },
  hero: { textAlign: 'center', padding: '54px 20px 10px', maxWidth: 820, margin: '0 auto' },
  pill: { display: 'inline-block', background: C.green3, color: C.green, fontWeight: 700, fontSize: 12.5, padding: '6px 14px', borderRadius: 20, marginBottom: 18 },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 40, margin: '0 0 12px', color: C.ink },
  heroSub: { fontSize: 16, color: C.ink3, lineHeight: 1.65, margin: 0 },
  toggleRow: { display: 'inline-flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginTop: 24, gap: 4 },
  toggleBtn: (on) => ({ border: 'none', cursor: 'pointer', padding: '9px 20px', borderRadius: 7, fontSize: 14, fontWeight: 700, background: on ? C.green : 'transparent', color: on ? '#fff' : C.ink2, display: 'flex', alignItems: 'center', gap: 8 }),
  save: { fontSize: 11, fontWeight: 700, background: '#fff', color: C.green, borderRadius: 12, padding: '2px 8px' },
  moduleTabs: { display: 'flex', justifyContent: 'center', gap: 8, margin: '28px auto 8px', maxWidth: 360 },
  moduleTab: (on) => ({ flex: 1, textAlign: 'center', cursor: 'pointer', padding: '10px 0', borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1px solid ${on ? C.green : C.border}`, background: on ? C.green3 : '#fff', color: on ? C.green : C.ink3 }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 1040, margin: '24px auto 10px', padding: '0 20px' },
  card: (pop) => ({ position: 'relative', background: '#fff', border: `1.5px solid ${pop ? C.green : C.border}`, borderRadius: 16, padding: '28px 24px', boxShadow: pop ? '0 8px 30px rgba(26,107,58,.12)' : '0 1px 4px rgba(0,0,0,.04)' }),
  popularBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', padding: '4px 14px', borderRadius: 20 },
  cardName: { fontSize: 18, fontWeight: 800, margin: '4px 0 4px' },
  cardBlurb: { fontSize: 13, color: C.ink3, margin: '0 0 14px', minHeight: 34 },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 },
  priceBig: { fontSize: 40, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display', serif" },
  priceUnit: { fontSize: 15, color: C.ink3, fontWeight: 600 },
  priceYearNote: { fontSize: 12.5, color: C.green2, fontWeight: 600, marginBottom: 12 },
  featList: { listStyle: 'none', padding: 0, margin: '16px 0 22px' },
  feat: { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, color: C.ink2, padding: '5px 0' },
  check: { color: C.green, fontWeight: 800, flexShrink: 0 },
  cardCta: (pop) => ({ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '12px 0', borderRadius: 9, fontWeight: 700, fontSize: 14.5, background: pop ? C.green : '#fff', color: pop ? '#fff' : C.green, border: `1.5px solid ${C.green}` }),
  included: { maxWidth: 1040, margin: '14px auto 0', padding: '0 20px', textAlign: 'center', fontSize: 13.5, color: C.ink3 },
  faqWrap: { maxWidth: 760, margin: '46px auto 0', padding: '0 20px' },
  faqTitle: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, textAlign: 'center', marginBottom: 18 },
  faqItem: { borderBottom: `1px solid ${C.border}`, padding: '14px 0', cursor: 'pointer' },
  faqQ: { display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 700, fontSize: 15, color: C.ink },
  faqA: { fontSize: 14, color: C.ink3, lineHeight: 1.65, marginTop: 10 },
  footer: { marginTop: 60, borderTop: `1px solid ${C.border}`, padding: '26px 20px', textAlign: 'center', color: C.ink3, fontSize: 13 },
  footLinks: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 },
  footLink: { color: C.ink2, textDecoration: 'none', fontSize: 13 },
};

export default function Pricing() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState('monthly');
  const [module, setModule] = useState('retail');
  const [currency, setCurrency] = useState('USD');
  const [openFaq, setOpenFaq] = useState(null);

  if (user) return <Navigate to="/app" replace />;

  const plans = PLANS[module];

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link to="/" style={S.navLogo}>PEWIL</Link>
        <div style={S.navLinks}>
          <Link to="/" style={S.navLink}>Home</Link>
          <Link to="/pricing" style={{ ...S.navLink, color: C.green, fontWeight: 700 }}>Pricing</Link>
          <Link to="/status" style={S.navLink}>Status</Link>
          <Link to="/login" style={S.navLink}>Sign in</Link>
          <Link to="/register" style={S.navCta}>Start free</Link>
        </div>
      </nav>

      <section style={S.hero}>
        <div style={S.pill}>14-day free trial · no card required · cancel anytime</div>
        <h1 style={S.heroTitle}>Simple, flat pricing.</h1>
        <p style={S.heroSub}>
          One clear monthly price — fiscalisation, mobile money and the full till included in every plan.
          No per-receipt fees, no surprises. Pay yearly and get 2 months free.
        </p>
        <div style={S.toggleRow}>
          <button style={S.toggleBtn(cycle === 'monthly')} onClick={() => setCycle('monthly')}>Monthly</button>
          <button style={S.toggleBtn(cycle === 'yearly')} onClick={() => setCycle('yearly')}>
            Yearly<span style={S.save}>2 months free</span>
          </button>
        </div>
        <div style={{ ...S.toggleRow, marginTop: 12 }}>
          {Object.values(CURRENCIES).map((c) => (
            <button key={c.code} style={S.toggleBtn(currency === c.code)} onClick={() => setCurrency(c.code)}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <div style={S.moduleTabs}>
        <div style={S.moduleTab(module === 'retail')} onClick={() => setModule('retail')}>Retail / Shop</div>
        <div style={S.moduleTab(module === 'farm')} onClick={() => setModule('farm')}>Farm</div>
      </div>

      <div style={S.grid}>
        {plans.map((plan) => {
          const lp = priceFor(plan, currency);
          const sym = lp.symbol;
          const price = cycle === 'yearly' ? lp.yearly : lp.monthly;
          const unit = cycle === 'yearly' ? '/year' : '/month';
          return (
            <div key={plan.slug} style={S.card(plan.popular)}>
              {plan.popular && <div style={S.popularBadge}>MOST POPULAR</div>}
              <h3 style={S.cardName}>{plan.name}</h3>
              <p style={S.cardBlurb}>{plan.blurb}</p>
              <div style={S.priceRow}>
                <span style={S.priceBig}>{sym}{fmtMoney(price)}</span>
                <span style={S.priceUnit}>{plan.per_branch ? `per branch${unit}` : unit}</span>
              </div>
              <div style={S.priceYearNote}>
                {plan.per_branch
                  ? (cycle === 'yearly' ? 'per branch · 2 months free' : `or ${sym}${fmtMoney(lp.yearly)}/branch/year (2 months free)`)
                  : (cycle === 'yearly' ? '2 months free vs monthly' : `or ${sym}${fmtMoney(lp.yearly)}/year (2 months free)`)}
              </div>
              <ul style={S.featList}>
                {plan.features.map((f, i) => (
                  <li key={i} style={S.feat}><span style={S.check}>✓</span><span>{f}</span></li>
                ))}
              </ul>
              <Link to={`/register?persona=${module}`} style={S.cardCta(plan.popular)}>
                Start 14-day free trial
              </Link>
            </div>
          );
        })}
      </div>

      <div style={S.included}>
        Every retail plan includes ZIMRA fiscalisation, EcoCash/OneMoney, card &amp; cash, offline selling, and email/WhatsApp receipts.
      </div>

      <div style={S.faqWrap}>
        <h2 style={S.faqTitle}>Frequently asked questions</h2>
        {FAQ.map((item, i) => (
          <div key={i} style={S.faqItem} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div style={S.faqQ}><span>{item.q}</span><span>{openFaq === i ? '−' : '+'}</span></div>
            {openFaq === i && <div style={S.faqA}>{item.a}</div>}
          </div>
        ))}
      </div>

      <footer style={S.footer}>
        <div style={S.footLinks}>
          <Link to="/" style={S.footLink}>Home</Link>
          <Link to="/pricing" style={S.footLink}>Pricing</Link>
          <Link to="/contact" style={S.footLink}>Contact</Link>
          <Link to="/status" style={S.footLink}>Status</Link>
          <Link to="/refund-policy" style={S.footLink}>Refund policy</Link>
          <Link to="/login" style={S.footLink}>Sign in</Link>
        </div>
        <div>Pewil — a Korvion Solutions product. Prices in USD. © {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
