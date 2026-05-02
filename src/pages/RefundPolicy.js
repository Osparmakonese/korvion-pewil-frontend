import { Link } from 'react-router-dom';
import BackLink from '../components/BackLink';

const S = {
  wrapper: { minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { background: '#0D4A22', color: '#c97d1a', fontWeight: 800, fontSize: 16, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', letterSpacing: 1 },
  body: { maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 8 },
  updated: { fontSize: 13, color: '#6b7280', marginBottom: 36 },
  h2: { fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 36, marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 1.75, color: '#374151', marginBottom: 14 },
};

export default function RefundPolicy() {
  return (
    <div style={S.wrapper}>
      <nav style={S.nav}>
        <Link to="/" style={S.logo}>PEWIL</Link>
        <BackLink to="/" label="Back to home" />
      </nav>
      <div style={S.body}>
        <h1 style={S.h1}>Refund Policy</h1>
        <p style={S.updated}>Last updated: 17 April 2026</p>

        <h2 style={S.h2}>1. Overview</h2>
        <p style={S.p}>This Refund Policy explains when and how refunds are issued for Pewil subscription payments. It supplements Section 4 (Subscription and Payment) of our Terms of Service. By subscribing to Pewil, you agree to the refund terms described here.</p>

        <h2 style={S.h2}>2. Free Trial</h2>
        <p style={S.p}>All new accounts receive a 30-day free trial. No payment is taken during the trial. If you cancel before the trial ends, you will never be charged and no refund is required. If you do not subscribe at the end of the trial, your account enters a read-only state and you can still export your data.</p>

        <h2 style={S.h2}>3. Subscription Fees Are Generally Non-Refundable</h2>
        <p style={S.p}>Monthly subscription fees are charged in advance and are generally non-refundable. Once a billing cycle has started, we do not pro-rate or refund unused days if you cancel mid-cycle. Your subscription will remain active through the end of the billing period you have already paid for, and will not renew thereafter.</p>

        <h2 style={S.h2}>4. Duplicate or Accidental Charges</h2>
        <p style={S.p}>If you are charged more than once for the same billing cycle, or if a charge is processed in error on our side, we will refund the duplicate or erroneous amount in full. Please contact support@pewil.org within 60 days of the charge with your account email and the Pesepay reference number so we can investigate and process the refund.</p>

        <h2 style={S.h2}>5. Failed Payment Handling</h2>
        <p style={S.p}>If a payment attempt fails at the Pesepay gateway but your subscription is still extended in error, the failed amount will not be captured. No refund is required because no money left your account. If you see a pending authorisation that is not captured within 7 business days, it will be automatically released by your card issuer or mobile money provider.</p>

        <h2 style={S.h2}>6. Service Outages</h2>
        <p style={S.p}>If Pewil experiences a prolonged outage that prevents you from using core features for more than 24 consecutive hours within a billing cycle, you may request a pro-rated service credit applied to your next invoice. Credits are not issued as cash refunds. We do not issue credits for scheduled maintenance, issues caused by your own internet connection, or force majeure events.</p>

        <h2 style={S.h2}>7. Downgrades</h2>
        <p style={S.p}>If you downgrade to a lower-priced plan mid-cycle, the change takes effect at the start of your next billing cycle. We do not refund the difference in price for the remainder of the current cycle. This keeps billing predictable and avoids partial-month accounting complexity.</p>

        <h2 style={S.h2}>8. Cancellation</h2>
        <p style={S.p}>You may cancel your subscription at any time through the Billing page inside the app. Cancellation stops future renewals and takes effect at the end of your current paid billing period. You retain full access until that date, and your data remains available for export for 30 days after your final billing period ends.</p>

        <h2 style={S.h2}>9. How to Request a Refund</h2>
        <p style={S.p}>If you believe you qualify for a refund under this policy, email support@pewil.org from the email address associated with your account. Include the date of the charge, the amount, the payment method (Visa, Mastercard, EcoCash, or OneMoney), and the Pesepay reference number from your receipt. We will respond within 2 business days.</p>

        <h2 style={S.h2}>10. Refund Processing Time</h2>
        <p style={S.p}>Approved refunds are processed through the same payment method used for the original charge. Card refunds typically appear within 5 to 10 business days, depending on your issuing bank. EcoCash and OneMoney refunds are typically processed within 2 to 5 business days. We cannot accelerate processing times on the payment provider's side.</p>

        <h2 style={S.h2}>11. Chargebacks</h2>
        <p style={S.p}>Before filing a chargeback with your bank or mobile money provider, please contact us first at support@pewil.org. Most billing questions can be resolved directly and faster than the chargeback process. Accounts that initiate chargebacks without first contacting support may be suspended pending investigation.</p>

        <h2 style={S.h2}>12. Statutory Rights</h2>
        <p style={S.p}>Nothing in this policy limits your rights under the Consumer Protection Act of Zimbabwe or any other applicable law. Where local law grants you a refund right that is more generous than this policy, that law takes precedence.</p>

        <h2 style={S.h2}>13. Changes to This Policy</h2>
        <p style={S.p}>We may update this Refund Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. The "Last updated" date at the top of this page shows the most recent revision.</p>

        <h2 style={S.h2}>14. Contact</h2>
        <p style={S.p}>For all refund requests or questions about this policy, contact support@pewil.org. Please include your account email and relevant transaction details so we can respond quickly.</p>
      </div>
    </div>
  );
}
