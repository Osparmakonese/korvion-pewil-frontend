import { useState } from 'react';

const S = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  title: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  p: { fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, marginTop: 10 },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 11px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box', minHeight: 100, resize: 'vertical', fontFamily: 'inherit' },
  btn: { padding: '10px 20px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  faqQ: { fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer', padding: '10px 12px', background: '#f9fafb', borderRadius: 7, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' },
  faqA: { fontSize: 12, color: '#374151', lineHeight: 1.7, padding: '8px 12px 14px', marginBottom: 6 },
  chip: (active, color, text) => ({
    display: 'inline-block', padding: '5px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700,
    marginRight: 8, marginBottom: 8, cursor: 'pointer', border: '1px solid transparent',
    background: active ? text : color, color: active ? '#fff' : text,
  }),
};

// Categories double as quick-link filters.
const CATS = [
  { id: 'all', label: 'All topics', color: '#f1f5f9', text: '#334155' },
  { id: 'start', label: 'Getting Started', color: '#e8f5ee', text: '#1a6b3a' },
  { id: 'fiscal', label: 'ZIMRA Fiscalisation', color: '#eef2ff', text: '#4338ca' },
  { id: 'payments', label: 'Payments & Wallets', color: '#fdf2f8', text: '#be185d' },
  { id: 'sales', label: 'Sales & Receipts', color: '#fffbeb', text: '#a16207' },
  { id: 'credit', label: 'Layby & Credit', color: '#f0fdfa', text: '#0f766e' },
  { id: 'reports', label: 'Reports & Tax', color: '#eff6ff', text: '#1d4ed8' },
  { id: 'billing', label: 'Billing & Plans', color: '#f5f3ff', text: '#6d28d9' },
  { id: 'security', label: 'Account & Security', color: '#fef2f2', text: '#991b1b' },
];

