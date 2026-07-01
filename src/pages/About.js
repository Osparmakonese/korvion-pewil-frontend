import { Link } from 'react-router-dom';
import BackLink from '../components/BackLink';

const S = {
  wrapper: { minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { background: '#0D4A22', color: '#c97d1a', fontWeight: 800, fontSize: 16, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', letterSpacing: 1 },
  body: { maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' },
  kicker: { fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#0E7C66', marginBottom: 10 },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: '#111827', marginBottom: 10, lineHeight: 1.2 },
  lead: { fontSize: 17, lineHeight: 1.7, color: '#374151', marginBottom: 34 },
  h2: { fontSize: 19, fontWeight: 700, color: '#111827', marginTop: 34, marginBottom: 10 },
  p: { fontSize: 14.5, lineHeight: 1.75, color: '#374151', marginBottom: 14 },
  box: { background: '#eef6f3', border: '1px solid #cfe6de', borderLeft: '5px solid #0E7C66', borderRadius: 8, padding: '16px 18px', margin: '20px 0' },
  boxP: { fontSize: 14.5, lineHeight: 1.7, color: '#123', margin: 0 },
  list: { margin: '4px 0 14px', paddingLeft: 20 },
  li: { fontSize: 14.5, lineHeight: 1.7, color: '#374151', marginBottom: 8 },
  ctaRow: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 34 },
  btn: { background: '#0D4A22', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: 10, textDecoration: 'none' },
  btnGhost: { background: '#fff', color: '#0D4A22', fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: 10, textDecoration: 'none', border: '1.5px solid #0D4A22' },
  foot: { fontSize: 12, color: '#9ca3af', marginTop: 44, borderTop: '1px solid #e5e7eb', paddingTop: 16 },
};

export default function About() {
  return (
    <div style={S.wrapper}>
      <nav style={S.nav}>
        <Link to="/" style={S.logo}>PEWIL</Link>
        <BackLink to="/" label="Back to home" />
      </nav>
      <div style={S.body}>
        <div style={S.kicker}>About Pewil</div>
        <h1 style={S.h1}>The operating system for African retail.</h1>
        <p style={S.lead}>
          Pewil turns a phone, tablet, or PC into a complete shop — sell, take any payment, track stock,
          stay tax-compliant, and see the numbers, all from one login. It’s built for how businesses
          actually trade across Africa, and it keeps working even when the internet drops.
        </p>

        <h2 style={S.h2}>What Pewil is</h2>
        <p style={S.p}>
          Pewil is a cloud retail and point-of-sale (POS) platform. From a single login it runs the till,
          the stock room, the accounts, tax compliance, payments, and reporting. Every business is fully
          isolated — each shop has its own private data, its own staff accounts, and its own features based
          on the kind of shop it is. Pewil is a product of Korvion Solutions.
        </p>

        <h2 style={S.h2}>Built for African businesses</h2>
        <p style={S.p}>
          From the corner tuckshop opening at six, to multi-branch supermarket groups, to fuel service
          stations, Pewil is designed around the realities of trading here: patchy connectivity,
          mobile-money-first customers, suppliers who live on WhatsApp, and tax rules that differ from one
          country to the next. It does about ninety percent of what enterprise POS does, at a fraction of
          the cost.
        </p>

        <h2 style={S.h2}>Where Pewil works</h2>
        <p style={S.p}>
          Pewil is live in <strong>Zimbabwe</strong> and <strong>Zambia</strong>, and is built to grow
          across the continent. It speaks each country’s tax authority — <strong>ZIMRA</strong> in
          Zimbabwe, <strong>ZRA Smart Invoice</strong> in Zambia, and more — bills in the local currency,
          and settles payments on the rails people already use: EcoCash and OneMoney in Zimbabwe, and MTN,
          Airtel and Zamtel mobile money in Zambia, plus card everywhere.
        </p>

        <div style={S.box}>
          <p style={S.boxP}>
            One product, many markets. A shop in Harare, a chain in Lusaka, and a service station in between
            all run the same Pewil — each seeing its own currency, its own tax authority, and its own
            payment methods.
          </p>
        </div>

        <h2 style={S.h2}>What it does</h2>
        <p style={S.p}>One system covers the whole shop:</p>
        <ul style={S.list}>
          <li style={S.li}><strong>Selling</strong> — a fast till with cash, mobile money, card and store credit; receipts, returns, layby, discounts and loyalty.</li>
          <li style={S.li}><strong>Stock &amp; suppliers</strong> — catalogue, purchase orders (including a WhatsApp assistant), goods-received, stocktakes, low-stock alerts and barcodes.</li>
          <li style={S.li}><strong>Money &amp; insights</strong> — end-of-day, profit &amp; loss, tax returns, balance sheet, debtors/creditors, margins and payroll.</li>
          <li style={S.li}><strong>Multi-branch</strong> — many branches under one business, stock transfers, and a chain roll-up.</li>
          <li style={S.li}><strong>Compliance &amp; loss prevention</strong> — automatic fiscalisation and tools that flag suspicious voids and price changes.</li>
          <li style={S.li}><strong>Fuel forecourt</strong> — grades, tanks, deliveries, dip readings, fleet cards and regulator returns.</li>
        </ul>
        <p style={S.p}>
          Pewil adapts to the trade — supermarket, pharmacy, restaurant, liquor, hardware, wholesale,
          electronics, or service station — showing each shop only the tools it needs.
        </p>

        <h2 style={S.h2}>The company</h2>
        <p style={S.p}>
          Pewil is built and operated by <strong>Korvion Solution (Pvt) Ltd</strong>. We build dependable,
          affordable software for the businesses that keep African high streets running — engineered for
          local realities, not adapted from somewhere else.
        </p>

        <h2 style={S.h2}>What we believe</h2>
        <ul style={S.list}>
          <li style={S.li}><strong>Affordable</strong> — enterprise-grade retail software at a fraction of the price.</li>
          <li style={S.li}><strong>Offline-first</strong> — the till keeps selling when the network drops, then syncs.</li>
          <li style={S.li}><strong>Compliant by default</strong> — tax fiscalisation is built in, never a paid add-on.</li>
          <li style={S.li}><strong>Your data is yours</strong> — export everything, anytime.</li>
        </ul>

        <div style={S.ctaRow}>
          <Link to="/register?persona=retail" style={S.btn}>Start a 14-day free trial &rarr;</Link>
          <Link to="/contact" style={S.btnGhost}>Talk to us</Link>
        </div>

        <div style={S.foot}>
          &copy; 2026 Korvion Solution (Pvt) Ltd · Registered in Harare, Zimbabwe · Serving shops across Africa.
        </div>
      </div>
    </div>
  );
}