const FAQ = [
  { cat: 'start', q: 'How do I add a product or field?', a: 'Go to Products (retail) or Fields (farm) and tap the "+" button at the top. For products you can also set a barcode, HS code, VAT rate, and flags like age-restricted or weighable under Advanced options.' },
  { cat: 'start', q: 'Can I use Pewil on my phone?', a: 'Yes — Pewil is a Progressive Web App. Open www.pewil.org in your phone browser and choose "Add to Home Screen" for an app-like experience that also works offline at the till.' },
  { cat: 'start', q: 'How do I set my shop branding (logo, VAT, address)?', a: 'Go to Setup → Receipt Customization. Set your store name, address, logo URL, brand colour, VAT number, TIN and bank details — these appear automatically on your printed receipts and invoices.' },

  { cat: 'fiscal', q: 'How do I connect my shop to ZIMRA (fiscalisation)?', a: 'On the ZIMRA FDMS portal, create a virtual device to get a Device ID and Activation Key. Then in Pewil open ZIMRA Fiscalisation, enter the Device ID, serial and Activation Key (start in sandbox), and press "Register with ZIMRA" → "Open fiscal day". Every sale is then signed and submitted automatically, with a QR + verification code on the receipt.' },
  { cat: 'fiscal', q: 'What does "FISCAL PENDING" on a receipt mean?', a: 'The sale was recorded but not yet sent to ZIMRA — usually because no device is connected yet, or the internet dropped. Pewil queues these and submits them automatically when the device is back online. Connect a device in ZIMRA Fiscalisation to clear pending sales.' },
  { cat: 'fiscal', q: 'A business customer needs an invoice with their VAT/TIN. How?', a: 'At the till capture the buyer’s name, TIN and VAT number on the sale, then print the A4 Fiscal Tax Invoice from the receipt screen. It includes the buyer details ZIMRA requires for B2B invoices (mandatory since 31 May 2025) so your customer can claim input VAT.' },
  { cat: 'fiscal', q: 'How are refunds handled for ZIMRA?', a: 'When you complete a return, Pewil automatically issues a fiscal Credit Note to ZIMRA that references the original receipt. You’ll see the credit-note number and verification code on the return.' },

  { cat: 'payments', q: 'Which payment methods can I take?', a: 'Cash, card, and mobile wallets — EcoCash, OneMoney, InnBucks, O’mari and Zimswitch — via Paynow. You can also split a single sale across several methods (e.g. cash + EcoCash).' },
  { cat: 'payments', q: 'How does EcoCash "push to phone" work at the till?', a: 'Choose EcoCash/Mobile Money as the tender. Pewil pushes a payment request to the customer’s phone; they approve it with their wallet PIN, and the sale only completes once Paynow confirms it as PAID. Connect your Paynow account under Payment Setup first.' },
  { cat: 'payments', q: 'Can I sell airtime, ZESA or water tokens?', a: 'Yes — open Vending. Once your Paynow BillPay float is connected (Vending Setup), you can sell airtime, ZESA electricity and Harare water tokens; the token/voucher prints on the receipt.' },
  { cat: 'payments', q: 'What about giving change as EcoCash, airtime or store credit?', a: 'At the change step you can keep change as store credit on the customer’s wallet, or send it as airtime/EcoCash/ZESA where those providers are connected.' },

  { cat: 'sales', q: 'Which receipt designs can I print?', a: 'A modern 80mm thermal receipt for everyday sales, and a full A4 Fiscal Tax Invoice for business/account customers. Both pull your branding from Receipt Customization and carry the live ZIMRA QR + verification code. For account sales the A4 invoice is the highlighted default.' },
  { cat: 'sales', q: 'Can I send a receipt by WhatsApp?', a: 'Yes — after a sale, tap "Send receipt via WhatsApp" on the receipt screen. It composes the receipt (items, total and the ZIMRA verification code) and opens WhatsApp to send to the customer.' },
  { cat: 'sales', q: 'How do returns and refunds work?', a: 'Open Returns & Refunds, pick the original sale, choose the items and refund method (cash, EcoCash, card or store credit). Completing the return restocks the items and issues a ZIMRA credit note.' },

  { cat: 'credit', q: 'How does Layby work?', a: 'Open Layby and create one for the customer with the items and a due date. Take instalments over time; when the balance reaches zero (or you tap Collect) the goods are released as a normal fiscal sale.' },
  { cat: 'credit', q: 'Can customers buy "on account" (credit)?', a: 'Yes. Set up the customer under Credit Accounts. At the till choose the "On Account" tender and pick the customer — the sale is added to their balance and a fiscal invoice is issued. Record their repayments on the Credit Accounts page.' },
  { cat: 'credit', q: 'Can I bill the same customer every month automatically?', a: 'Use Recurring Invoices for rent, monthly supply or retainers. Each run generates a fiscal invoice and can optionally charge the customer’s credit account.' },

  { cat: 'reports', q: 'Where do I see profit, VAT and stock value?', a: 'Open Financial Reports (owner only): Profit & Loss, VAT-7 Return, Balance Sheet, Debtors & Creditors aging, and Stock Valuation — all calculated live from your sales, purchases and accounts.' },
  { cat: 'reports', q: 'How do I prepare my VAT return?', a: 'Financial Reports → VAT-7 Return shows output VAT (from sales) minus input VAT (from purchases) for the period, with the net payable to ZIMRA. Reconcile it against your fiscalised receipts before filing.' },
  { cat: 'reports', q: 'How do I export my data?', a: 'Use the Data Export page (or the Export buttons on reports and the Audit Log) to download CSV/JSON of your data at any time.' },

  { cat: 'billing', q: 'Is there a free trial and how does pricing work?', a: 'Yes — every new shop gets a 14-day free trial, no card required. After that, one flat monthly price: Starter $10, Growth $25, Enterprise $69 (or pay yearly and get 2 months free). ZIMRA fiscalisation and mobile money are included in every plan. Farm has the same 14-day trial on its own tiers. Your data is always preserved.' },

  { cat: 'security', q: 'How do I add team members and set what they can see?', a: 'Owners open Administration → Team & Access → Add User to create a username, role (manager/worker) and password. Use the Permissions tab to control what each person can view. Roles and every change are recorded in the Audit Trail.' },
  { cat: 'security', q: 'Can I set password rules for my team?', a: 'Yes — Administration → Password Policy (or Settings → Security) lets the owner set minimum length and complexity rules enforced on every password and reset.' },
  { cat: 'security', q: 'Is my data secure?', a: 'Yes. Pewil uses HTTPS encryption, JWT authentication, role-based access, optional two-factor authentication, an audit log of every change, and regular backups. Your data is never shared with third parties.' },
];

export default function HelpSupport() {
  const [openFaq, setOpenFaq] = useState(null);
  const [filter, setFilter] = useState('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [sent, setSent] = useState(false);

  const shown = filter === 'all' ? FAQ : FAQ.filter((f) => f.cat === filter);

  // No /api/core/support/ endpoint yet — open the user's mail client pre-filled
  // so the message actually reaches us rather than faking a success.
  const handleSubmit = (e) => {
    e.preventDefault();
    const labelMap = {
      general: 'General Question', billing: 'Billing & Payments', bug: 'Bug Report',
      feature: 'Feature Request', account: 'Account & Security', fiscal: 'ZIMRA / Fiscalisation',
    };
    const tag = labelMap[category] || 'General Question';
    const url = `mailto:support@pewil.org?subject=${encodeURIComponent(`[${tag}] ${subject}`.trim())}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    setSent(true);
    setTimeout(() => setSent(false), 5000);
    setSubject(''); setMessage('');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Quick links / topic filter */}
      <div style={S.card}>
        <h3 style={S.title}>Browse by topic</h3>
        <div>
          {CATS.map((c) => (
            <span
              key={c.id}
              style={S.chip(filter === c.id, c.color, c.text)}
              onClick={() => { setFilter(c.id); setOpenFaq(null); }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={S.card}>
        <h3 style={S.title}>
          Frequently Asked Questions
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginLeft: 8 }}>
            {shown.length} {shown.length === 1 ? 'article' : 'articles'}
          </span>
        </h3>
        {shown.map((item, i) => (
          <div key={item.q}>
            <div style={S.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{item.q}</span>
              <span style={{ fontSize: 14, color: '#9ca3af', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {'▼'}
              </span>
            </div>
            {openFaq === i && <div style={S.faqA}>{item.a}</div>}
          </div>
        ))}
        {shown.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No articles in this topic yet.</p>}
      </div>

      {/* Contact Form */}
      <div style={S.card}>
        <h3 style={S.title}>Contact Support</h3>
        <p style={S.p}>Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.</p>

        {sent && (
          <div style={{ background: '#e8f5ee', color: '#1a6b3a', padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
            Opening your email app — send the draft to support@pewil.org and we'll respond within 24 hours.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={S.label}>Category</label>
          <select style={S.input} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="general">General Question</option>
            <option value="fiscal">ZIMRA / Fiscalisation</option>
            <option value="billing">Billing & Payments</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="account">Account & Security</option>
          </select>

          <label style={S.label}>Subject</label>
          <input style={S.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" required />

          <label style={S.label}>Message</label>
          <textarea style={S.textarea} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue or question in detail..." required />

          <button type="submit" style={S.btn}>Email Support</button>
        </form>
      </div>

      {/* Contact info */}
      <div style={S.card}>
        <h3 style={S.title}>Other Ways to Reach Us</h3>
        <p style={S.p}>Email: support@pewil.org</p>
        <p style={S.p}>Response time: Within 24 hours on business days</p>
        <p style={{ ...S.p, fontSize: 11, color: '#9ca3af' }}>Pewil is based in Zimbabwe. Business hours: Mon–Fri 8am–5pm CAT.</p>
      </div>
    </div>
  );
}
